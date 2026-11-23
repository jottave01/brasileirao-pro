import React, { useEffect, useRef, useState } from 'react';
import {
  Home,
  LogOut,
  Plus,
  Shield,
  ShoppingBag,
  Trophy,
  UserCheck,
} from 'lucide-react';
import {
  BotDifficulty,
  Club,
  ClubBotPersonality,
  Formation,
  LeagueConfig,
  LeagueState,
  Match,
  Player,
  PlayerPosition,
  TacticalMentality,
  TransferDispute,
  TransferDisputeBid,
} from './types/league';
import {
  createLeagueFromConfig,
  generateSchedule,
  reanchorFutureRoundsSchedule,
} from './engine/leagueGenerator';
import {
  calcMonthlySalary,
  CLUB_TEMPLATES,
  formatMillionsBRL,
  formatMonthlySalary,
  generateBaseSquad,
  generateWorldMarketPool,
  PLAYER_OVERRIDES,
  WORLD_MARKET_PLAYERS,
} from './data/seedData';
import {
  applySeasonEndAndPrepareNext,
  buildLineupSlots,
  evaluateFifaBotOffer,
  FORMATION_LAYOUT,
  getPositionFit,
  resolveTransferDispute,
  runBotMarketCycle,
  simulateMatchMinuteStep,
} from './engine/botAI';
import {
  claimClubAtomically,
  clearDeviceSession,
  dispatchLeagueAction,
  isSupabaseConfigured,
  LeagueRemoteAction,
  loadDeviceSession,
  loadLeagueByInviteCode,
  loadLocalLeagueState,
  saveDeviceSession,
  saveLeagueState,
  subscribeLeagueActions,
  subscribeLeagueUpdates,
} from './lib/supabaseSync';
import { LeagueCreatorView } from './components/LeagueCreatorView';
import { LobbyAndAdminView } from './components/LobbyAndAdminView';
import { TransferMarketView } from './components/TransferMarketView';
import { ClubManagementView } from './components/ClubManagementView';
import { CompetitionView } from './components/CompetitionView';
import { BrasileiraoTrophyLogo, ClubCrest } from './components/ClubBadge';
import { CareerLoginModal } from './components/CareerLoginModal';

type ActiveTab = 'lobby' | 'clube' | 'campeonato' | 'mercado' | 'criar';

let uidSeq = 1;
const uid = (prefix: string) => `${prefix}-${Date.now()}-${uidSeq++}`;

const DEFAULT_CONFIG: LeagueConfig = {
  name: 'Brasileirão Carreira',
  totalClubs: 20,
  humanCount: 3,
  botCount: 17,
  initialBudget: 150,
  useRealisticBudgets: true,
  squadSize: 20,
  format: 'pontos_corridos',
  homeAndAway: true,
  dailyScheduleTimes: ['12:00', '22:00'],
  transferRules: {
    windowOpen: true,
    windowHours: 24,
    maxDealsPerRound: 5,
    allowDirectPurchase: true,
    allowBotNegotiations: true,
    taxPercent: 5,
  },
  botDifficulty: 'medio',
  botPersonality: 'misto',
};

const VALID_STATUSES: LeagueState['status'][] = [
  'lobby',
  'escolha_clube',
  'janela_mercado',
  'campeonato',
  'fim_temporada',
];

function isValidLeagueState(s: LeagueState | null): s is LeagueState {
  if (!s || typeof s !== 'object') return false;
  return (
    Array.isArray(s.clubs) &&
    Array.isArray(s.participants) &&
    Array.isArray(s.worldMarket) &&
    Boolean(s.botPatienceMap) &&
    typeof s.transferWindowOpen === 'boolean' &&
    typeof s.config?.transferRules?.windowHours === 'number' &&
    VALID_STATUSES.includes(s.status)
  );
}

function applyFinishedMatchToLeague(clubs: Club[], finishedMatch: Match): Club[] {
  const homeWin = finishedMatch.homeGoals > finishedMatch.awayGoals;
  const draw = finishedMatch.homeGoals === finishedMatch.awayGoals;

  const goalCounts: Record<string, number> = {};
  const assistCounts: Record<string, number> = {};
  finishedMatch.events.forEach((ev) => {
    if (ev.type === 'gol') {
      goalCounts[`${ev.clubId}:${ev.playerName}`] =
        (goalCounts[`${ev.clubId}:${ev.playerName}`] ?? 0) + 1;
      if (ev.assistName) {
        assistCounts[`${ev.clubId}:${ev.assistName}`] =
          (assistCounts[`${ev.clubId}:${ev.assistName}`] ?? 0) + 1;
      }
    }
  });

  return clubs.map((club) => {
    if (club.id !== finishedMatch.homeClubId && club.id !== finishedMatch.awayClubId) {
      return club;
    }

    const isHome = club.id === finishedMatch.homeClubId;
    const gf = isHome ? finishedMatch.homeGoals : finishedMatch.awayGoals;
    const ga = isHome ? finishedMatch.awayGoals : finishedMatch.homeGoals;
    const won = isHome ? homeWin : !homeWin && !draw;
    const lost = !won && !draw;
    const pts = won ? 3 : draw ? 1 : 0;

    const prize = won ? 3.5 : draw ? 1.5 : 0.6;
    const boxOffice = isHome ? 1.8 : 0.4;
    const matchRevenue = Math.round((prize + boxOffice) * 10) / 10;
    const netChange = Math.round((matchRevenue - club.finances.wageBill) * 10) / 10;

    const updatedSquad = club.squad.map((p) => {
      const scored = goalCounts[`${club.id}:${p.knownName}`] ?? 0;
      const assisted = assistCounts[`${club.id}:${p.knownName}`] ?? 0;
      return scored > 0 || assisted > 0
        ? { ...p, goals: p.goals + scored, assists: p.assists + assisted }
        : p;
    });

    return {
      ...club,
      squad: updatedSquad,
      finances: {
        ...club.finances,
        budget: Math.max(0, Math.round((club.finances.budget + netChange) * 10) / 10),
        matchIncome: Math.round((club.finances.matchIncome + matchRevenue) * 10) / 10,
      },
      standing: {
        played: club.standing.played + 1,
        wins: club.standing.wins + (won ? 1 : 0),
        draws: club.standing.draws + (draw ? 1 : 0),
        losses: club.standing.losses + (lost ? 1 : 0),
        goalsFor: club.standing.goalsFor + gf,
        goalsAgainst: club.standing.goalsAgainst + ga,
        points: club.standing.points + pts,
      },
    };
  });
}

function mergeMissingWorldStars(state: LeagueState): LeagueState {
  const pool = generateWorldMarketPool();
  const existingNames = new Set<string>([
    ...state.worldMarket.map((p) => p.name),
    ...state.clubs.flatMap((c) => c.squad.map((p) => p.name)),
  ]);
  const missing = pool.filter((p) => !existingNames.has(p.name));
  if (missing.length === 0) return state;
  return {
    ...state,
    worldMarket: [...state.worldMarket, ...missing],
  };
}

function migrateLegacyPlayer(player: Player, index = 0): { player: Player; changed: boolean } {
  const ov = PLAYER_OVERRIDES[player.name];
  const star = WORLD_MARKET_PLAYERS.find((w) => w.name === player.name);
  let changed = false;

  let nextPos = player.position;
  if ((nextPos as string) === 'PONTA') {
    nextPos = ov?.position ?? star?.position ?? (index % 2 === 0 ? 'PE' : 'PD');
    changed = true;
  }

  let nextSec = player.secondaryPositions ?? [];
  if (nextSec.some((s) => (s as string) === 'PONTA')) {
    nextSec = Array.from(
      new Set(
        nextSec.flatMap((s) =>
          (s as string) === 'PONTA' ? (ov?.secondaryPositions ?? star?.secondaryPositions ?? ['PE', 'PD']) : [s]
        )
      )
    ) as PlayerPosition[];
    changed = true;
  }

  const nextAmbi = player.ambidextrous ?? ov?.ambidextrous ?? star?.ambidextrous ?? false;
  if (player.ambidextrous !== nextAmbi && (ov?.ambidextrous || star?.ambidextrous)) {
    changed = true;
  }

  const nextSalary = player.monthlySalary ?? calcMonthlySalary(player.overall);
  if (player.monthlySalary === undefined) {
    changed = true;
  }

  const nextWage = Math.max(0.1, Math.round((nextSalary / 1000) * 10) / 10);

  if (!changed) return { player, changed: false };

  return {
    player: {
      ...player,
      position: nextPos,
      secondaryPositions: nextSec,
      ambidextrous: nextAmbi,
      monthlySalary: nextSalary,
      wage: nextWage,
    },
    changed: true,
  };
}

function syncOfficialClubSquads(state: LeagueState): LeagueState {
  const allClubNames = new Set(
    state.clubs.flatMap((c) => c.squad.map((p) => p.name))
  );
  let changed = false;

  const migratedWorld = state.worldMarket.map((p, idx) => {
    const res = migrateLegacyPlayer(p, idx);
    if (res.changed) changed = true;
    return res.player;
  });

  const migratedFree = state.freeAgents.map((p, idx) => {
    const res = migrateLegacyPlayer(p, idx);
    if (res.changed) changed = true;
    return res.player;
  });

  const nextClubs = state.clubs.map((club, idx) => {
    const template = CLUB_TEMPLATES.find(
      (t) =>
        club.id.startsWith(`${t.id}-`) ||
        t.shortName === club.shortName ||
        t.name === club.name
    );

    let squadChanged = false;
    const clubLocalNames = new Set(club.squad.map((p) => p.name));

    const cleanedSquad = club.squad.map((p, pIdx) => {
      let current = p;
      if (template?.id === 'fla' && current.name === 'Pedro' && current.nationality !== 'Brasil') {
        squadChanged = true;
        current = { ...current, nationality: 'Brasil', nationalityFlag: '🇧🇷' };
      }
      const mig = migrateLegacyPlayer(current, pIdx);
      if (mig.changed) squadChanged = true;
      return mig.player;
    });

    const layout = FORMATION_LAYOUT[club.formation] ?? FORMATION_LAYOUT['4-3-3'];
    const cleanedSlots = (club.lineupSlots ?? []).map((slot, sIdx) => {
      if ((slot.role as string) === 'PONTA') {
        squadChanged = true;
        return { ...slot, role: layout[sIdx]?.role ?? 'PD' };
      }
      return slot;
    });

    const officialSquad = template
      ? generateBaseSquad(state.config.squadSize, idx, template)
      : [];
    const additions = officialSquad.filter((op) => {
      const baseName = op.name.replace(/\s+\([A-Z]+\)$/, '');
      if (allClubNames.has(op.name) || clubLocalNames.has(baseName)) {
        return false;
      }
      return true;
    });

    if (additions.length === 0 && !squadChanged) return club;

    changed = true;
    additions.forEach((op) => allClubNames.add(op.name));
    const mergedSquad = [
      ...cleanedSquad,
      ...additions.map((op) => ({
        ...op,
        isStarter: false,
        currentClubName: club.name,
      })),
    ];
    const built = buildLineupSlots(mergedSquad, club.formation, cleanedSlots);
    return {
      ...club,
      squad: built.squad,
      lineupSlots: built.lineupSlots,
      finances: {
        ...club.finances,
        wageBill: Math.round(built.squad.reduce((s, p) => s + p.wage, 0) * 10) / 10,
      },
    };
  });

  const needsScheduleMigration =
    state.config.dailyScheduleTimes?.[0] !== '12:00' ||
    state.config.dailyScheduleTimes?.[1] === '20:00';

  if (!changed && !needsScheduleMigration && state.transferDisputes) return state;
  return {
    ...state,
    config: needsScheduleMigration
      ? {
          ...state.config,
          dailyScheduleTimes: ['12:00', '22:00'],
        }
      : state.config,
    clubs: nextClubs,
    worldMarket: migratedWorld,
    freeAgents: migratedFree,
    transferDisputes: state.transferDisputes ?? [],
  };
}

function markMatchManualControl(matches: Match[], round: number, clubId: string): Match[] {
  return matches.map((m) => {
    if (m.round !== round || m.status !== 'ao_vivo') return m;
    if (m.homeClubId !== clubId && m.awayClubId !== clubId) return m;
    const cur = m.manualControlClubs ?? [];
    if (cur.includes(clubId)) return m;
    return { ...m, manualControlClubs: [...cur, clubId] };
  });
}

function getReservedDisputeCash(
  state: LeagueState,
  clubId: string,
  excludeTargetPlayerId?: string
): number {
  return (state.transferDisputes ?? [])
    .filter((d) => d.status === 'ativa' && d.targetPlayerId !== excludeTargetPlayerId)
    .reduce((sum, d) => {
      const myBid = d.bids.find((b) => b.clubId === clubId);
      return sum + (myBid?.offerCash ?? 0);
    }, 0);
}

function findDisputeTargetPlayer(
  state: LeagueState,
  dispute: Pick<TransferDispute, 'targetPlayerId' | 'originType' | 'sellerClubId'>
): Player | undefined {
  if (dispute.originType === 'europa') {
    return state.worldMarket.find((p) => p.id === dispute.targetPlayerId);
  }
  if (dispute.originType === 'livre') {
    return state.freeAgents.find((p) => p.id === dispute.targetPlayerId);
  }
  const seller = dispute.sellerClubId
    ? state.clubs.find((c) => c.id === dispute.sellerClubId)
    : undefined;
  return seller?.squad.find((p) => p.id === dispute.targetPlayerId);
}

function finalizeAcceptedTransfer(
  prev: LeagueState,
  params: {
    buyerClubId: string;
    targetPlayerId: string;
    originType: 'europa' | 'bot' | 'livre' | 'human';
    sellerClubId?: string;
    offerCash: number;
    proposedMonthlySalary?: number;
    swapPlayerId?: string;
  }
): LeagueState {
  const buyer = prev.clubs.find((c) => c.id === params.buyerClubId);
  if (!buyer || buyer.finances.budget < params.offerCash) return prev;
  if (buyer.squad.some((p) => p.id === params.targetPlayerId)) return prev;

  const sellerClub =
    params.sellerClubId && params.sellerClubId !== 'europa' && params.sellerClubId !== 'livre'
      ? prev.clubs.find((c) => c.id === params.sellerClubId)
      : undefined;

  const targetPlayer =
    params.originType === 'europa'
      ? prev.worldMarket.find((p) => p.id === params.targetPlayerId)
      : params.originType === 'livre'
      ? prev.freeAgents.find((p) => p.id === params.targetPlayerId)
      : sellerClub?.squad.find((p) => p.id === params.targetPlayerId);

  if (!targetPlayer) return prev;

  const swapPlayer = params.swapPlayerId
    ? buyer.squad.find((p) => p.id === params.swapPlayerId)
    : undefined;

  const finalMonthlySalary =
    params.proposedMonthlySalary ??
    targetPlayer.monthlySalary ??
    calcMonthlySalary(targetPlayer.overall);
  const finalWage = Math.max(0.1, Math.round((finalMonthlySalary / 1000) * 10) / 10);

  const signedPlayer: Player = {
    ...targetPlayer,
    isStarter: false,
    listedForSale: false,
    isWorldMarket: false,
    currentClubName: buyer.shortName,
    monthlySalary: finalMonthlySalary,
    wage: finalWage,
  };

  const updatedClubs = prev.clubs.map((c) => {
    if (c.id === buyer.id) {
      const remaining = swapPlayer
        ? c.squad.filter((p) => p.id !== swapPlayer.id)
        : [...c.squad];
      const built = buildLineupSlots(
        [...remaining, signedPlayer],
        c.formation,
        c.lineupSlots
      );
      return {
        ...c,
        squad: built.squad,
        lineupSlots: built.lineupSlots,
        dealsThisRound: c.dealsThisRound + 1,
        finances: {
          ...c.finances,
          budget: Math.max(0, Math.round((c.finances.budget - params.offerCash) * 10) / 10),
          transferSpent: Math.round((c.finances.transferSpent + params.offerCash) * 10) / 10,
          wageBill: Math.round(built.squad.reduce((s, p) => s + p.wage, 0) * 10) / 10,
        },
      };
    }
    if (sellerClub && c.id === sellerClub.id) {
      const remaining = c.squad.filter((p) => p.id !== targetPlayer.id);
      if (swapPlayer) {
        remaining.push({
          ...swapPlayer,
          isStarter: false,
          listedForSale: false,
          currentClubName: sellerClub.shortName,
        });
      }
      const built = buildLineupSlots(remaining, c.formation, c.lineupSlots);
      return {
        ...c,
        squad: built.squad,
        lineupSlots: built.lineupSlots,
        finances: {
          ...c.finances,
          budget: Math.round((c.finances.budget + params.offerCash) * 10) / 10,
          transferIncome: Math.round((c.finances.transferIncome + params.offerCash) * 10) / 10,
          wageBill: Math.round(built.squad.reduce((s, p) => s + p.wage, 0) * 10) / 10,
        },
      };
    }
    return c;
  });

  return {
    ...prev,
    clubs: updatedClubs,
    worldMarket:
      params.originType === 'europa'
        ? prev.worldMarket.filter((p) => p.id !== params.targetPlayerId)
        : prev.worldMarket,
    freeAgents:
      params.originType === 'livre'
        ? prev.freeAgents.filter((p) => p.id !== params.targetPlayerId)
        : prev.freeAgents,
  };
}

function resolveExpiredOrAllDisputes(state: LeagueState, forceAll = false): LeagueState {
  const disputes = state.transferDisputes ?? [];
  const nowMs = Date.now();
  const toResolve = disputes.filter(
    (d) =>
      d.status === 'ativa' &&
      (forceAll || nowMs >= new Date(d.expiresAt).getTime())
  );

  if (toResolve.length === 0) return state;

  let next = state;
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const resolvedMap = new Map<string, TransferDispute>();
  const feedAdditions: LeagueState['feed'] = [];
  const negAdditions: LeagueState['negotiations'] = [];

  for (const dispute of toResolve) {
    const targetPlayer = findDisputeTargetPlayer(next, dispute);
    const { winnerBid, reason } = resolveTransferDispute(dispute, next.clubs, targetPlayer);

    if (winnerBid) {
      next = finalizeAcceptedTransfer(next, {
        buyerClubId: winnerBid.clubId,
        targetPlayerId: dispute.targetPlayerId,
        originType: dispute.originType,
        sellerClubId: dispute.sellerClubId,
        offerCash: winnerBid.offerCash,
        proposedMonthlySalary: winnerBid.proposedMonthlySalary,
        swapPlayerId: winnerBid.swapPlayerId,
      });

      resolvedMap.set(dispute.id, {
        ...dispute,
        status: 'encerrada',
        winnerClubId: winnerBid.clubId,
        resolutionReason: reason,
      });

      feedAdditions.push({
        id: uid('feed-disp-win'),
        category: 'mercado',
        actorName: winnerBid.clubName,
        actorType: 'human',
        message: reason,
        timestamp: nowStr,
      });

      negAdditions.push({
        id: uid('neg-disp-win'),
        fromClubId: winnerBid.clubId,
        toClubId: dispute.sellerClubId ?? dispute.originType,
        targetPlayerId: dispute.targetPlayerId,
        targetPlayerName: dispute.targetPlayerName,
        offerCash: winnerBid.offerCash,
        proposedMonthlySalary: winnerBid.proposedMonthlySalary,
        swapPlayerId: winnerBid.swapPlayerId,
        swapPlayerName: winnerBid.swapPlayerName,
        status: 'aceita',
        botReason: reason,
        createdAt: nowStr,
      });
    } else {
      resolvedMap.set(dispute.id, {
        ...dispute,
        status: 'encerrada',
        resolutionReason: reason,
      });
      feedAdditions.push({
        id: uid('feed-disp-fail'),
        category: 'mercado',
        actorName: 'Mercado FIFA',
        actorType: 'system',
        message: reason,
        timestamp: nowStr,
      });
    }
  }

  return {
    ...next,
    transferDisputes: (next.transferDisputes ?? []).map((d) => resolvedMap.get(d.id) ?? d),
    negotiations: [...negAdditions, ...next.negotiations].slice(0, 40),
    feed: [...feedAdditions, ...next.feed].slice(0, 25),
  };
}

function applyClaimClubState(
  prev: LeagueState,
  participantId: string,
  clubId: string,
  updateCurrentUserActiveClub = true
): LeagueState {
  const user = prev.participants.find((p) => p.id === participantId);
  const target = prev.clubs.find((c) => c.id === clubId);
  if (!user || !target) return prev;
  if (target.claimedByParticipantId && target.claimedByParticipantId !== user.id) {
    return prev;
  }

  const prevClubId = user.clubId;
  const updatedClubs = prev.clubs.map((c) => {
    if (c.id === prevClubId && c.id !== clubId) {
      return {
        ...c,
        controller: 'bot' as const,
        claimedByParticipantId: undefined,
        managerName: `Bot ${c.shortName}`,
        isAdmin: false,
        inviteClaimed: false,
      };
    }
    if (c.id === clubId) {
      return {
        ...c,
        controller: 'human' as const,
        claimedByParticipantId: user.id,
        managerName: user.name,
        isAdmin: user.isAdmin,
        inviteClaimed: true,
      };
    }
    return c;
  });

  const updatedParticipants = prev.participants.map((p) =>
    p.id === user.id ? { ...p, clubId } : p
  );

  return {
    ...prev,
    clubs: updatedClubs,
    participants: updatedParticipants,
    activeHumanClubId:
      updateCurrentUserActiveClub && prev.currentUserId === user.id
        ? clubId
        : prev.activeHumanClubId,
  };
}

function applyUpdateTacticsState(
  prev: LeagueState,
  clubId: string,
  formation: Formation,
  mentality: TacticalMentality
): LeagueState {
  return {
    ...prev,
    matches: markMatchManualControl(prev.matches, prev.currentRound, clubId),
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;

      const currentStarters = (c.lineupSlots ?? [])
        .map((s) => c.squad.find((p) => p.id === s.playerId))
        .filter((p): p is NonNullable<typeof p> => Boolean(p));

      if (currentStarters.length === 11) {
        const layout = FORMATION_LAYOUT[formation];
        const usedIds = new Set<string>();
        const nextSlots = layout.map((spec, idx) => ({
          slotIndex: idx,
          role: spec.role,
          playerId: '',
        }));

        layout.forEach((spec, idx) => {
          const exact = currentStarters.find(
            (p) => p.position === spec.role && !usedIds.has(p.id)
          );
          if (exact) {
            usedIds.add(exact.id);
            nextSlots[idx].playerId = exact.id;
          }
        });
        layout.forEach((spec, idx) => {
          if (nextSlots[idx].playerId) return;
          const best = currentStarters
            .filter((p) => !usedIds.has(p.id))
            .sort(
              (a, b) =>
                getPositionFit(b, spec.role).effectiveOvr -
                getPositionFit(a, spec.role).effectiveOvr
            )[0];
          if (best) {
            usedIds.add(best.id);
            nextSlots[idx].playerId = best.id;
          }
        });

        const starterIds = new Set(nextSlots.map((s) => s.playerId));
        return {
          ...c,
          formation,
          mentality,
          lineupSlots: nextSlots,
          squad: c.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
        };
      }

      const built = buildLineupSlots(c.squad, formation, c.lineupSlots);
      return {
        ...c,
        formation,
        mentality,
        squad: built.squad,
        lineupSlots: built.lineupSlots,
      };
    }),
  };
}

function applyAssignSlotState(
  prev: LeagueState,
  clubId: string,
  slotIndex: number,
  playerId: string
): LeagueState {
  return {
    ...prev,
    matches: markMatchManualControl(prev.matches, prev.currentRound, clubId),
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;
      const currentSlots = [...c.lineupSlots];
      const targetSlot = currentSlots[slotIndex];
      if (!targetSlot) return c;

      const prevOwnerSlotIdx = currentSlots.findIndex((s) => s.playerId === playerId);
      const oldPlayerId = targetSlot.playerId;

      if (prevOwnerSlotIdx !== -1 && prevOwnerSlotIdx !== slotIndex) {
        currentSlots[prevOwnerSlotIdx] = {
          ...currentSlots[prevOwnerSlotIdx],
          playerId: oldPlayerId,
        };
      }
      currentSlots[slotIndex] = { ...targetSlot, playerId };

      const starterIds = new Set(currentSlots.map((s) => s.playerId));
      return {
        ...c,
        lineupSlots: currentSlots,
        squad: c.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
      };
    }),
  };
}

function applyAutoPickState(prev: LeagueState, clubId: string): LeagueState {
  return {
    ...prev,
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;
      const built = buildLineupSlots(c.squad, c.formation);
      return { ...c, squad: built.squad, lineupSlots: built.lineupSlots };
    }),
  };
}

function applyUpdateSalaryState(
  prev: LeagueState,
  clubId: string,
  playerId: string,
  newMonthlySalary: number
): LeagueState {
  const clampedSalary = Math.max(30, Math.min(3000, Math.round(newMonthlySalary)));
  return {
    ...prev,
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;
      const nextSquad = c.squad.map((p) => {
        if (p.id !== playerId) return p;
        return {
          ...p,
          monthlySalary: clampedSalary,
          wage: Math.max(0.1, Math.round((clampedSalary / 1000) * 10) / 10),
        };
      });
      return {
        ...c,
        squad: nextSquad,
        finances: {
          ...c.finances,
          wageBill: Math.round(nextSquad.reduce((s, p) => s + p.wage, 0) * 10) / 10,
        },
      };
    }),
  };
}

function applyToggleSaleState(prev: LeagueState, clubId: string, playerId: string): LeagueState {
  return {
    ...prev,
    clubs: prev.clubs.map((c) =>
      c.id === clubId
        ? {
            ...c,
            squad: c.squad.map((p) =>
              p.id === playerId
                ? {
                    ...p,
                    listedForSale: !p.listedForSale,
                    askingPrice: !p.listedForSale ? p.marketValue : undefined,
                  }
                : p
            ),
          }
        : c
    ),
  };
}

function applyLiveSubState(
  prev: LeagueState,
  matchId: string,
  clubId: string,
  slotIndex: number,
  subInPlayerId: string
): LeagueState {
  const targetClub = prev.clubs.find((c) => c.id === clubId);
  const targetMatch = prev.matches.find((m) => m.id === matchId);
  if (!targetClub || !targetMatch) return prev;

  const isHome = targetMatch.homeClubId === clubId;
  const used = isHome ? targetMatch.homeSubsUsed : targetMatch.awaySubsUsed;
  if (used >= 5) return prev;

  const outPlayerId = targetClub.lineupSlots[slotIndex]?.playerId;
  const outPlayer = targetClub.squad.find((p) => p.id === outPlayerId);
  const inPlayer = targetClub.squad.find((p) => p.id === subInPlayerId);
  if (!outPlayer || !inPlayer) return prev;

  const nextSlots = targetClub.lineupSlots.map((s, idx) =>
    idx === slotIndex ? { ...s, playerId: subInPlayerId } : s
  );
  const starterIds = new Set(nextSlots.map((s) => s.playerId));

  return {
    ...prev,
    clubs: prev.clubs.map((c) =>
      c.id === clubId
        ? {
            ...c,
            lineupSlots: nextSlots,
            squad: c.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
          }
        : c
    ),
    matches: prev.matches.map((m) => {
      if (m.id !== matchId) return m;
      const desc = `🔄 ${targetClub.shortName}: entra ${inPlayer.knownName}, sai ${outPlayer.knownName}`;
      const manualClubs = m.manualControlClubs ?? [];
      return {
        ...m,
        homeSubsUsed: isHome ? m.homeSubsUsed + 1 : m.homeSubsUsed,
        awaySubsUsed: !isHome ? m.awaySubsUsed + 1 : m.awaySubsUsed,
        homeSubbedOutIds: isHome ? [...m.homeSubbedOutIds, outPlayer.id] : m.homeSubbedOutIds,
        awaySubbedOutIds: !isHome ? [...m.awaySubbedOutIds, outPlayer.id] : m.awaySubbedOutIds,
        manualControlClubs: manualClubs.includes(clubId) ? manualClubs : [...manualClubs, clubId],
        lastPlayText: desc,
        events: [
          ...m.events,
          {
            minute: m.currentMinute,
            type: 'substituicao',
            clubId,
            playerName: inPlayer.knownName,
            description: desc,
          },
        ],
      };
    }),
  };
}

function applyMarketBidState(
  prev: LeagueState,
  params: {
    buyerClubId: string;
    targetPlayerId: string;
    originType: 'europa' | 'bot' | 'livre';
    sellerClubId?: string;
    offerCash: number;
    proposedMonthlySalary: number;
    swapPlayerId?: string;
  }
): LeagueState {
  if (!prev.transferWindowOpen) return prev;

  const buyer = prev.clubs.find((c) => c.id === params.buyerClubId);
  if (!buyer) return prev;

  const reservedCash = getReservedDisputeCash(prev, params.buyerClubId, params.targetPlayerId);
  const availableBudget = Math.max(0, buyer.finances.budget - reservedCash);
  if (availableBudget < params.offerCash) return prev;
  if (buyer.squad.some((p) => p.id === params.targetPlayerId)) return prev;

  const sellerClub =
    params.originType === 'bot' && params.sellerClubId
      ? prev.clubs.find((c) => c.id === params.sellerClubId)
      : undefined;
  const targetPlayer =
    params.originType === 'europa'
      ? prev.worldMarket.find((p) => p.id === params.targetPlayerId)
      : params.originType === 'livre'
      ? prev.freeAgents.find((p) => p.id === params.targetPlayerId)
      : sellerClub?.squad.find((p) => p.id === params.targetPlayerId);

  const swapPlayer = params.swapPlayerId
    ? buyer.squad.find((p) => p.id === params.swapPlayerId)
    : undefined;

  if (!targetPlayer) return prev;

  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const patienceKey = `${params.buyerClubId}:${params.targetPlayerId}`;
  const prevPatience = prev.botPatienceMap[patienceKey]?.patience ?? 3;
  const evalRes = evaluateFifaBotOffer({
    targetPlayer,
    sellerClub,
    buyerClub: buyer,
    originType: params.originType,
    offerCash: params.offerCash,
    proposedMonthlySalary: params.proposedMonthlySalary,
    swapPlayer,
    currentPatience: prevPatience,
  });

  const updatedPatienceMap = {
    ...prev.botPatienceMap,
    [patienceKey]: {
      patience: evalRes.nextPatience,
      locked: evalRes.locked,
      lastCounter: evalRes.counterCash,
      lastCounterSalary: evalRes.counterSalary,
      lastMessage: evalRes.message,
    },
  };

  if (evalRes.outcome !== 'aceita') {
    return {
      ...prev,
      botPatienceMap: updatedPatienceMap,
      negotiations: [
        {
          id: uid('neg'),
          fromClubId: params.buyerClubId,
          toClubId: sellerClub?.id ?? params.originType,
          targetPlayerId: params.targetPlayerId,
          targetPlayerName: targetPlayer.knownName,
          offerCash: params.offerCash,
          proposedMonthlySalary: params.proposedMonthlySalary,
          swapPlayerId: params.swapPlayerId,
          swapPlayerName: swapPlayer?.knownName,
          status: evalRes.outcome,
          counterCash: evalRes.counterCash,
          counterSalary: evalRes.counterSalary,
          botReason: evalRes.message,
          createdAt: nowStr,
        },
        ...prev.negotiations.slice(0, 39),
      ],
    };
  }

  // Solo (1 humano na liga): conclui transferência imediatamente
  const humanClubsCount = prev.clubs.filter((c) => c.controller === 'human').length;
  if (humanClubsCount <= 1) {
    const settled = finalizeAcceptedTransfer(prev, {
      buyerClubId: params.buyerClubId,
      targetPlayerId: params.targetPlayerId,
      originType: params.originType,
      sellerClubId: sellerClub?.id,
      offerCash: params.offerCash,
      proposedMonthlySalary: params.proposedMonthlySalary,
      swapPlayerId: params.swapPlayerId,
    });
    return {
      ...settled,
      botPatienceMap: updatedPatienceMap,
      negotiations: [
        {
          id: uid('neg'),
          fromClubId: params.buyerClubId,
          toClubId: sellerClub?.id ?? params.originType,
          targetPlayerId: params.targetPlayerId,
          targetPlayerName: targetPlayer.knownName,
          offerCash: params.offerCash,
          proposedMonthlySalary: params.proposedMonthlySalary,
          swapPlayerId: params.swapPlayerId,
          swapPlayerName: swapPlayer?.knownName,
          status: 'aceita',
          botReason: evalRes.message,
          createdAt: nowStr,
        },
        ...prev.negotiations.slice(0, 39),
      ],
      feed: [
        {
          id: uid('feed-trf'),
          category: 'mercado',
          actorName: buyer.shortName,
          actorType: buyer.controller,
          message: `Contratou ${targetPlayer.knownName} (OVR ${targetPlayer.overall}) do ${
            sellerClub?.shortName ?? targetPlayer.currentClubName ?? 'Mercado'
          } por ${formatMillionsBRL(params.offerCash)} (${formatMonthlySalary(params.proposedMonthlySalary)}).`,
          timestamp: nowStr,
        },
        ...prev.feed.slice(0, 24),
      ],
    };
  }

  // Multiplayer (2+ humanos): abre ou atualiza disputa de 3 horas para amigos cobrirem a proposta!
  const swapValue = swapPlayer ? swapPlayer.marketValue * 0.9 : 0;
  const bidEntry: TransferDisputeBid = {
    clubId: buyer.id,
    clubName: buyer.shortName,
    offerCash: params.offerCash,
    swapPlayerId: swapPlayer?.id,
    swapPlayerName: swapPlayer?.knownName,
    swapValue,
    proposedMonthlySalary: params.proposedMonthlySalary,
    submittedAt: nowStr,
  };

  const existingDispute = (prev.transferDisputes ?? []).find(
    (d) => d.status === 'ativa' && d.targetPlayerId === params.targetPlayerId
  );

  const windowEndsMs = prev.transferWindowEndsAt
    ? new Date(prev.transferWindowEndsAt).getTime()
    : Date.now() + 24 * 3600 * 1000;
  const defaultExpiresMs = Date.now() + 3 * 3600 * 1000;
  const expiresAtIso =
    existingDispute?.expiresAt ??
    new Date(Math.min(defaultExpiresMs, windowEndsMs)).toISOString();

  const updatedDispute: TransferDispute = existingDispute
    ? {
        ...existingDispute,
        bids: [
          ...existingDispute.bids.filter((b) => b.clubId !== buyer.id),
          bidEntry,
        ],
      }
    : {
        id: uid('disp'),
        targetPlayerId: params.targetPlayerId,
        targetPlayerName: targetPlayer.knownName,
        originType: params.originType,
        sellerClubId: sellerClub?.id,
        sellerClubName: sellerClub?.name ?? targetPlayer.currentClubName ?? 'Livre',
        expiresAt: expiresAtIso,
        bids: [bidEntry],
        status: 'ativa',
      };

  const otherDisputes = (prev.transferDisputes ?? []).filter((d) => d.id !== updatedDispute.id);
  const expiresFormatted = new Date(expiresAtIso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    ...prev,
    botPatienceMap: updatedPatienceMap,
    transferDisputes: [updatedDispute, ...otherDisputes],
    negotiations: [
      {
        id: uid('neg'),
        fromClubId: params.buyerClubId,
        toClubId: sellerClub?.id ?? params.originType,
        targetPlayerId: params.targetPlayerId,
        targetPlayerName: targetPlayer.knownName,
        offerCash: params.offerCash,
        proposedMonthlySalary: params.proposedMonthlySalary,
        swapPlayerId: params.swapPlayerId,
        swapPlayerName: swapPlayer?.knownName,
        status: 'em_disputa',
        botReason: `Disputa aberta! Lance de ${formatMillionsBRL(params.offerCash)} (${formatMonthlySalary(
          params.proposedMonthlySalary
        )}). Amigos podem cobrir até ${expiresFormatted}.`,
        createdAt: nowStr,
      },
      ...prev.negotiations.slice(0, 39),
    ],
    feed: [
      {
        id: uid('feed-disp-bid'),
        category: 'mercado',
        actorName: buyer.shortName,
        actorType: buyer.controller,
        message: existingDispute
          ? `Cobriu oferta por ${targetPlayer.knownName} (${formatMillionsBRL(params.offerCash)} • ${formatMonthlySalary(params.proposedMonthlySalary)}).`
          : `Abriu disputa de 3h por ${targetPlayer.knownName} (${formatMillionsBRL(params.offerCash)} • ${formatMonthlySalary(params.proposedMonthlySalary)}).`,
        timestamp: nowStr,
      },
      ...prev.feed.slice(0, 24),
    ],
  };
}

function applySendHumanOfferState(
  prev: LeagueState,
  params: {
    fromClubId: string;
    toClubId: string;
    targetPlayerId: string;
    offerCash: number;
    proposedMonthlySalary?: number;
    swapPlayerId?: string;
  }
): LeagueState {
  if (!prev.transferWindowOpen) return prev;
  const fromClub = prev.clubs.find((c) => c.id === params.fromClubId);
  const toClub = prev.clubs.find((c) => c.id === params.toClubId);
  const targetPlayer = toClub?.squad.find((p) => p.id === params.targetPlayerId);
  const swapPlayer = params.swapPlayerId
    ? fromClub?.squad.find((p) => p.id === params.swapPlayerId)
    : undefined;
  const available = fromClub
    ? fromClub.finances.budget - getReservedDisputeCash(prev, fromClub.id)
    : 0;
  if (
    !fromClub ||
    !toClub ||
    toClub.controller !== 'human' ||
    !targetPlayer ||
    available < params.offerCash
  ) {
    return prev;
  }

  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return {
    ...prev,
    negotiations: [
      {
        id: uid('neg'),
        fromClubId: params.fromClubId,
        toClubId: params.toClubId,
        targetPlayerId: params.targetPlayerId,
        targetPlayerName: targetPlayer.knownName,
        offerCash: params.offerCash,
        proposedMonthlySalary:
          params.proposedMonthlySalary ??
          targetPlayer.monthlySalary ??
          calcMonthlySalary(targetPlayer.overall),
        swapPlayerId: params.swapPlayerId,
        swapPlayerName: swapPlayer?.knownName,
        status: 'aguardando_amigo',
        botReason: `Aguardando autorização de ${toClub.managerName} (${toClub.name}).`,
        createdAt: nowStr,
      },
      ...prev.negotiations.slice(0, 39),
    ],
    feed: [
      {
        id: uid('feed-hum-req'),
        category: 'mercado',
        actorName: fromClub.shortName,
        actorType: 'human',
        message: `Enviou proposta de ${formatMillionsBRL(params.offerCash)} ao ${toClub.shortName} por ${targetPlayer.knownName}.`,
        timestamp: nowStr,
      },
      ...prev.feed.slice(0, 24),
    ],
  };
}

function applyRespondHumanOfferState(
  prev: LeagueState,
  offerId: string,
  decision: 'aceita' | 'recusada'
): LeagueState {
  if (!prev.transferWindowOpen) return prev;
  const offer = prev.negotiations.find((n) => n.id === offerId);
  if (!offer || offer.status !== 'aguardando_amigo') return prev;
  const buyer = prev.clubs.find((c) => c.id === offer.fromClubId);
  const seller = prev.clubs.find((c) => c.id === offer.toClubId);
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let nextState = prev;
  if (decision === 'aceita') {
    nextState = finalizeAcceptedTransfer(prev, {
      buyerClubId: offer.fromClubId,
      targetPlayerId: offer.targetPlayerId,
      originType: 'human',
      sellerClubId: offer.toClubId,
      offerCash: offer.offerCash,
      proposedMonthlySalary: offer.proposedMonthlySalary,
      swapPlayerId: offer.swapPlayerId,
    });
  }

  return {
    ...nextState,
    negotiations: nextState.negotiations.map((n) =>
      n.id === offerId
        ? {
            ...n,
            status: decision,
            botReason:
              decision === 'aceita'
                ? `${seller?.managerName} autorizou a venda por ${formatMillionsBRL(offer.offerCash)}.`
                : `${seller?.managerName} recusou a proposta.`,
          }
        : n
    ),
    feed:
      decision === 'aceita' && buyer && seller
        ? [
            {
              id: uid('feed-hum'),
              category: 'mercado',
              actorName: seller.shortName,
              actorType: 'human',
              message: `Autorizou venda de ${offer.targetPlayerName} para o ${buyer.shortName} (${formatMillionsBRL(offer.offerCash)}).`,
              timestamp: nowStr,
            },
            ...nextState.feed.slice(0, 24),
          ]
        : nextState.feed,
  };
}

function applyRemoteLeagueAction(prev: LeagueState, action: LeagueRemoteAction): LeagueState {
  const p = action.payload;
  switch (action.action_type) {
    case 'join_participant': {
      const id = String(p.id ?? '');
      const name = String(p.name ?? '');
      const pin = String(p.pin ?? '');
      if (!id || !name || prev.participants.some((x) => x.id === id || x.name.toLowerCase() === name.toLowerCase())) {
        return prev;
      }
      if (prev.participants.length >= prev.config.humanCount) return prev;
      const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return {
        ...prev,
        participants: [
          ...prev.participants,
          { id, name, pin, isAdmin: false, clubId: null, joinedAt: nowStr },
        ],
        feed: [
          {
            id: uid('feed-join-r'),
            category: 'convite',
            actorName: name,
            actorType: 'human',
            message: 'Entrou na liga a partir de outro dispositivo.',
            timestamp: nowStr,
          },
          ...prev.feed.slice(0, 24),
        ],
      };
    }
    case 'claim_club':
      return applyClaimClubState(prev, String(p.participantId ?? action.actor_participant_id), String(p.clubId ?? ''), false);
    case 'update_tactics':
      return applyUpdateTacticsState(prev, String(p.clubId), p.formation as Formation, p.mentality as TacticalMentality);
    case 'assign_slot':
      return applyAssignSlotState(prev, String(p.clubId), Number(p.slotIndex), String(p.playerId));
    case 'auto_pick':
      return applyAutoPickState(prev, String(p.clubId));
    case 'live_sub':
      return applyLiveSubState(prev, String(p.matchId), String(p.clubId), Number(p.slotIndex), String(p.subInPlayerId));
    case 'update_salary':
      return applyUpdateSalaryState(prev, String(p.clubId), String(p.playerId), Number(p.newMonthlySalary));
    case 'toggle_sale':
      return applyToggleSaleState(prev, String(p.clubId), String(p.playerId));
    case 'submit_market_bid':
      return applyMarketBidState(prev, {
        buyerClubId: String(p.buyerClubId),
        targetPlayerId: String(p.targetPlayerId),
        originType: p.originType as 'europa' | 'bot' | 'livre',
        sellerClubId: p.sellerClubId ? String(p.sellerClubId) : undefined,
        offerCash: Number(p.offerCash),
        proposedMonthlySalary: Number(p.proposedMonthlySalary),
        swapPlayerId: p.swapPlayerId ? String(p.swapPlayerId) : undefined,
      });
    case 'send_human_offer':
      return applySendHumanOfferState(prev, {
        fromClubId: String(p.fromClubId),
        toClubId: String(p.toClubId),
        targetPlayerId: String(p.targetPlayerId),
        offerCash: Number(p.offerCash),
        proposedMonthlySalary: p.proposedMonthlySalary ? Number(p.proposedMonthlySalary) : undefined,
        swapPlayerId: p.swapPlayerId ? String(p.swapPlayerId) : undefined,
      });
    case 'respond_human_offer':
      return applyRespondHumanOfferState(prev, String(p.offerId), p.decision as 'aceita' | 'recusada');
    default:
      return prev;
  }
}

const HAD_SESSION_ON_BOOT =
  typeof window !== 'undefined' && Boolean(loadDeviceSession());

function createInitialLeague(): LeagueState {
  const inviteParam =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('invite')
      : null;

  const savedRaw = loadLocalLeagueState();
  if (isValidLeagueState(savedRaw) && (!inviteParam || savedRaw.inviteCode === inviteParam)) {
    const saved = syncOfficialClubSquads(mergeMissingWorldStars(savedRaw));
    const session = loadDeviceSession();
    if (session) {
      const matched = saved.participants.find(
        (p) =>
          (p.id === session.participantId && p.pin === session.pin) ||
          (p.name.toLowerCase() === session.name.toLowerCase() && p.pin === session.pin)
      );
      if (matched) {
        return {
          ...saved,
          currentUserId: matched.id,
          activeHumanClubId: matched.clubId ?? saved.activeHumanClubId,
        };
      }
    }
    return {
      ...saved,
      currentUserId: '',
    };
  }

  const fresh = createLeagueFromConfig(DEFAULT_CONFIG, 'Você (Admin)', false, '1234');
  const admin = fresh.participants[0];
  if (admin) {
    saveDeviceSession({ participantId: admin.id, name: admin.name, pin: admin.pin });
  }
  return fresh;
}

function advanceToNextRoundState(
  prev: LeagueState,
  nowStr: string
): { nextState: LeagueState; openedMidWindow: boolean } {
  if (prev.currentRound >= prev.totalRounds) {
    return { nextState: prev, openedMidWindow: false };
  }

  const shouldOpenMidWindow =
    prev.config.homeAndAway &&
    !prev.midSeasonWindowDone &&
    prev.currentRound === Math.floor(prev.totalRounds / 2);

  const refreshedClubs = prev.clubs.map((c) => ({
    ...c,
    dealsThisRound: 0,
    squad: c.squad.map((p) => ({ ...p, stamina: 100 })),
  }));
  const botCycle = runBotMarketCycle({ ...prev, clubs: refreshedClubs });

  if (shouldOpenMidWindow) {
    const windowHours = prev.config.transferRules.windowHours || 24;
    const windowEndsAt = new Date(Date.now() + windowHours * 3600 * 1000).toISOString();
    return {
      openedMidWindow: true,
      nextState: {
        ...prev,
        status: 'janela_mercado',
        currentRound: prev.currentRound + 1,
        clubs: botCycle.clubs,
        freeAgents: botCycle.freeAgents,
        transferWindowOpen: true,
        transferWindowEndsAt: windowEndsAt,
        transferWindowLabel: `Janela Virada de Turno (${windowHours}h)`,
        midSeasonWindowDone: true,
        botPatienceMap: {},
        feed: [
          {
            id: uid('feed-midwin'),
            category: 'mercado' as const,
            actorName: 'Virada de Turno',
            actorType: 'system' as const,
            message: `Janela de ${windowHours}h reaberta para o returno! Negociações liberadas.`,
            timestamp: nowStr,
          },
          ...botCycle.feedItems,
          ...prev.feed,
        ].slice(0, 24),
      },
    };
  }

  return {
    openedMidWindow: false,
    nextState: {
      ...prev,
      currentRound: prev.currentRound + 1,
      clubs: botCycle.clubs,
      freeAgents: botCycle.freeAgents,
      feed: [...botCycle.feedItems, ...prev.feed].slice(0, 24),
    },
  };
}

export function App() {
  const [league, setLeague] = useState<LeagueState>(createInitialLeague);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lobby');
  const [liveRoundRunning, setLiveRoundRunning] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'new_career'>('login');
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('invite') || !HAD_SESSION_ON_BOOT;
  });

  const skipNextSaveRef = useRef(false);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? null;
  const isAdminUser = currentUser?.isAdmin === true;

  const activeHumanClub =
    league.clubs.find((c) => c.id === (currentUser?.clubId || league.activeHumanClubId)) ??
    league.clubs.find((c) => c.controller === 'human') ??
    league.clubs[0];

  const incomingPendingApprovals = league.negotiations.filter(
    (n) => n.toClubId === activeHumanClub.id && n.status === 'aguardando_amigo'
  ).length;

  // Persistência local + Supabase Realtime (Host/Admin autoritativo durante mercado/jogos)
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const shouldPersistRemote =
      isAdminUser || league.status === 'lobby' || league.status === 'escolha_clube';
    saveLeagueState(league, shouldPersistRemote);
  }, [league, isAdminUser]);

  useEffect(() => {
    return subscribeLeagueUpdates(league.id, (nextState) => {
      if (!isValidLeagueState(nextState)) return;
      skipNextSaveRef.current = true;
      setLeague((prev) => {
        const myParticipant = nextState.participants.find((p) => p.id === prev.currentUserId);
        return {
          ...nextState,
          currentUserId: prev.currentUserId,
          activeHumanClubId: myParticipant?.clubId ?? prev.activeHumanClubId,
        };
      });
    });
  }, [league.id]);

  // Se entrou por link ?invite=CODIGO em outro aparelho, busca a sala real no Supabase
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const inviteCode = new URLSearchParams(window.location.search).get('invite')?.trim().toUpperCase();
    if (!inviteCode) return;

    let cancelled = false;
    loadLeagueByInviteCode(inviteCode).then((remote) => {
      if (cancelled || !remote || !isValidLeagueState(remote)) return;
      const synced = syncOfficialClubSquads(mergeMissingWorldStars(remote));
      const session = loadDeviceSession();
      const matched = session
        ? synced.participants.find(
            (p) =>
              (p.id === session.participantId && p.pin === session.pin) ||
              (p.name.toLowerCase() === session.name.toLowerCase() && p.pin === session.pin)
          )
        : undefined;

      skipNextSaveRef.current = true;
      setLeague({
        ...synced,
        currentUserId: matched?.id ?? '',
        activeHumanClubId: matched?.clubId ?? synced.clubs[0]?.id ?? '',
      });
      if (!matched) {
        setLoginModalMode('login');
        setInviteModalOpen(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Admin/Host recebe ações atômicas dos amigos em outros aparelhos e consolida no estado oficial
  useEffect(() => {
    if (!isAdminUser) return;
    return subscribeLeagueActions(league.id, (action) => {
      if (action.actor_participant_id === currentUser?.id) return;
      setLeague((prev) => applyRemoteLeagueAction(prev, action));
    });
  }, [league.id, isAdminUser, currentUser?.id]);

  // Encerramento automático de disputas de 3h e da janela de transferências
  useEffect(() => {
    if (isSupabaseConfigured && !isAdminUser) return;
    const hasActiveDisputes = (league.transferDisputes ?? []).some((d) => d.status === 'ativa');
    if (!league.transferWindowOpen && !hasActiveDisputes) return;

    const checkTimers = () => {
      const nowMs = Date.now();
      const windowExpired = Boolean(
        league.transferWindowOpen &&
          league.transferWindowEndsAt &&
          !Number.isNaN(new Date(league.transferWindowEndsAt).getTime()) &&
          nowMs >= new Date(league.transferWindowEndsAt).getTime()
      );
      const anyDisputeExpired = (league.transferDisputes ?? []).some(
        (d) => d.status === 'ativa' && nowMs >= new Date(d.expiresAt).getTime()
      );

      if (!windowExpired && !anyDisputeExpired) return;

      const nowStr = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      setLeague((prev) => {
        const curNow = Date.now();
        const isWinExpired = Boolean(
          prev.transferWindowOpen &&
            prev.transferWindowEndsAt &&
            !Number.isNaN(new Date(prev.transferWindowEndsAt).getTime()) &&
            curNow >= new Date(prev.transferWindowEndsAt).getTime()
        );
        let next = resolveExpiredOrAllDisputes(prev, isWinExpired);
        if (!isWinExpired) return next;

        const rescheduledMatches =
          next.currentRound >= 2
            ? reanchorFutureRoundsSchedule(
                next.matches,
                next.currentRound,
                next.config.dailyScheduleTimes,
                curNow
              )
            : next.matches;

        return {
          ...next,
          status: next.status === 'janela_mercado' ? 'campeonato' : next.status,
          transferWindowOpen: false,
          transferWindowEndsAt: null,
          matches: rescheduledMatches,
          feed: [
            {
              id: uid('feed-auto-close-win'),
              category: 'mercado',
              actorName: 'Mercado FIFA',
              actorType: 'system',
              message: 'Período da janela encerrado automaticamente! Todas as disputas foram apuradas.',
              timestamp: nowStr,
            },
            ...next.feed.slice(0, 24),
          ],
        };
      });
    };

    checkTimers();
    const timer = setInterval(checkTimers, 5000);
    return () => clearInterval(timer);
  }, [league.transferWindowOpen, league.transferWindowEndsAt, league.transferDisputes, isAdminUser]);

  // Loop de Partida ao Vivo (~2.5s por minuto de jogo + 30s intervalo -> ~4m15s real por jogo)
  useEffect(() => {
    if (!liveRoundRunning) return;

    const timer = setInterval(() => {
      setLeague((prev) => {
        const roundMatches = prev.matches.filter((m) => m.round === prev.currentRound);
        if (roundMatches.every((m) => m.status === 'finalizada')) {
          setLiveRoundRunning(false);
          return prev;
        }

        let updatedClubs = [...prev.clubs];
        const newlyFinished: Match[] = [];

        const updatedMatches = prev.matches.map((m) => {
          if (m.round !== prev.currentRound || m.status === 'finalizada') return m;
          const home = updatedClubs.find((c) => c.id === m.homeClubId);
          const away = updatedClubs.find((c) => c.id === m.awayClubId);
          if (!home || !away) return m;

          const res = simulateMatchMinuteStep(m, home, away, 1);

          if (
            res.homeStaminaDrain > 0 ||
            res.awayStaminaDrain > 0 ||
            res.homePlayerDrains ||
            res.awayPlayerDrains ||
            res.homeTacticUpdate ||
            res.awayTacticUpdate ||
            res.homeAutoSub ||
            res.awayAutoSub
          ) {
            const applySideUpdates = (
              c: Club,
              sideDrain: number,
              playerDrains: Record<string, number> | undefined,
              tacticUpdate: { formation: Formation; mentality: TacticalMentality } | undefined,
              autoSub: { slotIndex: number; outPlayerId: string; inPlayerId: string } | undefined
            ): Club => {
              let nextClub = c;
              if (sideDrain > 0 || playerDrains) {
                nextClub = {
                  ...nextClub,
                  squad: nextClub.squad.map((p) => {
                    if (!p.isStarter) return p;
                    const drain = playerDrains?.[p.id] ?? sideDrain;
                    return {
                      ...p,
                      stamina: Math.max(15, Math.round((p.stamina - drain) * 10) / 10),
                    };
                  }),
                };
              }
              if (tacticUpdate) {
                const built = buildLineupSlots(
                  nextClub.squad,
                  tacticUpdate.formation,
                  nextClub.lineupSlots
                );
                nextClub = {
                  ...nextClub,
                  formation: tacticUpdate.formation,
                  mentality: tacticUpdate.mentality,
                  squad: built.squad,
                  lineupSlots: built.lineupSlots,
                };
              }
              if (autoSub) {
                const nextSlots = nextClub.lineupSlots.map((s, idx) =>
                  idx === autoSub.slotIndex ? { ...s, playerId: autoSub.inPlayerId } : s
                );
                const starterIds = new Set(nextSlots.map((s) => s.playerId));
                nextClub = {
                  ...nextClub,
                  lineupSlots: nextSlots,
                  squad: nextClub.squad.map((p) => ({
                    ...p,
                    isStarter: starterIds.has(p.id),
                  })),
                };
              }
              return nextClub;
            };

            updatedClubs = updatedClubs.map((c) => {
              if (c.id === home.id) {
                return applySideUpdates(
                  c,
                  res.homeStaminaDrain,
                  res.homePlayerDrains,
                  res.homeTacticUpdate,
                  res.homeAutoSub
                );
              }
              if (c.id === away.id) {
                return applySideUpdates(
                  c,
                  res.awayStaminaDrain,
                  res.awayPlayerDrains,
                  res.awayTacticUpdate,
                  res.awayAutoSub
                );
              }
              return c;
            });
          }

          if (res.match.status === 'finalizada') {
            newlyFinished.push(res.match);
          }
          return res.match;
        });

        newlyFinished.forEach((fm) => {
          updatedClubs = applyFinishedMatchToLeague(updatedClubs, fm);
        });

        const allDone = updatedMatches
          .filter((m) => m.round === prev.currentRound)
          .every((m) => m.status === 'finalizada');

        if (allDone) {
          setLiveRoundRunning(false);
        }

        const isSeasonEnd = allDone && prev.currentRound >= prev.totalRounds;

        return {
          ...prev,
          clubs: updatedClubs,
          matches: updatedMatches,
          status: isSeasonEnd ? 'fim_temporada' : prev.status,
        };
      });
    }, 2500);

    return () => clearInterval(timer);
  }, [liveRoundRunning]);

  // Agendador Automático das Rodadas 2..N nos horários 12:00 e 22:00 (Horário de Brasília)
  useEffect(() => {
    if (league.status !== 'campeonato') return;
    if (isSupabaseConfigured && !isAdminUser) return;

    const checkSchedule = () => {
      const nowMs = Date.now();
      const roundMatches = league.matches.filter((m) => m.round === league.currentRound);
      const isRoundDone =
        roundMatches.length > 0 && roundMatches.every((m) => m.status === 'finalizada');

      if (isRoundDone && league.currentRound < league.totalRounds) {
        const nextRoundMatch = league.matches.find((m) => m.round === league.currentRound + 1);
        const nextTs = nextRoundMatch?.scheduledAt
          ? new Date(nextRoundMatch.scheduledAt).getTime()
          : NaN;
        if (!Number.isNaN(nextTs) && nowMs >= nextTs) {
          const nowStr = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const willOpenMidWindow =
            league.config.homeAndAway &&
            !league.midSeasonWindowDone &&
            league.currentRound === Math.floor(league.totalRounds / 2);

          setLeague((prev) => advanceToNextRoundState(prev, nowStr).nextState);
          if (!willOpenMidWindow) {
            setLiveRoundRunning(true);
          } else {
            setLiveRoundRunning(false);
          }
        }
        return;
      }

      if (!isRoundDone && !liveRoundRunning && league.currentRound >= 2) {
        const curTs = roundMatches[0]?.scheduledAt
          ? new Date(roundMatches[0].scheduledAt).getTime()
          : NaN;
        if (!Number.isNaN(curTs) && nowMs >= curTs) {
          setLiveRoundRunning(true);
        }
      }
    };

    checkSchedule();
    const schedTimer = setInterval(checkSchedule, 5000);
    return () => clearInterval(schedTimer);
  }, [
    league.status,
    league.currentRound,
    league.totalRounds,
    league.matches,
    liveRoundRunning,
    isAdminUser,
  ]);

  // Handlers de Liga & Autenticação por PIN
  const handleCreateLeague = (
    config: LeagueConfig,
    adminName: string,
    preClaimFriends: boolean,
    adminPin: string
  ) => {
    setLiveRoundRunning(false);
    setAuthError(null);
    const created = createLeagueFromConfig(config, adminName, preClaimFriends, adminPin);
    const admin =
      created.participants.find((p) => p.id === created.currentUserId) ?? created.participants[0];
    if (admin) {
      saveDeviceSession({ participantId: admin.id, name: admin.name, pin: admin.pin });
    }
    setLeague(created);
    setActiveTab('lobby');
  };

  const joinOrLoginOnLeagueState = (
    targetLeague: LeagueState,
    name: string,
    pin: string
  ): { ok: boolean; error?: string; nextState?: LeagueState; joinedNew?: LeagueState['participants'][number] } => {
    const cleanName = name.trim();
    const cleanPin = pin.trim();
    if (!cleanName || cleanPin.length < 4) {
      return { ok: false, error: 'Informe seu nome e um PIN de 4 dígitos.' };
    }

    const existing = targetLeague.participants.find(
      (p) => p.name.toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      if (existing.pin !== cleanPin) {
        return {
          ok: false,
          error: 'PIN incorreto! Digite o mesmo PIN de 4 dígitos cadastrado no seu primeiro acesso.',
        };
      }
      saveDeviceSession({ participantId: existing.id, name: existing.name, pin: existing.pin });
      return {
        ok: true,
        nextState: {
          ...targetLeague,
          currentUserId: existing.id,
          activeHumanClubId: existing.clubId ?? targetLeague.activeHumanClubId,
        },
      };
    }

    if (targetLeague.participants.length >= targetLeague.config.humanCount) {
      return {
        ok: false,
        error:
          'Todas as vagas desta sala já estão ocupadas. Entre com o mesmo nome e PIN do seu primeiro acesso.',
      };
    }

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newParticipant = {
      id: uid('user'),
      name: cleanName,
      pin: cleanPin,
      isAdmin: false,
      clubId: null,
      joinedAt: nowStr,
    };

    saveDeviceSession({
      participantId: newParticipant.id,
      name: newParticipant.name,
      pin: newParticipant.pin,
    });

    return {
      ok: true,
      joinedNew: newParticipant,
      nextState: {
        ...targetLeague,
        participants: [...targetLeague.participants, newParticipant],
        currentUserId: newParticipant.id,
        feed: [
          {
            id: uid('feed-join'),
            category: 'convite',
            actorName: cleanName,
            actorType: 'human',
            message: 'Entrou na liga com conta protegida por PIN.',
            timestamp: nowStr,
          },
          ...targetLeague.feed.slice(0, 24),
        ],
      },
    };
  };

  const handleJoinOrLoginParticipant = (name: string, pin: string) => {
    const res = joinOrLoginOnLeagueState(league, name, pin);
    if (!res.ok || !res.nextState) {
      setAuthError(res.error ?? 'Não foi possível entrar na liga.');
      return;
    }
    setAuthError(null);
    setLeague(res.nextState);
    if (res.joinedNew && isSupabaseConfigured) {
      dispatchLeagueAction(
        res.nextState.id,
        res.joinedNew.id,
        'join_participant',
        res.joinedNew as unknown as Record<string, unknown>
      );
    }
    setInviteModalOpen(false);
  };

  const handleJoinByInviteCode = async (inviteCode: string, name: string, pin: string) => {
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      setAuthError('Digite o Código da Sala enviado pelo Admin.');
      return;
    }

    let sourceLeague: LeagueState | null = null;
    if (cleanCode === league.inviteCode.toUpperCase()) {
      sourceLeague = league;
    } else {
      const remote = await loadLeagueByInviteCode(cleanCode);
      if (remote && isValidLeagueState(remote)) {
        sourceLeague = syncOfficialClubSquads(mergeMissingWorldStars(remote));
      }
    }

    if (!sourceLeague) {
      setAuthError(`Código da sala "${cleanCode}" inválido! Peça o código correto ao Admin.`);
      return;
    }

    const res = joinOrLoginOnLeagueState(sourceLeague, name, pin);
    if (!res.ok || !res.nextState) {
      setAuthError(res.error ?? 'Não foi possível entrar nesta sala.');
      return;
    }

    setAuthError(null);
    setLeague(res.nextState);
    if (res.joinedNew && isSupabaseConfigured) {
      await dispatchLeagueAction(
        res.nextState.id,
        res.joinedNew.id,
        'join_participant',
        res.joinedNew as unknown as Record<string, unknown>
      );
    }
    setInviteModalOpen(false);
  };

  const handleLogout = () => {
    clearDeviceSession();
    setLiveRoundRunning(false);
    setAuthError(null);
    setLoginModalMode('login');
    setLeague((prev) => ({
      ...prev,
      currentUserId: '',
    }));
    setInviteModalOpen(true);
  };

  const handleStartClubSelection = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLeague((prev) => {
      if (prev.participants.length < prev.config.humanCount) return prev;
      return {
        ...prev,
        status: 'escolha_clube',
        feed: [
          {
            id: uid('feed-pick'),
            category: 'admin',
            actorName: 'Admin',
            actorType: 'human',
            message: 'Todos os amigos conectados! Escolha de clubes liberada.',
            timestamp: nowStr,
          },
          ...prev.feed.slice(0, 24),
        ],
      };
    });
  };

  const handleClaimClub = async (clubId: string) => {
    const user = league.participants.find((p) => p.id === league.currentUserId);
    if (!user) return;
    const res = await claimClubAtomically(league.id, clubId, user.id, user.name);
    if (!res.ok) return;

    setLeague((prev) => applyClaimClubState(prev, user.id, clubId, true));
    if (isSupabaseConfigured && !user.isAdmin) {
      dispatchLeagueAction(league.id, user.id, 'claim_club', {
        participantId: user.id,
        clubId,
      });
    }
  };

  const handleConfirmClubsToWindow = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLeague((prev) => {
      const allPicked = prev.participants.every((p) => Boolean(p.clubId));
      if (!allPicked) return prev;

      const humanCount = prev.clubs.filter((c) => c.controller === 'human').length;
      const botCount = prev.clubs.length - humanCount;
      const firstHuman = prev.clubs.find((c) => c.controller === 'human') ?? prev.clubs[0];
      const windowHours = prev.config.transferRules.windowHours || 24;
      const windowEndsAt = new Date(Date.now() + windowHours * 3600 * 1000).toISOString();

      return {
        ...prev,
        status: 'janela_mercado',
        transferWindowOpen: true,
        transferWindowEndsAt: windowEndsAt,
        transferWindowLabel: `Janela Pré-Temporada (${windowHours}h)`,
        botPatienceMap: {},
        transferDisputes: [],
        activeHumanClubId:
          prev.participants.find((p) => p.id === prev.currentUserId)?.clubId ?? firstHuman.id,
        config: {
          ...prev.config,
          humanCount,
          botCount,
        },
        auditLogs: [
          {
            id: uid('audit'),
            timestamp: new Date().toLocaleString('pt-BR'),
            adminName: prev.participants.find((p) => p.isAdmin)?.name ?? 'Admin',
            action: 'Clubes Definidos & Janela FIFA Aberta',
            details: `${humanCount} Humanos + ${botCount} Bots. Janela de ${windowHours}h iniciada.`,
          },
          ...prev.auditLogs,
        ],
        feed: [
          {
            id: uid('feed-win'),
            category: 'mercado',
            actorName: 'Mercado FIFA',
            actorType: 'system',
            message: `Janela de ${windowHours}h aberta! Disputas por jogadores duram até 3h para amigos cobrirem.`,
            timestamp: nowStr,
          },
          ...prev.feed.slice(0, 24),
        ],
      };
    });
    setActiveTab('mercado');
  };

  const handleCloseWindowToMatches = () => {
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLeague((prev) => {
      const resolved = resolveExpiredOrAllDisputes(prev, true);
      const nextMatches =
        resolved.currentRound >= 2
          ? reanchorFutureRoundsSchedule(
              resolved.matches,
              resolved.currentRound,
              resolved.config.dailyScheduleTimes,
              Date.now()
            )
          : resolved.matches;
      return {
        ...resolved,
        status: 'campeonato',
        transferWindowOpen: false,
        transferWindowEndsAt: null,
        matches: nextMatches,
        feed: [
          {
            id: uid('feed-close-win'),
            category: 'admin',
            actorName: 'Admin',
            actorType: 'human',
            message: 'Janela de transferências encerrada! Disputas finalizadas e partidas prontas.',
            timestamp: nowStr,
          },
          ...resolved.feed.slice(0, 24),
        ],
      };
    });
    setActiveTab('campeonato');
  };

  const handleStartLiveRound = () => {
    if (isSupabaseConfigured && !isAdminUser) return;
    if (league.status === 'janela_mercado' || league.currentRound === 1) {
      setLeague((prev) => {
        const base =
          prev.status === 'janela_mercado' ? resolveExpiredOrAllDisputes(prev, true) : prev;
        const anchoredMatches =
          base.currentRound === 1
            ? reanchorFutureRoundsSchedule(
                base.matches,
                2,
                base.config.dailyScheduleTimes,
                Date.now()
              )
            : base.matches;
        return {
          ...base,
          status: 'campeonato',
          transferWindowOpen: false,
          transferWindowEndsAt: null,
          matches: anchoredMatches,
        };
      });
    }
    setLiveRoundRunning(true);
  };

  const handlePreStartChangeHumanCount = (newHumanCount: number) => {
    setLeague((prev) => {
      if (prev.status !== 'lobby') return prev;
      const minHumans = Math.max(1, prev.participants.length);
      const safeHumans = Math.max(minHumans, Math.min(prev.config.totalClubs, newHumanCount));
      const safeBots = prev.config.totalClubs - safeHumans;
      const codeSuffix = prev.inviteCode.split('-').pop() ?? '4821';
      const newCode = `LIGA-${safeHumans}H${safeBots}B-${codeSuffix}`;
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

      return {
        ...prev,
        inviteCode: newCode,
        inviteLink: `${origin}/?invite=${newCode}`,
        config: {
          ...prev.config,
          humanCount: safeHumans,
          botCount: safeBots,
        },
      };
    });
  };

  const handleUpdateBotConfig = (
    clubId: string,
    difficulty: BotDifficulty,
    personality: ClubBotPersonality
  ) => {
    setLeague((prev) => ({
      ...prev,
      clubs: prev.clubs.map((c) =>
        c.id === clubId ? { ...c, botDifficulty: difficulty, botPersonality: personality } : c
      ),
    }));
  };

  const handleBuyFreeAgent = (clubId: string, playerId: string) => {
    const player = league.freeAgents.find((p) => p.id === playerId);
    if (!player) return;
    handleAttemptFifaBotNegotiation(
      clubId,
      playerId,
      'livre',
      undefined,
      player.marketValue,
      player.monthlySalary ?? calcMonthlySalary(player.overall)
    );
  };

  const handleAttemptFifaBotNegotiation = (
    buyerClubId: string,
    targetPlayerId: string,
    originType: 'europa' | 'bot' | 'livre',
    sellerClubId: string | undefined,
    offerCash: number,
    proposedMonthlySalary: number,
    swapPlayerId?: string
  ) => {
    const payload = {
      buyerClubId,
      targetPlayerId,
      originType,
      sellerClubId,
      offerCash,
      proposedMonthlySalary,
      swapPlayerId,
    };
    setLeague((prev) => applyMarketBidState(prev, payload));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'submit_market_bid', payload);
    }
  };

  const handleSendHumanOffer = (
    fromClubId: string,
    toClubId: string,
    targetPlayerId: string,
    offerCash: number,
    proposedMonthlySalary?: number,
    swapPlayerId?: string
  ) => {
    const payload = {
      fromClubId,
      toClubId,
      targetPlayerId,
      offerCash,
      proposedMonthlySalary,
      swapPlayerId,
    };
    setLeague((prev) => applySendHumanOfferState(prev, payload));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'send_human_offer', payload);
    }
  };

  const handleRespondHumanOffer = (offerId: string, decision: 'aceita' | 'recusada') => {
    setLeague((prev) => applyRespondHumanOfferState(prev, offerId, decision));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'respond_human_offer', {
        offerId,
        decision,
      });
    }
  };

  const handleUpdateTactics = (
    clubId: string,
    formation: Formation,
    mentality: TacticalMentality
  ) => {
    setLeague((prev) => applyUpdateTacticsState(prev, clubId, formation, mentality));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'update_tactics', {
        clubId,
        formation,
        mentality,
      });
    }
  };

  const handleAssignSlotPlayer = (clubId: string, slotIndex: number, playerId: string) => {
    setLeague((prev) => applyAssignSlotState(prev, clubId, slotIndex, playerId));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'assign_slot', {
        clubId,
        slotIndex,
        playerId,
      });
    }
  };

  const handleAutoPickLineup = (clubId: string) => {
    setLeague((prev) => applyAutoPickState(prev, clubId));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'auto_pick', { clubId });
    }
  };

  const handleToggleListForSale = (clubId: string, playerId: string) => {
    setLeague((prev) => applyToggleSaleState(prev, clubId, playerId));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'toggle_sale', { clubId, playerId });
    }
  };

  const handleMakeLiveSubstitution = (
    matchId: string,
    clubId: string,
    slotIndex: number,
    subInPlayerId: string
  ) => {
    setLeague((prev) => applyLiveSubState(prev, matchId, clubId, slotIndex, subInPlayerId));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'live_sub', {
        matchId,
        clubId,
        slotIndex,
        subInPlayerId,
      });
    }
  };

  const handleAdvanceRound = () => {
    const willOpenMidWindow =
      league.config.homeAndAway &&
      !league.midSeasonWindowDone &&
      league.currentRound === Math.floor(league.totalRounds / 2);

    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setLeague((prev) => advanceToNextRoundState(prev, nowStr).nextState);

    if (willOpenMidWindow) {
      setActiveTab('mercado');
    }
  };

  const handleStartNextSeason = () => {
    setLiveRoundRunning(false);
    setLeague((prev) =>
      applySeasonEndAndPrepareNext(prev, (clubs, config) => generateSchedule(clubs, config))
    );
    setActiveTab('mercado');
  };

  return (
    <div className="min-h-[100dvh] stadium-bg text-slate-100 flex justify-center">
      {/* Container Mobile-First (Smartphone iOS/Android) */}
      <div className="w-full max-w-[480px] min-h-[100dvh] flex flex-col sm:border-x sm:border-white/[0.06] bg-[#06090E]/75 relative">
        {/* Header Broadcast Alinhado (64px) */}
        <header className="sticky top-0 z-30 pt-safe backdrop-blur-xl bg-[#070B12]/94 border-b border-white/[0.08] shadow-lg shadow-black/40">
          <div className="px-3.5 h-16 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrasileiraoTrophyLogo size="sm" />
              <div className="min-w-0 flex flex-col justify-center">
                <div className="font-display text-lg font-extrabold text-white uppercase tracking-wide truncate leading-none">
                  {league.config.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold leading-none whitespace-nowrap">
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/25 font-bold">
                    T{league.season}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 font-bold">
                    SÉRIE A
                  </span>
                  <span className={isSupabaseConfigured ? 'text-emerald-400' : 'text-sky-400'}>
                    {isSupabaseConfigured ? '• Online' : '• Local'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Identidade do Técnico & Clube */}
              <div
                className="h-9 flex items-center gap-1.5 bg-[#0D131E] border rounded-xl px-2.5 max-w-[132px]"
                style={{
                  borderColor: currentUser?.clubId
                    ? `${activeHumanClub.primaryColor}70`
                    : 'rgba(255,255,255,0.12)',
                }}
              >
                {currentUser?.clubId && <ClubCrest club={activeHumanClub} size="xs" />}
                <span className="text-[11px] font-bold text-white truncate">
                  {currentUser ? currentUser.name.split(' ')[0] : 'Convidado'}
                  {currentUser?.clubId ? ` • ${activeHumanClub.shortName}` : ''}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setLoginModalMode('login');
                  setInviteModalOpen(true);
                }}
                className="w-9 h-9 rounded-xl bg-[#0D131E] border border-white/12 hover:border-emerald-400/60 text-slate-200 flex items-center justify-center cursor-pointer transition"
                title="Login / Entrar com Código"
                aria-label="Login e Central de Carreira"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="h-9 px-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/25 text-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                  title="Sair da conta (exigirá PIN para voltar)"
                  aria-label="Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </button>
              )}

              {isAdminUser && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setLoginModalMode('new_career');
                    setInviteModalOpen(true);
                  }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-400 hover:brightness-110 text-slate-950 flex items-center justify-center cursor-pointer shadow-md shadow-emerald-500/20 transition"
                  title="Nova Carreira"
                  aria-label="Nova Carreira"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 px-3.5 pt-4 pb-24 overflow-x-hidden">
          {activeTab === 'criar' && isAdminUser && (
            <LeagueCreatorView
              hasActiveLeague
              onCancel={() => setActiveTab('lobby')}
              onCreateLeague={handleCreateLeague}
            />
          )}

          {activeTab === 'lobby' && (
            <LobbyAndAdminView
              league={league}
              onOpenLoginModal={(mode = 'login') => {
                setAuthError(null);
                setLoginModalMode(isAdminUser ? mode : 'login');
                setInviteModalOpen(true);
              }}
              onStartClubSelection={handleStartClubSelection}
              onClaimClub={handleClaimClub}
              onConfirmClubsToWindow={handleConfirmClubsToWindow}
              onPreStartChangeHumanCount={handlePreStartChangeHumanCount}
              onUpdateBotConfig={handleUpdateBotConfig}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'mercado' && (
            <TransferMarketView
              league={league}
              onBuyFreeAgent={handleBuyFreeAgent}
              onAttemptFifaBotNegotiation={handleAttemptFifaBotNegotiation}
              onSendHumanOffer={handleSendHumanOffer}
              onRespondHumanOffer={handleRespondHumanOffer}
              onCloseWindowToMatches={handleCloseWindowToMatches}
            />
          )}

          {activeTab === 'clube' && (
            <ClubManagementView
              league={league}
              onUpdateTactics={handleUpdateTactics}
              onAssignSlotPlayer={handleAssignSlotPlayer}
              onAutoPickLineup={handleAutoPickLineup}
              onToggleListForSale={handleToggleListForSale}
              onConfirmSquadAndStartMatches={() => setActiveTab('campeonato')}
            />
          )}

          {activeTab === 'campeonato' && (
            <CompetitionView
              league={league}
              liveRoundRunning={liveRoundRunning}
              onStartLiveRound={handleStartLiveRound}
              onAdvanceRound={handleAdvanceRound}
              onUpdateTactics={handleUpdateTactics}
              onAssignSlotPlayer={handleAssignSlotPlayer}
              onMakeLiveSubstitution={handleMakeLiveSubstitution}
              onStartNextSeason={handleStartNextSeason}
            />
          )}
        </main>

        {/* Tela de Login & Central de Carreira */}
        {inviteModalOpen && (
          <CareerLoginModal
            league={league}
            isAdminUser={isAdminUser}
            authError={authError}
            canDismiss={Boolean(currentUser)}
            initialMode={isAdminUser ? loginModalMode : 'login'}
            onClose={() => {
              setAuthError(null);
              setInviteModalOpen(false);
            }}
            onJoinOrLogin={handleJoinOrLoginParticipant}
            onJoinByInviteCode={handleJoinByInviteCode}
            onStartFreshCareer={(freshConfig, adminName, adminPin) => {
              if (!isAdminUser) return;
              handleCreateLeague(freshConfig, adminName, false, adminPin);
              setInviteModalOpen(false);
            }}
            onOpenAdvancedCreator={() => {
              if (!isAdminUser) return;
              setAuthError(null);
              setInviteModalOpen(false);
              setActiveTab('criar');
            }}
          />
        )}

        {/* Bottom Tab Bar Fixa (4 abas sem Leilão) */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-30 pb-safe backdrop-blur-xl bg-[#06090E]/95 border-t border-white/[0.08]">
          <div className="grid grid-cols-4 px-1 pt-1.5">
            {(
              [
                { id: 'lobby', label: 'Início', icon: Home },
                { id: 'mercado', label: 'Mercado', icon: ShoppingBag },
                { id: 'clube', label: 'Time', icon: Shield },
                { id: 'campeonato', label: 'Jogos', icon: Trophy },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition cursor-pointer relative ${
                    active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.3]' : 'stroke-[1.8]'}`} />
                  <span>{tab.label}</span>
                  {tab.id === 'mercado' && league.transferWindowOpen && incomingPendingApprovals > 0 && (
                    <span className="absolute top-0.5 right-4 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {incomingPendingApprovals}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

export default App;
