export const BRASILEIRAO_TARGETS = {
  goalsPerMatch: [2.2, 2.8] as const,
  shotsPerTeam: [10.0, 16.0] as const,
  onTargetPerTeam: [3.0, 6.0] as const,
  yellowsPerMatch: [3.0, 6.0] as const,
  redsPerMatch: [0.05, 0.28] as const,
  possessionRange: [34, 66] as const,
  passAccuracyPct: [74, 88] as const,
};

export const SIM_BALANCE = {
  // Volume de posses/passes (~350-420 passes/time com ~78-83% acerto, ~12-14 chutes/time, ~2.45 gols/jogo)
  possessionsPerMinuteBase: 2.34,
  maxStepsPerPossession: 8,

  // Vantagem realista de jogar em casa (~0.95 pts -> ~44-48% Casa, ~25-29% Empate, ~24-28% Fora)
  homeCrowdEdge: 0.95,

  // Curva logística OVR/Atributo (77 vs 72 competitivo ~60-66% V; 92 vs 72 dominante)
  duelScaleDivisor: 28.5,
  shotFinishScaleDivisor: 22.5,

  // Execução base
  basePassSuccess: 0.926,
  baseVerticalSuccess: 0.56,
  baseLongBallSuccess: 0.34,
  baseDribbleSuccess: 0.53,
  baseCrossSuccess: 0.22,
  baseOffsideRate: 0.032,

  // Faltas e Cartões (~24-30 faltas, ~3.8-5.0 amarelos/jogo, ~0.10-0.22 vermelhos/jogo)
  foulOnFailedTackleProb: 0.34,
  foulInPressingDuelProb: 0.082,
  yellowCardPerFoulProb: 0.175,
  directRedPerHardFoulProb: 0.003,
  penaltyRateOnBoxFoul: 0.4,

  // Funil realista de Finalizações (~12-14.5 chutes/time -> ~4.2-5.1 no alvo -> ~2.35-2.65 gols/jogo)
  baseShootTriggerZone4: 0.0056,
  baseShootTriggerZone5: 0.072,
  shotBlockBaseRate: 0.22,
  onTargetBaseRate: 0.31,
  goalOnTargetBaseRate: 0.175,
  bigChanceOnTargetBonus: 0.16,
  bigChanceGoalBonus: 0.14,
  cornerFromBlockedOrSavedShot: 0.26,
  reboundAfterKeeperSaveProb: 0.075,

  // Impacto de expulsão (-1 jogador)
  redCardDuelPenaltyPerPlayer: 4.0,
  redCardPossessionPenalty: 0.12,

  // Desgaste físico realista (equilibrado ~58-65%, Gegenpressing ~45-54%, Bloco Baixo ~66-74%)
  baseDrainScale: 1.24,
};
