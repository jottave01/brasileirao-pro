import {
  BotAIMemory,
  BotDifficulty,
  Club,
  ClubTactics,
  Formation,
  Match,
  MatchSimState,
  Player,
  PlayerPosition,
  TacticalMentality,
} from '../types/league';
import {
  ensurePlayerAttributes,
  getEffectivePlayerMatchOvr,
  getPositionFit,
} from './playerAttributes';
import {
  calculateClubStrength,
  evaluateTacticalCompatibility,
  getClubTactics,
  getEffectiveStarters,
  tacticsEqual,
} from './tacticalEngine';

export interface BotDifficultyAIProfile {
  evalIntervalMin: number;
  cooldownMin: number;
  subCheckIntervalMin: number;
  maxTacticalChanges: number;
  perceptionAccuracy: number; // 0..1: quão bem lê sinais do jogo
  compatibilityDiscipline: number; // 0..1: evita contradições táticas ao adaptar
  subStaminaTrigger: number; // facilidade em identificar cansaço no momento certo
  minSubMinute: number;
  tacticalSubWeight: number;
}

export const BOT_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyAIProfile> = {
  facil: {
    evalIntervalMin: 18,
    cooldownMin: 18,
    subCheckIntervalMin: 16,
    maxTacticalChanges: 2,
    perceptionAccuracy: 0.32,
    compatibilityDiscipline: 0.2,
    subStaminaTrigger: 46,
    minSubMinute: 72,
    tacticalSubWeight: 0.2,
  },
  medio: {
    evalIntervalMin: 14,
    cooldownMin: 14,
    subCheckIntervalMin: 10,
    maxTacticalChanges: 2,
    perceptionAccuracy: 0.68,
    compatibilityDiscipline: 0.78,
    subStaminaTrigger: 54,
    minSubMinute: 62,
    tacticalSubWeight: 0.62,
  },
  dificil: {
    evalIntervalMin: 10,
    cooldownMin: 11,
    subCheckIntervalMin: 6,
    maxTacticalChanges: 3,
    perceptionAccuracy: 0.88,
    compatibilityDiscipline: 0.94,
    subStaminaTrigger: 58,
    minSubMinute: 56,
    tacticalSubWeight: 0.88,
  },
  lendario: {
    evalIntervalMin: 8,
    cooldownMin: 11,
    subCheckIntervalMin: 4,
    maxTacticalChanges: 3,
    perceptionAccuracy: 0.99,
    compatibilityDiscipline: 1.0,
    subStaminaTrigger: 59,
    minSubMinute: 54,
    tacticalSubWeight: 1.0,
  },
};

export interface BotMatchDiagnostic {
  minute: number;
  goalDiff: number;
  ownPossession: number;
  ownShots: number;
  oppShots: number;
  ownOnTarget: number;
  oppOnTarget: number;
  ownBigChances: number;
  oppBigChances: number;
  countersConceded: number;
  midfieldControlShare: number;
  strikerTouchesPer10: number;
  avgStamina: number;
  tiredOutfieldCount: number;
  riskyYellowCount: number;
  ownRedCount: number;
  oppRedCount: number;
  sterilePossession: boolean;
  losingMidfield: boolean;
  isolatedStriker: boolean;
  sufferingCounters: boolean;
  squadOvrGap: number; // own - opp
}

export function createInitialBotAIMemory(): BotAIMemory {
  return {
    lastEvalMinute: 0,
    lastTacticChangeMinute: -20,
    tacticalChangesCount: 0,
    recentReasons: [],
  };
}

export function analyzeMatchContextForBot(params: {
  ownClub: Club;
  oppClub: Club;
  match: Match;
  simState: MatchSimState;
  isHome: boolean;
}): BotMatchDiagnostic {
  const { ownClub, oppClub, match, simState, isHome } = params;
  const minute = Math.max(1, match.currentMinute + 1);
  const s = match.stats;

  const ownRedIds = isHome ? simState.homeRedCardedIds : simState.awayRedCardedIds;
  const oppRedIds = isHome ? simState.awayRedCardedIds : simState.homeRedCardedIds;
  const ownYellowIds = isHome ? simState.homeYellowCardedIds : simState.awayYellowCardedIds;

  const starters = getEffectiveStarters(ownClub, ownRedIds);
  const outfield = starters.filter((p) => p.slotRole !== 'GOL');
  const avgStamina = outfield.length
    ? outfield.reduce((sum, p) => sum + p.stamina, 0) / outfield.length
    : 100;
  const tiredOutfieldCount = outfield.filter((p) => p.stamina < 60).length;
  const riskyYellowCount = outfield.filter(
    (p) =>
      ownYellowIds.includes(p.id) &&
      (p.slotRole === 'ZAG' || p.slotRole === 'VOL' || p.slotRole === 'LD' || p.slotRole === 'LE')
  ).length;

  const ownPossession = isHome ? s.homePossession : 100 - s.homePossession;
  const ownShots = isHome ? s.homeShots : s.awayShots;
  const oppShots = isHome ? s.awayShots : s.homeShots;
  const ownOnTarget = isHome ? s.homeOnTarget : s.awayOnTarget;
  const oppOnTarget = isHome ? s.awayOnTarget : s.homeOnTarget;
  const ownBigChances = isHome ? s.homeBigChances ?? 0 : s.awayBigChances ?? 0;
  const oppBigChances = isHome ? s.awayBigChances ?? 0 : s.homeBigChances ?? 0;
  const countersConceded = isHome ? simState.homeCountersConceded : simState.awayCountersConceded;

  const totalMidDuels = Math.max(1, simState.homeMidfieldDuelsWon + simState.awayMidfieldDuelsWon);
  const ownMidDuels = isHome ? simState.homeMidfieldDuelsWon : simState.awayMidfieldDuelsWon;
  const midfieldControlShare =
    totalMidDuels >= 8 ? ownMidDuels / totalMidDuels : 0.5;

  const ownStrikerTouches = isHome ? simState.homeStrikerTouches : simState.awayStrikerTouches;
  const strikerTouchesPer10 = (ownStrikerTouches / minute) * 10;

  const goalDiff = isHome ? match.homeGoals - match.awayGoals : match.awayGoals - match.homeGoals;
  const expectedShotsByNow = (minute / 90) * 11;

  const sterilePossession =
    minute >= 22 &&
    ownPossession >= 57 &&
    ownShots < Math.max(2, expectedShotsByNow * 0.55) &&
    ownBigChances <= 1;

  const sufferingCounters =
    (countersConceded >= 2 && minute >= 18) || (oppBigChances >= 2 && ownPossession >= 52);

  const losingMidfield = minute >= 18 && midfieldControlShare < 0.41;
  const isolatedStriker = minute >= 22 && ownShots >= 2 && strikerTouchesPer10 < 1.35;

  const ownStr = calculateClubStrength(ownClub).overall;
  const oppStr = calculateClubStrength(oppClub).overall;

  return {
    minute,
    goalDiff,
    ownPossession,
    ownShots,
    oppShots,
    ownOnTarget,
    oppOnTarget,
    ownBigChances,
    oppBigChances,
    countersConceded,
    midfieldControlShare,
    strikerTouchesPer10,
    avgStamina,
    tiredOutfieldCount,
    riskyYellowCount,
    ownRedCount: ownRedIds.length,
    oppRedCount: oppRedIds.length,
    sterilePossession,
    losingMidfield,
    isolatedStriker,
    sufferingCounters,
    squadOvrGap: ownStr - oppStr,
  };
}

function pickCompatibleFormation(
  club: Club,
  preferred: Formation[],
  redCardedIds: string[]
): Formation {
  const viable = preferred.filter((f) => {
    const zags = club.squad.filter((p) => !redCardedIds.includes(p.id) && p.position === 'ZAG').length;
    if ((f === '3-5-2' || f === '3-4-3' || f === '5-3-2') && zags < 3) return false;
    return true;
  });
  return viable[0] ?? club.formation;
}

export interface BotTacticalDecisionResult {
  formation: Formation;
  mentality: TacticalMentality;
  tactics: ClubTactics;
  reason: string;
  memory: BotAIMemory;
}

export function evaluateBotTacticalDecision(params: {
  ownClub: Club;
  oppClub: Club;
  match: Match;
  simState: MatchSimState;
  isHome: boolean;
  allowAIControl: boolean;
}): { decision: BotTacticalDecisionResult | null; nextMemory: BotAIMemory } {
  const { ownClub, oppClub, match, simState, isHome, allowAIControl } = params;
  const curMemory = isHome ? simState.homeAI : simState.awayAI;

  if (!allowAIControl) {
    return { decision: null, nextMemory: curMemory };
  }

  const profile = BOT_DIFFICULTY_PROFILES[ownClub.controller === 'bot' ? ownClub.botDifficulty : 'dificil'];
  const minute = Math.min(90, match.currentMinute + 1);
  if (minute < 12 || minute >= 88) {
    return { decision: null, nextMemory: curMemory };
  }

  const ownRedIds = isHome ? simState.homeRedCardedIds : simState.awayRedCardedIds;
  const diag = analyzeMatchContextForBot({ ownClub, oppClub, match, simState, isHome });

  // Disparo emergencial por expulsão recente ou intervalo entre avaliações regulares
  const recentRedEmergency = ownRedIds.length > 0 && curMemory.lastTacticChangeMinute < minute - 3 && !curMemory.recentReasons.some((r) => r.startsWith('red_adapt'));
  const dueEval = minute - curMemory.lastEvalMinute >= profile.evalIntervalMin;
  if (!dueEval && !recentRedEmergency) {
    return { decision: null, nextMemory: curMemory };
  }

  const nextMemory: BotAIMemory = {
    ...curMemory,
    lastEvalMinute: minute,
  };

  if (curMemory.tacticalChangesCount >= profile.maxTacticalChanges) {
    return { decision: null, nextMemory };
  }

  // Cooldown anti-oscilação (ignorado apenas em emergência de cartão vermelho ou déficit >= 2)
  const cooldownMet = minute - curMemory.lastTacticChangeMinute >= profile.cooldownMin;
  if (!cooldownMet && !recentRedEmergency && !(diag.goalDiff <= -2 && minute >= 55)) {
    return { decision: null, nextMemory };
  }

  // Avaliação de eficácia da mudança anterior antes de fazer outra
  let lastChangeWorsened = false;
  if (curMemory.lastDecision && minute - curMemory.lastDecision.minute >= 16) {
    const ld = curMemory.lastDecision;
    const oppShotGain = diag.oppShots - ld.oppShotsAtChange;
    const ownShotGain = diag.ownShots - ld.ownShotsAtChange;
    const scoreDelta = diag.goalDiff - ld.goalDiffAtChange;
    if (scoreDelta < 0 && oppShotGain > ownShotGain + 2) {
      lastChangeWorsened = true;
    }
  }

  const curTactics = getClubTactics(ownClub);
  const oppTactics = getClubTactics(oppClub);
  const starters = getEffectiveStarters(ownClub, ownRedIds);

  let candFormation: Formation = ownClub.formation;
  let candMentality: TacticalMentality = ownClub.mentality;
  let candTactics: ClubTactics = { ...curTactics };
  let reasonKey = '';
  let reasonText = '';

  const canSeeSignal = () => Math.random() < profile.perceptionAccuracy;
  const alreadyDid = (key: string) => curMemory.recentReasons.slice(-2).includes(key);

  // Prioridade 1: Expulsão no próprio time -> reorganização defensiva real
  if (ownRedIds.length > 0 && !alreadyDid('red_adapt') && (recentRedEmergency || canSeeSignal())) {
    reasonKey = 'red_adapt';
    if (diag.goalDiff >= 0) {
      candFormation = pickCompatibleFormation(ownClub, ['4-4-2', '5-3-2'], ownRedIds);
      candMentality = 'Contra-Ataque';
      candTactics = {
        buildUpStyle: 'Contra-ataques rápidos',
        offensiveStyle: 'Transições rápidas',
        pressing: 'Pressão baixa',
        defensiveLine: 'Recuada',
        intensity: 'Normal',
      };
      reasonText = `Com um a menos, ${ownClub.shortName} fecha linhas em ${candFormation} (${candMentality}).`;
    } else {
      candFormation = pickCompatibleFormation(ownClub, ['4-4-2', '4-2-3-1'], ownRedIds);
      candMentality = 'Equilibrada';
      candTactics = {
        ...curTactics,
        pressing: 'Bloco médio',
        defensiveLine: 'Equilibrada',
        intensity: 'Normal',
      };
      reasonText = `Após expulsão, ${ownClub.shortName} ajusta bloco médio para manter equilíbrio.`;
    }
  }
  // Prioridade 2: Adversário com jogador expulso -> explorar vantagem numérica
  else if (
    diag.oppRedCount > 0 &&
    diag.goalDiff <= 1 &&
    !alreadyDid('exploit_opp_red') &&
    canSeeSignal()
  ) {
    reasonKey = 'exploit_opp_red';
    candFormation = pickCompatibleFormation(ownClub, ['4-3-3', '4-2-3-1', '3-4-3'], ownRedIds);
    candMentality = 'Ofensiva';
    candTactics = {
      ...curTactics,
      offensiveStyle:
        curTactics.offensiveStyle === 'Posse de bola' ? 'Jogo pelas laterais' : curTactics.offensiveStyle,
      pressing: 'Pressão após perda',
      defensiveLine: 'Adiantada',
      intensity: diag.avgStamina >= 62 ? 'Normal' : curTactics.intensity,
    };
    reasonText = `${ownClub.shortName} aproveita superioridade numérica e adianta o bloco!`;
  }
  // Prioridade 3: Sofrendo muitos contra-ataques nas costas
  else if (diag.sufferingCounters && !alreadyDid('fix_counters') && canSeeSignal()) {
    reasonKey = 'fix_counters';
    candTactics = {
      ...curTactics,
      defensiveLine: curTactics.defensiveLine === 'Adiantada' ? 'Equilibrada' : 'Recuada',
      pressing: curTactics.pressing === 'Pressão alta' ? 'Bloco médio' : curTactics.pressing,
      buildUpStyle:
        curTactics.buildUpStyle === 'Saída curta' ? 'Equilibrada' : curTactics.buildUpStyle,
    };
    if (ownClub.mentality === 'Tudo ou Nada' && diag.goalDiff >= -1 && minute < 78) {
      candMentality = 'Ofensiva';
    }
    if (ownClub.formation === '3-4-3') {
      candFormation = pickCompatibleFormation(ownClub, ['4-2-3-1', '4-3-3'], ownRedIds);
    }
    reasonText = `Sofrendo contra-ataques: ${ownClub.shortName} recua a linha para fechar as costas da zaga.`;
  }
  // Prioridade 4: Posse estéril (muita posse sem finalizar, apenas quando não está vencendo)
  else if (
    diag.sterilePossession &&
    minute >= 30 &&
    diag.goalDiff <= 0 &&
    !alreadyDid('fix_sterile_pos') &&
    canSeeSignal()
  ) {
    reasonKey = 'fix_sterile_pos';
    candTactics = {
      ...curTactics,
      buildUpStyle:
        curTactics.buildUpStyle === 'Saída curta' ? 'Equilibrada' : curTactics.buildUpStyle,
      offensiveStyle:
        curTactics.offensiveStyle === 'Posse de bola'
          ? ownClub.formation === '4-3-3' || ownClub.formation === '3-4-3'
            ? 'Jogo pelas laterais'
            : 'Ataque pelo meio'
          : curTactics.offensiveStyle,
      intensity: diag.avgStamina >= 68 ? 'Normal' : curTactics.intensity,
    };
    if (diag.goalDiff < 0 && ownClub.mentality === 'Equilibrada') {
      candMentality = 'Ofensiva';
    }
    reasonText = `Posse sem agressividade (${diag.ownPossession}%): ${ownClub.shortName} busca mais profundidade.`;
  }
  // Prioridade 5: Perdendo disputa do meio-campo e sofrendo pressão de finalizações
  else if (
    diag.losingMidfield &&
    minute >= 24 &&
    diag.goalDiff <= 0 &&
    diag.oppShots >= diag.ownShots + 3 &&
    ownClub.mentality !== 'Contra-Ataque' &&
    !alreadyDid('fix_midfield') &&
    canSeeSignal()
  ) {
    reasonKey = 'fix_midfield';
    candFormation = pickCompatibleFormation(ownClub, ['4-2-3-1', '4-3-3'], ownRedIds);
    candTactics = {
      ...curTactics,
      buildUpStyle: 'Equilibrada',
      offensiveStyle: candFormation === '4-3-3' ? 'Jogo pelas laterais' : 'Ataque pelo meio',
      pressing: curTactics.pressing === 'Pressão baixa' ? 'Bloco médio' : curTactics.pressing,
    };
    reasonText = `Inferioridade no meio: ${ownClub.shortName} reorganiza o setor central (${candFormation}).`;
  }
  // Prioridade 6: Centroavante isolado em ligações diretas sem sucesso
  else if (
    diag.isolatedStriker &&
    curTactics.buildUpStyle === 'Ligações diretas' &&
    !alreadyDid('fix_isolated_ca') &&
    canSeeSignal()
  ) {
    reasonKey = 'fix_isolated_ca';
    candFormation = pickCompatibleFormation(ownClub, ['4-2-3-1', '4-3-3'], ownRedIds);
    candTactics = {
      ...curTactics,
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Ataque pelo meio',
    };
    reasonText = `Centroavante isolado: ${ownClub.shortName} aproxima os meias para apoiar o ataque.`;
  }
  // Prioridade 7: Gerenciar vantagem sem entregar o campo cedo demais
  else if (
    diag.goalDiff >= 1 &&
    diag.goalDiff <= 2 &&
    minute >= 72 &&
    !alreadyDid('protect_lead') &&
    (ownClub.mentality === 'Ofensiva' ||
      ownClub.mentality === 'Tudo ou Nada' ||
      curTactics.defensiveLine === 'Adiantada') &&
    canSeeSignal()
  ) {
    reasonKey = 'protect_lead';
    const isUnderLateSiege = minute >= 82 && diag.oppShots >= diag.ownShots + 3;
    candMentality = isUnderLateSiege ? 'Retranca' : 'Contra-Ataque';
    candFormation = isUnderLateSiege
      ? pickCompatibleFormation(ownClub, ['5-3-2', '4-4-2'], ownRedIds)
      : ownClub.formation;
    candTactics = {
      buildUpStyle: 'Contra-ataques rápidos',
      offensiveStyle: 'Transições rápidas',
      pressing: isUnderLateSiege ? 'Pressão baixa' : 'Bloco médio',
      defensiveLine: isUnderLateSiege || minute >= 78 ? 'Recuada' : 'Equilibrada',
      intensity: diag.avgStamina < 60 ? 'Baixa' : 'Normal',
    };
    reasonText = `Gerenciando vantagem aos ${minute}': ${ownClub.shortName} organiza a transição defensiva.`;
  }
  // Prioridade 8: Perdendo no 2º tempo -> pressionar sem abrir buracos precipitados
  else if (
    ((diag.goalDiff === -1 && minute >= 64) || (diag.goalDiff <= -2 && minute >= 54)) &&
    !alreadyDid('chase_game_late') &&
    canSeeSignal()
  ) {
    const desperate = minute >= 81 || (diag.goalDiff <= -2 && minute >= 75);
    reasonKey = desperate ? 'chase_game_late' : 'chase_game_early';
    if (alreadyDid(reasonKey)) {
      return { decision: null, nextMemory };
    }
    const oppSittingDeep =
      oppTactics.defensiveLine === 'Recuada' ||
      oppClub.mentality === 'Retranca' ||
      oppClub.mentality === 'Contra-Ataque';
    candFormation = pickCompatibleFormation(
      ownClub,
      desperate ? ['4-3-3', '3-4-3', '4-2-3-1'] : ['4-2-3-1', '4-3-3'],
      ownRedIds
    );
    candMentality = desperate ? 'Tudo ou Nada' : 'Ofensiva';
    candTactics = {
      buildUpStyle: oppTactics.defensiveLine === 'Adiantada' ? 'Contra-ataques rápidos' : 'Equilibrada',
      offensiveStyle:
        oppClub.formation === '3-5-2' || oppClub.formation === '5-3-2' || oppSittingDeep
          ? 'Jogo pelas laterais'
          : 'Ataque pelo meio',
      pressing: 'Pressão após perda',
      defensiveLine: oppSittingDeep ? 'Equilibrada' : desperate ? 'Adiantada' : 'Equilibrada',
      intensity: diag.avgStamina >= 56 ? 'Normal' : 'Baixa',
    };
    reasonText = desperate
      ? `Tudo por empate aos ${minute}': ${ownClub.shortName} avança no ${candFormation} (${candMentality})!`
      : `Em desvantagem, ${ownClub.shortName} assume postura ofensiva (${candFormation}).`;
  }
  // Prioridade 9: Fadiga mantendo pressão alta / intensidade alta
  else if (
    (ownClub.botDifficulty !== 'facil' || diag.avgStamina < 46) &&
    diag.avgStamina < (profile.perceptionAccuracy >= 0.88 ? 65 : 54) &&
    (curTactics.intensity === 'Alta' || curTactics.pressing === 'Pressão alta') &&
    !alreadyDid('manage_fatigue') &&
    canSeeSignal()
  ) {
    reasonKey = 'manage_fatigue';
    candTactics = {
      ...curTactics,
      pressing: 'Bloco médio',
      intensity: 'Normal',
      defensiveLine: curTactics.defensiveLine === 'Adiantada' ? 'Equilibrada' : curTactics.defensiveLine,
    };
    reasonText = `Desgaste elevado (${Math.round(diag.avgStamina)}%): ${ownClub.shortName} dosa o ritmo para manter eficiência.`;
  }
  // Prioridade 10 (Difícil/Lendário): Contra-tática específica à linha ou pressão alta do rival
  else if (
    profile.perceptionAccuracy >= 0.85 &&
    (oppTactics.defensiveLine === 'Adiantada' || oppClub.mentality === 'Tudo ou Nada') &&
    curTactics.buildUpStyle !== 'Contra-ataques rápidos' &&
    !alreadyDid('counter_high_line') &&
    canSeeSignal()
  ) {
    reasonKey = 'counter_high_line';
    candFormation = pickCompatibleFormation(ownClub, ['4-3-3', '4-4-2', '4-2-3-1'], ownRedIds);
    candMentality = diag.goalDiff < 0 ? 'Ofensiva' : 'Contra-Ataque';
    candTactics = {
      ...curTactics,
      buildUpStyle: 'Contra-ataques rápidos',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Bloco médio',
      defensiveLine: 'Recuada',
      intensity: 'Normal',
    };
    reasonText = `Leitura tática: ${ownClub.shortName} explora a Linha Adiantada de ${oppClub.shortName} com transições velozes!`;
  }
  else if (
    profile.perceptionAccuracy >= 0.85 &&
    oppTactics.pressing === 'Pressão alta' &&
    curTactics.buildUpStyle === 'Saída curta' &&
    !alreadyDid('escape_high_press') &&
    canSeeSignal()
  ) {
    reasonKey = 'escape_high_press';
    candTactics = {
      ...curTactics,
      buildUpStyle: 'Contra-ataques rápidos',
      offensiveStyle: 'Transições rápidas',
      defensiveLine: 'Equilibrada',
    };
    reasonText = `Leitura tática: ${ownClub.shortName} acelera a saída de bola para escapar da pressão alta.`;
  }
  else if (
    profile.perceptionAccuracy >= 0.85 &&
    (oppTactics.defensiveLine === 'Recuada' ||
      oppTactics.pressing === 'Pressão baixa' ||
      oppClub.formation === '5-3-2') &&
    diag.goalDiff <= 0 &&
    curTactics.offensiveStyle !== 'Jogo pelas laterais' &&
    !alreadyDid('stretch_low_block') &&
    canSeeSignal()
  ) {
    reasonKey = 'stretch_low_block';
    candFormation = pickCompatibleFormation(ownClub, ['4-3-3', '4-2-3-1'], ownRedIds);
    candMentality = 'Equilibrada';
    candTactics = {
      ...curTactics,
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Jogo pelas laterais',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    };
    reasonText = `Leitura tática: ${ownClub.shortName} abre amplitude pelos lados para furar o bloco baixo de ${oppClub.shortName}.`;
  }
  // Prioridade 11 (Lendário): Otimização de sinergia máxima e fechamento de corredores contra jogo aberto
  else if (
    profile.perceptionAccuracy >= 0.94 &&
    !alreadyDid('elite_synergy_lock') &&
    (curTactics.defensiveLine === 'Adiantada' ||
      ownClub.formation === '5-3-2' ||
      curTactics.offensiveStyle === 'Posse de bola')
  ) {
    reasonKey = 'elite_synergy_lock';
    candFormation = pickCompatibleFormation(ownClub, ['4-3-3', '4-4-2'], ownRedIds);
    candMentality = diag.goalDiff >= 1 ? 'Contra-Ataque' : 'Equilibrada';
    candTactics = {
      buildUpStyle: oppTactics.defensiveLine === 'Adiantada' ? 'Contra-ataques rápidos' : 'Equilibrada',
      offensiveStyle:
        oppTactics.defensiveLine === 'Adiantada' ? 'Transições rápidas' : 'Jogo pelas laterais',
      pressing: 'Bloco médio',
      defensiveLine: oppTactics.defensiveLine === 'Adiantada' ? 'Recuada' : 'Equilibrada',
      intensity: 'Normal',
    };
    reasonText = `Leitura de elite: ${ownClub.shortName} equilibra linhas e explora corredores no ${candFormation}.`;
  }
  // Prioridade 12 (Difícil/Lendário): Adaptação se a mudança anterior piorou o time
  else if (
    lastChangeWorsened &&
    profile.perceptionAccuracy >= 0.85 &&
    !alreadyDid('pivot_after_review')
  ) {
    reasonKey = 'pivot_after_review';
    candFormation = pickCompatibleFormation(ownClub, ['4-3-3', '4-2-3-1'], ownRedIds);
    candMentality = diag.goalDiff >= 0 ? 'Equilibrada' : 'Ofensiva';
    candTactics = {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Jogo pelas laterais',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    };
    reasonText = `Leitura tática: ${ownClub.shortName} corrige estratégia anterior após baixa produção.`;
  }
  // Em Fácil, técnico novato frequentemente comete erros de alinhamento entre linhas ou decisões precipitadas
  else if (
    ownClub.botDifficulty === 'facil' &&
    minute >= 14 &&
    !alreadyDid('facil_misalign') &&
    Math.random() < 0.72
  ) {
    reasonKey = 'facil_misalign';
    candFormation = pickCompatibleFormation(ownClub, ['5-3-2', '3-4-3'], ownRedIds);
    candMentality = diag.goalDiff > 0 ? 'Retranca' : 'Tudo ou Nada';
    candTactics = {
      buildUpStyle: 'Saída curta',
      offensiveStyle: 'Jogo pelas laterais',
      pressing: candMentality === 'Retranca' ? 'Pressão alta' : 'Pressão baixa',
      defensiveLine: candMentality === 'Retranca' ? 'Adiantada' : 'Recuada',
      intensity: 'Alta',
    };
    reasonText = `${ownClub.shortName} altera o posicionamento sem sincronizar pressão e linha defensiva.`;
  }
  else if (
    ownClub.botDifficulty === 'facil' &&
    diag.goalDiff <= -1 &&
    minute >= 38 &&
    !alreadyDid('facil_panic') &&
    Math.random() < 0.65
  ) {
    reasonKey = 'facil_panic';
    candMentality = 'Tudo ou Nada';
    candTactics = {
      ...curTactics,
      pressing: 'Pressão alta',
      defensiveLine: 'Recuada',
      intensity: 'Alta',
    };
    reasonText = `${ownClub.shortName} se lança desordenadamente ao ataque buscando reagir.`;
  }
  else if (
    ownClub.botDifficulty === 'facil' &&
    diag.goalDiff >= 1 &&
    minute >= 50 &&
    !alreadyDid('facil_park') &&
    Math.random() < 0.6
  ) {
    reasonKey = 'facil_park';
    candFormation = pickCompatibleFormation(ownClub, ['5-3-2'], ownRedIds);
    candMentality = 'Retranca';
    candTactics = {
      ...curTactics,
      buildUpStyle: 'Saída curta',
      offensiveStyle: 'Jogo pelas laterais',
      pressing: 'Pressão alta',
      defensiveLine: 'Adiantada',
      intensity: 'Baixa',
    };
    reasonText = `${ownClub.shortName} tenta segurar o placar com instruções contraditórias.`;
  }

  if (!reasonKey) {
    return { decision: null, nextMemory };
  }

  // Evita mudanças sem diferença prática
  if (
    candFormation === ownClub.formation &&
    candMentality === ownClub.mentality &&
    tacticsEqual(candTactics, curTactics)
  ) {
    return { decision: null, nextMemory };
  }

  // Bots mais inteligentes validam compatibilidade elenco x tática antes de aplicar
  if (Math.random() < profile.compatibilityDiscipline) {
    const curCompat = evaluateTacticalCompatibility({
      formation: ownClub.formation,
      mentality: ownClub.mentality,
      tactics: curTactics,
      starters,
    });
    const testCompat = evaluateTacticalCompatibility({
      formation: candFormation,
      mentality: candMentality,
      tactics: candTactics,
      starters,
    });
    if (testCompat.score < 64 && candTactics.defensiveLine === 'Adiantada') {
      candTactics = { ...candTactics, defensiveLine: 'Equilibrada' };
    }
    if (testCompat.score < 62 && candTactics.pressing === 'Pressão alta') {
      candTactics = { ...candTactics, pressing: 'Bloco médio' };
    }
    if (candMentality === 'Retranca' && (candTactics.pressing === 'Pressão alta' || candTactics.defensiveLine === 'Adiantada')) {
      candTactics = { ...candTactics, pressing: 'Pressão baixa', defensiveLine: 'Recuada' };
    }
    if (candTactics.pressing === 'Pressão baixa' && candTactics.defensiveLine === 'Adiantada') {
      candTactics = { ...candTactics, defensiveLine: 'Equilibrada' };
    }
    const finalCompat = evaluateTacticalCompatibility({
      formation: candFormation,
      mentality: candMentality,
      tactics: candTactics,
      starters,
    });
    if (finalCompat.score + 6 < curCompat.score && reasonKey !== 'red_adapt') {
      return { decision: null, nextMemory };
    }
  } else if (ownClub.botDifficulty === 'facil' && Math.random() < 0.55) {
    // Em Fácil, técnico adversário ocasionalmente desalinha pressão e linha defensiva
    candTactics = {
      ...candTactics,
      defensiveLine: candTactics.pressing === 'Pressão alta' ? 'Recuada' : 'Adiantada',
    };
  }

  const updatedMemory: BotAIMemory = {
    lastEvalMinute: minute,
    lastTacticChangeMinute: minute,
    tacticalChangesCount: curMemory.tacticalChangesCount + 1,
    recentReasons: [...curMemory.recentReasons.slice(-4), reasonKey],
    lastDecision: {
      minute,
      reason: reasonKey,
      prevFormation: ownClub.formation,
      prevMentality: ownClub.mentality,
      prevTactics: curTactics,
      ownShotsAtChange: diag.ownShots,
      oppShotsAtChange: diag.oppShots,
      ownBigChancesAtChange: diag.ownBigChances,
      oppBigChancesAtChange: diag.oppBigChances,
      goalDiffAtChange: diag.goalDiff,
      possessionAtChange: diag.ownPossession,
    },
  };

  return {
    decision: {
      formation: candFormation,
      mentality: candMentality,
      tactics: candTactics,
      reason: reasonText,
      memory: updatedMemory,
    },
    nextMemory: updatedMemory,
  };
}

export function evaluateBotSubstitution(params: {
  club: Club;
  oppClub: Club;
  match: Match;
  simState: MatchSimState;
  isHome: boolean;
  subsUsed: number;
  subbedOutIds: string[];
}): { slotIndex: number; outPlayer: Player; inPlayer: Player; reason: string } | null {
  const { club, match, simState, isHome, subsUsed, subbedOutIds } = params;
  if (subsUsed >= 5) return null;

  const difficulty: BotDifficulty = club.controller === 'bot' ? club.botDifficulty : 'dificil';
  const profile = BOT_DIFFICULTY_PROFILES[difficulty];
  const minute = Math.min(90, match.currentMinute + 1);

  if (minute < profile.minSubMinute || minute >= 89) return null;
  // Evita checagens todo minuto em dificuldades baixas; usa cadência realista
  if (minute % profile.subCheckIntervalMin !== 0 && subsUsed < 4) {
    // Ainda permite troca de emergência se houver jogador muito cansado (<45%)
    const hasCritical = club.squad.some(
      (p) => p.isStarter && p.position !== 'GOL' && p.stamina < 45
    );
    if (!hasCritical) return null;
  }

  const ownRedIds = isHome ? simState.homeRedCardedIds : simState.awayRedCardedIds;
  const ownYellowIds = isHome ? simState.homeYellowCardedIds : simState.awayYellowCardedIds;
  const goalDiff = isHome ? match.homeGoals - match.awayGoals : match.awayGoals - match.homeGoals;
  const curTactics = getClubTactics(club);

  const slots = club.lineupSlots ?? [];
  const starterIdsOnField = new Set(slots.map((s) => s.playerId));

  // Jogadores elegíveis no banco (nunca quem saiu, expulso, já titular ou suspenso)
  const benchPool = club.squad.filter(
    (p) =>
      !p.isStarter &&
      !starterIdsOnField.has(p.id) &&
      !subbedOutIds.includes(p.id) &&
      !ownRedIds.includes(p.id) &&
      (p.suspendedMatches ?? 0) === 0 &&
      p.position !== 'GOL' &&
      p.stamina >= 72
  );
  if (benchPool.length === 0) return null;

  // Avalia urgência de saída de cada titular ativo
  const candidatesOut = slots
    .map((slot, slotIndex) => {
      if (ownRedIds.includes(slot.playerId)) return null; // expulso NUNCA pode ser substituído!
      const player = club.squad.find((p) => p.id === slot.playerId);
      if (!player || slot.role === 'GOL') return null;

      let urgency = 0;
      let reason = '';

      if (player.stamina <= profile.subStaminaTrigger) {
        urgency += (profile.subStaminaTrigger - player.stamina) * 1.45;
        reason = `desgaste (${Math.round(player.stamina)}%)`;
      }

      const hasYellow = ownYellowIds.includes(player.id);
      if (
        hasYellow &&
        (slot.role === 'ZAG' || slot.role === 'VOL' || slot.role === 'LD' || slot.role === 'LE') &&
        minute >= 54
      ) {
        urgency += 14 * profile.tacticalSubWeight;
        if (!reason) reason = 'risco de 2º amarelo';
      }

      const rating = simState.playerRatings[player.id] ?? 6.5;
      if (minute >= 58 && rating < 5.95) {
        urgency += (6.2 - rating) * 16 * profile.tacticalSubWeight;
        if (!reason) reason = 'baixo rendimento em campo';
      }

      // Necessidade tática por placar
      if (goalDiff <= -1 && minute >= 62 && (slot.role === 'VOL' || slot.role === 'ZAG' || slot.role === 'MC')) {
        urgency += 8 * profile.tacticalSubWeight;
      } else if (goalDiff >= 1 && minute >= 72 && (slot.role === 'PE' || slot.role === 'PD' || slot.role === 'MEI')) {
        urgency += 8 * profile.tacticalSubWeight;
      } else if (goalDiff >= 3 && minute >= 72 && player.overall >= 82 && player.stamina < 76) {
        // Preserva craque quando placar está elástico
        urgency += 15 * profile.tacticalSubWeight;
        if (!reason) reason = 'poupar titular com boa vantagem';
      }

      return { slotIndex, slot, player, urgency, reason: reason || 'renovar fôlego' };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null && x.urgency >= 7)
    .sort((a, b) => b.urgency - a.urgency);

  if (candidatesOut.length === 0) return null;

  for (const target of candidatesOut) {
    const targetEffectiveOvr = getPositionFit(target.player, target.slot.role).effectiveOvr;
    const targetLiveOvr = getEffectivePlayerMatchOvr(target.player, target.slot.role);
    const hasYellowRisk = ownYellowIds.includes(target.player.id);

    const scoredBench = benchPool
      .map((bench) => {
        const fit = getPositionFit(bench, target.slot.role);
        const benchLiveOvr = getEffectivePlayerMatchOvr(bench, target.slot.role);
        const attrs = ensurePlayerAttributes(bench);
        let styleBonus = 0;

        if (
          (curTactics.buildUpStyle === 'Contra-ataques rápidos' ||
            curTactics.offensiveStyle === 'Transições rápidas') &&
          (target.slot.role === 'PE' || target.slot.role === 'PD' || target.slot.role === 'CA')
        ) {
          styleBonus += (attrs.velocidade - 74) * 0.15;
        }
        if (goalDiff <= -1 && (bench.position === 'CA' || bench.position === 'MEI' || bench.position === 'PE' || bench.position === 'PD')) {
          styleBonus += (attrs.finalizacao + attrs.visao - 140) * 0.12 * profile.tacticalSubWeight;
        }
        if (goalDiff >= 1 && (bench.position === 'VOL' || bench.position === 'ZAG' || bench.position === 'MC')) {
          styleBonus += (attrs.marcacao + attrs.desarme - 140) * 0.12 * profile.tacticalSubWeight;
        }

        // Em Fácil, bot pode aceitar encaixe pior ou substituto mais fraco
        const qualityDropAllowed = difficulty === 'facil' ? 10 : difficulty === 'medio' ? 7 : 5;
        const improvesLiveOrEmergency =
          difficulty === 'facil' ||
          difficulty === 'medio' ||
          hasYellowRisk ||
          target.player.stamina < 53 ||
          benchLiveOvr >= targetLiveOvr - 0.5;
        const viable =
          improvesLiveOrEmergency &&
          fit.effectiveOvr >= targetEffectiveOvr - qualityDropAllowed &&
          fit.penalty >= (difficulty === 'lendario' ? -5 : -8);
        const staminaGainBonus = Math.max(0, bench.stamina - target.player.stamina) * 0.22;
        const totalScore = fit.effectiveOvr + styleBonus + staminaGainBonus - (fit.penalty < 0 ? 2 : 0);

        return { bench, viable, totalScore, fit };
      })
      .filter((c) => c.viable)
      .sort((a, b) => b.totalScore - a.totalScore);

    if (scoredBench.length > 0) {
      const picked = scoredBench[0];
      return {
        slotIndex: target.slotIndex,
        outPlayer: target.player,
        inPlayer: picked.bench,
        reason: target.reason,
      };
    }
  }

  return null;
}

export { type PlayerPosition };
