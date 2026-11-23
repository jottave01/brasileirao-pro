import {
  Club,
  ClubTactics,
  Formation,
  Match,
  MatchEvent,
  MatchSimState,
  MatchStats,
  Player,
  PlayerPosition,
  PlayPhase,
  TacticalMentality,
} from '../types/league';
import {
  createInitialBotAIMemory,
  evaluateBotSubstitution,
  evaluateBotTacticalDecision,
} from './botManagerAI';
import { SIM_BALANCE } from './matchBalance';
import {
  ensurePlayerAttributes,
  getEffectiveMatchAttribute,
  getPositionFit,
} from './playerAttributes';
import {
  computeTacticalBehaviorProfile,
  FORMATION_LAYOUT,
  getEffectiveStarters,
  TacticalBehaviorProfile,
} from './tacticalEngine';

export interface PitchActor {
  player: Player;
  slotIndex: number;
  slotRole: PlayerPosition;
  effectiveOvr: number;
}

export function normalizeMatchStats(raw?: Partial<MatchStats>): Required<MatchStats> {
  return {
    homePossession: raw?.homePossession ?? 50,
    homeShots: raw?.homeShots ?? 0,
    awayShots: raw?.awayShots ?? 0,
    homeOnTarget: raw?.homeOnTarget ?? 0,
    awayOnTarget: raw?.awayOnTarget ?? 0,
    homeCorners: raw?.homeCorners ?? 0,
    awayCorners: raw?.awayCorners ?? 0,
    homeFouls: raw?.homeFouls ?? 0,
    awayFouls: raw?.awayFouls ?? 0,
    homeYellowCards: raw?.homeYellowCards ?? 0,
    awayYellowCards: raw?.awayYellowCards ?? 0,
    homeRedCards: raw?.homeRedCards ?? 0,
    awayRedCards: raw?.awayRedCards ?? 0,
    homePasses: raw?.homePasses ?? 0,
    awayPasses: raw?.awayPasses ?? 0,
    homePassesCompleted: raw?.homePassesCompleted ?? 0,
    awayPassesCompleted: raw?.awayPassesCompleted ?? 0,
    homeTackles: raw?.homeTackles ?? 0,
    awayTackles: raw?.awayTackles ?? 0,
    homeInterceptions: raw?.homeInterceptions ?? 0,
    awayInterceptions: raw?.awayInterceptions ?? 0,
    homeSaves: raw?.homeSaves ?? 0,
    awaySaves: raw?.awaySaves ?? 0,
    homeCrosses: raw?.homeCrosses ?? 0,
    awayCrosses: raw?.awayCrosses ?? 0,
    homeOffsides: raw?.homeOffsides ?? 0,
    awayOffsides: raw?.awayOffsides ?? 0,
    homeBigChances: raw?.homeBigChances ?? 0,
    awayBigChances: raw?.awayBigChances ?? 0,
    homePossessionTicks: raw?.homePossessionTicks ?? 0,
    awayPossessionTicks: raw?.awayPossessionTicks ?? 0,
  };
}

export function createInitialSimState(homeClub: Club, awayClub: Club): MatchSimState {
  const playerRatings: Record<string, number> = {};
  for (const s of homeClub.lineupSlots ?? []) {
    playerRatings[s.playerId] = 6.5;
  }
  for (const s of awayClub.lineupSlots ?? []) {
    playerRatings[s.playerId] = 6.5;
  }
  return {
    ballZone: 3,
    ballLane: 'center',
    possessionSide: 'home',
    momentumHome: 0,
    homeCountersConceded: 0,
    awayCountersConceded: 0,
    homeMidfieldDuelsWon: 0,
    awayMidfieldDuelsWon: 0,
    homeFlankAttacks: 0,
    awayFlankAttacks: 0,
    homeStrikerTouches: 0,
    awayStrikerTouches: 0,
    homeHighRecoveries: 0,
    awayHighRecoveries: 0,
    homeYellowCardedIds: [],
    awayYellowCardedIds: [],
    homeRedCardedIds: [],
    awayRedCardedIds: [],
    playerRatings,
    homeAI: createInitialBotAIMemory(),
    awayAI: createInitialBotAIMemory(),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function logisticDuelProb(
  attScore: number,
  defScore: number,
  baseProb: number,
  sensitivity = SIM_BALANCE.duelScaleDivisor,
  minP = 0.05,
  maxP = 0.95
): number {
  const diff = (attScore - defScore) / sensitivity;
  const baseLogit = Math.log(baseProb / Math.max(0.001, 1 - baseProb));
  const p = 1 / (1 + Math.exp(-(baseLogit + diff)));
  return clamp(p, minP, maxP);
}

function getActiveActors(club: Club, redCardedIds: string[]): PitchActor[] {
  const slots = club.lineupSlots ?? [];
  const actors: PitchActor[] = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (redCardedIds.includes(slot.playerId)) continue;
    const p = club.squad.find((item) => item.id === slot.playerId);
    if (!p) continue;
    actors.push({
      player: p,
      slotIndex: i,
      slotRole: slot.role,
      effectiveOvr: getPositionFit(p, slot.role).effectiveOvr,
    });
  }
  if (actors.length >= 8) return actors;
  return [...club.squad]
    .filter((p) => !redCardedIds.includes(p.id))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11)
    .map((p, idx) => ({
      player: p,
      slotIndex: idx,
      slotRole: p.position,
      effectiveOvr: p.overall,
    }));
}

function pickWeightedActor(
  actors: PitchActor[],
  preferredRoles: PlayerPosition[],
  scoring: (actor: PitchActor) => number,
  excludeId?: string
): PitchActor {
  const nonExcluded = excludeId ? actors.filter((a) => a.player.id !== excludeId) : actors;
  const poolSource = nonExcluded.length > 0 ? nonExcluded : actors;
  const matched = poolSource.filter((a) => preferredRoles.includes(a.slotRole));
  const pool =
    matched.length > 0
      ? matched
      : poolSource.filter((a) => a.slotRole !== 'GOL');
  const finalPool = pool.length > 0 ? pool : poolSource;

  const weights = finalPool.map((a) => Math.max(0.25, scoring(a)));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < finalPool.length; i++) {
    r -= weights[i];
    if (r <= 0) return finalPool[i];
  }
  return finalPool[0];
}

function pickKeeperActor(actors: PitchActor[]): PitchActor {
  const gk = actors.find((a) => a.slotRole === 'GOL') ?? actors.find((a) => a.player.position === 'GOL');
  return gk ?? actors[0];
}

function getActorPitchCoords(
  club: Club,
  playerId: string | undefined,
  isHome: boolean,
  zone: 1 | 2 | 3 | 4 | 5,
  lane: 'left' | 'center' | 'right'
): { x: number; y: number } {
  const layout = FORMATION_LAYOUT[club.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const slotIdx = playerId ? (club.lineupSlots ?? []).findIndex((s) => s.playerId === playerId) : -1;
  const spec = slotIdx >= 0 ? layout[slotIdx] : undefined;

  const zoneXMap = isHome ? [12, 31, 50, 72, 87] : [88, 69, 50, 28, 13];
  const baseZoneX = zoneXMap[zone - 1];

  const laneYMap =
    lane === 'left'
      ? isHome
        ? 22
        : 78
      : lane === 'right'
      ? isHome
        ? 78
        : 22
      : 50;

  if (!spec) {
    return { x: baseZoneX, y: laneYMap };
  }

  const slotBaseX = isHome
    ? 8 + ((100 - spec.pitchY) / 100) * 62
    : 92 - ((100 - spec.pitchY) / 100) * 62;
  const slotBaseY = isHome ? spec.pitchX : 100 - spec.pitchX;

  return {
    x: clamp(Math.round(baseZoneX * 0.65 + slotBaseX * 0.35), 6, 94),
    y: clamp(Math.round(laneYMap * 0.6 + slotBaseY * 0.4), 10, 90),
  };
}

function bumpRating(
  ratings: Record<string, number>,
  playerId: string | undefined,
  delta: number
): void {
  if (!playerId) return;
  const cur = ratings[playerId] ?? 6.5;
  ratings[playerId] = Math.round(clamp(cur + delta, 4.0, 10.0) * 100) / 100;
}

function getBaseRoleStaminaDrain(role: PlayerPosition, formation: Formation): number {
  switch (role) {
    case 'GOL':
      return 0.06;
    case 'ZAG':
      return 0.23;
    case 'CA':
      return 0.32;
    case 'MEI':
      return 0.36;
    case 'VOL':
      return 0.4;
    case 'MC':
      return 0.41;
    case 'PE':
    case 'PD':
      return 0.44;
    case 'LD':
    case 'LE':
      return formation === '3-5-2' || formation === '3-4-3' ? 0.49 : 0.44;
  }
}

export function computeClubPlayerDrains(
  club: Club,
  stepMinutes: number,
  activePlayerId?: string,
  secondaryPlayerId?: string,
  redCardedIds: string[] = []
): Record<string, number> {
  const drains: Record<string, number> = {};
  const behavior = computeTacticalBehaviorProfile(club, undefined, redCardedIds.length);
  const slotByPlayerId = new Map<string, PlayerPosition>();
  (club.lineupSlots ?? []).forEach((s) => slotByPlayerId.set(s.playerId, s.role));

  club.squad.forEach((p) => {
    if (!p.isStarter || redCardedIds.includes(p.id)) return;
    const role = slotByPlayerId.get(p.id) ?? p.position;
    const attrs = ensurePlayerAttributes(p);
    // Resistência individual reduz desgaste proporcionalmente
    const staminaShield = clamp(1.16 - (attrs.resistencia - 60) * 0.0085, 0.7, 1.18);
    let drain =
      getBaseRoleStaminaDrain(role, club.formation) *
      behavior.staminaBurnRate *
      SIM_BALANCE.baseDrainScale *
      staminaShield *
      stepMinutes;

    if (p.id === activePlayerId) {
      drain += (role === 'GOL' ? 0.08 : 0.14) * stepMinutes;
    } else if (p.id === secondaryPlayerId) {
      drain += (role === 'GOL' ? 0.06 : 0.08) * stepMinutes;
    }

    drains[p.id] = Math.round(drain * 100) / 100;
  });

  return drains;
}

function remapFormationStartersPreservingPitch(club: Club, nextFormation: Formation): Club {
  const layout = FORMATION_LAYOUT[nextFormation];
  const currentStarters = (club.lineupSlots ?? [])
    .map((s) => club.squad.find((p) => p.id === s.playerId))
    .filter((p): p is Player => Boolean(p));

  if (currentStarters.length !== 11) {
    return { ...club, formation: nextFormation };
  }

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
    formation: nextFormation,
    lineupSlots: nextSlots,
    squad: club.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
  };
}

interface HighlightCandidate {
  priority: number;
  ballX: number;
  ballY: number;
  fromBallX?: number;
  fromBallY?: number;
  activePlayerId?: string;
  secondaryPlayerId?: string;
  possessionSide: 'home' | 'away';
  playPhase: PlayPhase;
  text: string;
}

type PossessionContext =
  | 'kickoff'
  | 'build_up'
  | 'positional'
  | 'counter'
  | 'high_recovery'
  | 'corner'
  | 'free_kick';

type ShotContext = 'penalti' | '1v1' | 'area_livre' | 'area_marcada' | 'cabecada' | 'rebote' | 'fora_area';

export function simulateMatchMinuteStep(
  match: Match,
  homeClub: Club,
  awayClub: Club,
  stepMinutes = 1
): {
  match: Match;
  homeStaminaDrain: number;
  awayStaminaDrain: number;
  homePlayerDrains?: Record<string, number>;
  awayPlayerDrains?: Record<string, number>;
  homeTacticUpdate?: { formation: Formation; mentality: TacticalMentality; tactics?: ClubTactics };
  awayTacticUpdate?: { formation: Formation; mentality: TacticalMentality; tactics?: ClubTactics };
  homeAutoSub?: { slotIndex: number; outPlayerId: string; inPlayerId: string };
  awayAutoSub?: { slotIndex: number; outPlayerId: string; inPlayerId: string };
} {
  if (match.status === 'finalizada') {
    return { match, homeStaminaDrain: 0, awayStaminaDrain: 0 };
  }

  // Intervalo de 30s aos 45'
  if (match.isHalftime) {
    const nextHt = Math.max(0, match.halftimeRemainingSec - 3);
    if (nextHt > 0) {
      return {
        match: {
          ...match,
          halftimeRemainingSec: nextHt,
          lastPlayText: `Intervalo (${nextHt}s) — Faça substituições e ajustes táticos!`,
        },
        homeStaminaDrain: 0,
        awayStaminaDrain: 0,
      };
    }
    return {
      match: {
        ...match,
        isHalftime: false,
        halftimeRemainingSec: 0,
        ballX: 50,
        ballY: 50,
        activePlayerId: undefined,
        secondaryPlayerId: undefined,
        fromBallX: undefined,
        fromBallY: undefined,
        playPhase: 'kickoff',
        lastPlayText: 'Apita o árbitro! Começa o 2º tempo.',
      },
      homeStaminaDrain: 0,
      awayStaminaDrain: 0,
    };
  }

  const prevMin = match.currentMinute;
  const targetMinute = Math.min(90, prevMin + stepMinutes);
  const enteredHalftime = prevMin < 45 && targetMinute >= 45 && stepMinutes <= 3;

  const stats = normalizeMatchStats(match.stats);
  const newEvents: MatchEvent[] = [...match.events];
  const simState: MatchSimState = match.simState
    ? {
        ...match.simState,
        homeYellowCardedIds: [...match.simState.homeYellowCardedIds],
        awayYellowCardedIds: [...match.simState.awayYellowCardedIds],
        homeRedCardedIds: [...match.simState.homeRedCardedIds],
        awayRedCardedIds: [...match.simState.awayRedCardedIds],
        playerRatings: { ...match.simState.playerRatings },
        homeAI: { ...match.simState.homeAI, recentReasons: [...match.simState.homeAI.recentReasons] },
        awayAI: { ...match.simState.awayAI, recentReasons: [...match.simState.awayAI.recentReasons] },
      }
    : createInitialSimState(homeClub, awayClub);

  let effHome = homeClub;
  let effAway = awayClub;
  let homeGoals = match.homeGoals;
  let awayGoals = match.awayGoals;
  let homeSubsUsed = match.homeSubsUsed;
  let awaySubsUsed = match.awaySubsUsed;
  const homeSubbedOutIds = [...match.homeSubbedOutIds];
  const awaySubbedOutIds = [...match.awaySubbedOutIds];

  let latestHomeTacticUpdate:
    | { formation: Formation; mentality: TacticalMentality; tactics?: ClubTactics }
    | undefined;
  let latestAwayTacticUpdate:
    | { formation: Formation; mentality: TacticalMentality; tactics?: ClubTactics }
    | undefined;
  let latestHomeAutoSub:
    | { slotIndex: number; outPlayerId: string; inPlayerId: string }
    | undefined;
  let latestAwayAutoSub:
    | { slotIndex: number; outPlayerId: string; inPlayerId: string }
    | undefined;

  const manualList = match.manualControlClubs ?? [];
  const homeAllowAI = !manualList.includes(effHome.id);
  const awayAllowAI = !manualList.includes(effAway.id);

  let bestHighlight: HighlightCandidate = {
    priority: 0,
    ballX: match.ballX,
    ballY: match.ballY,
    possessionSide: simState.possessionSide,
    playPhase: match.playPhase,
    text: match.lastPlayText,
  };

  const considerHighlight = (cand: HighlightCandidate) => {
    if (cand.priority >= bestHighlight.priority) {
      bestHighlight = cand;
    }
  };

  const totalHomeDrains: Record<string, number> = {};
  const totalAwayDrains: Record<string, number> = {};
  let lastMinuteActiveId: string | undefined;
  let lastMinuteSecondaryId: string | undefined;

  for (let curMin = prevMin + 1; curMin <= targetMinute; curMin++) {
    const stepSnapshotMatch: Match = {
      ...match,
      currentMinute: curMin - 1,
      homeGoals,
      awayGoals,
      stats,
    };

    // 1. Análise e decisão do treinador IA (sem bônus artificiais de atributos!)
    const homeEval = evaluateBotTacticalDecision({
      ownClub: effHome,
      oppClub: effAway,
      match: stepSnapshotMatch,
      simState,
      isHome: true,
      allowAIControl: homeAllowAI,
    });
    simState.homeAI = homeEval.nextMemory;
    if (homeEval.decision) {
      effHome = remapFormationStartersPreservingPitch(effHome, homeEval.decision.formation);
      effHome = {
        ...effHome,
        mentality: homeEval.decision.mentality,
        tactics: homeEval.decision.tactics,
      };
      latestHomeTacticUpdate = {
        formation: homeEval.decision.formation,
        mentality: homeEval.decision.mentality,
        tactics: homeEval.decision.tactics,
      };
      newEvents.push({
        minute: curMin,
        type: 'tatica',
        clubId: effHome.id,
        playerName: effHome.managerName,
        description: `📋 ${homeEval.decision.reason}`,
      });
      considerHighlight({
        priority: 32,
        ballX: 50,
        ballY: 50,
        possessionSide: simState.possessionSide,
        playPhase: 'meio_campo',
        text: `📋 ${homeEval.decision.reason}`,
      });
    }

    const awayEval = evaluateBotTacticalDecision({
      ownClub: effAway,
      oppClub: effHome,
      match: stepSnapshotMatch,
      simState,
      isHome: false,
      allowAIControl: awayAllowAI,
    });
    simState.awayAI = awayEval.nextMemory;
    if (awayEval.decision) {
      effAway = remapFormationStartersPreservingPitch(effAway, awayEval.decision.formation);
      effAway = {
        ...effAway,
        mentality: awayEval.decision.mentality,
        tactics: awayEval.decision.tactics,
      };
      latestAwayTacticUpdate = {
        formation: awayEval.decision.formation,
        mentality: awayEval.decision.mentality,
        tactics: awayEval.decision.tactics,
      };
      newEvents.push({
        minute: curMin,
        type: 'tatica',
        clubId: effAway.id,
        playerName: effAway.managerName,
        description: `📋 ${awayEval.decision.reason}`,
      });
      considerHighlight({
        priority: 32,
        ballX: 50,
        ballY: 50,
        possessionSide: simState.possessionSide,
        playPhase: 'meio_campo',
        text: `📋 ${awayEval.decision.reason}`,
      });
    }

    // 2. Substituições inteligentes da IA
    if (homeAllowAI && homeSubsUsed < 5) {
      const subPick = evaluateBotSubstitution({
        club: effHome,
        oppClub: effAway,
        match: stepSnapshotMatch,
        simState,
        isHome: true,
        subsUsed: homeSubsUsed,
        subbedOutIds: homeSubbedOutIds,
      });
      if (subPick) {
        homeSubsUsed += 1;
        homeSubbedOutIds.push(subPick.outPlayer.id);
        const nextSlots = (effHome.lineupSlots ?? []).map((s, idx) =>
          idx === subPick.slotIndex ? { ...s, playerId: subPick.inPlayer.id } : s
        );
        const starterIds = new Set(nextSlots.map((s) => s.playerId));
        effHome = {
          ...effHome,
          lineupSlots: nextSlots,
          squad: effHome.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
        };
        simState.playerRatings[subPick.inPlayer.id] = simState.playerRatings[subPick.inPlayer.id] ?? 6.5;
        latestHomeAutoSub = {
          slotIndex: subPick.slotIndex,
          outPlayerId: subPick.outPlayer.id,
          inPlayerId: subPick.inPlayer.id,
        };
        newEvents.push({
          minute: curMin,
          type: 'substituicao',
          clubId: effHome.id,
          playerName: subPick.inPlayer.knownName,
          playerId: subPick.inPlayer.id,
          description: `🔄 ${effHome.shortName}: entra ${subPick.inPlayer.knownName}, sai ${subPick.outPlayer.knownName} (${subPick.reason})`,
        });
      }
    }

    if (awayAllowAI && awaySubsUsed < 5) {
      const subPick = evaluateBotSubstitution({
        club: effAway,
        oppClub: effHome,
        match: stepSnapshotMatch,
        simState,
        isHome: false,
        subsUsed: awaySubsUsed,
        subbedOutIds: awaySubbedOutIds,
      });
      if (subPick) {
        awaySubsUsed += 1;
        awaySubbedOutIds.push(subPick.outPlayer.id);
        const nextSlots = (effAway.lineupSlots ?? []).map((s, idx) =>
          idx === subPick.slotIndex ? { ...s, playerId: subPick.inPlayer.id } : s
        );
        const starterIds = new Set(nextSlots.map((s) => s.playerId));
        effAway = {
          ...effAway,
          lineupSlots: nextSlots,
          squad: effAway.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
        };
        simState.playerRatings[subPick.inPlayer.id] = simState.playerRatings[subPick.inPlayer.id] ?? 6.5;
        latestAwayAutoSub = {
          slotIndex: subPick.slotIndex,
          outPlayerId: subPick.outPlayer.id,
          inPlayerId: subPick.inPlayer.id,
        };
        newEvents.push({
          minute: curMin,
          type: 'substituicao',
          clubId: effAway.id,
          playerName: subPick.inPlayer.knownName,
          playerId: subPick.inPlayer.id,
          description: `🔄 ${effAway.shortName}: entra ${subPick.inPlayer.knownName}, sai ${subPick.outPlayer.knownName} (${subPick.reason})`,
        });
      }
    }

    // 3. Preparação dos atletas ativos e perfis comportamentais reais para o minuto
    const homeActors = getActiveActors(effHome, simState.homeRedCardedIds);
    const awayActors = getActiveActors(effAway, simState.awayRedCardedIds);

    const homeProfile = computeTacticalBehaviorProfile(
      effHome,
      homeActors.map((a) => ({ ...a.player, slotRole: a.slotRole })),
      simState.homeRedCardedIds.length
    );
    const awayProfile = computeTacticalBehaviorProfile(
      effAway,
      awayActors.map((a) => ({ ...a.player, slotRole: a.slotRole })),
      simState.awayRedCardedIds.length
    );

    const avgTempo = (homeProfile.tempo + awayProfile.tempo) / 2;
    const rawPossCount = SIM_BALANCE.possessionsPerMinuteBase * avgTempo;
    const baseInt = Math.floor(rawPossCount);
    const possessionsInMinute = clamp(
      baseInt + (Math.random() < rawPossCount - baseInt ? 1 : 0),
      2,
      5
    );

    let attSide: 'home' | 'away' = simState.possessionSide;
    let attZone: 1 | 2 | 3 | 4 | 5 = attSide === 'home' ? simState.ballZone : ((6 - simState.ballZone) as 1 | 2 | 3 | 4 | 5);
    let lane: 'left' | 'center' | 'right' = simState.ballLane;
    let context: PossessionContext = curMin === 1 ? 'kickoff' : 'positional';

    // Helper de seleção de ator coerente por zona e corredor
    const selectZoneCarrier = (
      actors: PitchActor[],
      profile: TacticalBehaviorProfile,
      zone: 1 | 2 | 3 | 4 | 5,
      curLane: 'left' | 'center' | 'right',
      ctx: PossessionContext,
      excludeId?: string
    ): PitchActor => {
      if (zone === 1) {
        const roles: PlayerPosition[] =
          ctx === 'build_up' || Math.random() < 0.34 ? ['GOL', 'ZAG'] : ['ZAG', 'LD', 'LE', 'VOL'];
        return pickWeightedActor(
          actors,
          roles,
          (a) => getEffectiveMatchAttribute(a.player, 'passe', a.slotRole) * profile.compatibility.cohesionMultiplier,
          excludeId
        );
      }
      if (zone === 2) {
        const roles: PlayerPosition[] =
          curLane === 'center' ? ['ZAG', 'VOL', 'MC'] : ['LD', 'LE', 'ZAG', 'VOL'];
        return pickWeightedActor(
          actors,
          roles,
          (a) => getEffectiveMatchAttribute(a.player, 'passe', a.slotRole),
          excludeId
        );
      }
      if (zone === 3) {
        const roles: PlayerPosition[] =
          curLane === 'center'
            ? ['VOL', 'MC', 'MEI']
            : ['LD', 'LE', 'PE', 'PD', 'MC'];
        return pickWeightedActor(
          actors,
          roles,
          (a) =>
            getEffectiveMatchAttribute(a.player, 'passe', a.slotRole) * 0.6 +
            getEffectiveMatchAttribute(a.player, 'visao', a.slotRole) * 0.4,
          excludeId
        );
      }
      if (zone === 4) {
        const roles: PlayerPosition[] =
          curLane === 'center'
            ? ['MEI', 'MC', 'CA', 'VOL']
            : ['PE', 'PD', 'LD', 'LE', 'MEI'];
        return pickWeightedActor(
          actors,
          roles,
          (a) =>
            getEffectiveMatchAttribute(a.player, 'visao', a.slotRole) * 0.45 +
            getEffectiveMatchAttribute(a.player, 'drible', a.slotRole) * 0.35 +
            getEffectiveMatchAttribute(a.player, 'velocidade', a.slotRole) * 0.2,
          excludeId
        );
      }
      // Zona 5 (área)
      const roles: PlayerPosition[] =
        ctx === 'corner'
          ? ['CA', 'ZAG', 'PE', 'PD']
          : ['CA', 'PE', 'PD', 'MEI'];
      return pickWeightedActor(
        actors,
        roles,
        (a) =>
          getEffectiveMatchAttribute(a.player, 'posicionamento', a.slotRole) * 0.55 +
          getEffectiveMatchAttribute(a.player, 'finalizacao', a.slotRole) * 0.45,
        excludeId
      );
    };

    const selectDefenderForDuel = (
      defActors: PitchActor[],
      attZoneFromAttPerspective: 1 | 2 | 3 | 4 | 5,
      curLane: 'left' | 'center' | 'right',
      isPressing = false
    ): PitchActor => {
      // Zona 5 atacante = Zona 1 defensiva (ZAGs e laterais)
      if (attZoneFromAttPerspective >= 5) {
        return pickWeightedActor(defActors, ['ZAG', 'VOL', 'LD', 'LE'], (a) =>
          getEffectiveMatchAttribute(a.player, 'marcacao', a.slotRole, { isPressing })
        );
      }
      if (attZoneFromAttPerspective === 4) {
        const roles: PlayerPosition[] =
          curLane === 'center' ? ['VOL', 'ZAG', 'MC'] : ['LD', 'LE', 'ZAG', 'VOL'];
        return pickWeightedActor(defActors, roles, (a) =>
          getEffectiveMatchAttribute(a.player, 'desarme', a.slotRole, { isPressing })
        );
      }
      if (attZoneFromAttPerspective === 3) {
        return pickWeightedActor(defActors, ['VOL', 'MC', 'MEI', 'LD', 'LE'], (a) =>
          getEffectiveMatchAttribute(a.player, 'desarme', a.slotRole, { isPressing })
        );
      }
      // Zona 1 ou 2 atacante -> atacantes/pontas/meias adversários pressionam a saída
      return pickWeightedActor(defActors, ['CA', 'PE', 'PD', 'MEI', 'MC'], (a) =>
        getEffectiveMatchAttribute(a.player, 'marcacao', a.slotRole, { isPressing }) * 0.5 +
        getEffectiveMatchAttribute(a.player, 'velocidade', a.slotRole, { isPressing }) * 0.5
      );
    };

    for (let possIdx = 0; possIdx < possessionsInMinute; possIdx++) {
      let lastCarrier: PitchActor | undefined;
      let lastAssister: PitchActor | undefined;
      let passStreak = 0;
      let penaltyPending = false;
      let directFreeKickShotPending = false;
      let freeKickLane: 'left' | 'center' | 'right' = lane;
      let possessionAlive = true;

      for (let step = 0; step < SIM_BALANCE.maxStepsPerPossession && possessionAlive; step++) {
        const isHomeAtt = attSide === 'home';
        const attClub = isHomeAtt ? effHome : effAway;
        const defClub = isHomeAtt ? effAway : effHome;
        const attActors = isHomeAtt ? homeActors : awayActors;
        const defActors = isHomeAtt ? awayActors : homeActors;
        const attProfile = isHomeAtt ? homeProfile : awayProfile;
        const defProfile = isHomeAtt ? awayProfile : homeProfile;
        const attCrowd = isHomeAtt ? SIM_BALANCE.homeCrowdEdge : 0;
        const defCrowd = !isHomeAtt ? SIM_BALANCE.homeCrowdEdge : 0;
        const attRedCount = isHomeAtt ? simState.homeRedCardedIds.length : simState.awayRedCardedIds.length;
        const defRedCount = isHomeAtt ? simState.awayRedCardedIds.length : simState.homeRedCardedIds.length;

        const attCohesionBonus = (attProfile.compatibility.cohesionMultiplier - 1) * 24;
        const defCohesionBonus = (defProfile.compatibility.cohesionMultiplier - 1) * 24;
        const attManPenalty = attRedCount * SIM_BALANCE.redCardDuelPenaltyPerPlayer;
        const defManPenalty = defRedCount * SIM_BALANCE.redCardDuelPenaltyPerPlayer;

        // Tick de posse por fase simulada
        if (isHomeAtt) stats.homePossessionTicks += 1;
        else stats.awayPossessionTicks += 1;

        const carrier =
          lastCarrier ?? selectZoneCarrier(attActors, attProfile, attZone, lane, context);
        lastMinuteActiveId = carrier.player.id;

        if (carrier.slotRole === 'CA') {
          if (isHomeAtt) simState.homeStrikerTouches += 1;
          else simState.awayStrikerTouches += 1;
        }
        if (lane !== 'center' && attZone >= 4) {
          if (isHomeAtt) simState.homeFlankAttacks += 1;
          else simState.awayFlankAttacks += 1;
        }

        const resolveShot = (shooter: PitchActor, shotCtx: ShotContext, assister?: PitchActor) => {
          const oppDefender = selectDefenderForDuel(defActors, 5, lane);
          const oppKeeper = pickKeeperActor(defActors);
          const isBigChance =
            shotCtx === 'penalti' ||
            shotCtx === '1v1' ||
            shotCtx === 'area_livre' ||
            shotCtx === 'rebote';

          if (isHomeAtt) stats.homeShots += 1;
          else stats.awayShots += 1;
          if (isBigChance) {
            if (isHomeAtt) stats.homeBigChances += 1;
            else stats.awayBigChances += 1;
          }

          const shooterFinish = getEffectiveMatchAttribute(
            shooter.player,
            'finalizacao',
            shooter.slotRole
          );
          const shooterPos = getEffectiveMatchAttribute(
            shooter.player,
            'posicionamento',
            shooter.slotRole
          );
          const defBlockRating =
            (getEffectiveMatchAttribute(oppDefender.player, 'marcacao', oppDefender.slotRole) * 0.5 +
              getEffectiveMatchAttribute(oppDefender.player, 'posicionamento', oppDefender.slotRole) * 0.5) +
            defCrowd +
            defCohesionBonus -
            defManPenalty;

          // 1. Checagem de bloqueio defensivo (aumentado em bloco baixo / linha recuada)
          const blockEligible = shotCtx !== 'penalti' && shotCtx !== '1v1' && shotCtx !== 'rebote';
          const effectiveBoxCompact = Math.max(
            0.84,
            defProfile.boxCompactness - Math.min(0.16, passStreak * 0.032)
          );
          if (blockEligible) {
            const contextBlockMult =
              shotCtx === 'fora_area'
                ? 1.45
                : shotCtx === 'area_marcada'
                ? 1.15
                : 0.45;
            const blockProb = clamp(
              logisticDuelProb(
                defBlockRating,
                shooterFinish * 0.5 + shooterPos * 0.5 + attCrowd,
                SIM_BALANCE.shotBlockBaseRate * effectiveBoxCompact * contextBlockMult,
                SIM_BALANCE.duelScaleDivisor,
                0.03,
                0.38
              ),
              0.03,
              0.38
            );
            if (Math.random() < blockProb) {
              bumpRating(simState.playerRatings, oppDefender.player.id, 0.14);
              const fromCoords = getActorPitchCoords(attClub, shooter.player.id, isHomeAtt, attZone, lane);
              considerHighlight({
                priority: 45,
                ballX: isHomeAtt ? 88 : 12,
                ballY: 50,
                fromBallX: fromCoords.x,
                fromBallY: fromCoords.y,
                activePlayerId: oppDefender.player.id,
                secondaryPlayerId: shooter.player.id,
                possessionSide: isHomeAtt ? 'home' : 'away',
                playPhase: isHomeAtt ? 'finalizacao_casa' : 'finalizacao_fora',
                text: `🛡️ ${oppDefender.player.knownName} se joga na frente e bloqueia o chute de ${shooter.player.knownName}!`,
              });

              if (Math.random() < SIM_BALANCE.cornerFromBlockedOrSavedShot) {
                if (isHomeAtt) stats.homeCorners += 1;
                else stats.awayCorners += 1;
                context = 'corner';
                attZone = 5;
                lane = Math.random() < 0.5 ? 'left' : 'right';
                lastCarrier = undefined;
                lastAssister = undefined;
                return;
              }
              possessionAlive = false;
              attSide = isHomeAtt ? 'away' : 'home';
              attZone = 2;
              lane = 'center';
              context = defProfile.tactics.buildUpStyle === 'Contra-ataques rápidos' ? 'counter' : 'positional';
              return;
            }
          }

          // 2. Pontaria (no gol vs para fora)
          const baseAccuracy =
            shotCtx === 'penalti'
              ? 0.86
              : shotCtx === '1v1'
              ? 0.6
              : shotCtx === 'area_livre'
              ? 0.5
              : shotCtx === 'rebote'
              ? 0.52
              : shotCtx === 'cabecada'
              ? 0.34
              : shotCtx === 'fora_area'
              ? 0.24
              : SIM_BALANCE.onTargetBaseRate;

          const accuracyProb = logisticDuelProb(
            shooterFinish * 0.72 + shooterPos * 0.28 + attCrowd + attCohesionBonus - attManPenalty,
            defBlockRating * 0.35 + 48,
            baseAccuracy,
            SIM_BALANCE.shotFinishScaleDivisor,
            0.16,
            0.9
          );

          const fromCoords = getActorPitchCoords(
            attClub,
            shooter.player.id,
            isHomeAtt,
            shotCtx === 'fora_area' ? 4 : 5,
            lane
          );

          if (Math.random() > accuracyProb) {
            if (isBigChance) {
              bumpRating(simState.playerRatings, shooter.player.id, -0.22);
              newEvents.push({
                minute: curMin,
                type: 'chance_clara',
                clubId: attClub.id,
                playerName: shooter.player.knownName,
                playerId: shooter.player.id,
                description: `💨 Chance clara desperdiçada! ${shooter.player.knownName} bate para fora!`,
              });
            }
            considerHighlight({
              priority: isBigChance ? 64 : 42,
              ballX: isHomeAtt ? 96 : 4,
              ballY: Math.random() < 0.5 ? 30 : 70,
              fromBallX: fromCoords.x,
              fromBallY: fromCoords.y,
              activePlayerId: shooter.player.id,
              secondaryPlayerId: assister?.player.id,
              possessionSide: attSide,
              playPhase: isHomeAtt ? 'finalizacao_casa' : 'finalizacao_fora',
              text: isBigChance
                ? `⚡ Quase! ${shooter.player.knownName} recebe na boa e manda tirando tinta da trave!`
                : `⚡ ${shooter.player.knownName} (${attClub.shortName}) finaliza cruzado pela linha de fundo.`,
            });
            possessionAlive = false;
            attSide = isHomeAtt ? 'away' : 'home';
            attZone = 1;
            lane = 'center';
            context = 'build_up';
            return;
          }

          // Chute NO GOL!
          if (isHomeAtt) stats.homeOnTarget += 1;
          else stats.awayOnTarget += 1;

          const keeperReflex = getEffectiveMatchAttribute(oppKeeper.player, 'reflexos', 'GOL');
          const keeperPos = getEffectiveMatchAttribute(oppKeeper.player, 'posicionamento', 'GOL');
          const keeperSkill = keeperReflex * 0.65 + keeperPos * 0.35 + defCrowd * 0.45;
          const finishSkill = shooterFinish * 0.78 + shooterPos * 0.22 + attCrowd * 0.55 + attCohesionBonus * 0.4;

          const baseGoalRate =
            shotCtx === 'penalti'
              ? 0.76
              : shotCtx === '1v1'
              ? 0.41
              : shotCtx === 'area_livre'
              ? 0.34
              : shotCtx === 'rebote'
              ? 0.35
              : shotCtx === 'cabecada'
              ? 0.23
              : shotCtx === 'fora_area'
              ? 0.12
              : SIM_BALANCE.goalOnTargetBaseRate;

          const goalProb = logisticDuelProb(
            finishSkill,
            keeperSkill,
            baseGoalRate,
            SIM_BALANCE.shotFinishScaleDivisor,
            0.06,
            0.84
          );

          if (Math.random() < goalProb) {
            // GOOOOL! (estritamente decorrente de finalização no alvo)
            if (isHomeAtt) homeGoals += 1;
            else awayGoals += 1;

            const validAssist =
              assister && assister.player.id !== shooter.player.id ? assister : undefined;
            bumpRating(simState.playerRatings, shooter.player.id, 1.15);
            if (validAssist) {
              bumpRating(simState.playerRatings, validAssist.player.id, 0.72);
            }
            bumpRating(simState.playerRatings, oppKeeper.player.id, -0.2);

            simState.momentumHome = clamp(
              simState.momentumHome + (isHomeAtt ? 0.35 : -0.35),
              -1,
              1
            );

            const goalText =
              shotCtx === 'penalti'
                ? `GOOOL de pênalti do ${attClub.name}! ${shooter.player.knownName} desloca ${oppKeeper.player.knownName} com categoria!`
                : shotCtx === 'cabecada'
                ? `GOOOL do ${attClub.name}! Cabeceio fatal de ${shooter.player.knownName}${validAssist ? ` após cruzamento de ${validAssist.player.knownName}` : ''}!`
                : context === 'counter'
                ? `GOOOL do ${attClub.name}! Contra-ataque mortal concluído por ${shooter.player.knownName}${validAssist ? ` (assist. ${validAssist.player.knownName})` : ''}!`
                : `GOOOL do ${attClub.name}! ${shooter.player.knownName} bate firme sem chance para ${oppKeeper.player.knownName}${validAssist ? ` (passe de ${validAssist.player.knownName})` : ''}!`;

            newEvents.push({
              minute: curMin,
              type: 'gol',
              clubId: attClub.id,
              playerName: shooter.player.knownName,
              playerId: shooter.player.id,
              assistName: validAssist?.player.knownName,
              assistPlayerId: validAssist?.player.id,
              description: `⚽ ${shooter.player.knownName}${validAssist ? ` (${validAssist.player.knownName})` : ''}`,
            });

            considerHighlight({
              priority: 100,
              ballX: isHomeAtt ? 97 : 3,
              ballY: Math.round(46 + Math.random() * 8),
              fromBallX: fromCoords.x,
              fromBallY: fromCoords.y,
              activePlayerId: shooter.player.id,
              secondaryPlayerId: validAssist?.player.id,
              possessionSide: attSide,
              playPhase: isHomeAtt ? 'gol_casa' : 'gol_fora',
              text: goalText,
            });

            possessionAlive = false;
            attSide = isHomeAtt ? 'away' : 'home';
            attZone = 3;
            lane = 'center';
            context = 'kickoff';
            return;
          }

          // DEFESA DO GOLEIRO! (contabiliza obrigatoriamente quando chute no alvo não vira gol)
          if (isHomeAtt) stats.awaySaves += 1;
          else stats.homeSaves += 1;

          bumpRating(simState.playerRatings, oppKeeper.player.id, isBigChance ? 0.42 : 0.25);

          if (isBigChance || Math.random() < 0.22) {
            newEvents.push({
              minute: curMin,
              type: 'defesa',
              clubId: defClub.id,
              playerName: oppKeeper.player.knownName,
              playerId: oppKeeper.player.id,
              description: `🧤 ${isBigChance ? 'Milagre de ' : 'Defesa de '}${oppKeeper.player.knownName} evitando gol de ${shooter.player.knownName}!`,
            });
          }

          const saveRoll = Math.random();
          if (
            shotCtx !== 'rebote' &&
            shotCtx !== 'penalti' &&
            saveRoll < SIM_BALANCE.reboundAfterKeeperSaveProb
          ) {
            // Rebote perigoso na área!
            considerHighlight({
              priority: 72,
              ballX: isHomeAtt ? 90 : 10,
              ballY: 50,
              fromBallX: fromCoords.x,
              fromBallY: fromCoords.y,
              activePlayerId: shooter.player.id,
              secondaryPlayerId: oppKeeper.player.id,
              possessionSide: attSide,
              playPhase: isHomeAtt ? 'finalizacao_casa' : 'finalizacao_fora',
              text: `🧤 ${oppKeeper.player.knownName} espalma para o meio da área — bola viva no rebote!`,
            });
            const reboundTaker = pickWeightedActor(
              attActors,
              ['CA', 'PE', 'PD', 'MEI'],
              (a) => getEffectiveMatchAttribute(a.player, 'posicionamento', a.slotRole)
            );
            lastCarrier = reboundTaker;
            lastAssister = undefined;
            resolveShot(reboundTaker, 'rebote', undefined);
            return;
          }

          if (saveRoll < SIM_BALANCE.reboundAfterKeeperSaveProb + SIM_BALANCE.cornerFromBlockedOrSavedShot) {
            if (isHomeAtt) stats.homeCorners += 1;
            else stats.awayCorners += 1;
            considerHighlight({
              priority: 62,
              ballX: isHomeAtt ? 94 : 6,
              ballY: Math.random() < 0.5 ? 20 : 80,
              fromBallX: fromCoords.x,
              fromBallY: fromCoords.y,
              activePlayerId: shooter.player.id,
              secondaryPlayerId: oppKeeper.player.id,
              possessionSide: attSide,
              playPhase: isHomeAtt ? 'finalizacao_casa' : 'finalizacao_fora',
              text: `🧤 Defesaça! ${oppKeeper.player.knownName} desvia finalização de ${shooter.player.knownName} pela linha de fundo! Escanteio.`,
            });
            context = 'corner';
            attZone = 5;
            lane = Math.random() < 0.5 ? 'left' : 'right';
            lastCarrier = undefined;
            lastAssister = undefined;
            return;
          }

          considerHighlight({
            priority: isBigChance ? 68 : 50,
            ballX: isHomeAtt ? 93 : 7,
            ballY: 50,
            fromBallX: fromCoords.x,
            fromBallY: fromCoords.y,
            activePlayerId: shooter.player.id,
            secondaryPlayerId: oppKeeper.player.id,
            possessionSide: attSide,
            playPhase: isHomeAtt ? 'finalizacao_casa' : 'finalizacao_fora',
            text: `🧤 ${oppKeeper.player.knownName} segura firme a batida de ${shooter.player.knownName}!`,
          });
          possessionAlive = false;
          attSide = isHomeAtt ? 'away' : 'home';
          attZone = 1;
          lane = 'center';
          context = 'build_up';
        };

        // Lances de bola parada imediatos (pênalti, falta frontal ou escanteio)
        if (penaltyPending) {
          penaltyPending = false;
          const taker = pickWeightedActor(attActors, ['CA', 'MEI', 'PE', 'PD'], (a) =>
            getEffectiveMatchAttribute(a.player, 'finalizacao', a.slotRole)
          );
          attZone = 5;
          lane = 'center';
          resolveShot(taker, 'penalti', undefined);
          continue;
        }

        if (directFreeKickShotPending) {
          directFreeKickShotPending = false;
          const taker = pickWeightedActor(attActors, ['MEI', 'CA', 'PE', 'PD', 'LD', 'LE'], (a) =>
            getEffectiveMatchAttribute(a.player, 'finalizacao', a.slotRole) * 0.6 +
            getEffectiveMatchAttribute(a.player, 'visao', a.slotRole) * 0.4
          );
          lane = freeKickLane;
          resolveShot(taker, 'fora_area', undefined);
          continue;
        }

        if (context === 'corner') {
          const taker = pickWeightedActor(attActors, ['MEI', 'PE', 'PD', 'LD', 'LE', 'MC'], (a) =>
            getEffectiveMatchAttribute(a.player, 'passe', a.slotRole) * 0.6 +
            getEffectiveMatchAttribute(a.player, 'visao', a.slotRole) * 0.4
          );
          const target = pickWeightedActor(
            attActors,
            ['CA', 'ZAG', 'VOL', 'PE', 'PD'],
            (a) =>
              getEffectiveMatchAttribute(a.player, 'forca', a.slotRole) * 0.55 +
              getEffectiveMatchAttribute(a.player, 'posicionamento', a.slotRole) * 0.45,
            taker.player.id
          );
          const oppHeader = pickWeightedActor(defActors, ['ZAG', 'VOL', 'CA'], (a) =>
            getEffectiveMatchAttribute(a.player, 'forca', a.slotRole) * 0.5 +
            getEffectiveMatchAttribute(a.player, 'marcacao', a.slotRole) * 0.5
          );
          if (isHomeAtt) {
            stats.homeCrosses += 1;
            stats.homePasses += 1;
          } else {
            stats.awayCrosses += 1;
            stats.awayPasses += 1;
          }

          const crossSkill =
            (getEffectiveMatchAttribute(taker.player, 'passe', taker.slotRole) +
              getEffectiveMatchAttribute(target.player, 'forca', target.slotRole)) /
              2 +
            attCrowd;
          const defHeaderSkill =
            (getEffectiveMatchAttribute(oppHeader.player, 'forca', oppHeader.slotRole) +
              getEffectiveMatchAttribute(oppHeader.player, 'marcacao', oppHeader.slotRole)) /
              2 +
            defCrowd;

          const winHeaderProb = logisticDuelProb(crossSkill, defHeaderSkill, 0.24, SIM_BALANCE.duelScaleDivisor, 0.12, 0.45);
          if (Math.random() < winHeaderProb) {
            if (isHomeAtt) stats.homePassesCompleted += 1;
            else stats.awayPassesCompleted += 1;
            attZone = 5;
            lane = 'center';
            resolveShot(target, 'cabecada', taker);
          } else {
            if (isHomeAtt) stats.awayInterceptions += 1;
            else stats.homeInterceptions += 1;
            possessionAlive = false;
            attSide = isHomeAtt ? 'away' : 'home';
            attZone = 2;
            lane = Math.random() < 0.5 ? 'left' : 'right';
            context = defProfile.tactics.buildUpStyle === 'Contra-ataques rápidos' ? 'counter' : 'positional';
          }
          continue;
        }

        // Escolha de Ação Tática Consciente dentro da Jogada
        type ActionChoice =
          | 'passe_curto'
          | 'passe_vertical'
          | 'lancamento'
          | 'conducao'
          | 'cruzamento'
          | 'finalizacao';

        const actionWeights: Record<ActionChoice, number> = {
          passe_curto: 0,
          passe_vertical: 0,
          lancamento: 0,
          conducao: 0,
          cruzamento: 0,
          finalizacao: 0,
        };

        if (attZone === 1) {
          actionWeights.passe_curto = attProfile.shortPassWeight * 2.5;
          actionWeights.lancamento = attProfile.longBallWeight * 1.05;
          actionWeights.conducao = attProfile.dribbleWeight * 0.26;
        } else if (attZone === 2) {
          actionWeights.passe_curto = attProfile.shortPassWeight * 2.25;
          actionWeights.passe_vertical = attProfile.verticalPassWeight * 0.62;
          actionWeights.lancamento = attProfile.longBallWeight * 0.88;
          actionWeights.conducao = attProfile.dribbleWeight * 0.62;
        } else if (attZone === 3) {
          actionWeights.passe_curto = attProfile.shortPassWeight * 2.15;
          actionWeights.passe_vertical = attProfile.verticalPassWeight * 0.9;
          actionWeights.lancamento =
            attProfile.longBallWeight * (defProfile.behindLineExposure > 1.03 ? 0.95 : 0.48);
          actionWeights.conducao = attProfile.dribbleWeight * 0.85;
        } else if (attZone === 4) {
          const lowBlockPenalty =
            lane === 'center' && defProfile.boxCompactness > 1.02 ? 0.85 : 1.0;
          actionWeights.passe_curto = attProfile.shortPassWeight * 1.7;
          actionWeights.passe_vertical = attProfile.verticalPassWeight * 0.85;
          actionWeights.conducao = attProfile.dribbleWeight * 0.85;
          actionWeights.cruzamento =
            lane !== 'center'
              ? attProfile.crossWeight * 0.92
              : attProfile.crossWeight * 0.2;
          actionWeights.finalizacao =
            SIM_BALANCE.baseShootTriggerZone4 * 4.2 * attProfile.shootEagerness * lowBlockPenalty;
        } else {
          // Zona 5 (área)
          actionWeights.finalizacao =
            SIM_BALANCE.baseShootTriggerZone5 * 5.2 * attProfile.shootEagerness;
          actionWeights.passe_curto = attProfile.shortPassWeight * 0.72;
          actionWeights.conducao = attProfile.dribbleWeight * 0.42;
        }

        if (context === 'counter') {
          actionWeights.passe_vertical *= 1.5;
          actionWeights.conducao *= 1.45;
          actionWeights.passe_curto *= 0.6;
        } else if (context === 'high_recovery') {
          actionWeights.finalizacao *= 1.45;
          actionWeights.passe_vertical *= 1.4;
        }

        const totalActionW = Object.values(actionWeights).reduce((s, v) => s + v, 0);
        let ar = Math.random() * Math.max(0.01, totalActionW);
        let chosenAction: ActionChoice = 'passe_curto';
        for (const k of Object.keys(actionWeights) as ActionChoice[]) {
          ar -= actionWeights[k];
          if (ar <= 0) {
            chosenAction = k;
            break;
          }
        }

        const oppDefender = selectDefenderForDuel(
          defActors,
          attZone,
          lane,
          defProfile.pressAggression > 1.08
        );

        // EXECUÇÃO DAS AÇÕES
        if (chosenAction === 'finalizacao') {
          const workedOpenBoost = Math.min(
            0.24,
            Math.max(0, passStreak - 2) *
              (attProfile.tactics.offensiveStyle === 'Posse de bola' ? 0.08 : 0.06)
          );
          const shotType: ShotContext =
            attZone <= 4
              ? 'fora_area'
              : context === 'counter' || context === 'high_recovery'
              ? Math.random() < 0.28 + workedOpenBoost * 0.4
                ? '1v1'
                : Math.random() < 0.35
                ? 'area_livre'
                : 'area_marcada'
              : Math.random() < 0.16 + workedOpenBoost
              ? 'area_livre'
              : 'area_marcada';
          resolveShot(carrier, shotType, lastAssister);
          continue;
        }

        if (chosenAction === 'cruzamento') {
          if (isHomeAtt) {
            stats.homeCrosses += 1;
            stats.homePasses += 1;
          } else {
            stats.awayCrosses += 1;
            stats.awayPasses += 1;
          }

          const target = pickWeightedActor(
            attActors,
            ['CA', 'PE', 'PD', 'MEI'],
            (a) =>
              getEffectiveMatchAttribute(a.player, 'posicionamento', a.slotRole) * 0.6 +
              getEffectiveMatchAttribute(a.player, 'forca', a.slotRole) * 0.4,
            carrier.player.id
          );
          const oppCb = pickWeightedActor(defActors, ['ZAG', 'LD', 'LE', 'VOL'], (a) =>
            getEffectiveMatchAttribute(a.player, 'marcacao', a.slotRole) * 0.55 +
            getEffectiveMatchAttribute(a.player, 'forca', a.slotRole) * 0.45
          );

          const crossAtt =
            getEffectiveMatchAttribute(carrier.player, 'passe', carrier.slotRole) * 0.5 +
            getEffectiveMatchAttribute(target.player, 'posicionamento', target.slotRole) * 0.3 +
            getEffectiveMatchAttribute(target.player, 'forca', target.slotRole) * 0.2 +
            attCrowd +
            attCohesionBonus -
            attManPenalty;
          const crossDef =
            getEffectiveMatchAttribute(oppCb.player, 'marcacao', oppCb.slotRole) * 0.55 +
            getEffectiveMatchAttribute(oppCb.player, 'forca', oppCb.slotRole) * 0.45 +
            defCrowd +
            defCohesionBonus -
            defManPenalty +
            (defProfile.boxCompactness - 1) * 4;

          const crossSuccessP = logisticDuelProb(
            crossAtt,
            crossDef,
            SIM_BALANCE.baseCrossSuccess,
            15,
            0.16,
            0.72
          );

          const fromCoords = getActorPitchCoords(attClub, carrier.player.id, isHomeAtt, attZone, lane);

          if (Math.random() < crossSuccessP) {
            if (isHomeAtt) stats.homePassesCompleted += 1;
            else stats.awayPassesCompleted += 1;
            attZone = 5;
            lane = 'center';
            considerHighlight({
              priority: 36,
              ballX: isHomeAtt ? 88 : 12,
              ballY: 50,
              fromBallX: fromCoords.x,
              fromBallY: fromCoords.y,
              activePlayerId: target.player.id,
              secondaryPlayerId: carrier.player.id,
              possessionSide: attSide,
              playPhase: isHomeAtt ? 'cruzamento_casa' : 'cruzamento_fora',
              text: `${carrier.player.knownName} levanta na medida buscando ${target.player.knownName} na área!`,
            });
            resolveShot(target, 'cabecada', carrier);
            continue;
          }

          // Cruzamento interceptado ou desviado p/ escanteio
          if (Math.random() < 0.26) {
            if (isHomeAtt) stats.homeCorners += 1;
            else stats.awayCorners += 1;
            context = 'corner';
            attZone = 5;
            lastCarrier = undefined;
            lastAssister = undefined;
            continue;
          }

          if (isHomeAtt) stats.awayInterceptions += 1;
          else stats.homeInterceptions += 1;
          bumpRating(simState.playerRatings, oppCb.player.id, 0.12);
          possessionAlive = false;
          attSide = isHomeAtt ? 'away' : 'home';
          attZone = 1;
          lane = 'center';
          context = 'build_up';
          continue;
        }

        if (chosenAction === 'conducao') {
          const carrierSkill =
            getEffectiveMatchAttribute(carrier.player, 'drible', carrier.slotRole) * 0.55 +
            getEffectiveMatchAttribute(carrier.player, 'velocidade', carrier.slotRole) * 0.25 +
            getEffectiveMatchAttribute(carrier.player, 'aceleracao', carrier.slotRole) * 0.2 +
            attCrowd +
            attCohesionBonus -
            attManPenalty;
          const defSkill =
            getEffectiveMatchAttribute(oppDefender.player, 'desarme', oppDefender.slotRole, { isPressing: true }) * 0.55 +
            getEffectiveMatchAttribute(oppDefender.player, 'marcacao', oppDefender.slotRole, { isPressing: true }) * 0.3 +
            getEffectiveMatchAttribute(oppDefender.player, 'velocidade', oppDefender.slotRole, { isPressing: true }) * 0.15 +
            defCrowd +
            defCohesionBonus -
            defManPenalty +
            (attZone >= 4 ? 9 : 0);

          const winDribbleProb = logisticDuelProb(
            carrierSkill,
            defSkill,
            SIM_BALANCE.baseDribbleSuccess,
            SIM_BALANCE.duelScaleDivisor,
            0.22,
            0.84
          );

          const fromCoords = getActorPitchCoords(attClub, carrier.player.id, isHomeAtt, attZone, lane);

          if (Math.random() < winDribbleProb) {
            if (attZone === 3 || attZone === 4) {
              if (isHomeAtt) simState.homeMidfieldDuelsWon += 1;
              else simState.awayMidfieldDuelsWon += 1;
            }
            const nextZ = clamp(attZone + 1, 1, 5) as 1 | 2 | 3 | 4 | 5;
            attZone = nextZ;
            const toCoords = getActorPitchCoords(attClub, carrier.player.id, isHomeAtt, attZone, lane);
            lastCarrier = carrier;
            lastAssister = lastAssister ?? undefined;

            considerHighlight({
              priority: attZone >= 4 ? 30 : 20,
              ballX: toCoords.x,
              ballY: toCoords.y,
              fromBallX: fromCoords.x,
              fromBallY: fromCoords.y,
              activePlayerId: carrier.player.id,
              secondaryPlayerId: oppDefender.player.id,
              possessionSide: attSide,
              playPhase:
                context === 'counter'
                  ? isHomeAtt
                    ? 'contra_ataque_casa'
                    : 'contra_ataque_fora'
                  : isHomeAtt
                  ? 'ataque_casa'
                  : 'ataque_fora',
              text: `${carrier.player.knownName} entorta ${oppDefender.player.knownName} no drible e ganha terreno para o ${attClub.shortName}!`,
            });
            continue;
          }

          // Falha no drible: Desarme limpo ou Falta!
          const foulProb = clamp(
            SIM_BALANCE.foulOnFailedTackleProb *
              defProfile.foulRiskMod *
              (carrierSkill > defSkill ? 1.16 : 0.9) *
              (oppDefender.player.stamina < 60 ? 1.15 : 1.0),
            0.12,
            0.52
          );

          if (Math.random() < foulProb) {
            if (isHomeAtt) stats.awayFouls += 1;
            else stats.homeFouls += 1;
            bumpRating(simState.playerRatings, oppDefender.player.id, -0.15);

            const defYellows = isHomeAtt ? simState.awayYellowCardedIds : simState.homeYellowCardedIds;
            const defReds = isHomeAtt ? simState.awayRedCardedIds : simState.homeRedCardedIds;
            const alreadyYellowed = defYellows.includes(oppDefender.player.id);

            const straightRedProb =
              (context === 'counter' && attZone >= 4 ? 2.2 : 1.0) *
              SIM_BALANCE.directRedPerHardFoulProb;
            const yellowProb =
              SIM_BALANCE.yellowCardPerFoulProb *
              (context === 'counter' ? 1.65 : 1.0) *
              (alreadyYellowed ? 0.34 : 1.0) * // arbitragem rigorosa apenas em 2º amarelo grave
              defProfile.foulRiskMod;

            const cardRoll = Math.random();
            if (cardRoll < straightRedProb) {
              defReds.push(oppDefender.player.id);
              if (isHomeAtt) stats.awayRedCards += 1;
              else stats.homeRedCards += 1;
              bumpRating(simState.playerRatings, oppDefender.player.id, -1.6);
              newEvents.push({
                minute: curMin,
                type: 'cartao_vermelho',
                clubId: defClub.id,
                playerName: oppDefender.player.knownName,
                playerId: oppDefender.player.id,
                description: `🟥 Cartão vermelho direto para ${oppDefender.player.knownName} (${defClub.shortName})!`,
              });
              considerHighlight({
                priority: 86,
                ballX: fromCoords.x,
                ballY: fromCoords.y,
                activePlayerId: oppDefender.player.id,
                secondaryPlayerId: carrier.player.id,
                possessionSide: attSide,
                playPhase: 'falta',
                text: `🟥 EXPULSO! ${oppDefender.player.knownName} (${defClub.shortName}) comete falta violenta em ${carrier.player.knownName} e deixa o time com 10!`,
              });
            } else if (cardRoll < straightRedProb + yellowProb) {
              if (alreadyYellowed) {
                defReds.push(oppDefender.player.id);
                if (isHomeAtt) {
                  stats.awayYellowCards += 1;
                  stats.awayRedCards += 1;
                } else {
                  stats.homeYellowCards += 1;
                  stats.homeRedCards += 1;
                }
                bumpRating(simState.playerRatings, oppDefender.player.id, -1.3);
                newEvents.push({
                  minute: curMin,
                  type: 'cartao_vermelho',
                  clubId: defClub.id,
                  playerName: oppDefender.player.knownName,
                  playerId: oppDefender.player.id,
                  description: `🟨🟥 2º amarelo e expulsão para ${oppDefender.player.knownName} (${defClub.shortName})!`,
                });
                considerHighlight({
                  priority: 85,
                  ballX: fromCoords.x,
                  ballY: fromCoords.y,
                  activePlayerId: oppDefender.player.id,
                  secondaryPlayerId: carrier.player.id,
                  possessionSide: attSide,
                  playPhase: 'falta',
                  text: `🟨🟥 Segundo amarelo! ${oppDefender.player.knownName} (${defClub.shortName}) é expulso e deixa sua equipe com 10!`,
                });
              } else {
                defYellows.push(oppDefender.player.id);
                if (isHomeAtt) stats.awayYellowCards += 1;
                else stats.homeYellowCards += 1;
                bumpRating(simState.playerRatings, oppDefender.player.id, -0.3);
                newEvents.push({
                  minute: curMin,
                  type: 'cartao_amarelo',
                  clubId: defClub.id,
                  playerName: oppDefender.player.knownName,
                  playerId: oppDefender.player.id,
                  description: `🟨 Cartão amarelo para ${oppDefender.player.knownName} (${defClub.shortName})`,
                });
                considerHighlight({
                  priority: 55,
                  ballX: fromCoords.x,
                  ballY: fromCoords.y,
                  activePlayerId: oppDefender.player.id,
                  secondaryPlayerId: carrier.player.id,
                  possessionSide: attSide,
                  playPhase: 'falta',
                  text: `🟨 Cartão amarelo para ${oppDefender.player.knownName} (${defClub.shortName}) após entrada em ${carrier.player.knownName}.`,
                });
              }
            } else {
              considerHighlight({
                priority: 22,
                ballX: fromCoords.x,
                ballY: fromCoords.y,
                activePlayerId: oppDefender.player.id,
                secondaryPlayerId: carrier.player.id,
                possessionSide: attSide,
                playPhase: 'falta',
                text: `Falta marcada de ${oppDefender.player.knownName} sobre ${carrier.player.knownName}.`,
              });
            }

            // Bola parada após falta (pênalti se dentro da área em zona 5!)
            if (attZone === 5 && Math.random() < SIM_BALANCE.penaltyRateOnBoxFoul) {
              penaltyPending = true;
              newEvents.push({
                minute: curMin,
                type: 'falta',
                clubId: attClub.id,
                playerName: carrier.player.knownName,
                playerId: carrier.player.id,
                description: `⚠️ Pênalti sofrido por ${carrier.player.knownName} (${attClub.shortName})!`,
              });
              continue;
            }
            if (attZone === 4 && Math.random() < 0.28) {
              directFreeKickShotPending = true;
              freeKickLane = lane;
              continue;
            }
            context = 'free_kick';
            lastCarrier = undefined;
            continue;
          }

          // Desarme limpo!
          if (isHomeAtt) stats.awayTackles += 1;
          else stats.homeTackles += 1;
          bumpRating(simState.playerRatings, oppDefender.player.id, 0.16);
          if (attZone <= 2) {
            if (isHomeAtt) simState.awayHighRecoveries += 1;
            else simState.homeHighRecoveries += 1;
          }

          possessionAlive = false;
          const flippedZone = clamp(6 - attZone, 1, 5) as 1 | 2 | 3 | 4 | 5;
          attSide = isHomeAtt ? 'away' : 'home';
          attZone = flippedZone;
          lane = lane === 'left' ? 'right' : lane === 'right' ? 'left' : 'center';
          const isHighRec = flippedZone >= 4;
          const startsCounter =
            !isHighRec &&
            (defProfile.tactics.buildUpStyle === 'Contra-ataques rápidos' ||
              defProfile.tactics.offensiveStyle === 'Transições rápidas') &&
            attProfile.behindLineExposure >= 1.04;
          if (startsCounter) {
            if (isHomeAtt) simState.homeCountersConceded += 1;
            else simState.awayCountersConceded += 1;
          }
          context = isHighRec ? 'high_recovery' : startsCounter ? 'counter' : 'positional';
          continue;
        }

        // PASSES (passe_curto, passe_vertical, lancamento)
        if (isHomeAtt) stats.homePasses += 1;
        else stats.awayPasses += 1;

        const targetLane: 'left' | 'center' | 'right' =
          Math.random() < attProfile.wingBias
            ? Math.random() < 0.5
              ? 'left'
              : 'right'
            : 'center';

        const nextZoneCandidate: 1 | 2 | 3 | 4 | 5 =
          chosenAction === 'lancamento'
            ? (clamp(attZone + 1 + (Math.random() < 0.28 ? 1 : 0), 2, attZone >= 3 ? 5 : 4) as 1 | 2 | 3 | 4 | 5)
            : chosenAction === 'passe_vertical'
            ? (clamp(attZone + 1, 2, 5) as 1 | 2 | 3 | 4 | 5)
            : attZone === 1
            ? Math.random() < 0.72
              ? 2
              : 1
            : attZone === 2
            ? Math.random() < 0.62
              ? 3
              : 2
            : attZone === 3
            ? Math.random() <
              (attProfile.tactics.pressing === 'Pressão baixa' ? 0.3 : attProfile.tactics.offensiveStyle === 'Posse de bola' ? 0.38 : 0.43)
              ? 4
              : 3
            : attZone === 4
            ? Math.random() < (attProfile.tactics.offensiveStyle === 'Posse de bola' ? 0.21 : 0.14)
              ? 5
              : Math.random() < 0.24
              ? 3 // recua para circular contra bloco postado
              : 4
            : Math.random() < (attProfile.tactics.offensiveStyle === 'Posse de bola' ? 0.48 : 0.36)
            ? 5 // passe curto ou toque para trás dentro da própria área buscando ângulo
            : 4;

        const receiver = selectZoneCarrier(
          attActors,
          attProfile,
          nextZoneCandidate,
          targetLane,
          context,
          carrier.player.id
        );

        // Checagem de Impedimento em passes verticais / lançamentos para zona 4-5
        if (
          (chosenAction === 'passe_vertical' || chosenAction === 'lancamento') &&
          nextZoneCandidate >= 4
        ) {
          const recPosSkill = getEffectiveMatchAttribute(
            receiver.player,
            'posicionamento',
            receiver.slotRole
          );
          const offsideProb = clamp(
            defProfile.offsideTrapRate * (1.12 - (recPosSkill - 72) * 0.012),
            0.01,
            0.12
          );
          if (Math.random() < offsideProb) {
            if (isHomeAtt) stats.homeOffsides += 1;
            else stats.awayOffsides += 1;
            const recCoords = getActorPitchCoords(
              attClub,
              receiver.player.id,
              isHomeAtt,
              nextZoneCandidate,
              targetLane
            );
            considerHighlight({
              priority: 26,
              ballX: recCoords.x,
              ballY: recCoords.y,
              activePlayerId: receiver.player.id,
              secondaryPlayerId: carrier.player.id,
              possessionSide: attSide,
              playPhase: 'impedimento',
              text: `🚩 Impedimento marcado! ${receiver.player.knownName} partiu um pouco antes do passe de ${carrier.player.knownName}.`,
            });
            possessionAlive = false;
            attSide = isHomeAtt ? 'away' : 'home';
            attZone = clamp(6 - nextZoneCandidate, 1, 4) as 1 | 2 | 3 | 4;
            lane = 'center';
            context = 'free_kick';
            continue;
          }
        }

        const passSkill = getEffectiveMatchAttribute(carrier.player, 'passe', carrier.slotRole);
        const visionSkill = getEffectiveMatchAttribute(carrier.player, 'visao', carrier.slotRole);
        const recPos = getEffectiveMatchAttribute(receiver.player, 'posicionamento', receiver.slotRole);
        const recPace =
          (getEffectiveMatchAttribute(receiver.player, 'velocidade', receiver.slotRole) +
            getEffectiveMatchAttribute(receiver.player, 'aceleracao', receiver.slotRole)) /
          2;

        const pressActiveHere = attZone >= defProfile.minPressAttZone;
        const pressPenalty = pressActiveHere
          ? (defProfile.pressAggression - 0.9) * (attZone <= 2 ? 12 : 9)
          : -7;
        const areaDensityPenalty =
          nextZoneCandidate === 5 ? 13 : nextZoneCandidate === 4 ? 8 : 0;
        const sustainedPossessionEase = Math.min(8, passStreak * 2);

        let attPassScore =
          passSkill * 0.55 +
          visionSkill * 0.45 +
          sustainedPossessionEase +
          attCrowd +
          attCohesionBonus -
          attManPenalty;
        let defIntScore =
          (getEffectiveMatchAttribute(oppDefender.player, 'marcacao', oppDefender.slotRole, { isPressing: pressActiveHere }) * 0.5 +
            getEffectiveMatchAttribute(oppDefender.player, 'posicionamento', oppDefender.slotRole, { isPressing: pressActiveHere }) * 0.5) +
          pressPenalty +
          areaDensityPenalty +
          defCrowd +
          defCohesionBonus -
          defManPenalty;

        let basePassP = SIM_BALANCE.basePassSuccess;
        if (chosenAction === 'passe_vertical') {
          basePassP =
            SIM_BALANCE.baseVerticalSuccess +
            (context === 'counter' || passStreak >= 3 ? 0.09 : 0);
          attPassScore =
            attPassScore * 0.65 +
            recPos * 0.2 +
            recPace * 0.15 +
            (defProfile.behindLineExposure - 1) * 28;
          defIntScore += (defProfile.boxCompactness - 1) * 7;
        } else if (chosenAction === 'lancamento') {
          basePassP =
            SIM_BALANCE.baseLongBallSuccess +
            (context === 'counter' && defProfile.behindLineExposure > 1.03 ? 0.1 : 0);
          attPassScore =
            attPassScore * 0.55 +
            getEffectiveMatchAttribute(receiver.player, 'forca', receiver.slotRole) * 0.25 +
            recPace * 0.2 +
            (defProfile.behindLineExposure - 1) * 32;
        }

        const passSuccessP = logisticDuelProb(
          attPassScore,
          defIntScore,
          basePassP,
          SIM_BALANCE.duelScaleDivisor,
          0.26,
          0.96
        );

        const fromCoords = getActorPitchCoords(attClub, carrier.player.id, isHomeAtt, attZone, lane);

        if (Math.random() < passSuccessP) {
          if (isHomeAtt) stats.homePassesCompleted += 1;
          else stats.awayPassesCompleted += 1;
          passStreak += 1;

          if (chosenAction === 'passe_vertical' && attZone >= 3) {
            if (isHomeAtt) simState.homeMidfieldDuelsWon += 1;
            else simState.awayMidfieldDuelsWon += 1;
          }

          attZone = nextZoneCandidate;
          lane = targetLane;
          const toCoords = getActorPitchCoords(attClub, receiver.player.id, isHomeAtt, attZone, lane);
          lastAssister = carrier;
          lastCarrier = receiver;

          const isCounterRun =
            context === 'counter' ||
            (chosenAction === 'lancamento' && defProfile.behindLineExposure >= 1.04 && attZone >= 4);

          if (chosenAction === 'lancamento' && isCounterRun && defProfile.behindLineExposure >= 1.04) {
            if (isHomeAtt) simState.awayCountersConceded += 1;
            else simState.homeCountersConceded += 1;
          }

          const phase: PlayPhase =
            isCounterRun
              ? isHomeAtt
                ? 'contra_ataque_casa'
                : 'contra_ataque_fora'
              : attZone >= 4
              ? isHomeAtt
                ? 'ataque_casa'
                : 'ataque_fora'
              : isHomeAtt
              ? 'construcao_casa'
              : 'construcao_fora';

          considerHighlight({
            priority: chosenAction === 'passe_vertical' && attZone >= 4 ? 28 : 16,
            ballX: toCoords.x,
            ballY: toCoords.y,
            fromBallX: fromCoords.x,
            fromBallY: fromCoords.y,
            activePlayerId: receiver.player.id,
            secondaryPlayerId: carrier.player.id,
            possessionSide: attSide,
            playPhase: phase,
            text:
              chosenAction === 'lancamento'
                ? `Lançamento longo de ${carrier.player.knownName} encontra ${receiver.player.knownName} em velocidade!`
                : chosenAction === 'passe_vertical'
                ? `${carrier.player.knownName} quebra linhas com passe vertical para ${receiver.player.knownName}!`
                : `Troca de passes do ${attClub.shortName}: ${carrier.player.knownName} aciona ${receiver.player.knownName}.`,
          });

          continue;
        }

        // Passe interceptado!
        if (isHomeAtt) stats.awayInterceptions += 1;
        else stats.homeInterceptions += 1;
        bumpRating(simState.playerRatings, oppDefender.player.id, 0.14);

        // Falta na pressão / dividida de passe (gera cartões táticos realistas quando bloqueando saída/transição!)
        if (pressActiveHere && Math.random() < SIM_BALANCE.foulInPressingDuelProb * defProfile.foulRiskMod) {
          if (isHomeAtt) stats.awayFouls += 1;
          else stats.homeFouls += 1;
          const defYellows = isHomeAtt ? simState.awayYellowCardedIds : simState.homeYellowCardedIds;
          const defReds = isHomeAtt ? simState.awayRedCardedIds : simState.homeRedCardedIds;
          const alreadyYellowed = defYellows.includes(oppDefender.player.id);
          if (
            Math.random() <
            SIM_BALANCE.yellowCardPerFoulProb * 0.72 * (alreadyYellowed ? 0.34 : 1.0)
          ) {
            if (alreadyYellowed) {
              defReds.push(oppDefender.player.id);
              if (isHomeAtt) {
                stats.awayYellowCards += 1;
                stats.awayRedCards += 1;
              } else {
                stats.homeYellowCards += 1;
                stats.homeRedCards += 1;
              }
              newEvents.push({
                minute: curMin,
                type: 'cartao_vermelho',
                clubId: defClub.id,
                playerName: oppDefender.player.knownName,
                playerId: oppDefender.player.id,
                description: `🟨🟥 2º amarelo por falta tática para ${oppDefender.player.knownName}!`,
              });
            } else {
              defYellows.push(oppDefender.player.id);
              if (isHomeAtt) stats.awayYellowCards += 1;
              else stats.homeYellowCards += 1;
              newEvents.push({
                minute: curMin,
                type: 'cartao_amarelo',
                clubId: defClub.id,
                playerName: oppDefender.player.knownName,
                playerId: oppDefender.player.id,
                description: `🟨 Cartão amarelo para ${oppDefender.player.knownName} (falta tática).`,
              });
            }
          }
          context = 'free_kick';
          lastCarrier = undefined;
          continue;
        }

        possessionAlive = false;
        const flippedZone = clamp(6 - nextZoneCandidate, 1, 4) as 1 | 2 | 3 | 4;
        if (flippedZone >= 4) {
          if (isHomeAtt) simState.awayHighRecoveries += 1;
          else simState.homeHighRecoveries += 1;
        }
        const startsCounter =
          flippedZone >= 2 &&
          flippedZone <= 3 &&
          (defProfile.tactics.buildUpStyle === 'Contra-ataques rápidos' ||
            defProfile.tactics.offensiveStyle === 'Transições rápidas') &&
          attProfile.behindLineExposure >= 1.04;
        if (startsCounter) {
          if (isHomeAtt) simState.homeCountersConceded += 1;
          else simState.awayCountersConceded += 1;
        }

        attSide = isHomeAtt ? 'away' : 'home';
        attZone = flippedZone;
        lane = targetLane === 'left' ? 'right' : targetLane === 'right' ? 'left' : 'center';
        context = flippedZone >= 4 ? 'high_recovery' : startsCounter ? 'counter' : 'positional';
      }

      // Garante alternância / recuo territorial caso posse termine sem chute na área
      if (possessionAlive && context !== 'corner') {
        lastCarrier = undefined;
        if (attZone >= 4) {
          attZone = 3;
          context = 'positional';
        }
      }
    }

    // Dreno físico por jogador neste minuto simulado
    const hDrains = computeClubPlayerDrains(
      effHome,
      1,
      lastMinuteActiveId,
      lastMinuteSecondaryId,
      simState.homeRedCardedIds
    );
    const aDrains = computeClubPlayerDrains(
      effAway,
      1,
      lastMinuteActiveId,
      lastMinuteSecondaryId,
      simState.awayRedCardedIds
    );

    effHome = {
      ...effHome,
      squad: effHome.squad.map((p) => {
        const d = hDrains[p.id] ?? 0;
        if (d > 0) totalHomeDrains[p.id] = Math.round(((totalHomeDrains[p.id] ?? 0) + d) * 100) / 100;
        return d > 0 ? { ...p, stamina: Math.max(15, Math.round((p.stamina - d) * 10) / 10) } : p;
      }),
    };
    effAway = {
      ...effAway,
      squad: effAway.squad.map((p) => {
        const d = aDrains[p.id] ?? 0;
        if (d > 0) totalAwayDrains[p.id] = Math.round(((totalAwayDrains[p.id] ?? 0) + d) * 100) / 100;
        return d > 0 ? { ...p, stamina: Math.max(15, Math.round((p.stamina - d) * 10) / 10) } : p;
      }),
    };

    // Atualiza estado da bola para o próximo minuto
    simState.possessionSide = attSide;
    simState.ballZone = attSide === 'home' ? attZone : ((6 - attZone) as 1 | 2 | 3 | 4 | 5);
    simState.ballLane = lane;
  }

  // Posse calculada estritamente pelas unidades simuladas com a bola
  const totalTicks = stats.homePossessionTicks + stats.awayPossessionTicks;
  stats.homePossession =
    totalTicks > 0 ? clamp(Math.round((stats.homePossessionTicks / totalTicks) * 100), 15, 85) : 50;

  // Coesão final garantida nas estatísticas
  stats.homeOnTarget = Math.min(stats.homeOnTarget, stats.homeShots);
  stats.awayOnTarget = Math.min(stats.awayOnTarget, stats.awayShots);
  stats.homePassesCompleted = Math.min(stats.homePassesCompleted, stats.homePasses);
  stats.awayPassesCompleted = Math.min(stats.awayPassesCompleted, stats.awayPasses);

  return {
    match: {
      ...match,
      homeGoals,
      awayGoals,
      currentMinute: targetMinute,
      isHalftime: enteredHalftime,
      halftimeRemainingSec: enteredHalftime ? 30 : 0,
      status: targetMinute >= 90 ? 'finalizada' : 'ao_vivo',
      homeSubsUsed,
      awaySubsUsed,
      homeSubbedOutIds,
      awaySubbedOutIds,
      ballX: Math.round(bestHighlight.ballX),
      ballY: Math.round(bestHighlight.ballY),
      activePlayerId: bestHighlight.activePlayerId,
      secondaryPlayerId: bestHighlight.secondaryPlayerId,
      fromBallX: bestHighlight.fromBallX,
      fromBallY: bestHighlight.fromBallY,
      possessionClubId:
        bestHighlight.possessionSide === 'home' ? effHome.id : effAway.id,
      playPhase: bestHighlight.playPhase,
      lastPlayText:
        targetMinute >= 90
          ? `Fim de jogo! ${effHome.shortName} ${homeGoals} x ${awayGoals} ${effAway.shortName}.`
          : enteredHalftime
          ? 'Intervalo! 30s para mexer na tática, instruções e substituições.'
          : bestHighlight.text,
      stats,
      events: newEvents.sort((a, b) => a.minute - b.minute),
      simState,
    },
    homeStaminaDrain: 0,
    awayStaminaDrain: 0,
    homePlayerDrains: totalHomeDrains,
    awayPlayerDrains: totalAwayDrains,
    homeTacticUpdate: latestHomeTacticUpdate,
    awayTacticUpdate: latestAwayTacticUpdate,
    homeAutoSub: latestHomeAutoSub,
    awayAutoSub: latestAwayAutoSub,
  };
}
