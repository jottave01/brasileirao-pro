import {
  ActivityFeedItem,
  BotDifficulty,
  Club,
  ClubFinances,
  FinanceLedgerEntry,
  LeagueState,
  Match,
  MatchBoxOfficeReport,
  NegotiationOffer,
  Player,
  SeasonHistoryEntry,
  TransferDispute,
  TransferDisputeBid,
} from '../types/league';
import {
  calcAgentMinimumSalary,
  calcMarketValue,
  calcMonthlySalary,
  CLUB_TEMPLATES,
  formatMillionsBRL,
  formatMonthlySalary,
  generateWorldMarketPool,
  getMatchRivalryLabel,
} from '../data/seedData';
import { evolvePlayerAttributesForSeason } from './playerAttributes';
import {
  buildLineupSlots,
  calculateClubStrength,
} from './tacticalEngine';

// Re-exportações modulares do novo motor de simulação, atributos, táticas e IA
export {
  ATTRIBUTE_KEYS,
  PLAYER_ATTRIBUTE_GROUPS,
  calculateOverallFromAttributes,
  ensurePlayerAttributes,
  evolvePlayerAttributesForSeason,
  generatePlayerAttributes,
  getEffectiveMatchAttribute,
  getEffectivePlayerMatchOvr,
  getPositionFit,
} from './playerAttributes';

export {
  BUILD_UP_OPTIONS,
  DEFENSIVE_LINE_OPTIONS,
  DEFAULT_CLUB_TACTICS,
  FORMATION_LAYOUT,
  FORMATION_OPTIONS,
  FORMATION_TACTICAL_PROFILE,
  INTENSITY_OPTIONS,
  OFFENSIVE_STYLE_OPTIONS,
  PLAY_STYLE_OPTIONS,
  PLAY_STYLE_SPECS,
  PRESSING_OPTIONS,
  TACTICAL_POSTURES,
  TACTICAL_PRESETS,
  autoPickLineup,
  buildLineupSlots,
  buildTacticsForPlayStyle,
  calculateClubStrength,
  chooseBotTactics,
  computeTacticalBehaviorProfile,
  computeTacticalMatchupModifiers,
  computeTeamNota,
  evaluateFormationSynergy,
  evaluateTacticalCompatibility,
  evaluateTacticalMatchup,
  getClubTactics,
  getEffectiveStarters,
  inferPlayStyleFromClub,
  normalizePosture,
  tacticsEqual,
  type FormationOptionMeta,
  type FormationSlotSpec,
  type FormationTacticalProfile,
  type PlayStyleSpec,
  type TacticalBehaviorProfile,
  type TacticalCompatibilityReport,
  type TacticalReadout,
} from './tacticalEngine';

export {
  computeClubPlayerDrains,
  createInitialSimState,
  normalizeMatchStats,
  simulateMatchMinuteStep,
} from './matchSimulation';

export {
  BOT_DIFFICULTY_PROFILES,
  analyzeMatchContextForBot,
  createInitialBotAIMemory,
  evaluateBotSubstitution,
  evaluateBotTacticalDecision,
} from './botManagerAI';

export const PAYROLL_INTERVAL_ROUNDS = 4;

export function calcMonthlyPayrollMillions(club: Pick<Club, 'squad' | 'tier'>): number {
  const sumMillions = club.squad.reduce(
    (sum, p) => sum + (p.monthlySalary ?? calcMonthlySalary(p.overall, club.tier)) / 1000,
    0
  );
  return Math.round(sumMillions * 100) / 100;
}

export function isClubInFinancialDebt(club: Pick<Club, 'finances'>): boolean {
  return (club.finances.wageBudget ?? 0) < 0;
}

export function appendFinanceLedger(
  ledger: FinanceLedgerEntry[] | undefined,
  entry: Omit<FinanceLedgerEntry, 'id' | 'timestamp'>
): FinanceLedgerEntry[] {
  const nowStr = new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const next: FinanceLedgerEntry = {
    ...entry,
    id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowStr,
  };
  return [next, ...(ledger ?? [])].slice(0, 20);
}

/** Credita receita quitando eventuais dívidas salariais antes de dividir entre Caixa e Fundo Salarial */
export function creditClubRevenue(
  club: Club,
  amountMillions: number,
  meta: {
    round: number;
    type: FinanceLedgerEntry['type'];
    label: string;
  }
): ClubFinances {
  const curFinances = club.finances;
  const curWageBill = curFinances.wageBill || calcMonthlyPayrollMillions(club);
  let budget = curFinances.budget ?? 0;
  let wageBudget = curFinances.wageBudget ?? Math.round(curWageBill * 5 * 100) / 100;

  const incoming = Math.max(0, Math.round(amountMillions * 100) / 100);
  if (incoming <= 0) return curFinances;

  let remaining = incoming;
  let clearedDebt = 0;

  if (wageBudget < 0) {
    const needed = Math.abs(wageBudget);
    const payDebt = Math.min(remaining, needed);
    wageBudget = Math.round((wageBudget + payDebt) * 100) / 100;
    remaining = Math.round((remaining - payDebt) * 100) / 100;
    clearedDebt = payDebt;
  }

  let transferPct = curFinances.revenueTransferPct ?? 45;
  if (club.controller === 'bot' && wageBudget < curWageBill * 2) {
    transferPct = 25;
  }
  const clampedPct = Math.max(0, Math.min(100, transferPct));
  const toTransfer = Math.round(remaining * (clampedPct / 100) * 100) / 100;
  const toWage = Math.round((remaining - toTransfer) * 100) / 100;

  budget = Math.round((budget + toTransfer) * 100) / 100;
  wageBudget = Math.round((wageBudget + toWage) * 100) / 100;

  const targetFund: FinanceLedgerEntry['targetFund'] =
    clearedDebt > 0 && remaining === 0
      ? 'salarios'
      : toTransfer > 0 && toWage + clearedDebt > 0
      ? 'misto'
      : toTransfer > 0
      ? 'transferencias'
      : 'salarios';

  return {
    ...curFinances,
    budget,
    wageBudget,
    financeLedger: appendFinanceLedger(curFinances.financeLedger, {
      round: meta.round,
      type: meta.type,
      label: clearedDebt > 0 ? `${meta.label} (abateu dívida)` : meta.label,
      amount: incoming,
      targetFund,
    }),
  };
}

export function calculateMatchBoxOffice(params: {
  homeClub: Club;
  awayClub: Club;
  allClubs: Club[];
  round: number;
  totalRounds: number;
  finishedMatches: Match[];
}): MatchBoxOfficeReport {
  const { homeClub, awayClub, allClubs, round, totalRounds, finishedMatches } = params;

  const tpl = CLUB_TEMPLATES.find(
    (t) =>
      homeClub.id.startsWith(`${t.id}-`) ||
      t.shortName === homeClub.shortName ||
      t.name === homeClub.name
  );
  const capacity = homeClub.stadiumCapacity ?? tpl?.stadiumCapacity ?? 35000;

  const standingsOrder = [...allClubs].sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
    const sgA = a.standing.goalsFor - a.standing.goalsAgainst;
    const sgB = b.standing.goalsFor - b.standing.goalsAgainst;
    if (sgB !== sgA) return sgB - sgA;
    return b.standing.goalsFor - a.standing.goalsFor;
  });

  const homeRank = Math.max(1, standingsOrder.findIndex((c) => c.id === homeClub.id) + 1);
  const awayRank = Math.max(1, standingsOrder.findIndex((c) => c.id === awayClub.id) + 1);
  const played = homeClub.standing.played;

  let baseOcc = 0.76;
  if (played === 0) {
    baseOcc =
      homeClub.tier === 1
        ? 0.86
        : homeClub.tier === 2
        ? 0.82
        : homeClub.tier === 3
        ? 0.78
        : 0.74;
  } else if (homeRank <= 4) {
    baseOcc = 0.94;
  } else if (homeRank <= 8) {
    baseOcc = 0.85;
  } else if (homeRank <= 14) {
    baseOcc = 0.76;
  } else if (homeRank <= 16) {
    baseOcc = 0.6;
  } else {
    baseOcc = 0.44;
  }

  const homeRecent = finishedMatches
    .filter(
      (m) =>
        m.status === 'finalizada' &&
        (m.homeClubId === homeClub.id || m.awayClubId === homeClub.id)
    )
    .sort((a, b) => a.round - b.round)
    .slice(-5);

  let formMod = 0;
  homeRecent.forEach((m) => {
    const isH = m.homeClubId === homeClub.id;
    const gf = isH ? m.homeGoals : m.awayGoals;
    const ga = isH ? m.awayGoals : m.homeGoals;
    if (gf > ga) formMod += 0.025;
    else if (gf < ga) formMod -= 0.025;
  });
  formMod = Math.max(-0.08, Math.min(0.08, formMod));

  const rivalry = getMatchRivalryLabel(homeClub.id, awayClub.id);
  let impMod = 0;
  let highlightLabel: string | undefined;

  if (rivalry) {
    impMod += 0.18;
    highlightLabel = `Clássico: ${rivalry}`;
  }

  if (played >= 3 && homeRank <= 4 && awayRank <= 4) {
    impMod += 0.16;
    if (!highlightLabel) highlightLabel = 'Briga pelo Título (G4)';
  } else if (played >= 3 && homeRank <= 6 && awayRank <= 6) {
    impMod += 0.12;
    if (!highlightLabel) highlightLabel = 'Confronto Direto G6';
  } else if (played >= 6 && homeRank >= 15 && awayRank >= 15) {
    impMod += 0.1;
    if (!highlightLabel) highlightLabel = 'Decisão contra o Z4';
  } else if (played >= 4 && Math.abs(homeRank - awayRank) <= 2) {
    impMod += 0.06;
    if (!highlightLabel) highlightLabel = 'Rival Direto na Tabela';
  }

  if (awayClub.tier === 1 && homeClub.tier >= 2) {
    impMod += 0.08;
  }
  if (round >= Math.max(1, totalRounds - 5) && (homeRank <= 6 || homeRank >= 15)) {
    impMod += 0.07;
  }

  const jitter = Math.random() * 0.04 - 0.02;
  const finalOcc = Math.max(0.3, Math.min(1.0, baseOcc + formMod + impMod + jitter));
  const attendance = Math.round(capacity * finalOcc);
  const occupancyPct = Math.min(100, Math.round(finalOcc * 100));

  const baseTicket =
    homeClub.tier === 1 ? 82 : homeClub.tier === 2 ? 68 : homeClub.tier === 3 ? 58 : 48;
  const priceMult =
    rivalry || (played >= 3 && homeRank <= 4 && awayRank <= 4)
      ? 1.22
      : played >= 3 && homeRank <= 6 && awayRank <= 6
      ? 1.12
      : occupancyPct >= 90
      ? 1.06
      : 1.0;

  const avgTicketPrice = Math.round(baseTicket * priceMult);
  const revenue = Math.round(((attendance * avgTicketPrice) / 1_000_000) * 100) / 100;

  return {
    attendance,
    capacity,
    occupancyPct,
    avgTicketPrice,
    revenue,
    highlightLabel,
    isRivalry: Boolean(rivalry),
  };
}

function getTransferNegotiationDifficultyFactor(difficulty: BotDifficulty): number {
  switch (difficulty) {
    case 'facil':
      return 0.84;
    case 'medio':
      return 1.0;
    case 'dificil':
      return 1.12;
    case 'lendario':
      return 1.24;
  }
}

export interface FifaOfferEvaluation {
  outcome: 'aceita' | 'contraproposta' | 'recusada';
  counterCash?: number;
  counterSalary?: number;
  nextPatience: number;
  locked: boolean;
  message: string;
}

/** Negociação realista completa: Clube Vendedor (passe) + Empresário/Atleta (salário & projeto) */
export function evaluateFifaBotOffer(params: {
  targetPlayer: Player;
  sellerClub?: Club;
  buyerClub?: Club;
  originType?: 'europa' | 'bot' | 'livre';
  offerCash: number;
  proposedMonthlySalary?: number;
  swapPlayer?: Player;
  currentPatience: number;
}): FifaOfferEvaluation {
  const {
    targetPlayer,
    sellerClub,
    buyerClub,
    originType,
    offerCash,
    proposedMonthlySalary,
    swapPlayer,
    currentPatience,
  } = params;

  if (currentPatience <= 0) {
    return {
      outcome: 'recusada',
      nextPatience: 0,
      locked: true,
      message: 'Negociação encerrada nesta janela por falta de paciência do clube e empresário.',
    };
  }

  const minBaseSalary = calcAgentMinimumSalary(targetPlayer, buyerClub);
  const starterRivals =
    buyerClub?.squad.filter(
      (p) =>
        p.isStarter &&
        (p.position === targetPlayer.position ||
          (targetPlayer.ambidextrous && (p.position === 'PE' || p.position === 'PD')))
    ) ?? [];
  const hasHardCompetition = starterRivals.some((p) => p.overall >= targetPlayer.overall + 2);
  const effectiveMinSalary = hasHardCompetition
    ? Math.max(40, Math.round((minBaseSalary * 1.08) / 5) * 5)
    : minBaseSalary;

  const offeredSalary =
    proposedMonthlySalary ?? targetPlayer.monthlySalary ?? calcMonthlySalary(targetPlayer.overall);
  const salaryRatio = effectiveMinSalary > 0 ? offeredSalary / effectiveMinSalary : 1;

  const evaluateAgentResponse = (clubAgreed: boolean): FifaOfferEvaluation => {
    const agreedFeeText = `${formatMillionsBRL(offerCash)}${swapPlayer ? ` + ${swapPlayer.knownName}` : ''}`;
    if (salaryRatio < 0.78) {
      const nextPatience = Math.max(0, currentPatience - 2);
      const locked = nextPatience <= 0;
      const prefix = clubAgreed ? `O clube aceitou o passe (${agreedFeeText}), mas a` : 'A';
      return {
        outcome: 'recusada',
        counterCash: offerCash,
        counterSalary: effectiveMinSalary,
        nextPatience,
        locked,
        message: locked
          ? `Conduta reprovada! O empresário de ${targetPlayer.knownName} encerrou as conversas após oferta salarial ofensiva (${formatMonthlySalary(offeredSalary)}).`
          : `${prefix} proposta salarial (${formatMonthlySalary(offeredSalary)}) ofendeu o empresário de ${targetPlayer.knownName}. Mínimo exigido: ${formatMonthlySalary(effectiveMinSalary)} (Paciência: ${nextPatience}/3).`,
      };
    }

    if (salaryRatio < 1.0) {
      const nextPatience = Math.max(0, currentPatience - 1);
      const locked = nextPatience <= 0;
      if (locked) {
        return {
          outcome: 'recusada',
          nextPatience: 0,
          locked: true,
          message: `Paciência esgotada! O empresário de ${targetPlayer.knownName} recusou ${formatMonthlySalary(offeredSalary)} e encerrou a negociação.`,
        };
      }
      const msgStart = clubAgreed
        ? `O clube aceitou o passe (${agreedFeeText}), mas o`
        : 'O';
      return {
        outcome: 'contraproposta',
        counterCash: offerCash,
        counterSalary: effectiveMinSalary,
        nextPatience,
        locked: false,
        message: `${msgStart} empresário de ${targetPlayer.knownName} recusou ${formatMonthlySalary(offeredSalary)} e exige ${formatMonthlySalary(effectiveMinSalary)} para fechar contrato.`,
      };
    }

    return {
      outcome: 'aceita',
      nextPatience: currentPatience,
      locked: false,
      message: clubAgreed
        ? `Acordo completo! Clube (${agreedFeeText}) e empresário (${formatMonthlySalary(offeredSalary)}) aceitaram liberar ${targetPlayer.knownName}!`
        : `Contrato aceito! ${targetPlayer.knownName} e seu empresário aprovaram ${formatMonthlySalary(offeredSalary)}.`,
    };
  };

  const isFreeAgent =
    originType === 'livre' ||
    (!sellerClub && (!targetPlayer.currentClubName || targetPlayer.currentClubName === 'Livre'));

  if (isFreeAgent) {
    return evaluateAgentResponse(false);
  }

  if (sellerClub && sellerClub.squad.length <= 13 && !swapPlayer) {
    return {
      outcome: 'recusada',
      nextPatience: currentPatience,
      locked: false,
      message: `${sellerClub.shortName} recusou: elenco no limite mínimo sem jogador na troca.`,
    };
  }

  const fairValue = targetPlayer.marketValue;
  const swapValue = swapPlayer ? swapPlayer.marketValue * 0.85 : 0;
  const totalOffer = Math.round((offerCash + swapValue) * 10) / 10;
  const ratio = fairValue > 0 ? totalOffer / fairValue : 1;

  if (ratio >= 1.0) {
    return evaluateAgentResponse(true);
  }

  const sellerStarterPenalty = sellerClub && targetPlayer.isStarter ? 0.12 : 0;
  const diffFactor = sellerClub
    ? getTransferNegotiationDifficultyFactor(sellerClub.botDifficulty)
    : 1.0;

  if (ratio >= 0.85) {
    const acceptProb = Math.max(
      0.18,
      Math.min(0.65, (ratio - 0.82) * 3.1 - sellerStarterPenalty - (diffFactor - 1) * 0.25)
    );
    if (Math.random() < acceptProb) {
      return evaluateAgentResponse(true);
    }

    const nextPatience = Math.max(0, currentPatience - 1);
    const locked = nextPatience <= 0;
    const askMultiplier = sellerClub && targetPlayer.isStarter ? 1.06 : 1.02;
    const needed = Math.max(
      offerCash + 1,
      Math.round((fairValue * askMultiplier - swapValue) * 2) / 2
    );

    if (locked) {
      return {
        outcome: 'recusada',
        nextPatience: 0,
        locked: true,
        message: `Paciência esgotada! ${sellerClub?.shortName ?? targetPlayer.currentClubName ?? 'O clube'} encerrou as conversas nesta janela.`,
      };
    }

    const salaryNote =
      salaryRatio < 1.0
        ? ` e o empresário exige salário de ${formatMonthlySalary(effectiveMinSalary)}`
        : '';

    return {
      outcome: 'contraproposta',
      counterCash: needed,
      counterSalary: salaryRatio < 1.0 ? effectiveMinSalary : undefined,
      nextPatience,
      locked: false,
      message: `${sellerClub?.shortName ?? targetPlayer.currentClubName ?? 'Clube'} pede ${formatMillionsBRL(needed)}${
        swapPlayer ? ` + ${swapPlayer.knownName}` : ''
      }${salaryNote} (passe avaliado em ${formatMillionsBRL(fairValue)}).`,
    };
  }

  const drop = ratio < 0.65 ? 2 : 1;
  const nextPatience = Math.max(0, currentPatience - drop);
  const locked = nextPatience <= 0;

  return {
    outcome: 'recusada',
    nextPatience,
    locked,
    message: locked
      ? `Conduta reprovada: oferta muito baixa (${formatMillionsBRL(totalOffer)} vs ${formatMillionsBRL(fairValue)}). O clube encerrou as negociações!`
      : `Recusada! Oferta muito abaixo do valor de mercado (${formatMillionsBRL(fairValue)}). Paciência restante: ${nextPatience}/3.`,
  };
}

export function evaluateHumanOfferToBot(offer: {
  fromClub: Club;
  toClub: Club;
  targetPlayer: Player;
  offerCash: number;
  swapPlayer?: Player;
}): {
  status: NegotiationOffer['status'];
  counterCash?: number;
  reason: string;
} {
  const res = evaluateFifaBotOffer({
    targetPlayer: offer.targetPlayer,
    sellerClub: offer.toClub,
    offerCash: offer.offerCash,
    swapPlayer: offer.swapPlayer,
    currentPatience: 3,
  });
  return {
    status: res.outcome,
    counterCash: res.counterCash,
    reason: res.message,
  };
}

export function runBotMarketCycle(league: LeagueState): {
  clubs: Club[];
  freeAgents: Player[];
  feedItems: ActivityFeedItem[];
} {
  if (!league.config.transferRules.windowOpen) {
    return { clubs: league.clubs, freeAgents: league.freeAgents, feedItems: [] };
  }

  const updatedClubs = league.clubs.map((c) => ({
    ...c,
    squad: [...c.squad],
    lineupSlots: [...c.lineupSlots],
    finances: { ...c.finances },
  }));
  let updatedFreeAgents = [...league.freeAgents];
  const feedItems: ActivityFeedItem[] = [];
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  for (let i = 0; i < updatedClubs.length; i++) {
    const bot = updatedClubs[i];
    if (bot.controller !== 'bot') continue;
    if (isClubInFinancialDebt(bot)) continue;
    if (bot.dealsThisRound >= league.config.transferRules.maxDealsPerRound) continue;

    if (
      league.config.transferRules.allowDirectPurchase &&
      bot.squad.length < league.config.squadSize &&
      updatedFreeAgents.length > 0 &&
      Math.random() < 0.45
    ) {
      const affordable = updatedFreeAgents.filter(
        (p) => p.marketValue <= bot.finances.budget * 0.5
      );
      if (affordable.length > 0) {
        const pick = affordable[0];
        const fee = pick.marketValue;
        const tax = Math.round(fee * (league.config.transferRules.taxPercent / 100) * 10) / 10;
        const totalCost = Math.round((fee + tax) * 10) / 10;

        if (bot.finances.budget >= totalCost) {
          bot.finances.budget = Math.round((bot.finances.budget - totalCost) * 10) / 10;
          bot.finances.transferSpent = Math.round((bot.finances.transferSpent + totalCost) * 10) / 10;
          const built = buildLineupSlots(
            [...bot.squad, { ...pick, isStarter: false, listedForSale: false }],
            bot.formation,
            bot.lineupSlots
          );
          bot.squad = built.squad;
          bot.lineupSlots = built.lineupSlots;
          bot.finances.wageBill = calcMonthlyPayrollMillions({ squad: bot.squad, tier: bot.tier });
          bot.dealsThisRound += 1;
          updatedFreeAgents = updatedFreeAgents.filter((p) => p.id !== pick.id);

          feedItems.push({
            id: `feed-bot-${Date.now()}-${i}`,
            category: 'mercado',
            actorName: bot.shortName,
            actorType: 'bot',
            message: `Contratou ${pick.knownName} (${pick.position}, ${pick.overall}) por ${formatMillionsBRL(totalCost)}.`,
            timestamp: nowStr,
          });
        }
      }
    }
  }

  return {
    clubs: updatedClubs,
    freeAgents: updatedFreeAgents,
    feedItems: feedItems.slice(0, 4),
  };
}

export function calculateSeasonPrizes(clubs: Club[]): Array<{
  clubId: string;
  clubName: string;
  rank: number;
  prize: number;
}> {
  const sorted = [...clubs].sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
    const sgA = a.standing.goalsFor - a.standing.goalsAgainst;
    const sgB = b.standing.goalsFor - b.standing.goalsAgainst;
    if (sgB !== sgA) return sgB - sgA;
    return b.standing.goalsFor - a.standing.goalsFor;
  });

  return sorted.map((c, idx) => {
    const rank = idx + 1;
    const prize =
      rank === 1
        ? 45
        : rank === 2
        ? 35
        : rank === 3
        ? 28
        : rank === 4
        ? 22
        : rank <= 8
        ? 16
        : rank <= 12
        ? 12
        : 8;
    return { clubId: c.id, clubName: c.name, rank, prize };
  });
}

/** Processa vencimento de contratos de Bots e Humanos e libera atletas sem renovação para Livres */
export function processBotContractExpirations(
  clubs: Club[],
  freeAgents: Player[],
  isSeasonEnd: boolean
): {
  clubs: Club[];
  freeAgents: Player[];
  feedItems: ActivityFeedItem[];
} {
  const releasedPlayers: Player[] = [];
  const feedItems: ActivityFeedItem[] = [];
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const existingFreeIds = new Set(freeAgents.map((p) => p.id));

  const nextClubs = clubs.map((club) => {
    let squad = [...club.squad];
    const expiring: Player[] = [];

    if (club.controller === 'bot') {
      const kept: Player[] = [];
      for (const p of squad) {
        const curYears = p.contractYears ?? 2;
        if (curYears <= 1 && kept.length + (squad.length - kept.length - 1) >= 15) {
          const shouldRenew =
            (p.isStarter && p.age <= 30 && club.finances.budget >= 25) ||
            (p.age <= 24 && Math.random() < 0.65) ||
            Math.random() < 0.52;

          if (shouldRenew) {
            const newSal = calcAgentMinimumSalary(p, club);
            kept.push({
              ...p,
              contractYears: isSeasonEnd ? 2 + (p.age <= 25 ? 1 : 0) : 3,
              monthlySalary: newSal,
              wage: Math.max(0.1, Math.round((newSal / 1000) * 10) / 10),
            });
          } else {
            expiring.push(p);
          }
        } else {
          kept.push({
            ...p,
            contractYears: isSeasonEnd ? Math.max(1, curYears - 1) : curYears,
          });
        }
      }
      squad = kept;
    } else if (isSeasonEnd) {
      const kept: Player[] = [];
      for (const p of squad) {
        const curYears = p.contractYears ?? 2;
        if (curYears <= 1 && kept.length + (squad.length - kept.length - 1) >= 15) {
          expiring.push(p);
        } else {
          kept.push({
            ...p,
            contractYears: Math.max(1, curYears - 1),
          });
        }
      }
      squad = kept;
    }

    if (expiring.length === 0 && !isSeasonEnd) {
      return club;
    }

    expiring.forEach((p) => {
      if (!existingFreeIds.has(p.id)) {
        existingFreeIds.add(p.id);
        releasedPlayers.push({
          ...p,
          isStarter: false,
          listedForSale: false,
          currentClubName: 'Livre',
          contractYears: 0,
          marketValue: 0,
        });
        feedItems.push({
          id: `feed-exp-${club.id}-${p.id}-${Date.now()}`,
          category: 'mercado',
          actorName: club.shortName,
          actorType: club.controller,
          message: `Contrato de ${p.knownName} (OVR ${p.overall}) encerrou! Atleta ficou Livre no mercado.`,
          timestamp: nowStr,
        });
      }
    });

    const built = buildLineupSlots(squad, club.formation, club.lineupSlots);
    const wageBill = calcMonthlyPayrollMillions({ squad: built.squad, tier: club.tier });

    return {
      ...club,
      squad: built.squad,
      lineupSlots: built.lineupSlots,
      finances: {
        ...club.finances,
        wageBill,
      },
    };
  });

  const nextFree = [...releasedPlayers, ...freeAgents].sort((a, b) => b.overall - a.overall);
  return {
    clubs: nextClubs,
    freeAgents: nextFree,
    feedItems: feedItems.slice(0, 6),
  };
}

export function applySeasonEndAndPrepareNext(
  league: LeagueState,
  regenerateMatches: (clubs: Club[], config: LeagueState['config']) => { matches: Match[]; totalRounds: number }
): LeagueState {
  const prizes = calculateSeasonPrizes(league.clubs);
  const prizeMap = new Map(prizes.map((p) => [p.clubId, p]));
  const champion = league.clubs.find((c) => c.id === prizes[0]?.clubId);
  const runnerUp = league.clubs.find((c) => c.id === prizes[1]?.clubId);
  const topScorerEntry = league.clubs
    .flatMap((c) => c.squad)
    .sort((a, b) => b.goals - a.goals)[0];

  const historyEntry: SeasonHistoryEntry = {
    season: league.season,
    championClubId: champion?.id ?? '',
    championName: champion?.name ?? '-',
    championManager: champion?.managerName ?? '-',
    championLogoUrl: champion?.logoUrl ?? '',
    runnerUpName: runnerUp?.name ?? '-',
    topScorerName: topScorerEntry?.knownName ?? '-',
    topScorerGoals: topScorerEntry?.goals ?? 0,
    prizesAwarded: prizes,
  };

  const preExpiryClubs: Club[] = league.clubs.map((c) => {
    const award = prizeMap.get(c.id);
    const prize = award?.prize ?? 8;
    const isChamp = award?.rank === 1;

    const evolvedSquad = c.squad.map((p) => {
      const nextAge = p.age + 1;
      const evolved = evolvePlayerAttributesForSeason(p, {
        goals: p.goals ?? 0,
        assists: p.assists ?? 0,
        isStarter: Boolean(p.isStarter),
      });
      const nextOvr = evolved.overall;
      const nextVal = calcMarketValue(nextOvr);
      const baseCur = calcMonthlySalary(p.overall, c.tier);
      const baseNext = calcMonthlySalary(nextOvr, c.tier);
      const curSalary = p.monthlySalary ?? baseCur;
      const nextSalary =
        nextOvr === p.overall
          ? curSalary
          : Math.max(25, Math.round((curSalary * (baseNext / Math.max(25, baseCur))) / 5) * 5);

      return {
        ...p,
        age: nextAge,
        overall: nextOvr,
        attributes: evolved.attributes,
        marketValue: nextVal,
        monthlySalary: nextSalary,
        wage: Math.max(0.1, Math.round((nextSalary / 1000) * 10) / 10),
        stamina: 100,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        suspendedMatches: 0,
      };
    });

    const built = buildLineupSlots(evolvedSquad, c.formation, c.lineupSlots);
    const wageBill = calcMonthlyPayrollMillions({ squad: built.squad, tier: c.tier });
    const credited = creditClubRevenue(
      { ...c, squad: built.squad, finances: { ...c.finances, wageBill } },
      prize,
      {
        round: league.totalRounds,
        type: 'premio',
        label: `Premiação T${league.season} (${award?.rank ?? '-'}º)`,
      }
    );

    return {
      ...c,
      squad: built.squad,
      lineupSlots: built.lineupSlots,
      titlesWon: c.titlesWon + (isChamp ? 1 : 0),
      dealsThisRound: 0,
      finances: {
        ...credited,
        prizeIncome: Math.round((c.finances.prizeIncome + prize) * 100) / 100,
        wageBill,
        boxOfficeIncome: 0,
        totalWagesPaid: 0,
        lastPayrollRound: 0,
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
    };
  });

  const contractCycle = processBotContractExpirations(
    preExpiryClubs,
    league.freeAgents,
    true
  );

  const { matches, totalRounds } = regenerateMatches(contractCycle.clubs, league.config);
  const nextSeason = league.season + 1;
  const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const windowHours = league.config.transferRules.windowHours || 24;
  const windowEnds = new Date(Date.now() + windowHours * 3600 * 1000).toISOString();

  return {
    ...league,
    season: nextSeason,
    seasonHistory: [historyEntry, ...league.seasonHistory],
    status: 'janela_mercado',
    clubs: contractCycle.clubs,
    freeAgents: contractCycle.freeAgents,
    currentRound: 1,
    totalRounds,
    matches,
    worldMarket: generateWorldMarketPool(),
    transferWindowOpen: true,
    transferWindowEndsAt: windowEnds,
    transferWindowLabel: `Janela Pré-Temporada T${nextSeason} (24h)`,
    midSeasonWindowDone: false,
    botPatienceMap: {},
    transferDisputes: [],
    feed: [
      {
        id: `feed-s${nextSeason}-${Date.now()}`,
        category: 'admin' as const,
        actorName: `Temporada ${nextSeason}`,
        actorType: 'system' as const,
        message: `${champion?.name} campeão da T${league.season}! Atributos evoluídos, cartões zerados e janela de 24h aberta.`,
        timestamp: nowStr,
      },
      ...contractCycle.feedItems,
      ...league.feed,
    ].slice(0, 24),
  };
}

export function resolveTransferDispute(
  dispute: TransferDispute,
  clubs: Club[],
  targetPlayer: Player | undefined
): {
  winnerBid: TransferDisputeBid | null;
  reason: string;
} {
  if (!targetPlayer) {
    return {
      winnerBid: null,
      reason: `Disputa encerrada: ${dispute.targetPlayerName} não está mais disponível no mercado.`,
    };
  }

  const validEntries = dispute.bids
    .map((bid) => {
      const club = clubs.find((c) => c.id === bid.clubId);
      if (!club || isClubInFinancialDebt(club) || club.finances.budget < bid.offerCash) return null;
      if (bid.swapPlayerId && !club.squad.some((p) => p.id === bid.swapPlayerId)) {
        return null;
      }
      const totalFee = Math.round((bid.offerCash + bid.swapValue) * 10) / 10;
      return { bid, club, totalFee };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (validEntries.length === 0) {
    return {
      winnerBid: null,
      reason: `Nenhum clube manteve saldo/peças válidas até o fim das 3h por ${targetPlayer.knownName}.`,
    };
  }

  const isFreeDispute = dispute.originType === 'livre';
  const maxFee = Math.max(...validEntries.map((e) => e.totalFee));
  const maxSalary = Math.max(...validEntries.map((e) => e.bid.proposedMonthlySalary));

  const finalists = isFreeDispute
    ? validEntries.filter((e) => e.bid.proposedMonthlySalary >= maxSalary * 0.94)
    : validEntries.filter((e) => e.totalFee >= maxFee * 0.94);

  if (finalists.length === 1) {
    const win = finalists[0];
    return {
      winnerBid: win.bid,
      reason: isFreeDispute
        ? `${win.club.shortName} ofereceu o maior salário (${formatMonthlySalary(win.bid.proposedMonthlySalary)}) e fechou com ${targetPlayer.knownName}!`
        : `${win.club.shortName} apresentou a maior proposta (${formatMillionsBRL(win.totalFee)}) e levou ${targetPlayer.knownName}!`,
    };
  }

  const standingsOrder = [...clubs].sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
    const sgA = a.standing.goalsFor - a.standing.goalsAgainst;
    const sgB = b.standing.goalsFor - b.standing.goalsAgainst;
    if (sgB !== sgA) return sgB - sgA;
    return b.standing.goalsFor - a.standing.goalsFor;
  });

  const expectedSalary = targetPlayer.monthlySalary ?? calcMonthlySalary(targetPlayer.overall);

  const scoredFinalists = finalists.map((entry) => {
    const { bid, club, totalFee } = entry;
    const salaryRatio = expectedSalary > 0 ? bid.proposedMonthlySalary / expectedSalary : 1;
    const salaryScore = Math.max(-10, Math.min(22, (salaryRatio - 0.85) * 35));

    const feeRatioBonus = maxFee > 0 ? Math.max(0, (totalFee / maxFee - 0.94) / 0.06) * 6 : 0;

    const strength = calculateClubStrength(club);
    const rank = standingsOrder.findIndex((c) => c.id === club.id) + 1;
    const tableBonus =
      club.standing.played === 0
        ? 0
        : rank <= 4
        ? 5
        : rank <= 6
        ? 3
        : rank >= clubs.length - 3
        ? -4
        : 0;
    const prestigeScore = (5 - club.tier) * 2.5 + (strength.overall - 72) * 0.6 + tableBonus;

    const posCompetitors = club.squad.filter((p) => {
      if (p.position === targetPlayer.position) return true;
      if (targetPlayer.ambidextrous && (p.position === 'PE' || p.position === 'PD')) return true;
      return false;
    });
    const bestCompetitorOvr = posCompetitors.length
      ? Math.max(...posCompetitors.map((p) => p.overall))
      : 70;
    const ovrDiff = targetPlayer.overall - bestCompetitorOvr;
    const playingTimeScore = ovrDiff >= 0 ? 6 : ovrDiff >= -2 ? 2 : -3;

    const careerScore =
      Math.round((salaryScore + feeRatioBonus + prestigeScore + playingTimeScore) * 10) / 10;

    return {
      ...entry,
      careerScore,
      salaryScore,
      prestigeScore,
      playingTimeScore,
    };
  });

  scoredFinalists.sort((a, b) => b.careerScore - a.careerScore);
  const topScore = scoredFinalists[0].careerScore;
  const tiedTop = scoredFinalists.filter((s) => topScore - s.careerScore <= 1.5);

  const chosen =
    tiedTop.length > 1
      ? tiedTop[Math.floor(Math.random() * tiedTop.length)]
      : scoredFinalists[0];

  const wasRandomTiebreak = tiedTop.length > 1;
  const salaryLabel = formatMonthlySalary(chosen.bid.proposedMonthlySalary);

  const reason = wasRandomTiebreak
    ? `Empate técnico nas ofertas e projetos por ${targetPlayer.knownName}: sorteio definiu o ${chosen.club.shortName} (${formatMillionsBRL(chosen.totalFee)} • ${salaryLabel}).`
    : `${targetPlayer.knownName} analisou salário (${salaryLabel}), projeto do clube e titularidade e escolheu o ${chosen.club.shortName} (${formatMillionsBRL(chosen.totalFee)})!`;

  return { winnerBid: chosen.bid, reason };
}
