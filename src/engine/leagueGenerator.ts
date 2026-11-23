import {
  CLUB_TEMPLATES,
  generateBaseSquad,
  generateFreeAgentsPool,
  generateWorldMarketPool,
} from '../data/seedData';
import {
  BotPersonality,
  Club,
  ClubBotPersonality,
  LeagueConfig,
  LeagueState,
  LobbyParticipant,
  Match,
} from '../types/league';
import { buildLineupSlots, calcMonthlyPayrollMillions, chooseBotTactics } from './botAI';
import { normalizeMatchStats } from './matchSimulation';

const BOT_PERSONALITIES: ClubBotPersonality[] = [
  'agressivo',
  'economico',
  'equilibrado',
  'galactico',
  'tatico',
];

function resolveBotPersonality(mode: BotPersonality, index: number): ClubBotPersonality {
  if (mode === 'misto') {
    return BOT_PERSONALITIES[index % BOT_PERSONALITIES.length];
  }
  return mode;
}

function parseScheduleHours(timeStr: string): [number, number] {
  const [hh, mm] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);
  return [hh, mm];
}

function getBrasiliaDateParts(ms: number): { year: number; month: number; day: number } {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms));
  const [y, m, d] = formatted.split('-').map((n) => parseInt(n, 10));
  return { year: y, month: m, day: d };
}

function buildBrasiliaSlotIso(year: number, month: number, dayOffset: number, hh: number, mm: number, day: number): string {
  const baseUtc = Date.UTC(year, month - 1, day + dayOffset, hh + 3, mm, 0, 0);
  return new Date(baseUtc).toISOString();
}

/** Gera próximos slots de 12:00 e 22:00 (Horário de Brasília, UTC-3) estritamente futuros após `afterMs` */
export function getNextBrasiliaSlots(
  count: number,
  dailyScheduleTimes: [string, string] = ['12:00', '22:00'],
  afterMs: number = Date.now()
): string[] {
  const { year, month, day } = getBrasiliaDateParts(afterMs);
  const parsed = [
    parseScheduleHours(dailyScheduleTimes[0] || '12:00'),
    parseScheduleHours(dailyScheduleTimes[1] || '22:00'),
  ].sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));

  const slots: string[] = [];
  let dayOffset = 0;
  while (slots.length < count && dayOffset < count + 10) {
    for (const [hh, mm] of parsed) {
      const iso = buildBrasiliaSlotIso(year, month, dayOffset, hh, mm, day);
      if (new Date(iso).getTime() > afterMs) {
        slots.push(iso);
        if (slots.length >= count) break;
      }
    }
    dayOffset += 1;
  }
  return slots;
}

export function computeRoundScheduledAt(
  round: number,
  dailyScheduleTimes: [string, string] = ['12:00', '22:00'],
  fromTimestampMs?: number
): string {
  if (fromTimestampMs !== undefined) {
    const slots = getNextBrasiliaSlots(round, dailyScheduleTimes, fromTimestampMs);
    return slots[round - 1] ?? slots[slots.length - 1] ?? new Date().toISOString();
  }
  const dayOffset = Math.floor((round - 1) / 2);
  const slotIdx = (round - 1) % 2;
  const timeStr = dailyScheduleTimes[slotIdx] ?? (slotIdx === 0 ? '12:00' : '22:00');
  const [hh, mm] = parseScheduleHours(timeStr);
  const { year, month, day } = getBrasiliaDateParts(Date.now());
  return buildBrasiliaSlotIso(year, month, dayOffset, hh, mm, day);
}

/** Reancora todas as rodadas a partir de `fromRound` para os próximos horários 12:00 e 22:00 (Brasília) */
export function reanchorFutureRoundsSchedule(
  matches: Match[],
  fromRound: number,
  dailyScheduleTimes: [string, string] = ['12:00', '22:00'],
  afterMs: number = Date.now()
): Match[] {
  const futureRounds = Array.from(
    new Set(matches.filter((m) => m.round >= fromRound).map((m) => m.round))
  ).sort((a, b) => a - b);

  if (futureRounds.length === 0) return matches;

  const slots = getNextBrasiliaSlots(futureRounds.length, dailyScheduleTimes, afterMs);
  const slotByRound = new Map<number, string>();
  futureRounds.forEach((r, idx) => {
    slotByRound.set(r, slots[idx] ?? slots[slots.length - 1]);
  });

  return matches.map((m) => {
    const sched = slotByRound.get(m.round);
    return sched ? { ...m, scheduledAt: sched } : m;
  });
}

function makeInitialMatch(
  id: string,
  round: number,
  phaseLabel: string,
  scheduledAt: string,
  homeClubId: string,
  awayClubId: string
): Match {
  return {
    id,
    round,
    phaseLabel,
    scheduledAt,
    homeClubId,
    awayClubId,
    homeGoals: 0,
    awayGoals: 0,
    status: 'agendada',
    currentMinute: 0,
    isHalftime: false,
    halftimeRemainingSec: 0,
    homeSubsUsed: 0,
    awaySubsUsed: 0,
    homeSubbedOutIds: [],
    awaySubbedOutIds: [],
    ballX: 50,
    ballY: 50,
    possessionClubId: homeClubId,
    playPhase: 'kickoff',
    lastPlayText: 'Aguardando horário da rodada...',
    stats: normalizeMatchStats(),
    events: [],
  };
}

export function generateSchedule(
  clubs: Club[],
  config: LeagueConfig
): { matches: Match[]; totalRounds: number } {
  const n = clubs.length;
  const matches: Match[] = [];
  const times: [string, string] = config.dailyScheduleTimes ?? ['12:00', '22:00'];

  if (config.format === 'pontos_corridos') {
    const ids = clubs.map((c) => c.id);
    if (ids.length % 2 !== 0) ids.push('BYE');
    const numTeams = ids.length;
    const roundsPerTurn = numTeams - 1;
    const half = numTeams / 2;

    const firstTurnMatches: Match[] = [];
    const rotation = [...ids];

    for (let r = 0; r < roundsPerTurn; r++) {
      const roundNum = r + 1;
      const sched = computeRoundScheduledAt(roundNum, times);
      for (let i = 0; i < half; i++) {
        const home = rotation[i];
        const away = rotation[numTeams - 1 - i];
        if (home !== 'BYE' && away !== 'BYE') {
          const flip = r % 2 === 1 && i === 0;
          firstTurnMatches.push(
            makeInitialMatch(
              `m-r${roundNum}-${i + 1}`,
              roundNum,
              config.homeAndAway ? `1º Turno • Rodada ${roundNum}` : `Rodada ${roundNum}`,
              sched,
              flip ? away : home,
              flip ? home : away
            )
          );
        }
      }
      const last = rotation.pop()!;
      rotation.splice(1, 0, last);
    }

    matches.push(...firstTurnMatches);

    if (config.homeAndAway) {
      firstTurnMatches.forEach((m, idx) => {
        const roundNum = m.round + roundsPerTurn;
        matches.push(
          makeInitialMatch(
            `m-ret-${roundNum}-${idx}`,
            roundNum,
            `2º Turno • Rodada ${roundNum}`,
            computeRoundScheduledAt(roundNum, times),
            m.awayClubId,
            m.homeClubId
          )
        );
      });
      return { matches, totalRounds: roundsPerTurn * 2 };
    }

    return { matches, totalRounds: roundsPerTurn };
  }

  if (config.format === 'grupos_mata_mata') {
    const groups: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
    let maxGroupRound = 0;

    groups.forEach((grp) => {
      const groupClubs = clubs.filter((c) => c.group === grp);
      if (groupClubs.length < 2) return;
      const ids = groupClubs.map((c) => c.id);
      if (ids.length % 2 !== 0) ids.push('BYE');
      const numTeams = ids.length;
      const roundsPerTurn = numTeams - 1;
      const rotation = [...ids];

      for (let r = 0; r < roundsPerTurn; r++) {
        const roundNum = r + 1;
        for (let i = 0; i < numTeams / 2; i++) {
          const home = rotation[i];
          const away = rotation[numTeams - 1 - i];
          if (home !== 'BYE' && away !== 'BYE') {
            matches.push(
              makeInitialMatch(
                `m-g${grp}-r${roundNum}-${i}`,
                roundNum,
                `Grupo ${grp} • Rodada ${roundNum}`,
                computeRoundScheduledAt(roundNum, times),
                home,
                away
              )
            );
            if (config.homeAndAway) {
              const retRound = roundNum + roundsPerTurn;
              matches.push(
                makeInitialMatch(
                  `m-g${grp}-ret-r${retRound}-${i}`,
                  retRound,
                  `Grupo ${grp} • Returno ${roundNum}`,
                  computeRoundScheduledAt(retRound, times),
                  away,
                  home
                )
              );
            }
          }
        }
        const last = rotation.pop()!;
        rotation.splice(1, 0, last);
      }
      maxGroupRound = Math.max(maxGroupRound, config.homeAndAway ? roundsPerTurn * 2 : roundsPerTurn);
    });

    return { matches, totalRounds: maxGroupRound };
  }

  const pairsCount = Math.floor(n / 2);
  for (let i = 0; i < pairsCount; i++) {
    const home = clubs[i * 2];
    const away = clubs[i * 2 + 1];
    matches.push(
      makeInitialMatch(
        `m-copa-r1-${i}`,
        1,
        pairsCount === 8 ? 'Oitavas de Final' : pairsCount === 4 ? 'Quartas de Final' : 'Copa • Ida',
        computeRoundScheduledAt(1, times),
        home.id,
        away.id
      )
    );
    if (config.homeAndAway) {
      matches.push(
        makeInitialMatch(
          `m-copa-r2-${i}`,
          2,
          'Copa • Volta',
          computeRoundScheduledAt(2, times),
          away.id,
          home.id
        )
      );
    }
  }
  return { matches, totalRounds: config.homeAndAway ? 2 : 1 };
}

export function createLeagueFromConfig(
  config: LeagueConfig,
  adminName = 'Você (Admin)',
  preClaimFriends = false,
  adminPin = '1234'
): LeagueState {
  const safeTotal = CLUB_TEMPLATES.length;
  const safeHumans = Math.max(1, Math.min(safeTotal, config.humanCount));
  const safeBots = safeTotal - safeHumans;

  const normalizedConfig: LeagueConfig = {
    ...config,
    totalClubs: safeTotal,
    humanCount: safeHumans,
    botCount: safeBots,
    dailyScheduleTimes: config.dailyScheduleTimes ?? ['12:00', '22:00'],
    useRealisticBudgets: config.useRealisticBudgets ?? true,
  };

  const groups: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];
  const clubs: Club[] = [];

  for (let i = 0; i < safeTotal; i++) {
    const tpl = CLUB_TEMPLATES[i % CLUB_TEMPLATES.length];
    const personality = resolveBotPersonality(normalizedConfig.botPersonality, i);
    const rawSquad = generateBaseSquad(normalizedConfig.squadSize, i, tpl);
    const tactics = chooseBotTactics(personality, rawSquad);
    const built = buildLineupSlots(rawSquad, tactics.formation);
    const squad = built.squad;
    const lineupSlots = built.lineupSlots;
    const wageBill = calcMonthlyPayrollMillions({ squad, tier: tpl.tier });
    const initialWageBudget = Math.round(wageBill * 5 * 100) / 100;

    const clubBudget = normalizedConfig.useRealisticBudgets
      ? tpl.realisticBudget
      : normalizedConfig.initialBudget;

    clubs.push({
      id: `${tpl.id}-${i}`,
      name: i >= CLUB_TEMPLATES.length ? `${tpl.name} ${i + 1}` : tpl.name,
      shortName: tpl.shortName,
      logoUrl: tpl.logoUrl,
      primaryColor: tpl.primaryColor,
      secondaryColor: tpl.secondaryColor,
      stadium: tpl.stadium,
      stadiumCapacity: tpl.stadiumCapacity,
      tier: tpl.tier,
      realisticBudget: tpl.realisticBudget,
      controller: 'bot',
      managerName: `Bot ${tpl.shortName}`,
      isAdmin: false,
      inviteClaimed: false,
      botPersonality: personality,
      botDifficulty: normalizedConfig.botDifficulty,
      formation: tactics.formation,
      mentality: tactics.mentality,
      tactics: tactics.tactics,
      squad,
      lineupSlots,
      finances: {
        budget: clubBudget,
        initialBudget: clubBudget,
        wageBill,
        wageBudget: initialWageBudget,
        revenueTransferPct: 45,
        boxOfficeIncome: 0,
        totalWagesPaid: 0,
        lastPayrollRound: 0,
        financeLedger: [],
        transferSpent: 0,
        transferIncome: 0,
        matchIncome: 0,
        prizeIncome: 0,
      },
      standing: {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      },
      dealsThisRound: 0,
      titlesWon: 0,
      group: normalizedConfig.format === 'grupos_mata_mata' ? groups[i % 4] : undefined,
    });
  }

  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const adminParticipant: LobbyParticipant = {
    id: 'user-admin',
    name: adminName,
    pin: adminPin,
    isAdmin: true,
    clubId: null,
    joinedAt: nowStr,
  };

  const participants: LobbyParticipant[] = [adminParticipant];
  if (preClaimFriends) {
    for (let f = 1; f < safeHumans; f++) {
      participants.push({
        id: `user-friend-${f}`,
        name: `Amigo ${f}`,
        pin: '1234',
        isAdmin: false,
        clubId: null,
        joinedAt: nowStr,
      });
    }
  }

  const { matches, totalRounds } = generateSchedule(clubs, normalizedConfig);

  const codeSuffix = Math.floor(1000 + Math.random() * 9000);
  const inviteCode = `LIGA-${safeHumans}H${safeBots}B-${codeSuffix}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const inviteLink = `${origin}/?invite=${inviteCode}`;

  return {
    id: `league-${Date.now()}`,
    season: 1,
    seasonHistory: [],
    config: normalizedConfig,
    status: 'lobby',
    inviteCode,
    inviteLink,
    participants,
    currentUserId: adminParticipant.id,
    clubs,
    activeHumanClubId: clubs[0].id,
    currentRound: 1,
    totalRounds,
    matches,
    freeAgents: generateFreeAgentsPool(28),
    worldMarket: generateWorldMarketPool(),
    transferWindowOpen: false,
    transferWindowEndsAt: null,
    transferWindowLabel: 'Aguardando Escolha dos Clubes',
    midSeasonWindowDone: false,
    botPatienceMap: {},
    negotiations: [],
    feed: [
      {
        id: `feed-init-1`,
        category: 'admin',
        actorName: adminName,
        actorType: 'human',
        message: `Criou "${normalizedConfig.name}" (${safeHumans} Humanos + ${safeBots} Bots • 2 rodadas/dia).`,
        timestamp: nowStr,
      },
    ],
    auditLogs: [
      {
        id: 'audit-1',
        timestamp: new Date().toLocaleString('pt-BR'),
        adminName,
        action: 'Criação da Liga',
        details: `${safeTotal} clubes (${safeHumans} Humanos + ${safeBots} Bots) | Horários ${normalizedConfig.dailyScheduleTimes.join(' & ')}`,
      },
    ],
  };
}
