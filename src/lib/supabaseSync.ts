import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { LeagueState } from '../types/league';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const SUPABASE_URL = rawUrl?.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const supabase: SupabaseClient | null =
  isSupabaseConfigured && SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

const LOCAL_STORAGE_KEY = 'brasileirao-pro:active-league';
const DEVICE_SESSION_KEY = 'brasileirao-pro:device-session';
const CHANNEL_NAME = 'brasileirao-pro-sync';
const TAB_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

export interface DeviceSession {
  participantId: string;
  name: string;
  pin: string;
}

export function saveDeviceSession(session: DeviceSession): void {
  try {
    localStorage.setItem(DEVICE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore storage errors
  }
}

export function loadDeviceSession(): DeviceSession | null {
  try {
    const raw = localStorage.getItem(DEVICE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeviceSession;
    return parsed?.participantId ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDeviceSession(): void {
  try {
    localStorage.removeItem(DEVICE_SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function saveLeagueState(
  state: LeagueState,
  persistRemote = true
): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'LEAGUE_UPDATED', senderId: TAB_ID, state });
      ch.close();
    }
  } catch {
    // ignore storage quota errors
  }

  if (supabase && persistRemote) {
    await supabase.from('leagues').upsert(
      {
        id: state.id,
        invite_code: state.inviteCode,
        state_json: state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  }
}

export async function loadLeagueByInviteCode(inviteCode: string): Promise<LeagueState | null> {
  const clean = inviteCode.trim().toUpperCase();
  if (!clean) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from('leagues')
      .select('state_json')
      .eq('invite_code', clean)
      .maybeSingle();
    if (!error && data?.state_json) {
      return data.state_json as LeagueState;
    }
  }

  const local = loadLocalLeagueState();
  if (local && local.inviteCode.toUpperCase() === clean) {
    return local;
  }
  return null;
}

export async function loadLeagueById(leagueId: string): Promise<LeagueState | null> {
  const clean = leagueId.trim();
  if (!clean) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from('leagues')
      .select('state_json')
      .eq('id', clean)
      .maybeSingle();
    if (!error && data?.state_json) {
      return data.state_json as LeagueState;
    }
  }

  const local = loadLocalLeagueState();
  if (local && local.id === clean) {
    return local;
  }
  return null;
}

export type LeagueActionType =
  | 'join_participant'
  | 'claim_club'
  | 'update_tactics'
  | 'assign_slot'
  | 'auto_pick'
  | 'live_sub'
  | 'update_salary'
  | 'toggle_sale'
  | 'submit_market_bid'
  | 'send_human_offer'
  | 'respond_human_offer';

export interface LeagueRemoteAction {
  id?: number;
  league_id: string;
  actor_participant_id: string;
  action_type: LeagueActionType;
  payload: Record<string, unknown>;
  created_at?: string;
}

export async function dispatchLeagueAction(
  leagueId: string,
  actorParticipantId: string,
  actionType: LeagueActionType,
  payload: Record<string, unknown>
): Promise<void> {
  const action: LeagueRemoteAction = {
    league_id: leagueId,
    actor_participant_id: actorParticipantId,
    action_type: actionType,
    payload,
  };

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ type: 'LEAGUE_ACTION', senderId: TAB_ID, action });
      ch.close();
    }
  } catch {
    // ignore channel errors
  }

  if (supabase) {
    await supabase.from('league_actions').insert(action);
  }
}

export function subscribeLeagueActions(
  leagueId: string,
  onAction: (action: LeagueRemoteAction) => void
): () => void {
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => {
      if (
        ev.data?.type === 'LEAGUE_ACTION' &&
        ev.data?.senderId !== TAB_ID &&
        ev.data.action?.league_id === leagueId
      ) {
        onAction(ev.data.action as LeagueRemoteAction);
      }
    };
  }

  if (!supabase) {
    return () => bc?.close();
  }

  const channel = supabase
    .channel(`league-actions-${leagueId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'league_actions',
        filter: `league_id=eq.${leagueId}`,
      },
      (payload) => {
        const nextAction = payload.new as LeagueRemoteAction | undefined;
        if (nextAction?.action_type) {
          onAction(nextAction);
        }
      }
    )
    .subscribe();

  return () => {
    bc?.close();
    supabase.removeChannel(channel);
  };
}

export function loadLocalLeagueState(): LeagueState | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeagueState;
    if (parsed && Array.isArray(parsed.clubs) && parsed.config) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function claimClubAtomically(
  leagueId: string,
  clubId: string,
  participantId: string,
  participantName: string
): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) {
    return { ok: true };
  }

  const { error } = await supabase.from('club_claims').insert({
    league_id: leagueId,
    club_id: clubId,
    participant_id: participantId,
    participant_name: participantName,
  });

  if (error) {
    return {
      ok: false,
      error: 'Este clube acabou de ser escolhido por outro participante!',
    };
  }
  return { ok: true };
}

export function subscribeLeagueUpdates(
  leagueId: string,
  onUpdate: (nextState: LeagueState) => void
): () => void {
  let bc: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(CHANNEL_NAME);
    bc.onmessage = (ev) => {
      if (
        ev.data?.type === 'LEAGUE_UPDATED' &&
        ev.data?.senderId !== TAB_ID &&
        ev.data.state?.id === leagueId
      ) {
        onUpdate(ev.data.state as LeagueState);
      }
    };
  }

  if (!supabase) {
    return () => bc?.close();
  }

  const channel = supabase
    .channel(`league-${leagueId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'leagues',
        filter: `id=eq.${leagueId}`,
      },
      (payload) => {
        const nextJson = (payload.new as { state_json?: LeagueState } | null)?.state_json;
        if (nextJson) onUpdate(nextJson);
      }
    )
    .subscribe();

  return () => {
    bc?.close();
    supabase.removeChannel(channel);
  };
}
