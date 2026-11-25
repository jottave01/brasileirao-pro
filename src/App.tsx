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
  Club,
  ClubTactics,
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
  isFixedScheduleExpired,
  isWithinFixedScheduleWindow,
  reanchorFutureRoundsSchedule,
} from './engine/leagueGenerator';
import {
  calcAgentMinimumSalary,
  calcImmediateInterestSalary,
  calcInitialContractYears,
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
  appendFinanceLedger,
  applySeasonEndAndPrepareNext,
  buildLineupSlots,
  calcMonthlyPayrollMillions,
  calculateMatchBoxOffice,
  creditClubRevenue,
  evaluateFifaBotOffer,
  FORMATION_LAYOUT,
  generatePlayerAttributes,
  getClubTactics,
  getPositionFit,
  isClubInFinancialDebt,
  normalizePosture,
  PAYROLL_INTERVAL_ROUNDS,
  processBotContractExpirations,
  resolveTransferDispute,
  runBotMarketCycle,
  simulateMatchMinuteStep,
} from './engine/botAI';
import {
  claimClubAtomically,
  clearDeviceSession,
  deleteCareerById,
  dispatchLeagueAction,
  isSupabaseConfigured,
  LeagueRemoteAction,
  listAllCareers,
  loadAdminAuthSession,
  loadDeviceSession,
  loadLeagueById,
  loadLeagueByInviteCode,
  loadLocalLeagueState,
  saveAdminAuthSession,
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

const ADMIN_EMAIL = 'brasileiraopro@gmail.com';
const ADMIN_PASSWORD = 'C@rreira37524';

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

function applyFinishedMatchToLeague(
  clubs: Club[],
  finishedMatch: Match,
  totalRounds: number,
  allMatches: Match[]
): {
  clubs: Club[];
  finishedMatch: Match;
  feedItems: LeagueState['feed'];
} {
  const homeClub = clubs.find((c) => c.id === finishedMatch.homeClubId);
  const awayClub = clubs.find((c) => c.id === finishedMatch.awayClubId);

  const boxOffice =
    homeClub && awayClub
      ? calculateMatchBoxOffice({
          homeClub,
          awayClub,
          allClubs: clubs,
          round: finishedMatch.round,
          totalRounds,
          finishedMatches: allMatches,
        })
      : undefined;

  const updatedMatch: Match = boxOffice
    ? { ...finishedMatch, boxOfficeReport: boxOffice }
    : finishedMatch;

  const homeWin = finishedMatch.homeGoals > finishedMatch.awayGoals;
  const draw = finishedMatch.homeGoals === finishedMatch.awayGoals;
  const feedItems: LeagueState['feed'] = [];
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const goalCountsById: Record<string, number> = {};
  const goalCountsByName: Record<string, number> = {};
  const assistCountsById: Record<string, number> = {};
  const assistCountsByName: Record<string, number> = {};
  finishedMatch.events.forEach((ev) => {
    if (ev.type === 'gol') {
      if (ev.playerId) {
        goalCountsById[ev.playerId] = (goalCountsById[ev.playerId] ?? 0) + 1;
      } else {
        goalCountsByName[`${ev.clubId}:${ev.playerName}`] =
          (goalCountsByName[`${ev.clubId}:${ev.playerName}`] ?? 0) + 1;
      }
      if (ev.assistPlayerId) {
        assistCountsById[ev.assistPlayerId] = (assistCountsById[ev.assistPlayerId] ?? 0) + 1;
      } else if (ev.assistName) {
        assistCountsByName[`${ev.clubId}:${ev.assistName}`] =
          (assistCountsByName[`${ev.clubId}:${ev.assistName}`] ?? 0) + 1;
      }
    }
  });

  const updatedClubs = clubs.map((club) => {
    if (club.id !== finishedMatch.homeClubId && club.id !== finishedMatch.awayClubId) {
      return club;
    }

    const isHome = club.id === finishedMatch.homeClubId;
    const oppShort = isHome ? awayClub?.shortName ?? 'ADV' : homeClub?.shortName ?? 'ADV';
    const gf = isHome ? finishedMatch.homeGoals : finishedMatch.awayGoals;
    const ga = isHome ? finishedMatch.awayGoals : finishedMatch.homeGoals;
    const won = isHome ? homeWin : !homeWin && !draw;
    const lost = !won && !draw;
    const pts = won ? 3 : draw ? 1 : 0;

    const resultQuota = won ? 2.4 : draw ? 1.2 : 0.5;
    const boxOfficeRev = isHome && boxOffice ? boxOffice.revenue : 0;
    const totalMatchRevenue = Math.round((boxOfficeRev + resultQuota) * 100) / 100;

    const matchYellowIds = new Set(
      isHome
        ? finishedMatch.simState?.homeYellowCardedIds ?? []
        : finishedMatch.simState?.awayYellowCardedIds ?? []
    );
    const matchRedIds = new Set(
      isHome
        ? finishedMatch.simState?.homeRedCardedIds ?? []
        : finishedMatch.simState?.awayRedCardedIds ?? []
    );

    const suspendedNowNames: string[] = [];

    const updatedSquad = club.squad.map((p) => {
      const scored =
        (goalCountsById[p.id] ?? 0) + (goalCountsByName[`${club.id}:${p.knownName}`] ?? 0);
      const assisted =
        (assistCountsById[p.id] ?? 0) + (assistCountsByName[`${club.id}:${p.knownName}`] ?? 0);

      // Jogador que estava suspenso cumpriu 1 partida de suspensão nesta rodada
      let nextSusp = (p.suspendedMatches ?? 0) > 0 ? Math.max(0, (p.suspendedMatches ?? 0) - 1) : 0;
      let nextYellows = p.yellowCards ?? 0;
      let nextReds = p.redCards ?? 0;

      if (matchRedIds.has(p.id)) {
        nextReds += 1;
        nextSusp += 1;
        suspendedNowNames.push(`${p.knownName} (Vermelho)`);
      } else if (matchYellowIds.has(p.id)) {
        nextYellows += 1;
        if (nextYellows % 3 === 0) {
          nextSusp += 1;
          suspendedNowNames.push(`${p.knownName} (3º Amarelo)`);
        }
      }

      if (
        scored === 0 &&
        assisted === 0 &&
        nextSusp === (p.suspendedMatches ?? 0) &&
        nextYellows === (p.yellowCards ?? 0) &&
        nextReds === (p.redCards ?? 0)
      ) {
        return p;
      }

      return {
        ...p,
        goals: p.goals + scored,
        assists: p.assists + assisted,
        yellowCards: nextYellows,
        redCards: nextReds,
        suspendedMatches: nextSusp,
      };
    });

    if (club.controller === 'human' && suspendedNowNames.length > 0) {
      feedItems.push({
        id: uid('feed-susp'),
        category: 'admin',
        actorName: club.shortName,
        actorType: 'human',
        message: `Suspensão automática p/ próxima rodada: ${suspendedNowNames.join(', ')}. Ajuste a escalação em Meu Clube.`,
        timestamp: nowStr,
      });
    }

    const hasSuspendedStarter = updatedSquad.some(
      (p) => p.isStarter && (p.suspendedMatches ?? 0) > 0
    );
    const botLineupRebuilt =
      club.controller === 'bot' && hasSuspendedStarter
        ? buildLineupSlots(updatedSquad, club.formation, club.lineupSlots)
        : null;
    const finalSquad = botLineupRebuilt ? botLineupRebuilt.squad : updatedSquad;
    const finalSlots = botLineupRebuilt ? botLineupRebuilt.lineupSlots : club.lineupSlots;

    const curWageBill = calcMonthlyPayrollMillions({ squad: finalSquad, tier: club.tier });
    let nextClub: Club = {
      ...club,
      squad: finalSquad,
      lineupSlots: finalSlots,
      finances: {
        ...club.finances,
        wageBill: curWageBill,
      },
    };

    if (boxOfficeRev > 0 && boxOffice) {
      const finAfterBox = creditClubRevenue(nextClub, boxOfficeRev, {
        round: finishedMatch.round,
        type: 'bilheteria',
        label: `Bilheteria vs ${oppShort} (${boxOffice.occupancyPct}%)`,
      });
      nextClub = { ...nextClub, finances: finAfterBox };
    }

    const finAfterQuota = creditClubRevenue(nextClub, resultQuota, {
      round: finishedMatch.round,
      type: 'cota_jogo',
      label: `Cota R${finishedMatch.round} (${won ? 'Vitória' : draw ? 'Empate' : 'Derrota'})`,
    });
    nextClub = {
      ...nextClub,
      finances: {
        ...finAfterQuota,
        boxOfficeIncome: Math.round(((finAfterQuota.boxOfficeIncome ?? 0) + boxOfficeRev) * 100) / 100,
        matchIncome: Math.round(((finAfterQuota.matchIncome ?? 0) + totalMatchRevenue) * 100) / 100,
      },
    };

    // Cobrança mensal da folha salarial a cada PAYROLL_INTERVAL_ROUNDS (4 rodadas)
    const shouldChargePayroll =
      finishedMatch.round % PAYROLL_INTERVAL_ROUNDS === 0 &&
      finishedMatch.round > (nextClub.finances.lastPayrollRound ?? 0);

    if (shouldChargePayroll) {
      let budget = nextClub.finances.budget ?? 0;
      let wageBudget = Math.round(((nextClub.finances.wageBudget ?? 0) - curWageBill) * 100) / 100;
      let pulledFromTransfer = 0;

      if (wageBudget < 0 && budget > 0) {
        pulledFromTransfer = Math.min(budget, Math.abs(wageBudget));
        budget = Math.round((budget - pulledFromTransfer) * 100) / 100;
        wageBudget = Math.round((wageBudget + pulledFromTransfer) * 100) / 100;
      }

      const ledgerLabel =
        wageBudget < 0
          ? `Folha Mensal R${finishedMatch.round} (DÉFICIT)`
          : pulledFromTransfer > 0
          ? `Folha Mensal R${finishedMatch.round} (+Caixa)`
          : `Folha Mensal (R${finishedMatch.round})`;

      nextClub = {
        ...nextClub,
        finances: {
          ...nextClub.finances,
          budget,
          wageBudget,
          totalWagesPaid: Math.round(((nextClub.finances.totalWagesPaid ?? 0) + curWageBill) * 100) / 100,
          lastPayrollRound: finishedMatch.round,
          financeLedger: appendFinanceLedger(nextClub.finances.financeLedger, {
            round: finishedMatch.round,
            type: 'folha_mensal',
            label: ledgerLabel,
            amount: -curWageBill,
            targetFund: pulledFromTransfer > 0 ? 'misto' : 'salarios',
          }),
        },
      };

      if (club.controller === 'human') {
        feedItems.push({
          id: uid('feed-payroll'),
          category: 'admin',
          actorName: club.shortName,
          actorType: 'human',
          message:
            wageBudget < 0
              ? `Folha salarial de ${formatMillionsBRL(curWageBill)} venceu (R${finishedMatch.round}) e o clube entrou em DÉFICIT de ${formatMillionsBRL(Math.abs(wageBudget))}! Contratações bloqueadas até regularizar.`
              : `Folha salarial mensal debitada (R${finishedMatch.round}): ${formatMillionsBRL(curWageBill)}.${
                  pulledFromTransfer > 0
                    ? ` (${formatMillionsBRL(pulledFromTransfer)} complementado do Caixa de Transferências).`
                    : ''
                }`,
          timestamp: nowStr,
        });
      }
    }

    return {
      ...nextClub,
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

  return {
    clubs: updatedClubs,
    finishedMatch: updatedMatch,
    feedItems,
  };
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

function migrateLegacyPlayer(
  player: Player,
  index = 0,
  clubTier?: number
): { player: Player; changed: boolean } {
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

  const nextSalary = player.monthlySalary ?? calcMonthlySalary(player.overall, clubTier);
  if (player.monthlySalary === undefined) {
    changed = true;
  }

  const isFreeAgent =
    player.currentClubName === 'Livre' || player.currentClubName === 'Sem Clube';
  const nextContractYears =
    player.contractYears ?? (isFreeAgent ? 0 : calcInitialContractYears(player.age, index));
  if (player.contractYears === undefined) {
    changed = true;
  }

  const nextWage = Math.max(0.1, Math.round((nextSalary / 1000) * 10) / 10);

  const hasValidAttributes = Boolean(
    player.attributes &&
      typeof player.attributes.passe === 'number' &&
      typeof player.attributes.reflexos === 'number'
  );
  const nextAttributes = hasValidAttributes
    ? player.attributes
    : generatePlayerAttributes({
        name: player.name,
        position: nextPos,
        secondaryPositions: nextSec,
        overall: player.overall,
        age: player.age,
        ambidextrous: nextAmbi,
      });

  if (!hasValidAttributes) {
    changed = true;
  }

  if (!changed) return { player, changed: false };

  return {
    player: {
      ...player,
      position: nextPos,
      secondaryPositions: nextSec,
      ambidextrous: nextAmbi,
      attributes: nextAttributes,
      yellowCards: player.yellowCards ?? 0,
      redCards: player.redCards ?? 0,
      suspendedMatches: player.suspendedMatches ?? 0,
      monthlySalary: nextSalary,
      wage: nextWage,
      contractYears: nextContractYears,
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
    const res = migrateLegacyPlayer(p, idx, 1);
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
      const mig = migrateLegacyPlayer(current, pIdx, template?.tier);
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

    const normalizedPosture = normalizePosture(club.mentality);
    const resolvedTactics = getClubTactics(club);
    const needsTacticsMigration =
      !club.tactics ||
      !club.tactics.playStyle ||
      club.mentality !== normalizedPosture;

    const needsFinanceMigration =
      needsTacticsMigration ||
      club.stadiumCapacity === undefined ||
      club.finances.wageBudget === undefined ||
      club.finances.revenueTransferPct === undefined ||
      club.finances.lastPayrollRound === undefined;

    if (additions.length === 0 && !squadChanged && !needsFinanceMigration) return club;

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
    const nextWageBill = calcMonthlyPayrollMillions({ squad: built.squad, tier: club.tier });
    return {
      ...club,
      mentality: normalizedPosture,
      tactics: resolvedTactics,
      stadiumCapacity: club.stadiumCapacity ?? template?.stadiumCapacity ?? 35000,
      squad: built.squad,
      lineupSlots: built.lineupSlots,
      finances: {
        ...club.finances,
        wageBill: nextWageBill,
        wageBudget: club.finances.wageBudget ?? Math.round(nextWageBill * 5 * 100) / 100,
        revenueTransferPct: club.finances.revenueTransferPct ?? 45,
        boxOfficeIncome: club.finances.boxOfficeIncome ?? 0,
        totalWagesPaid: club.finances.totalWagesPaid ?? 0,
        lastPayrollRound: club.finances.lastPayrollRound ?? 0,
        financeLedger: club.finances.financeLedger ?? [],
      },
    };
  });

  const validTimeRe = /^\d{2}:\d{2}$/;
  const hasValidSchedule =
    Array.isArray(state.config.dailyScheduleTimes) &&
    state.config.dailyScheduleTimes.length === 2 &&
    validTimeRe.test(state.config.dailyScheduleTimes[0]) &&
    validTimeRe.test(state.config.dailyScheduleTimes[1]);

  const effectiveTimes: [string, string] = hasValidSchedule
    ? state.config.dailyScheduleTimes
    : ['12:00', '22:00'];

  const curRoundMatches = state.matches.filter((m) => m.round === state.currentRound);
  const curRoundAllScheduled =
    curRoundMatches.length > 0 && curRoundMatches.every((m) => m.status === 'agendada');
  const needsExpiredReanchor =
    state.status === 'campeonato' &&
    curRoundAllScheduled &&
    isFixedScheduleExpired(curRoundMatches[0]?.scheduledAt);

  const nextMatches = needsExpiredReanchor
    ? reanchorFutureRoundsSchedule(state.matches, state.currentRound, effectiveTimes, Date.now())
    : state.matches;

  if (!changed && hasValidSchedule && !needsExpiredReanchor && state.transferDisputes) return state;
  return {
    ...state,
    config: hasValidSchedule
      ? state.config
      : {
          ...state.config,
          dailyScheduleTimes: effectiveTimes,
        },
    clubs: nextClubs,
    matches: nextMatches,
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
  if (!buyer || isClubInFinancialDebt(buyer) || buyer.finances.budget < params.offerCash) return prev;
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
    calcMonthlySalary(targetPlayer.overall, buyer.tier);
  const finalWage = Math.max(0.1, Math.round((finalMonthlySalary / 1000) * 10) / 10);

  const signedPlayer: Player = {
    ...targetPlayer,
    isStarter: false,
    listedForSale: false,
    isWorldMarket: false,
    currentClubName: buyer.shortName,
    monthlySalary: finalMonthlySalary,
    wage: finalWage,
    contractYears: 3,
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
      const nextWageBill = calcMonthlyPayrollMillions({ squad: built.squad, tier: c.tier });
      return {
        ...c,
        squad: built.squad,
        lineupSlots: built.lineupSlots,
        dealsThisRound: c.dealsThisRound + 1,
        finances: {
          ...c.finances,
          budget: Math.max(0, Math.round((c.finances.budget - params.offerCash) * 100) / 100),
          transferSpent: Math.round((c.finances.transferSpent + params.offerCash) * 100) / 100,
          wageBill: nextWageBill,
          financeLedger:
            params.offerCash > 0
              ? appendFinanceLedger(c.finances.financeLedger, {
                  round: prev.currentRound,
                  type: 'transferencia',
                  label: `Compra: ${targetPlayer.knownName}`,
                  amount: -params.offerCash,
                  targetFund: 'transferencias',
                })
              : c.finances.financeLedger,
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
          contractYears: Math.max(2, swapPlayer.contractYears ?? 2),
        });
      }
      const built = buildLineupSlots(remaining, c.formation, c.lineupSlots);
      const nextWageBill = calcMonthlyPayrollMillions({ squad: built.squad, tier: c.tier });
      const creditedFinances =
        params.offerCash > 0
          ? creditClubRevenue(
              { ...c, squad: built.squad, finances: { ...c.finances, wageBill: nextWageBill } },
              params.offerCash,
              {
                round: prev.currentRound,
                type: 'transferencia',
                label: `Venda: ${targetPlayer.knownName}`,
              }
            )
          : c.finances;
      return {
        ...c,
        squad: built.squad,
        lineupSlots: built.lineupSlots,
        finances: {
          ...creditedFinances,
          transferIncome: Math.round((c.finances.transferIncome + params.offerCash) * 100) / 100,
          wageBill: nextWageBill,
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

function remapLineupSlotsForFormation(club: Club, formation: Formation): Club {
  const currentStarters = (club.lineupSlots ?? [])
    .map((s) => club.squad.find((p) => p.id === s.playerId))
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
      const exact = currentStarters.find((p) => p.position === spec.role && !usedIds.has(p.id));
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
            getPositionFit(b, spec.role).effectiveOvr - getPositionFit(a, spec.role).effectiveOvr
        )[0];
      if (best) {
        usedIds.add(best.id);
        nextSlots[idx].playerId = best.id;
      }
    });

    const starterIds = new Set(nextSlots.map((s) => s.playerId));
    return {
      ...club,
      formation,
      lineupSlots: nextSlots,
      squad: club.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
    };
  }

  const built = buildLineupSlots(club.squad, formation, club.lineupSlots);
  return {
    ...club,
    formation,
    squad: built.squad,
    lineupSlots: built.lineupSlots,
  };
}

function applyUpdateTacticsState(
  prev: LeagueState,
  clubId: string,
  formation: Formation,
  mentality: TacticalMentality,
  tactics?: ClubTactics
): LeagueState {
  const normalizedPosture = normalizePosture(mentality);
  return {
    ...prev,
    matches: markMatchManualControl(prev.matches, prev.currentRound, clubId),
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;
      const remapped = remapLineupSlotsForFormation(c, formation);
      return {
        ...remapped,
        mentality: normalizedPosture,
        tactics: tactics ?? c.tactics ?? getClubTactics({ ...c, mentality: normalizedPosture }),
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
          wageBill: calcMonthlyPayrollMillions({ squad: nextSquad, tier: c.tier }),
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

function applyRenewContractState(
  prev: LeagueState,
  clubId: string,
  playerId: string
): LeagueState {
  const club = prev.clubs.find((c) => c.id === clubId);
  if (!club || isClubInFinancialDebt(club)) return prev;
  const target = club.squad.find((p) => p.id === playerId);
  if (!target) return prev;

  const currentYears = target.contractYears ?? 1;
  if (currentYears > 1) return prev;

  const renewedYears = Math.min(4, Math.max(3, currentYears + 3));
  const renewedSalary = Math.max(
    target.monthlySalary ?? calcMonthlySalary(target.overall, club.tier),
    calcAgentMinimumSalary(target, club)
  );
  const renewedWage = Math.max(0.1, Math.round((renewedSalary / 1000) * 10) / 10);
  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    ...prev,
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;
      const nextSquad = c.squad.map((p) =>
        p.id === playerId
          ? {
              ...p,
              contractYears: renewedYears,
              monthlySalary: renewedSalary,
              wage: renewedWage,
            }
          : p
      );
      return {
        ...c,
        squad: nextSquad,
        finances: {
          ...c.finances,
          wageBill: calcMonthlyPayrollMillions({ squad: nextSquad, tier: c.tier }),
        },
      };
    }),
    feed: [
      {
        id: uid('feed-renew'),
        category: 'mercado',
        actorName: club.shortName,
        actorType: club.controller,
        message: `Renovou o contrato de ${target.knownName} para ${renewedYears} anos (${formatMonthlySalary(
          renewedSalary
        )}).`,
        timestamp: nowStr,
      },
      ...prev.feed.slice(0, 24),
    ],
  };
}

function applyReallocateBudgetState(
  prev: LeagueState,
  clubId: string,
  direction: 'to_wage' | 'to_transfer',
  amountMillions: number
): LeagueState {
  const rawMove = Math.round(Math.max(0, amountMillions) * 100) / 100;
  if (rawMove <= 0) return prev;

  return {
    ...prev,
    clubs: prev.clubs.map((c) => {
      if (c.id !== clubId) return c;
      const curBudget = c.finances.budget ?? 0;
      const curWageBudget = c.finances.wageBudget ?? 0;

      if (direction === 'to_wage') {
        const move = Math.min(rawMove, Math.max(0, curBudget));
        if (move <= 0) return c;
        return {
          ...c,
          finances: {
            ...c.finances,
            budget: Math.round((curBudget - move) * 100) / 100,
            wageBudget: Math.round((curWageBudget + move) * 100) / 100,
            financeLedger: appendFinanceLedger(c.finances.financeLedger, {
              round: prev.currentRound,
              type: 'realocacao',
              label: 'Caixa → Fundo Salarial',
              amount: move,
              targetFund: 'salarios',
            }),
          },
        };
      }

      if (curWageBudget <= 0) return c;
      const move = Math.min(rawMove, curWageBudget);
      if (move <= 0) return c;
      return {
        ...c,
        finances: {
          ...c.finances,
          budget: Math.round((curBudget + move) * 100) / 100,
          wageBudget: Math.round((curWageBudget - move) * 100) / 100,
          financeLedger: appendFinanceLedger(c.finances.financeLedger, {
            round: prev.currentRound,
            type: 'realocacao',
            label: 'Fundo Salarial → Caixa Transf.',
            amount: move,
            targetFund: 'transferencias',
          }),
        },
      };
    }),
  };
}

function applySetRevenueSplitState(
  prev: LeagueState,
  clubId: string,
  transferPct: number
): LeagueState {
  const clamped = Math.max(0, Math.min(100, Math.round(transferPct)));
  return {
    ...prev,
    clubs: prev.clubs.map((c) =>
      c.id === clubId
        ? {
            ...c,
            finances: {
              ...c.finances,
              revenueTransferPct: clamped,
            },
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

  const subbedOutIds = isHome ? targetMatch.homeSubbedOutIds : targetMatch.awaySubbedOutIds;
  const redCardedIds = isHome
    ? targetMatch.simState?.homeRedCardedIds ?? []
    : targetMatch.simState?.awayRedCardedIds ?? [];

  const outPlayerId = targetClub.lineupSlots[slotIndex]?.playerId;
  const outPlayer = targetClub.squad.find((p) => p.id === outPlayerId);
  const inPlayer = targetClub.squad.find((p) => p.id === subInPlayerId);
  if (!outPlayer || !inPlayer) return prev;

  // Nunca permite substituir um atleta expulso, nem retornar substituído/suspenso/já titular
  if (
    redCardedIds.includes(outPlayer.id) ||
    redCardedIds.includes(inPlayer.id) ||
    subbedOutIds.includes(inPlayer.id) ||
    inPlayer.isStarter ||
    (inPlayer.suspendedMatches ?? 0) > 0
  ) {
    return prev;
  }

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
  if (!buyer || isClubInFinancialDebt(buyer)) return prev;

  const effectiveOfferCash = params.originType === 'livre' ? 0 : params.offerCash;
  const reservedCash = getReservedDisputeCash(prev, params.buyerClubId, params.targetPlayerId);
  const availableBudget = Math.max(0, buyer.finances.budget - reservedCash);
  if (availableBudget < effectiveOfferCash) return prev;
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

  const swapPlayer =
    params.originType === 'livre'
      ? undefined
      : params.swapPlayerId
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
    offerCash: effectiveOfferCash,
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
          offerCash: effectiveOfferCash,
          proposedMonthlySalary: params.proposedMonthlySalary,
          swapPlayerId: swapPlayer?.id,
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

  const existingDispute = (prev.transferDisputes ?? []).find(
    (d) => d.status === 'ativa' && d.targetPlayerId === params.targetPlayerId
  );
  const starterRivals = buyer.squad.filter(
    (p) =>
      p.isStarter &&
      (p.position === targetPlayer.position ||
        (targetPlayer.ambidextrous && (p.position === 'PE' || p.position === 'PD')))
  );
  const hasHardCompetition = starterRivals.some(
    (p) => p.overall >= targetPlayer.overall + 2
  );
  const immediateSalary = calcImmediateInterestSalary(
    targetPlayer,
    buyer,
    hasHardCompetition
  );
  const isImmediateFreeSign =
    params.originType === 'livre' &&
    !existingDispute &&
    params.proposedMonthlySalary >= immediateSalary;

  // Solo (1 humano na liga) OU Jogador Livre com proposta irrecusável (sem disputa prévia): assina na hora!
  const humanClubsCount = prev.clubs.filter((c) => c.controller === 'human').length;
  if (humanClubsCount <= 1 || isImmediateFreeSign) {
    const settled = finalizeAcceptedTransfer(prev, {
      buyerClubId: params.buyerClubId,
      targetPlayerId: params.targetPlayerId,
      originType: params.originType,
      sellerClubId: sellerClub?.id,
      offerCash: effectiveOfferCash,
      proposedMonthlySalary: params.proposedMonthlySalary,
      swapPlayerId: swapPlayer?.id,
    });
    const immediateMsg =
      isImmediateFreeSign && humanClubsCount > 1
        ? `Interesse imediato! ${targetPlayer.knownName} aceitou a proposta irrecusável de ${formatMonthlySalary(
            params.proposedMonthlySalary
          )}/mês na hora e dispensou disputa de 3h!`
        : evalRes.message;
    const feedMsg =
      params.originType === 'livre'
        ? `Contratou ${targetPlayer.knownName} (OVR ${targetPlayer.overall}) sem custos (Passe Livre) por ${formatMonthlySalary(
            params.proposedMonthlySalary
          )}/mês${isImmediateFreeSign && humanClubsCount > 1 ? ' — assinatura imediata!' : '.'}`
        : `Contratou ${targetPlayer.knownName} (OVR ${targetPlayer.overall}) do ${
            sellerClub?.shortName ?? targetPlayer.currentClubName ?? 'Mercado'
          } por ${formatMillionsBRL(effectiveOfferCash)} (${formatMonthlySalary(
            params.proposedMonthlySalary
          )}).`;

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
          offerCash: effectiveOfferCash,
          proposedMonthlySalary: params.proposedMonthlySalary,
          swapPlayerId: swapPlayer?.id,
          swapPlayerName: swapPlayer?.knownName,
          status: 'aceita',
          botReason: immediateMsg,
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
          message: feedMsg,
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
    offerCash: effectiveOfferCash,
    swapPlayerId: swapPlayer?.id,
    swapPlayerName: swapPlayer?.knownName,
    swapValue,
    proposedMonthlySalary: params.proposedMonthlySalary,
    submittedAt: nowStr,
  };

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

  const disputeReason =
    params.originType === 'livre'
      ? `Disputa salarial aberta! Proposta de ${formatMonthlySalary(
          params.proposedMonthlySalary
        )}/mês. Amigos podem cobrir até ${expiresFormatted}.`
      : `Disputa aberta! Lance de ${formatMillionsBRL(effectiveOfferCash)} (${formatMonthlySalary(
          params.proposedMonthlySalary
        )}). Amigos podem cobrir até ${expiresFormatted}.`;

  const disputeFeed =
    params.originType === 'livre'
      ? existingDispute
        ? `Cobriu oferta salarial por ${targetPlayer.knownName} (Passe Livre • ${formatMonthlySalary(
            params.proposedMonthlySalary
          )}/mês).`
        : `Abriu disputa de 3h por ${targetPlayer.knownName} (Passe Livre • ${formatMonthlySalary(
            params.proposedMonthlySalary
          )}/mês).`
      : existingDispute
      ? `Cobriu oferta por ${targetPlayer.knownName} (${formatMillionsBRL(effectiveOfferCash)} • ${formatMonthlySalary(
          params.proposedMonthlySalary
        )}).`
      : `Abriu disputa de 3h por ${targetPlayer.knownName} (${formatMillionsBRL(effectiveOfferCash)} • ${formatMonthlySalary(
          params.proposedMonthlySalary
        )}).`;

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
        offerCash: effectiveOfferCash,
        proposedMonthlySalary: params.proposedMonthlySalary,
        swapPlayerId: swapPlayer?.id,
        swapPlayerName: swapPlayer?.knownName,
        status: 'em_disputa',
        botReason: disputeReason,
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
        message: disputeFeed,
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
    isClubInFinancialDebt(fromClub) ||
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
      return applyUpdateTacticsState(
        prev,
        String(p.clubId),
        p.formation as Formation,
        p.mentality as TacticalMentality,
        p.tactics as ClubTactics | undefined
      );
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
    case 'renew_contract':
      return applyRenewContractState(prev, String(p.clubId), String(p.playerId));
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
    case 'reallocate_budget':
      return applyReallocateBudgetState(
        prev,
        String(p.clubId),
        p.direction as 'to_wage' | 'to_transfer',
        Number(p.amountMillions)
      );
    case 'set_revenue_split':
      return applySetRevenueSplitState(prev, String(p.clubId), Number(p.transferPct));
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
      if (matched && (!matched.isAdmin || loadAdminAuthSession())) {
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
  return {
    ...fresh,
    currentUserId: '',
  };
}

function ensureClubsHaveNoSuspendedStarters(clubs: Club[]): Club[] {
  return clubs.map((club) => {
    const hasSuspStarter = club.squad.some((p) => p.isStarter && (p.suspendedMatches ?? 0) > 0);
    if (!hasSuspStarter) return club;
    const built = buildLineupSlots(club.squad, club.formation, club.lineupSlots);
    return {
      ...club,
      squad: built.squad,
      lineupSlots: built.lineupSlots,
    };
  });
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

  const refreshedClubs = ensureClubsHaveNoSuspendedStarters(
    prev.clubs.map((c) => ({
      ...c,
      dealsThisRound: 0,
      squad: c.squad.map((p) => ({ ...p, stamina: 100 })),
    }))
  );
  const botCycle = runBotMarketCycle({ ...prev, clubs: refreshedClubs });
  const expirationRes = shouldOpenMidWindow
    ? processBotContractExpirations(botCycle.clubs, botCycle.freeAgents, false)
    : { clubs: botCycle.clubs, freeAgents: botCycle.freeAgents, feedItems: [] };

  if (shouldOpenMidWindow) {
    const windowHours = prev.config.transferRules.windowHours || 24;
    const windowEndsAt = new Date(Date.now() + windowHours * 3600 * 1000).toISOString();
    return {
      openedMidWindow: true,
      nextState: {
        ...prev,
        status: 'janela_mercado',
        currentRound: prev.currentRound + 1,
        clubs: expirationRes.clubs,
        freeAgents: expirationRes.freeAgents,
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
          ...expirationRes.feedItems,
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
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => loadAdminAuthSession());
  const [loginModalMode, setLoginModalMode] = useState<'login' | 'careers' | 'new_career'>('login');
  const [inviteModalOpen, setInviteModalOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('invite') || !HAD_SESSION_ON_BOOT;
  });

  const skipNextSaveRef = useRef(false);
  const isEmptyDeletedDraftRef = useRef(false);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? null;
  const isAdminUser = isAdminAuthed || currentUser?.isAdmin === true;

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
    if (isEmptyDeletedDraftRef.current) {
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
        if (nextState.currentRound < prev.currentRound) return prev;
        if (nextState.currentRound === prev.currentRound) {
          const prevMaxMin = Math.max(
            0,
            ...prev.matches.filter((m) => m.round === prev.currentRound).map((m) => m.currentMinute)
          );
          const nextMaxMin = Math.max(
            0,
            ...nextState.matches.filter((m) => m.round === nextState.currentRound).map((m) => m.currentMinute)
          );
          if (nextMaxMin < prevMaxMin) return prev;
        }
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

        const rescheduledMatches = reanchorFutureRoundsSchedule(
          next.matches,
          next.currentRound,
          next.config.dailyScheduleTimes,
          curNow
        );

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
              tacticUpdate:
                | { formation: Formation; mentality: TacticalMentality; tactics?: ClubTactics }
                | undefined,
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
                const remapped = remapLineupSlotsForFormation(nextClub, tacticUpdate.formation);
                nextClub = {
                  ...remapped,
                  mentality: tacticUpdate.mentality,
                  tactics: tacticUpdate.tactics ?? nextClub.tactics ?? getClubTactics(nextClub),
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

        let finalizedMatches = updatedMatches;
        const payrollFeedItems: LeagueState['feed'] = [];

        newlyFinished.forEach((fm) => {
          const outcome = applyFinishedMatchToLeague(
            updatedClubs,
            fm,
            prev.totalRounds,
            finalizedMatches
          );
          updatedClubs = outcome.clubs;
          finalizedMatches = finalizedMatches.map((m) =>
            m.id === outcome.finishedMatch.id ? outcome.finishedMatch : m
          );
          if (outcome.feedItems.length > 0) {
            payrollFeedItems.push(...outcome.feedItems);
          }
        });

        const allDone = finalizedMatches
          .filter((m) => m.round === prev.currentRound)
          .every((m) => m.status === 'finalizada');

        if (allDone) {
          setLiveRoundRunning(false);
        }

        const isSeasonEnd = allDone && prev.currentRound >= prev.totalRounds;

        return {
          ...prev,
          clubs: updatedClubs,
          matches: finalizedMatches,
          feed:
            payrollFeedItems.length > 0
              ? [...payrollFeedItems, ...prev.feed].slice(0, 24)
              : prev.feed,
          status: isSeasonEnd ? 'fim_temporada' : prev.status,
        };
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [liveRoundRunning]);

  // Agendador Automático estritamente nos horários fixos definidos (Horário de Brasília)
  useEffect(() => {
    if (league.status !== 'campeonato') return;
    if (isSupabaseConfigured && !isAdminUser) return;

    const checkSchedule = () => {
      const nowMs = Date.now();
      const roundMatches = league.matches.filter((m) => m.round === league.currentRound);
      if (roundMatches.length === 0) return;

      const isRoundDone = roundMatches.every((m) => m.status === 'finalizada');
      const hasLiveMatch = roundMatches.some((m) => m.status === 'ao_vivo');

      // 1. Rodada atual já finalizada: só avança e inicia a próxima dentro da janela do horário fixo dela
      if (isRoundDone && league.currentRound < league.totalRounds) {
        const nextRoundMatch = league.matches.find((m) => m.round === league.currentRound + 1);
        if (!nextRoundMatch?.scheduledAt) return;

        if (isWithinFixedScheduleWindow(nextRoundMatch.scheduledAt, nowMs)) {
          const nowStr = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const willOpenMidWindow =
            league.config.homeAndAway &&
            !league.midSeasonWindowDone &&
            league.currentRound === Math.floor(league.totalRounds / 2);

          setLeague((prev) => {
            const { nextState } = advanceToNextRoundState(prev, nowStr);
            if (willOpenMidWindow) return nextState;
            const startedIso = new Date(nowMs).toISOString();
            return {
              ...nextState,
              matches: nextState.matches.map((m) =>
                m.round === nextState.currentRound
                  ? { ...m, liveStartedAt: m.liveStartedAt ?? startedIso }
                  : m
              ),
            };
          });
          setLiveRoundRunning(!willOpenMidWindow);
          return;
        }

        // Horário fixo da próxima rodada já passou com o app fechado -> reancora para os próximos horários fixos futuros
        if (isFixedScheduleExpired(nextRoundMatch.scheduledAt, nowMs)) {
          setLeague((prev) => ({
            ...prev,
            matches: reanchorFutureRoundsSchedule(
              prev.matches,
              prev.currentRound + 1,
              prev.config.dailyScheduleTimes,
              nowMs
            ),
          }));
        }
        return;
      }

      if (isRoundDone || liveRoundRunning) return;

      // 2. Rodada atual estava 'ao_vivo' ao abrir o app (ex.: recarregou página)
      if (hasLiveMatch) {
        const liveMatch = roundMatches.find((m) => m.status === 'ao_vivo');
        const isManual = roundMatches.some((m) => Boolean(m.manualStarted));
        const startedRefMs = liveMatch?.liveStartedAt
          ? new Date(liveMatch.liveStartedAt).getTime()
          : new Date(liveMatch?.scheduledAt ?? '').getTime();
        const withinActiveLiveWindow =
          !Number.isNaN(startedRefMs) && nowMs - startedRefMs <= 25 * 60 * 1000;

        if (isManual || withinActiveLiveWindow) {
          setLiveRoundRunning(true);
        } else {
          // Partida antiga interrompida fora do horário: conclui sem abrir transmissão fora de hora e reancora futuras
          setLeague((prev) => {
            let updatedClubs = ensureClubsHaveNoSuspendedStarters(prev.clubs);
            const finishedInRound: Match[] = [];

            let updatedMatches = prev.matches.map((m) => {
              if (m.round !== prev.currentRound || m.status === 'finalizada') return m;
              const remaining = Math.max(1, 90 - m.currentMinute);
              const home = updatedClubs.find((c) => c.id === m.homeClubId);
              const away = updatedClubs.find((c) => c.id === m.awayClubId);
              if (!home || !away) return m;
              const cleared = m.isHalftime
                ? { ...m, isHalftime: false, halftimeRemainingSec: 0, halftimeTriggered: true }
                : m;
              const res = simulateMatchMinuteStep(cleared, home, away, remaining);
              if (res.match.status === 'finalizada') finishedInRound.push(res.match);
              return res.match;
            });

            finishedInRound.forEach((fm) => {
              const outcome = applyFinishedMatchToLeague(
                updatedClubs,
                fm,
                prev.totalRounds,
                updatedMatches
              );
              updatedClubs = outcome.clubs;
              updatedMatches = updatedMatches.map((m) =>
                m.id === outcome.finishedMatch.id ? outcome.finishedMatch : m
              );
            });

            const isSeasonEnd =
              prev.currentRound >= prev.totalRounds &&
              updatedMatches.filter((m) => m.round === prev.currentRound).every((m) => m.status === 'finalizada');

            return {
              ...prev,
              clubs: updatedClubs,
              matches: reanchorFutureRoundsSchedule(
                updatedMatches,
                prev.currentRound + 1,
                prev.config.dailyScheduleTimes,
                nowMs
              ),
              status: isSeasonEnd ? 'fim_temporada' : prev.status,
            };
          });
        }
        return;
      }

      // 3. Rodada atual ainda está 'agendada' (vale para Rodada 1 e todas as demais)
      const curSchedAt = roundMatches[0]?.scheduledAt;
      if (isWithinFixedScheduleWindow(curSchedAt, nowMs)) {
        const startedIso = new Date(nowMs).toISOString();
        setLeague((prev) => ({
          ...prev,
          clubs: ensureClubsHaveNoSuspendedStarters(prev.clubs),
          matches: prev.matches.map((m) =>
            m.round === prev.currentRound
              ? { ...m, liveStartedAt: m.liveStartedAt ?? startedIso }
              : m
          ),
        }));
        setLiveRoundRunning(true);
      } else if (isFixedScheduleExpired(curSchedAt, nowMs)) {
        // Nunca iniciar uma rodada agendada fora do horário fixo só por entrar no app; reancora para os próximos horários fixos
        setLeague((prev) => ({
          ...prev,
          matches: reanchorFutureRoundsSchedule(
            prev.matches,
            prev.currentRound,
            prev.config.dailyScheduleTimes,
            nowMs
          ),
        }));
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
    league.config.dailyScheduleTimes,
    league.config.homeAndAway,
    league.midSeasonWindowDone,
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
    isEmptyDeletedDraftRef.current = false;
    skipNextSaveRef.current = false;
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

  const handleAdminLogin = (email: string, password: string): boolean => {
    if (
      email.trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase() ||
      password !== ADMIN_PASSWORD
    ) {
      setAuthError('E-mail ou senha de administrador incorretos.');
      return false;
    }

    setAuthError(null);
    saveAdminAuthSession(true);
    setIsAdminAuthed(true);
    setLoginModalMode('careers');

    if (!isEmptyDeletedDraftRef.current) {
      const admin =
        league.participants.find((p) => p.isAdmin) ?? league.participants[0];
      if (admin) {
        saveDeviceSession({
          participantId: admin.id,
          name: admin.name,
          pin: admin.pin,
        });
        setLeague((prev) => {
          const targetAdmin =
            prev.participants.find((p) => p.isAdmin) ?? prev.participants[0];
          if (!targetAdmin) return prev;
          return {
            ...prev,
            currentUserId: targetAdmin.id,
            activeHumanClubId: targetAdmin.clubId ?? prev.activeHumanClubId,
          };
        });
      }
    }
    return true;
  };

  const handleSelectCareer = async (careerId: string): Promise<boolean> => {
    setAuthError(null);
    setLiveRoundRunning(false);

    let target: LeagueState | null = null;
    if (careerId === league.id && !isEmptyDeletedDraftRef.current) {
      target = league;
    } else {
      const loaded = await loadLeagueById(careerId);
      if (loaded && isValidLeagueState(loaded)) {
        target = syncOfficialClubSquads(mergeMissingWorldStars(loaded));
      }
    }

    if (!target) {
      setAuthError('Não foi possível carregar esta carreira.');
      return false;
    }

    const adminParticipant =
      target.participants.find((p) => p.isAdmin) ?? target.participants[0];
    if (adminParticipant) {
      saveDeviceSession({
        participantId: adminParticipant.id,
        name: adminParticipant.name,
        pin: adminParticipant.pin,
      });
    }

    isEmptyDeletedDraftRef.current = false;
    skipNextSaveRef.current = false;
    setLeague({
      ...target,
      currentUserId: adminParticipant?.id ?? '',
      activeHumanClubId: adminParticipant?.clubId ?? target.activeHumanClubId,
    });
    setActiveTab('lobby');
    setInviteModalOpen(false);
    return true;
  };

  const handleDeleteCareer = async (
    careerId: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await deleteCareerById(careerId);
    if (!res.ok) return res;

    if (careerId === league.id) {
      setLiveRoundRunning(false);
      const remaining = await listAllCareers();
      const nextSummary = remaining.find((c) => c.id !== careerId);
      const nextLoaded = nextSummary ? await loadLeagueById(nextSummary.id) : null;

      if (nextLoaded && isValidLeagueState(nextLoaded)) {
        const synced = syncOfficialClubSquads(mergeMissingWorldStars(nextLoaded));
        const adminParticipant =
          synced.participants.find((p) => p.isAdmin) ?? synced.participants[0];
        if (adminParticipant) {
          saveDeviceSession({
            participantId: adminParticipant.id,
            name: adminParticipant.name,
            pin: adminParticipant.pin,
          });
        }
        isEmptyDeletedDraftRef.current = false;
        skipNextSaveRef.current = true;
        setLeague({
          ...synced,
          currentUserId: adminParticipant?.id ?? '',
          activeHumanClubId: adminParticipant?.clubId ?? synced.activeHumanClubId,
        });
      } else {
        isEmptyDeletedDraftRef.current = true;
        skipNextSaveRef.current = true;
        clearDeviceSession();
        saveAdminAuthSession(true);
        setLeague((prev) => ({
          ...prev,
          currentUserId: '',
        }));
      }
    }

    return { ok: true };
  };

  const handleLogout = () => {
    clearDeviceSession();
    saveAdminAuthSession(false);
    setIsAdminAuthed(false);
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
      const nextMatches = reanchorFutureRoundsSchedule(
        resolved.matches,
        resolved.currentRound,
        resolved.config.dailyScheduleTimes,
        Date.now()
      );
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
            message: 'Janela de transferências encerrada! Disputas finalizadas e partidas agendadas nos horários fixos.',
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
    const nowMs = Date.now();
    const startedIso = new Date(nowMs).toISOString();
    setLeague((prev) => {
      const base =
        prev.status === 'janela_mercado' ? resolveExpiredOrAllDisputes(prev, true) : prev;
      const cleanClubs = ensureClubsHaveNoSuspendedStarters(base.clubs);
      const taggedCurrent = base.matches.map((m) =>
        m.round === base.currentRound
          ? { ...m, manualStarted: true, liveStartedAt: m.liveStartedAt ?? startedIso }
          : m
      );
      const anchoredMatches = reanchorFutureRoundsSchedule(
        taggedCurrent,
        base.currentRound + 1,
        base.config.dailyScheduleTimes,
        nowMs
      );
      return {
        ...base,
        status: 'campeonato',
        clubs: cleanClubs,
        transferWindowOpen: false,
        transferWindowEndsAt: null,
        matches: anchoredMatches,
      };
    });
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

  const handleReallocateBudget = (
    clubId: string,
    direction: 'to_wage' | 'to_transfer',
    amountMillions: number
  ) => {
    setLeague((prev) => applyReallocateBudgetState(prev, clubId, direction, amountMillions));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'reallocate_budget', {
        clubId,
        direction,
        amountMillions,
      });
    }
  };

  const handleSetRevenueSplit = (clubId: string, transferPct: number) => {
    setLeague((prev) => applySetRevenueSplitState(prev, clubId, transferPct));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'set_revenue_split', {
        clubId,
        transferPct,
      });
    }
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
    mentality: TacticalMentality,
    tactics?: ClubTactics
  ) => {
    setLeague((prev) => applyUpdateTacticsState(prev, clubId, formation, mentality, tactics));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'update_tactics', {
        clubId,
        formation,
        mentality,
        tactics,
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

  const handleRenewPlayerContract = (clubId: string, playerId: string) => {
    setLeague((prev) => applyRenewContractState(prev, clubId, playerId));
    if (isSupabaseConfigured && !isAdminUser && currentUser) {
      dispatchLeagueAction(league.id, currentUser.id, 'renew_contract', { clubId, playerId });
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

  const navItems: Array<{
    id: Exclude<ActiveTab, 'criar'>;
    label: string;
    mobileLabel: string;
    icon: typeof Home;
  }> = [
    { id: 'lobby', label: 'Início', mobileLabel: 'Início', icon: Home },
    { id: 'clube', label: 'Meu Clube', mobileLabel: 'Meu Clube', icon: Shield },
    { id: 'campeonato', label: 'Campeonato', mobileLabel: 'Campeonato', icon: Trophy },
    { id: 'mercado', label: 'Mercado', mobileLabel: 'Mercado', icon: ShoppingBag },
  ];

  const clubAccent = currentUser?.clubId ? activeHumanClub.primaryColor : '#10B981';

  return (
    <div className="min-h-[100dvh] console-bg text-[#F1F5F9] flex flex-col">
      {/* Barra Superior Console Responsiva */}
      <header
        className="sticky top-0 z-30 pt-safe bg-[#0B0F15]/95 backdrop-blur-md border-b border-white/[0.08]"
        style={{
          boxShadow: `inset 0 2px 0 0 ${clubAccent}, 0 8px 28px -14px rgba(0,0,0,0.85)`,
        }}
      >
        <div className="w-full max-w-[1380px] mx-auto px-2.5 sm:px-6 lg:px-8 h-14 lg:h-16 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Esquerda: Marca da Liga */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 min-w-0 flex-1 lg:flex-initial overflow-hidden">
            <BrasileiraoTrophyLogo size="sm" />
            <div className="min-w-0 flex flex-col justify-center overflow-hidden">
              <div className="font-display text-sm sm:text-lg lg:text-xl font-extrabold text-white uppercase tracking-wide truncate leading-none">
                {league.config.name}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 mt-1 text-[10px] sm:text-[11px] font-semibold leading-none whitespace-nowrap">
                <span className="text-amber-300 font-bold">T{league.season}</span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="hidden sm:inline text-slate-300">Série A</span>
                <span className="text-slate-600">•</span>
                <span
                  className={`inline-flex items-center gap-1 ${
                    isSupabaseConfigured ? 'text-emerald-400' : 'text-sky-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSupabaseConfigured ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                  />
                  {isSupabaseConfigured ? 'Online' : 'Local'}
                </span>
              </div>
            </div>
          </div>

          {/* Centro (Desktop Console): Navegação Horizontal EA FC Style */}
          <nav
            aria-label="Navegação Principal"
            className="hidden lg:flex items-center h-full gap-1"
          >
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const badgeCount =
                tab.id === 'mercado' && league.transferWindowOpen ? incomingPendingApprovals : 0;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative h-full px-4 flex items-center gap-2 text-sm font-semibold transition cursor-pointer ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? 'text-emerald-400 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'
                    }`}
                  />
                  <span className="font-display text-base uppercase tracking-wider font-bold">
                    {tab.label}
                  </span>
                  {badgeCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                      {badgeCount}
                    </span>
                  )}
                  {active && (
                    <span className="absolute bottom-0 inset-x-3 h-[2.5px] bg-emerald-400 rounded-t" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Direita: Identidade do Técnico, Caixa e Ações */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <div
              className="h-8 sm:h-9 flex items-center gap-1.5 sm:gap-2 bg-[#11161E] border border-white/[0.1] rounded-md px-1.5 sm:px-2.5 max-w-[96px] sm:max-w-[230px]"
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: clubAccent,
              }}
            >
              {currentUser?.clubId && <ClubCrest club={activeHumanClub} size="xs" />}
              <div className="min-w-0 leading-tight">
                <div className="text-[11px] sm:text-xs font-bold text-white truncate">
                  {currentUser?.clubId ? (
                    <>
                      <span className="hidden sm:inline">{currentUser.name.split(' ')[0]} • </span>
                      {activeHumanClub.shortName}
                    </>
                  ) : currentUser ? (
                    currentUser.name.split(' ')[0]
                  ) : (
                    'Convidado'
                  )}
                </div>
                {currentUser?.clubId && (
                  <div className="hidden sm:block text-[10px] text-emerald-400 font-semibold tabular-nums truncate">
                    {formatMillionsBRL(activeHumanClub.finances.budget)}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setAuthError(null);
                setLoginModalMode(isAdminUser ? 'careers' : 'login');
                setInviteModalOpen(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#11161E] border border-white/[0.1] hover:border-emerald-400/60 text-slate-200 flex items-center justify-center cursor-pointer transition"
              title={isAdminUser ? 'Central de Carreiras & Login' : 'Login / Entrar com Código'}
              aria-label="Login e Central de Carreira"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
            </button>

            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="h-8 sm:h-9 px-2 sm:px-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition"
                title="Sair da conta (exigirá PIN para voltar)"
                aria-label="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
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
                className="h-8 sm:h-9 px-2 sm:px-2.5 lg:px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1 cursor-pointer transition"
                title="Nova Carreira"
                aria-label="Nova Carreira"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden xl:inline">Nova Liga</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal Widescreen */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 lg:pb-10 overflow-x-hidden">
        <div key={activeTab} className="animate-console-enter">
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
              onRenewPlayerContract={handleRenewPlayerContract}
              onReallocateBudget={handleReallocateBudget}
              onSetRevenueSplit={handleSetRevenueSplit}
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
        </div>
      </main>

      {/* Tela de Login & Central de Carreira */}
      {inviteModalOpen && (
        <CareerLoginModal
          league={league}
          isAdminUser={isAdminUser}
          authError={authError}
          canDismiss={Boolean(currentUser) && !isEmptyDeletedDraftRef.current}
          initialMode={isAdminUser ? loginModalMode : 'login'}
          onClose={() => {
            setAuthError(null);
            setInviteModalOpen(false);
          }}
          onAdminLogin={handleAdminLogin}
          onJoinOrLogin={handleJoinOrLoginParticipant}
          onJoinByInviteCode={handleJoinByInviteCode}
          onSelectCareer={handleSelectCareer}
          onDeleteCareer={handleDeleteCareer}
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

      {/* Navegação Inferior Mobile Ergonômica */}
      <nav
        aria-label="Navegação Mobile"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 pb-safe bg-[#0B0F15]/96 backdrop-blur-md border-t border-white/[0.08] shadow-[0_-10px_28px_rgba(0,0,0,0.65)]"
      >
        <div className="grid grid-cols-4 h-14 px-1">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const badgeCount =
              tab.id === 'mercado' && league.transferWindowOpen ? incomingPendingApprovals : 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition cursor-pointer ${
                  active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {active && (
                  <span className="absolute top-0 inset-x-4 h-[2px] bg-emerald-400 rounded-b" />
                )}
                <Icon
                  className={`w-5 h-5 ${
                    active ? 'text-emerald-400 stroke-[2.3]' : 'stroke-[1.8]'
                  }`}
                />
                <span className="leading-none">{tab.mobileLabel}</span>
                {badgeCount > 0 && (
                  <span className="absolute top-1.5 right-[22%] min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {badgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
