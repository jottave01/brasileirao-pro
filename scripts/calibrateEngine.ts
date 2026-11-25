import {
  BotDifficulty,
  Club,
  ClubTactics,
  Formation,
  LeagueConfig,
  Match,
  Player,
  PlayerPosition,
  TacticalMentality,
} from '../src/types/league';
import {
  BRASILEIRAO_TARGETS,
} from '../src/engine/matchBalance';
import {
  DEFAULT_CLUB_TACTICS,
  FORMATION_LAYOUT,
  TACTICAL_PRESETS,
  buildLineupSlots,
} from '../src/engine/tacticalEngine';
import {
  calculateOverallFromAttributes,
  generatePlayerAttributes,
} from '../src/engine/playerAttributes';
import {
  createInitialSimState,
  normalizeMatchStats,
  simulateMatchMinuteStep,
} from '../src/engine/matchSimulation';
import { createLeagueFromConfig, generateSchedule } from '../src/engine/leagueGenerator';

function cloneClub(c: Club): Club {
  return {
    ...c,
    tactics: c.tactics ? { ...c.tactics } : { ...DEFAULT_CLUB_TACTICS },
    squad: c.squad.map((p) => ({
      ...p,
      stamina: 100,
      attributes: p.attributes ? { ...p.attributes } : undefined,
    })),
    lineupSlots: c.lineupSlots.map((s) => ({ ...s })),
  };
}

function remapStartersPreserving(club: Club, nextFormation: Formation): Club {
  const layout = FORMATION_LAYOUT[nextFormation];
  const currentStarters = (club.lineupSlots ?? [])
    .map((s) => club.squad.find((p) => p.id === s.playerId))
    .filter((p): p is Player => Boolean(p));
  if (currentStarters.length !== 11) return { ...club, formation: nextFormation };
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
    const rem = currentStarters.find((p) => !usedIds.has(p.id));
    if (rem) {
      usedIds.add(rem.id);
      nextSlots[idx].playerId = rem.id;
    }
  });
  return { ...club, formation: nextFormation, lineupSlots: nextSlots };
}

function makeFreshMatch(home: Club, away: Club, id = 'sim-m'): Match {
  return {
    id,
    round: 1,
    scheduledAt: new Date().toISOString(),
    homeClubId: home.id,
    awayClubId: away.id,
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
    possessionClubId: home.id,
    playPhase: 'kickoff',
    lastPlayText: '',
    stats: normalizeMatchStats(),
    events: [],
    simState: createInitialSimState(home, away),
  };
}

const invariantFailures: string[] = [];

function checkMatchInvariants(match: Match, label: string): void {
  const st = normalizeMatchStats(match.stats);
  if (st.homeOnTarget > st.homeShots || st.awayOnTarget > st.awayShots) {
    invariantFailures.push(`[${label}] onTarget > shots`);
  }
  if (match.homeGoals > st.homeOnTarget || match.awayGoals > st.awayOnTarget) {
    invariantFailures.push(`[${label}] goals > onTarget`);
  }
  if (st.homeSaves !== st.awayOnTarget - match.awayGoals) {
    invariantFailures.push(`[${label}] homeSaves (${st.homeSaves}) != awayOnTarget - awayGoals (${st.awayOnTarget - match.awayGoals})`);
  }
  if (st.awaySaves !== st.homeOnTarget - match.homeGoals) {
    invariantFailures.push(`[${label}] awaySaves (${st.awaySaves}) != homeOnTarget - homeGoals (${st.homeOnTarget - match.homeGoals})`);
  }
  if (st.homePassesCompleted > st.homePasses || st.awayPassesCompleted > st.awayPasses) {
    invariantFailures.push(`[${label}] passesCompleted > passes`);
  }
  if (match.homeSubsUsed > 5 || match.awaySubsUsed > 5) {
    invariantFailures.push(`[${label}] subsUsed > 5`);
  }
  if (st.homePossession < 10 || st.homePossession > 90) {
    invariantFailures.push(`[${label}] extreme invalid possession ${st.homePossession}%`);
  }
  // Verificar que nenhum jogador expulso foi substituído após expulsão ou subbed out voltou
  const sim = match.simState;
  if (sim) {
    for (const rid of sim.homeRedCardedIds) {
      if (match.homeSubbedOutIds.includes(rid)) {
        invariantFailures.push(`[${label}] red-carded home player subbed out`);
      }
    }
    for (const rid of sim.awayRedCardedIds) {
      if (match.awaySubbedOutIds.includes(rid)) {
        invariantFailures.push(`[${label}] red-carded away player subbed out`);
      }
    }
  }
  const goalEvents = match.events.filter((e) => e.type === 'gol');
  const homeGoalEvs = goalEvents.filter((e) => e.clubId === match.homeClubId).length;
  const awayGoalEvs = goalEvents.filter((e) => e.clubId === match.awayClubId).length;
  if (homeGoalEvs !== match.homeGoals || awayGoalEvs !== match.awayGoals) {
    invariantFailures.push(
      `[${label}] goals (${match.homeGoals}-${match.awayGoals}) != goal events (${homeGoalEvs}-${awayGoalEvs})`
    );
  }
  const goalMinutes = goalEvents.map((e) => e.minute);
  if (new Set(goalMinutes).size !== goalMinutes.length) {
    invariantFailures.push(`[${label}] multiple goals in same minute (${goalMinutes.join(',')})`);
  }
}

function simulateFullMatch(
  homeBase: Club,
  awayBase: Club,
  options?: { allowAI?: boolean; label?: string }
): { match: Match; homeEnd: Club; awayEnd: Club } {
  let home = cloneClub(homeBase);
  let away = cloneClub(awayBase);
  let match = makeFreshMatch(home, away);
  if (options?.allowAI === false) {
    match.manualControlClubs = [home.id, away.id];
  }

  let safety = 0;
  while (match.status !== 'finalizada' && safety++ < 110) {
    if (match.isHalftime) {
      match.isHalftime = false;
      match.halftimeRemainingSec = 0;
    }
    const res = simulateMatchMinuteStep(match, home, away, 1);
    match = res.match;

    if (res.homePlayerDrains) {
      home = {
        ...home,
        squad: home.squad.map((p) => {
          const d = res.homePlayerDrains?.[p.id] ?? 0;
          return p.isStarter && d > 0
            ? { ...p, stamina: Math.max(15, Math.round((p.stamina - d) * 10) / 10) }
            : p;
        }),
      };
    }
    if (res.awayPlayerDrains) {
      away = {
        ...away,
        squad: away.squad.map((p) => {
          const d = res.awayPlayerDrains?.[p.id] ?? 0;
          return p.isStarter && d > 0
            ? { ...p, stamina: Math.max(15, Math.round((p.stamina - d) * 10) / 10) }
            : p;
        }),
      };
    }

    if (res.homeTacticUpdate) {
      home = remapStartersPreserving(home, res.homeTacticUpdate.formation);
      home.mentality = res.homeTacticUpdate.mentality;
      if (res.homeTacticUpdate.tactics) home.tactics = res.homeTacticUpdate.tactics;
    }
    if (res.awayTacticUpdate) {
      away = remapStartersPreserving(away, res.awayTacticUpdate.formation);
      away.mentality = res.awayTacticUpdate.mentality;
      if (res.awayTacticUpdate.tactics) away.tactics = res.awayTacticUpdate.tactics;
    }

    if (res.homeAutoSub) {
      const nextSlots = home.lineupSlots.map((s, idx) =>
        idx === res.homeAutoSub!.slotIndex ? { ...s, playerId: res.homeAutoSub!.inPlayerId } : s
      );
      const ids = new Set(nextSlots.map((s) => s.playerId));
      home = {
        ...home,
        lineupSlots: nextSlots,
        squad: home.squad.map((p) => ({ ...p, isStarter: ids.has(p.id) })),
      };
    }
    if (res.awayAutoSub) {
      const nextSlots = away.lineupSlots.map((s, idx) =>
        idx === res.awayAutoSub!.slotIndex ? { ...s, playerId: res.awayAutoSub!.inPlayerId } : s
      );
      const ids = new Set(nextSlots.map((s) => s.playerId));
      away = {
        ...away,
        lineupSlots: nextSlots,
        squad: away.squad.map((p) => ({ ...p, isStarter: ids.has(p.id) })),
      };
    }
  }

  checkMatchInvariants(match, options?.label ?? `${home.shortName} vs ${away.shortName}`);
  return { match, homeEnd: home, awayEnd: away };
}

function createSyntheticClub(
  id: string,
  targetOvr: number,
  opts?: {
    formation?: Formation;
    mentality?: TacticalMentality;
    tactics?: ClubTactics;
    botDifficulty?: BotDifficulty;
    roleOverrides?: Partial<Record<PlayerPosition, { overall?: number; finalizacao?: number; reflexos?: number }>>;
  }
): Club {
  const formation = opts?.formation ?? '4-3-3';
  const roles: PlayerPosition[] = [
    'GOL', 'GOL',
    'LE', 'ZAG', 'ZAG', 'ZAG', 'LD', 'LD', 'LE',
    'VOL', 'VOL', 'MC', 'MC', 'MEI', 'MEI',
    'PE', 'PE', 'PD', 'PD', 'CA', 'CA',
  ];

  const squad: Player[] = roles.map((pos, idx) => {
    const ov = opts?.roleOverrides?.[pos];
    const isBench = idx === 1 || idx === 5 || idx === 7 || idx === 8 || idx === 10 || idx === 12 || idx === 14 || idx === 16 || idx === 18 || idx === 20;
    const baseOvr = ov?.overall ?? (isBench ? Math.max(60, targetOvr - 4) : targetOvr);
    const name = `${id}-${pos}-${idx}`;
    const attrSeedName = `SYNTH-${pos}-${idx}`;
    const attrs = generatePlayerAttributes({
      name: attrSeedName,
      position: pos,
      overall: baseOvr,
      age: 25,
    });
    if (ov?.finalizacao !== undefined) attrs.finalizacao = ov.finalizacao;
    if (ov?.reflexos !== undefined) attrs.reflexos = ov.reflexos;
    const effectiveOvr = ov?.finalizacao !== undefined || ov?.reflexos !== undefined
      ? baseOvr
      : calculateOverallFromAttributes(attrs, pos);

    return {
      id: `${id}-p-${idx}`,
      name,
      knownName: `${id}.${pos}${idx}`,
      position: pos,
      secondaryPositions: [],
      overall: effectiveOvr,
      attributes: attrs,
      age: 25,
      nationality: 'Brasil',
      marketValue: 10,
      wage: 0.2,
      monthlySalary: 200,
      stamina: 100,
      goals: 0,
      assists: 0,
    };
  });

  const built = buildLineupSlots(squad, formation);
  return {
    id,
    name: `Club ${id}`,
    shortName: id.slice(0, 3).toUpperCase(),
    logoUrl: '',
    primaryColor: '#10b981',
    secondaryColor: '#0f172a',
    stadium: 'Arena',
    stadiumCapacity: 40000,
    tier: 2,
    realisticBudget: 100,
    controller: 'bot',
    managerName: `Coach ${id}`,
    inviteClaimed: false,
    botPersonality: 'equilibrado',
    botDifficulty: opts?.botDifficulty ?? 'dificil',
    formation,
    mentality: opts?.mentality ?? 'Equilibrada',
    tactics: opts?.tactics ?? { ...DEFAULT_CLUB_TACTICS },
    squad: built.squad,
    lineupSlots: built.lineupSlots,
    finances: {
      budget: 100,
      initialBudget: 100,
      wageBill: 2,
      transferSpent: 0,
      transferIncome: 0,
      matchIncome: 0,
      prizeIncome: 0,
    },
    standing: { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
    dealsThisRound: 0,
    titlesWon: 0,
  };
}

console.log('==================================================================');
console.log('BRASILEIRAO PRO — DEEP SIMULATION BATCH CALIBRATION SUITE');
console.log('==================================================================\n');

// =========================================================================
// SUITE 1: Campeonato Brasileiro Completo (380 partidas reais dos 20 clubes)
// =========================================================================
const baseConfig: LeagueConfig = {
  name: 'Calibração Série A',
  totalClubs: 20,
  humanCount: 1,
  botCount: 19,
  initialBudget: 150,
  useRealisticBudgets: true,
  squadSize: 20,
  format: 'pontos_corridos',
  homeAndAway: true,
  dailyScheduleTimes: ['12:00', '22:00'],
  transferRules: {
    windowOpen: false,
    windowHours: 24,
    maxDealsPerRound: 5,
    allowDirectPurchase: false,
    allowBotNegotiations: false,
    taxPercent: 5,
  },
  botDifficulty: 'dificil',
  botPersonality: 'misto',
};

const league = createLeagueFromConfig(baseConfig, 'Test', false, '1234');
const seasonClubs = league.clubs.map((c) => ({ ...c, controller: 'bot' as const }));
const { matches } = generateSchedule(seasonClubs, baseConfig);

let s1Goals = 0;
let s1ShotsTeam = 0;
let s1OnTargetTeam = 0;
let s1BigChancesTeam = 0;
let s1PassesTeam = 0;
let s1PassesCompTeam = 0;
let s1TacklesTeam = 0;
let s1IntTeam = 0;
let s1CrossesTeam = 0;
let s1CornersTeam = 0;
let s1FoulsMatch = 0;
let s1YellowsMatch = 0;
let s1RedsMatch = 0;
let s1OffsidesMatch = 0;
let s1HomeWins = 0;
let s1Draws = 0;
let s1AwayWins = 0;
let s1EndStaminaSum = 0;
let s1EndStaminaCount = 0;
let s1MinPoss = 100;
let s1MaxPoss = 0;

const standings = new Map(
  seasonClubs.map((c) => [c.id, { club: c, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }])
);

for (const m of matches) {
  const h = seasonClubs.find((c) => c.id === m.homeClubId)!;
  const a = seasonClubs.find((c) => c.id === m.awayClubId)!;
  const { match: done, homeEnd, awayEnd } = simulateFullMatch(h, a, { label: m.id });
  const st = normalizeMatchStats(done.stats);

  s1Goals += done.homeGoals + done.awayGoals;
  s1ShotsTeam += st.homeShots + st.awayShots;
  s1OnTargetTeam += st.homeOnTarget + st.awayOnTarget;
  s1BigChancesTeam += st.homeBigChances + st.awayBigChances;
  s1PassesTeam += st.homePasses + st.awayPasses;
  s1PassesCompTeam += st.homePassesCompleted + st.awayPassesCompleted;
  s1TacklesTeam += st.homeTackles + st.awayTackles;
  s1IntTeam += st.homeInterceptions + st.awayInterceptions;
  s1CrossesTeam += st.homeCrosses + st.awayCrosses;
  s1CornersTeam += st.homeCorners + st.awayCorners;
  s1FoulsMatch += st.homeFouls + st.awayFouls;
  s1YellowsMatch += st.homeYellowCards + st.awayYellowCards;
  s1RedsMatch += st.homeRedCards + st.awayRedCards;
  s1OffsidesMatch += st.homeOffsides + st.awayOffsides;
  s1MinPoss = Math.min(s1MinPoss, st.homePossession, 100 - st.homePossession);
  s1MaxPoss = Math.max(s1MaxPoss, st.homePossession, 100 - st.homePossession);

  if (done.homeGoals > done.awayGoals) s1HomeWins += 1;
  else if (done.homeGoals === done.awayGoals) s1Draws += 1;
  else s1AwayWins += 1;

  for (const p of [...homeEnd.squad, ...awayEnd.squad]) {
    if (p.isStarter && p.position !== 'GOL') {
      s1EndStaminaSum += p.stamina;
      s1EndStaminaCount += 1;
    }
  }

  const hSt = standings.get(h.id)!;
  const aSt = standings.get(a.id)!;
  hSt.gf += done.homeGoals;
  hSt.ga += done.awayGoals;
  aSt.gf += done.awayGoals;
  aSt.ga += done.homeGoals;
  if (done.homeGoals > done.awayGoals) {
    hSt.w += 1; hSt.pts += 3; aSt.l += 1;
  } else if (done.homeGoals === done.awayGoals) {
    hSt.d += 1; hSt.pts += 1; aSt.d += 1; aSt.pts += 1;
  } else {
    aSt.w += 1; aSt.pts += 3; hSt.l += 1;
  }
}

const nMatches = matches.length;
const avgGoalsMatch = s1Goals / nMatches;
const avgShotsTeam = s1ShotsTeam / (nMatches * 2);
const avgOnTargetTeam = s1OnTargetTeam / (nMatches * 2);
const avgYellowsMatch = s1YellowsMatch / nMatches;
const avgRedsMatch = s1RedsMatch / nMatches;
const avgPassAcc = (s1PassesCompTeam / Math.max(1, s1PassesTeam)) * 100;

console.log(`1) BRASILEIRÃO COMPLETO (${nMatches} jogos)`);
console.log(`   Gols / jogo:          ${avgGoalsMatch.toFixed(2)}  (Meta: ${BRASILEIRAO_TARGETS.goalsPerMatch.join(' - ')})`);
console.log(`   Chutes / time:        ${avgShotsTeam.toFixed(2)}  (Meta: ${BRASILEIRAO_TARGETS.shotsPerTeam.join(' - ')})`);
console.log(`   No Gol / time:        ${avgOnTargetTeam.toFixed(2)}  (Meta: ${BRASILEIRAO_TARGETS.onTargetPerTeam.join(' - ')})`);
console.log(`   Chances Claras / time:${(s1BigChancesTeam / (nMatches * 2)).toFixed(2)}`);
console.log(`   Passes / time:        ${(s1PassesTeam / (nMatches * 2)).toFixed(0)} (${avgPassAcc.toFixed(1)}% acerto)`);
console.log(`   Desarmes / Intercept: ${(s1TacklesTeam / (nMatches * 2)).toFixed(1)} / ${(s1IntTeam / (nMatches * 2)).toFixed(1)} por time`);
console.log(`   Cruzamentos / Escant: ${(s1CrossesTeam / (nMatches * 2)).toFixed(1)} / ${(s1CornersTeam / (nMatches * 2)).toFixed(1)} por time`);
console.log(`   Faltas / Amarelos:    ${(s1FoulsMatch / nMatches).toFixed(1)} / ${avgYellowsMatch.toFixed(2)} por jogo  (Meta CA: ${BRASILEIRAO_TARGETS.yellowsPerMatch.join(' - ')})`);
console.log(`   Expulsões / jogo:     ${avgRedsMatch.toFixed(3)}  | Impedimentos: ${(s1OffsidesMatch / nMatches).toFixed(2)} / jogo`);
console.log(`   Posse min/max:        ${s1MinPoss}% - ${s1MaxPoss}%  | Vigor médio final linha: ${(s1EndStaminaSum / s1EndStaminaCount).toFixed(1)}%`);
console.log(`   Mando (V/E/D Casa):   ${((s1HomeWins / nMatches) * 100).toFixed(1)}% / ${((s1Draws / nMatches) * 100).toFixed(1)}% / ${((s1AwayWins / nMatches) * 100).toFixed(1)}%`);

const sortedTable = [...standings.values()].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga));
console.log(`   Top 5 Tabela Simulada: ${sortedTable.slice(0, 5).map((r, i) => `${i + 1}.${r.club.shortName}(${r.pts}p)`).join(' ')}`);
console.log(`   Z4 Tabela Simulada:    ${sortedTable.slice(-4).map((r, i) => `${17 + i}.${r.club.shortName}(${r.pts}p)`).join(' ')}\n`);

// =========================================================================
// SUITE 2: Progressão de Faixas de Overall (72 a 97)
// =========================================================================
console.log('2) CALIBRAGEM DE OVERALL (100 jogos cada par, alternando mando)');
const ovrPairs: Array<[number, number]> = [
  [72, 72],
  [77, 72],
  [82, 72],
  [87, 77],
  [92, 82],
  [97, 87],
  [92, 72],
];
for (const [ovrA, ovrB] of ovrPairs) {
  const clubA = createSyntheticClub(`A${ovrA}`, ovrA);
  const clubB = createSyntheticClub(`B${ovrB}`, ovrB);
  let wA = 0, d = 0, wB = 0, gfA = 0, gfB = 0, shA = 0, shB = 0;
  const N = 100;
  for (let i = 0; i < N; i++) {
    const aHome = i % 2 === 0;
    const res = simulateFullMatch(aHome ? clubA : clubB, aHome ? clubB : clubA, { allowAI: false, label: `ovr-${ovrA}-${ovrB}-${i}` });
    const gA = aHome ? res.match.homeGoals : res.match.awayGoals;
    const gB = aHome ? res.match.awayGoals : res.match.homeGoals;
    const st = normalizeMatchStats(res.match.stats);
    shA += aHome ? st.homeShots : st.awayShots;
    shB += aHome ? st.awayShots : st.homeShots;
    gfA += gA; gfB += gB;
    if (gA > gB) wA++; else if (gA === gB) d++; else wB++;
  }
  const ppgA = ((wA * 3 + d) / N).toFixed(2);
  console.log(`   OVR ${ovrA} vs OVR ${ovrB}:  V=${wA}% E=${d}% D=${wB}% | Gols ${(gfA / N).toFixed(2)} x ${(gfB / N).toFixed(2)} | Chutes ${(shA / N).toFixed(1)} x ${(shB / N).toFixed(1)} | PPG=${ppgA}`);
}
console.log('');

// =========================================================================
// SUITE 3: Diferenciação por Atributos Individuais & Especialistas
// =========================================================================
console.log('3) DIFERENCIAÇÃO POR ATRIBUTOS INDIVIDUAIS (120 jogos cada)');
{
  const gk90 = createSyntheticClub('GK90', 80, { roleOverrides: { GOL: { overall: 90 } } });
  const gk75 = createSyntheticClub('GK75', 80, { roleOverrides: { GOL: { overall: 75 } } });
  let wA = 0, d = 0, ga90 = 0, ga75 = 0, saves90 = 0, saves75 = 0, otA = 0, otB = 0;
  for (let i = 0; i < 120; i++) {
    const aHome = i % 2 === 0;
    const r = simulateFullMatch(aHome ? gk90 : gk75, aHome ? gk75 : gk90, { allowAI: false });
    const st = normalizeMatchStats(r.match.stats);
    const goalsConceded90 = aHome ? r.match.awayGoals : r.match.homeGoals;
    const goalsConceded75 = aHome ? r.match.homeGoals : r.match.awayGoals;
    ga90 += goalsConceded90; ga75 += goalsConceded75;
    saves90 += aHome ? st.homeSaves : st.awaySaves;
    saves75 += aHome ? st.awaySaves : st.homeSaves;
    otA += aHome ? st.awayOnTarget : st.homeOnTarget;
    otB += aHome ? st.homeOnTarget : st.awayOnTarget;
    if (goalsConceded90 < goalsConceded75) wA++; else if (goalsConceded90 === goalsConceded75) d++;
  }
  console.log(`   GOL 90 vs GOL 75 (mesma linha): Defesas ${(saves90 / Math.max(1, otA) * 100).toFixed(1)}% vs ${(saves75 / Math.max(1, otB) * 100).toFixed(1)}% | Gols sofridos ${(ga90 / 120).toFixed(2)} vs ${(ga75 / 120).toFixed(2)} | V=${Math.round(wA / 1.2)}% E=${Math.round(d / 1.2)}%`);
}
{
  const ca92 = createSyntheticClub('CA92', 80, { roleOverrides: { CA: { overall: 92 } } });
  const ca72 = createSyntheticClub('CA72', 80, { roleOverrides: { CA: { overall: 72 } } });
  let gf92 = 0, gf72 = 0, sh92 = 0, sh72 = 0, w92 = 0;
  for (let i = 0; i < 120; i++) {
    const aHome = i % 2 === 0;
    const r = simulateFullMatch(aHome ? ca92 : ca72, aHome ? ca72 : ca92, { allowAI: false });
    const st = normalizeMatchStats(r.match.stats);
    const g92 = aHome ? r.match.homeGoals : r.match.awayGoals;
    const g72 = aHome ? r.match.awayGoals : r.match.homeGoals;
    gf92 += g92; gf72 += g72;
    sh92 += aHome ? st.homeShots : st.awayShots;
    sh72 += aHome ? st.awayShots : st.homeShots;
    if (g92 > g72) w92++;
  }
  console.log(`   CA 92 vs CA 72 (mesmo time):   Gols ${(gf92 / 120).toFixed(2)} vs ${(gf72 / 120).toFixed(2)} | Chutes ${(sh92 / 120).toFixed(1)} vs ${(sh72 / 120).toFixed(1)} | Vitórias CA92=${w92}/120`);
}
{
  const sniper82 = createSyntheticClub('SN82', 80, { roleOverrides: { CA: { overall: 82, finalizacao: 92 } } });
  const nonFin87 = createSyntheticClub('NF87', 80, { roleOverrides: { CA: { overall: 87, finalizacao: 74 } } });
  let gfS = 0, gfN = 0, shS = 0, shN = 0;
  for (let i = 0; i < 120; i++) {
    const aHome = i % 2 === 0;
    const r = simulateFullMatch(aHome ? sniper82 : nonFin87, aHome ? nonFin87 : sniper82, { allowAI: false });
    const st = normalizeMatchStats(r.match.stats);
    gfS += aHome ? r.match.homeGoals : r.match.awayGoals;
    gfN += aHome ? r.match.awayGoals : r.match.homeGoals;
    shS += aHome ? st.homeShots : st.awayShots;
    shN += aHome ? st.awayShots : st.homeShots;
  }
  console.log(`   Especialista CA 82(Fin92) vs CA 87(Fin74): Conversão ${(gfS / Math.max(1, shS) * 100).toFixed(1)}% vs ${(gfN / Math.max(1, shN) * 100).toFixed(1)}% | Gols ${(gfS / 120).toFixed(2)} vs ${(gfN / 120).toFixed(2)}\n`);
}

// =========================================================================
// SUITE 4: Táticas, Formações & Anti-Dominância (Times 80 OVR idênticos)
// =========================================================================
console.log('4) ESTILOS TÁTICOS & FORMAÇÕES (Anti-Dominância, OVR 80 idênticos)');
const presetStats = new Map<string, { matches: number; pts: number; poss: number; passes: number; crosses: number; int: number; gf: number; ga: number; stam: number }>();
for (const p of TACTICAL_PRESETS) {
  presetStats.set(p.name, { matches: 0, pts: 0, poss: 0, passes: 0, crosses: 0, int: 0, gf: 0, ga: 0, stam: 0 });
}

for (let i = 0; i < TACTICAL_PRESETS.length; i++) {
  for (let j = i + 1; j < TACTICAL_PRESETS.length; j++) {
    const pA = TACTICAL_PRESETS[i];
    const pB = TACTICAL_PRESETS[j];
    const fA: Formation =
      pA.id === 'ligacao_direta'
        ? '5-3-2'
        : pA.id === 'posse' || pA.id === 'meio'
        ? '4-2-3-1'
        : pA.id === 'contra_ataque'
        ? '4-4-2'
        : '4-3-3';
    const fB: Formation =
      pB.id === 'ligacao_direta'
        ? '5-3-2'
        : pB.id === 'posse' || pB.id === 'meio'
        ? '4-2-3-1'
        : pB.id === 'contra_ataque'
        ? '4-4-2'
        : '4-3-3';
    const cA = createSyntheticClub(pA.id, 80, { formation: fA, mentality: pA.mentality, tactics: pA.tactics });
    const cB = createSyntheticClub(pB.id, 80, { formation: fB, mentality: pB.mentality, tactics: pB.tactics });
    for (let k = 0; k < 40; k++) {
      const aHome = k % 2 === 0;
      const r = simulateFullMatch(aHome ? cA : cB, aHome ? cB : cA, { allowAI: false });
      const st = normalizeMatchStats(r.match.stats);
      const sA = presetStats.get(pA.name)!;
      const sB = presetStats.get(pB.name)!;
      const gA = aHome ? r.match.homeGoals : r.match.awayGoals;
      const gB = aHome ? r.match.awayGoals : r.match.homeGoals;
      const endA = aHome ? r.homeEnd : r.awayEnd;
      const endB = aHome ? r.awayEnd : r.homeEnd;

      sA.matches++; sB.matches++;
      sA.gf += gA; sA.ga += gB; sB.gf += gB; sB.ga += gA;
      sA.pts += gA > gB ? 3 : gA === gB ? 1 : 0;
      sB.pts += gB > gA ? 3 : gB === gA ? 1 : 0;
      sA.poss += aHome ? st.homePossession : 100 - st.homePossession;
      sB.poss += aHome ? 100 - st.homePossession : st.homePossession;
      sA.passes += aHome ? st.homePasses : st.awayPasses;
      sB.passes += aHome ? st.awayPasses : st.homePasses;
      sA.crosses += aHome ? st.homeCrosses : st.awayCrosses;
      sB.crosses += aHome ? st.awayCrosses : st.homeCrosses;
      sA.int += aHome ? st.homeInterceptions : st.awayInterceptions;
      sB.int += aHome ? st.awayInterceptions : st.homeInterceptions;
      const avgStA = endA.squad.filter((p) => p.isStarter && p.position !== 'GOL').reduce((x, y) => x + y.stamina, 0) / 10;
      const avgStB = endB.squad.filter((p) => p.isStarter && p.position !== 'GOL').reduce((x, y) => x + y.stamina, 0) / 10;
      sA.stam += avgStA;
      sB.stam += avgStB;
    }
  }
}

let maxPresetPpg = 0;
for (const [name, s] of presetStats.entries()) {
  const ppg = s.pts / s.matches;
  maxPresetPpg = Math.max(maxPresetPpg, ppg);
  console.log(
    `   ${name.padEnd(20)} | PPG ${ppg.toFixed(2)} | Posse ${(s.poss / s.matches).toFixed(1)}% | Passes ${(s.passes / s.matches).toFixed(0)} | Cruz ${(s.crosses / s.matches).toFixed(1)} | Int ${(s.int / s.matches).toFixed(1)} | Vigor ${(s.stam / s.matches).toFixed(1)}% | G ${(s.gf / s.matches).toFixed(2)}-${(s.ga / s.matches).toFixed(2)}`
  );
}
console.log('');

// =========================================================================
// SUITE 5: Mando de Campo (160 jogos de times 80 OVR idênticos)
// =========================================================================
{
  const h = createSyntheticClub('HM80', 80);
  const a = createSyntheticClub('AW80', 80);
  let hw = 0, dr = 0, aw = 0;
  for (let i = 0; i < 160; i++) {
    const r = simulateFullMatch(h, a, { allowAI: false });
    if (r.match.homeGoals > r.match.awayGoals) hw++;
    else if (r.match.homeGoals === r.match.awayGoals) dr++;
    else aw++;
  }
  console.log(`5) MANDO DE CAMPO (160 jogos idênticos OVR 80): Casa ${(hw / 1.6).toFixed(1)}% | Empate ${(dr / 1.6).toFixed(1)}% | Fora ${(aw / 1.6).toFixed(1)}%\n`);
}

// =========================================================================
// SUITE 6: Dificuldade da IA dos Treinadores (mesmo elenco 80 OVR — SEM TRAPAÇA!)
// =========================================================================
console.log('6) INTELIGÊNCIA DA IA POR DIFICULDADE (Elencos 80 OVR idênticos, 200 jogos/par)');
const diffPairs: Array<[BotDifficulty, BotDifficulty]> = [
  ['lendario', 'facil'],
  ['dificil', 'facil'],
  ['medio', 'facil'],
  ['lendario', 'medio'],
];
const presetFormationFor = (id: string): Formation =>
  id === 'ligacao_direta' ? '5-3-2' : id === 'posse' || id === 'meio' ? '4-2-3-1' : id === 'contra_ataque' ? '4-4-2' : '4-3-3';
let aiHierarchyOk = true;
for (const [dA, dB] of diffPairs) {
  let wA = 0, dr = 0, wB = 0, changesA = 0, changesB = 0;
  const N = 200;
  for (let i = 0; i < N; i++) {
    const p1 = TACTICAL_PRESETS[i % TACTICAL_PRESETS.length];
    const p2 = TACTICAL_PRESETS[(i + (Math.floor(i / 6) % 3)) % TACTICAL_PRESETS.length];
    const swapTactics = Math.floor(i / 2) % 2 === 1;
    const tA = swapTactics ? p2 : p1;
    const tB = swapTactics ? p1 : p2;
    const cA = createSyntheticClub(dA, 80, {
      botDifficulty: dA,
      formation: presetFormationFor(tA.id),
      mentality: tA.mentality,
      tactics: tA.tactics,
    });
    const cB = createSyntheticClub(dB, 80, {
      botDifficulty: dB,
      formation: presetFormationFor(tB.id),
      mentality: tB.mentality,
      tactics: tB.tactics,
    });
    const aHome = i % 2 === 0;
    const r = simulateFullMatch(aHome ? cA : cB, aHome ? cB : cA, { allowAI: true });
    const gA = aHome ? r.match.homeGoals : r.match.awayGoals;
    const gB = aHome ? r.match.awayGoals : r.match.homeGoals;
    if (gA > gB) wA++; else if (gA === gB) dr++; else wB++;
    changesA += aHome ? (r.match.simState?.homeAI.tacticalChangesCount ?? 0) : (r.match.simState?.awayAI.tacticalChangesCount ?? 0);
    changesB += aHome ? (r.match.simState?.awayAI.tacticalChangesCount ?? 0) : (r.match.simState?.homeAI.tacticalChangesCount ?? 0);
  }
  const ppgA = (wA * 3 + dr) / N;
  const ppgB = (wB * 3 + dr) / N;
  if (dA === 'lendario' && dB === 'facil' && ppgA <= ppgB) aiHierarchyOk = false;
  console.log(`   ${dA.padEnd(9)} vs ${dB.padEnd(7)}: V=${wA} E=${dr} D=${wB} | PPG ${ppgA.toFixed(2)} vs ${ppgB.toFixed(2)} | Ajustes IA: ${(changesA / N).toFixed(1)} vs ${(changesB / N).toFixed(1)}`);
}

// =========================================================================
// VERIFICAÇÃO FINAL DE METAS & INVARIANTES
// =========================================================================
console.log('\n==================================================================');
console.log(`INVARIANTES ESTATÍSTICOS (${invariantFailures.length} falhas): ${invariantFailures.length === 0 ? 'PASS' : 'FAIL'}`);
if (invariantFailures.length > 0) {
  invariantFailures.slice(0, 10).forEach((e) => console.error('  !', e));
}

const checks = [
  { name: 'Gols/jogo (2.2-2.8)', ok: avgGoalsMatch >= BRASILEIRAO_TARGETS.goalsPerMatch[0] && avgGoalsMatch <= BRASILEIRAO_TARGETS.goalsPerMatch[1], val: avgGoalsMatch.toFixed(2) },
  { name: 'Chutes/time (10-16)', ok: avgShotsTeam >= BRASILEIRAO_TARGETS.shotsPerTeam[0] && avgShotsTeam <= BRASILEIRAO_TARGETS.shotsPerTeam[1], val: avgShotsTeam.toFixed(2) },
  { name: 'No Gol/time (3-6)', ok: avgOnTargetTeam >= BRASILEIRAO_TARGETS.onTargetPerTeam[0] && avgOnTargetTeam <= BRASILEIRAO_TARGETS.onTargetPerTeam[1], val: avgOnTargetTeam.toFixed(2) },
  { name: 'Amarelos/jogo (3-6)', ok: avgYellowsMatch >= BRASILEIRAO_TARGETS.yellowsPerMatch[0] && avgYellowsMatch <= BRASILEIRAO_TARGETS.yellowsPerMatch[1], val: avgYellowsMatch.toFixed(2) },
  { name: 'Expulsões raras (0.05-0.28)', ok: avgRedsMatch >= BRASILEIRAO_TARGETS.redsPerMatch[0] && avgRedsMatch <= BRASILEIRAO_TARGETS.redsPerMatch[1], val: avgRedsMatch.toFixed(3) },
  { name: 'Acerto passe (74-88%)', ok: avgPassAcc >= BRASILEIRAO_TARGETS.passAccuracyPct[0] && avgPassAcc <= BRASILEIRAO_TARGETS.passAccuracyPct[1], val: `${avgPassAcc.toFixed(1)}%` },
  { name: 'Anti-dominância tática (max PPG < 1.85)', ok: maxPresetPpg < 1.85, val: maxPresetPpg.toFixed(2) },
  { name: 'Hierarquia IA sem trapaça (Lendário > Fácil)', ok: aiHierarchyOk, val: aiHierarchyOk ? 'OK' : 'FAIL' },
];

for (const c of checks) {
  console.log(`  [${c.ok ? 'PASS' : 'WARN'}] ${c.name.padEnd(42)} => ${c.val}`);
}
console.log('==================================================================');

if (invariantFailures.length > 0 || checks.some((c) => !c.ok)) {
  process.exitCode = 1;
}
