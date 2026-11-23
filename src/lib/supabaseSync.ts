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
const LOCAL_CAREERS_CATALOG_KEY = 'brasileirao-pro:careers-catalog';
const DEVICE_SESSION_KEY = 'brasileirao-pro:device-session';
const ADMIN_AUTH_KEY = 'brasileirao-pro:admin-auth';
const CHANNEL_NAME = 'brasileirao-pro-sync';
const TAB_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);

export interface SavedCareerSummary {
  id: string;
  inviteCode: string;
  name: string;
  season: number;
  status: LeagueState['status'];
  currentRound: number;
  totalRounds: number;
  humanCount: number;
  botCount: number;
  participantsCount: number;
  botDifficulty: LeagueState['config']['botDifficulty'];
  updatedAt: string;
  source: 'cloud' | 'local';
}

type LocalCareerCatalog = Record<string, { updatedAt: string; state: LeagueState }>;

function readLocalCatalog(): LocalCareerCatalog {
  try {
    const raw = localStorage.getItem(LOCAL_CAREERS_CATALOG_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as LocalCareerCatalog;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocalCatalog(catalog: LocalCareerCatalog, protectedLeagueId?: string): void {
  try {
    localStorage.setItem(LOCAL_CAREERS_CATALOG_KEY, JSON.stringify(catalog));
  } catch {
    // Em caso de QuotaExceededError, remove as entradas mais antigas não-ativas
    const entries = Object.entries(catalog).sort(
      (a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime()
    );
    const trimmed: LocalCareerCatalog = {};
    for (const [id, entry] of entries) {
      if (id === protectedLeagueId || Object.keys(trimmed).length < 5) {
        trimmed[id] = entry;
      }
    }
    try {
      localStorage.setItem(LOCAL_CAREERS_CATALOG_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage quota errors
    }
  }
}

export function extractCareerSummary(
  state: LeagueState,
  updatedAt: string,
  source: 'cloud' | 'local'
): SavedCareerSummary {
  return {
    id: state.id,
    inviteCode: state.inviteCode,
    name: state.config?.name || 'Liga sem nome',
    season: state.season ?? 1,
    status: state.status,
    currentRound: state.currentRound ?? 1,
    totalRounds: state.totalRounds ?? 38,
    humanCount: state.config?.humanCount ?? 1,
    botCount: state.config?.botCount ?? 19,
    participantsCount: Array.isArray(state.participants) ? state.participants.length : 0,
    botDifficulty: state.config?.botDifficulty ?? 'medio',
    updatedAt,
    source,
  };
}

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

export function saveAdminAuthSession(isAuthed: boolean): void {
  try {
    if (isAuthed) {
      localStorage.setItem(ADMIN_AUTH_KEY, '1');
    } else {
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadAdminAuthSession(): boolean {
  try {
    return localStorage.getItem(ADMIN_AUTH_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearDeviceSession(): void {
  try {
    localStorage.removeItem(DEVICE_SESSION_KEY);
    localStorage.removeItem(ADMIN_AUTH_KEY);
  } catch {
    // ignore
  }
}

export async function saveLeagueState(
  state: LeagueState,
  persistRemote = true
): Promise<void> {
  const nowIso = new Date().toISOString();
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    if (state?.id && Array.isArray(state.clubs)) {
      const catalog = readLocalCatalog();
      catalog[state.id] = { updatedAt: nowIso, state };
      writeLocalCatalog(catalog, state.id);
    }
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
        updated_at: nowIso,
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

  const catalog = readLocalCatalog();
  const matchedEntry = Object.values(catalog).find(
    (entry) => entry?.state?.inviteCode?.toUpperCase() === clean
  );
  if (matchedEntry?.state) {
    return matchedEntry.state;
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

  const catalog = readLocalCatalog();
  if (catalog[clean]?.state) {
    return catalog[clean].state;
  }

  const local = loadLocalLeagueState();
  if (local && local.id === clean) {
    return local;
  }
  return null;
}

export async function listAllCareers(): Promise<SavedCareerSummary[]> {
  const map = new Map<string, SavedCareerSummary>();

  const catalog = readLocalCatalog();
  Object.values(catalog).forEach((entry) => {
    if (entry?.state?.id && Array.isArray(entry.state.clubs)) {
      map.set(
        entry.state.id,
        extractCareerSummary(entry.state, entry.updatedAt || new Date().toISOString(), 'local')
      );
    }
  });

  const local = loadLocalLeagueState();
  if (local?.id && Array.isArray(local.clubs) && !map.has(local.id)) {
    const tsMatch = Number(local.id.split('-')[1]);
    const fallbackIso =
      Number.isFinite(tsMatch) && tsMatch > 1_000_000_000_000
        ? new Date(tsMatch).toISOString()
        : new Date().toISOString();
    map.set(local.id, extractCareerSummary(local, fallbackIso, 'local'));
  }

  if (supabase) {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, invite_code, state_json, updated_at')
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((row) => {
        const st = row.state_json as LeagueState | undefined;
        if (!st?.id || !Array.isArray(st.clubs)) return;
        const cloudUpdated =
          typeof row.updated_at === 'string' && row.updated_at
            ? row.updated_at
            : new Date().toISOString();
        const existing = map.get(st.id);
        const cloudTime = new Date(cloudUpdated).getTime();
        const localTime = existing ? new Date(existing.updatedAt).getTime() : 0;
        map.set(
          st.id,
          extractCareerSummary(
            st,
            cloudTime >= localTime || !existing ? cloudUpdated : existing.updatedAt,
            'cloud'
          )
        );
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function deleteCareerById(
  leagueId: string
): Promise<{ ok: boolean; error?: string }> {
  const clean = leagueId.trim();
  if (!clean) return { ok: false, error: 'ID de carreira inválido.' };

  if (supabase) {
    const { error } = await supabase.from('leagues').delete().eq('id', clean);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  try {
    const catalog = readLocalCatalog();
    if (catalog[clean]) {
      delete catalog[clean];
      writeLocalCatalog(catalog);
    }
    const local = loadLocalLeagueState();
    if (local && local.id === clean) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }

  return { ok: true };
}

export type LeagueActionType =
  | 'join_participant'
  | 'claim_club'
  | 'update_tactics'
  | 'assign_slot'
  | 'auto_pick'
  | 'live_sub'
  | 'update_salary'
  | 'renew_contract'
  | 'toggle_sale'
  | 'submit_market_bid'
  | 'send_human_offer'
  | 'respond_human_offer'
  | 'reallocate_budget'
  | 'set_revenue_split';

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
