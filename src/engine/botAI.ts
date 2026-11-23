import {
  ActivityFeedItem,
  BotDifficulty,
  Club,
  ClubBotPersonality,
  Formation,
  LeagueState,
  LineupSlot,
  Match,
  MatchEvent,
  NegotiationOffer,
  Player,
  PlayerPosition,
  PlayPhase,
  SeasonHistoryEntry,
  TacticalMentality,
  TransferDispute,
  TransferDisputeBid,
} from '../types/league';
import {
  calcAgentMinimumSalary,
  calcMarketValue,
  calcMonthlySalary,
  formatMillionsBRL,
  formatMonthlySalary,
  generateWorldMarketPool,
} from '../data/seedData';

export interface FormationSlotSpec {
  role: PlayerPosition;
  label: string;
  pitchX: number;
  pitchY: number;
}

export const FORMATION_LAYOUT: Record<Formation, FormationSlotSpec[]> = {
  '4-3-3': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 15, pitchY: 70 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 85, pitchY: 70 },
    { role: 'VOL', label: 'VOL', pitchX: 50, pitchY: 54 },
    { role: 'MC', label: 'MC', pitchX: 27, pitchY: 43 },
    { role: 'MEI', label: 'MEI', pitchX: 73, pitchY: 43 },
    { role: 'PE', label: 'PE', pitchX: 19, pitchY: 20 },
    { role: 'CA', label: 'CA', pitchX: 50, pitchY: 14 },
    { role: 'PD', label: 'PD', pitchX: 81, pitchY: 20 },
  ],
  '4-4-2': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 15, pitchY: 70 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 85, pitchY: 70 },
    { role: 'PE', label: 'ME', pitchX: 17, pitchY: 46 },
    { role: 'VOL', label: 'VOL', pitchX: 39, pitchY: 51 },
    { role: 'MC', label: 'MC', pitchX: 61, pitchY: 51 },
    { role: 'PD', label: 'MD', pitchX: 83, pitchY: 46 },
    { role: 'CA', label: 'CA', pitchX: 36, pitchY: 18 },
    { role: 'CA', label: 'CA', pitchX: 64, pitchY: 18 },
  ],
  '4-2-3-1': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 15, pitchY: 70 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 85, pitchY: 70 },
    { role: 'VOL', label: 'VOL', pitchX: 36, pitchY: 55 },
    { role: 'MC', label: 'MC', pitchX: 64, pitchY: 55 },
    { role: 'PE', label: 'PE', pitchX: 20, pitchY: 35 },
    { role: 'MEI', label: 'MEI', pitchX: 50, pitchY: 34 },
    { role: 'PD', label: 'PD', pitchX: 80, pitchY: 35 },
    { role: 'CA', label: 'CA', pitchX: 50, pitchY: 14 },
  ],
  '3-5-2': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'ZAG', label: 'ZAG', pitchX: 25, pitchY: 72 },
    { role: 'ZAG', label: 'ZAG', pitchX: 50, pitchY: 74 },
    { role: 'ZAG', label: 'ZAG', pitchX: 75, pitchY: 72 },
    { role: 'LE', label: 'ALA E', pitchX: 14, pitchY: 48 },
    { role: 'VOL', label: 'VOL', pitchX: 36, pitchY: 53 },
    { role: 'MEI', label: 'MEI', pitchX: 50, pitchY: 39 },
    { role: 'MC', label: 'MC', pitchX: 64, pitchY: 53 },
    { role: 'LD', label: 'ALA D', pitchX: 86, pitchY: 48 },
    { role: 'CA', label: 'CA', pitchX: 37, pitchY: 17 },
    { role: 'CA', label: 'CA', pitchX: 63, pitchY: 17 },
  ],
  '3-4-3': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'ZAG', label: 'ZAG', pitchX: 25, pitchY: 72 },
    { role: 'ZAG', label: 'ZAG', pitchX: 50, pitchY: 74 },
    { role: 'ZAG', label: 'ZAG', pitchX: 75, pitchY: 72 },
    { role: 'LE', label: 'ALA E', pitchX: 17, pitchY: 47 },
    { role: 'VOL', label: 'VOL', pitchX: 39, pitchY: 50 },
    { role: 'MC', label: 'MC', pitchX: 61, pitchY: 50 },
    { role: 'LD', label: 'ALA D', pitchX: 83, pitchY: 47 },
    { role: 'PE', label: 'PE', pitchX: 21, pitchY: 19 },
    { role: 'CA', label: 'CA', pitchX: 50, pitchY: 14 },
    { role: 'PD', label: 'PD', pitchX: 79, pitchY: 19 },
  ],
  '5-3-2': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 12, pitchY: 66 },
    { role: 'ZAG', label: 'ZAG', pitchX: 31, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 50, pitchY: 74 },
    { role: 'ZAG', label: 'ZAG', pitchX: 69, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 88, pitchY: 66 },
    { role: 'MC', label: 'MC', pitchX: 28, pitchY: 46 },
    { role: 'VOL', label: 'VOL', pitchX: 50, pitchY: 50 },
    { role: 'MEI', label: 'MEI', pitchX: 72, pitchY: 46 },
    { role: 'CA', label: 'CA', pitchX: 37, pitchY: 17 },
    { role: 'CA', label: 'CA', pitchX: 63, pitchY: 17 },
  ],
};

const NEIGHBOR_POSITIONS: Record<PlayerPosition, PlayerPosition[]> = {
  GOL: [],
  ZAG: ['LD', 'LE', 'VOL'],
  LD: ['LE', 'ZAG', 'MC', 'PD'],
  LE: ['LD', 'ZAG', 'MC', 'PE'],
  VOL: ['ZAG', 'MC', 'MEI'],
  MC: ['VOL', 'MEI', 'LD', 'LE'],
  MEI: ['MC', 'VOL', 'PE', 'PD', 'CA'],
  PE: ['PD', 'MEI', 'CA', 'LE'],
  PD: ['PE', 'MEI', 'CA', 'LD'],
  CA: ['PE', 'PD', 'MEI'],
};

export function getPositionFit(
  player: Player,
  slotRole: PlayerPosition
): {
  effectiveOvr: number;
  penalty: number;
  fit: 'natural' | 'secundaria' | 'improvisado' | 'critico';
} {
  if (player.position === slotRole) {
    return { effectiveOvr: player.overall, penalty: 0, fit: 'natural' };
  }
  if (
    player.ambidextrous &&
    (player.position === 'PE' || player.position === 'PD') &&
    (slotRole === 'PE' || slotRole === 'PD')
  ) {
    return { effectiveOvr: player.overall, penalty: 0, fit: 'natural' };
  }
  if (player.secondaryPositions?.includes(slotRole)) {
    return {
      effectiveOvr: Math.max(45, player.overall - 2),
      penalty: -2,
      fit: 'secundaria',
    };
  }
  if (player.position === 'GOL' || slotRole === 'GOL') {
    return {
      effectiveOvr: Math.max(40, player.overall - 25),
      penalty: -25,
      fit: 'critico',
    };
  }
  if (NEIGHBOR_POSITIONS[player.position]?.includes(slotRole)) {
    return {
      effectiveOvr: Math.max(45, player.overall - 6),
      penalty: -6,
      fit: 'improvisado',
    };
  }
  return {
    effectiveOvr: Math.max(42, player.overall - 12),
    penalty: -12,
    fit: 'critico',
  };
}

export function buildLineupSlots(
  squad: Player[],
  formation: Formation,
  preserveExisting?: LineupSlot[]
): { squad: Player[]; lineupSlots: LineupSlot[] } {
  const layout = FORMATION_LAYOUT[formation];
  const sorted = [...squad].sort((a, b) => b.overall - a.overall);
  const usedIds = new Set<string>();
  const slots: LineupSlot[] = new Array(layout.length);

  if (preserveExisting && preserveExisting.length === layout.length) {
    layout.forEach((spec, idx) => {
      const prev = preserveExisting[idx];
      const match = prev ? sorted.find((p) => p.id === prev.playerId) : undefined;
      if (match && (match.position === spec.role || match.secondaryPositions?.includes(spec.role)) && !usedIds.has(match.id)) {
        usedIds.add(match.id);
        slots[idx] = { slotIndex: idx, role: spec.role, playerId: match.id };
      }
    });
  }

  // 1. Posição natural
  layout.forEach((spec, idx) => {
    if (slots[idx]) return;
    const exact = sorted.find((p) => p.position === spec.role && !usedIds.has(p.id));
    if (exact) {
      usedIds.add(exact.id);
      slots[idx] = { slotIndex: idx, role: spec.role, playerId: exact.id };
    }
  });

  // 2. Posição secundária
  layout.forEach((spec, idx) => {
    if (slots[idx]) return;
    const sec = sorted.find(
      (p) => p.secondaryPositions?.includes(spec.role) && !usedIds.has(p.id)
    );
    if (sec) {
      usedIds.add(sec.id);
      slots[idx] = { slotIndex: idx, role: spec.role, playerId: sec.id };
    }
  });

  // 3. Melhor encaixe restante por effectiveOvr
  layout.forEach((spec, idx) => {
    if (slots[idx]) return;
    const bestFit = sorted
      .filter((p) => !usedIds.has(p.id))
      .sort(
        (a, b) =>
          getPositionFit(b, spec.role).effectiveOvr - getPositionFit(a, spec.role).effectiveOvr
      )[0];
    if (bestFit) {
      usedIds.add(bestFit.id);
      slots[idx] = { slotIndex: idx, role: spec.role, playerId: bestFit.id };
    }
  });

  const starterIds = new Set(slots.filter(Boolean).map((s) => s.playerId));
  return {
    squad: squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
    lineupSlots: slots.filter(Boolean),
  };
}

export function autoPickLineup(squad: Player[], formation: Formation): Player[] {
  return buildLineupSlots(squad, formation).squad;
}

export function chooseBotTactics(personality: ClubBotPersonality): {
  formation: Formation;
  mentality: TacticalMentality;
} {
  switch (personality) {
    case 'agressivo':
      return { formation: '4-3-3', mentality: 'Ofensiva' };
    case 'galactico':
      return { formation: '4-2-3-1', mentality: 'Ofensiva' };
    case 'tatico':
      return { formation: '3-5-2', mentality: 'Contra-Ataque' };
    case 'economico':
      return { formation: '5-3-2', mentality: 'Retranca' };
    case 'equilibrado':
    default:
      return { formation: '4-4-2', mentality: 'Equilibrada' };
  }
}

export interface FormationTacticalProfile {
  midControl: number;
  wingThreat: number;
  centralBoxPresence: number;
  centralShield: number;
  wingBackExposure: number;
  pressResistance: number;
  styleLabel: string;
  strengths: string;
  weaknesses: string;
}

export const FORMATION_TACTICAL_PROFILE: Record<Formation, FormationTacticalProfile> = {
  '4-3-3': {
    midControl: 1,
    wingThreat: 3,
    centralBoxPresence: 1,
    centralShield: 0,
    wingBackExposure: 1,
    pressResistance: 2,
    styleLabel: 'Amplitude & Pressão Alta',
    strengths: 'Ataque forte pelas pontas (PE/PD) e pressão alta na saída adversária',
    weaknesses: 'Pode sofrer superioridade numérica contra 5 meio-campistas',
  },
  '4-4-2': {
    midControl: 0,
    wingThreat: 2,
    centralBoxPresence: 3,
    centralShield: 1,
    wingBackExposure: 1,
    pressResistance: 0,
    styleLabel: 'Linhas Compactas & Dupla de Área',
    strengths: 'Presença dupla de área (2 CAs) e duas linhas compactas para contra-atacar',
    weaknesses: 'Espaço entrelinhas vulnerável contra um camisa 10 (4-2-3-1) ou 3-5-2',
  },
  '4-2-3-1': {
    midControl: 3,
    wingThreat: 2,
    centralBoxPresence: 1,
    centralShield: 2,
    wingBackExposure: 1,
    pressResistance: 3,
    styleLabel: 'Controle Central & Meia Criativo',
    strengths: 'Dupla de volantes + camisa 10 domina a posse e protege a entrada da área',
    weaknesses: 'Centroavante isolado se os pontas ficarem presos na marcação',
  },
  '3-5-2': {
    midControl: 4,
    wingThreat: 1,
    centralBoxPresence: 3,
    centralShield: 2,
    wingBackExposure: 3,
    pressResistance: 2,
    styleLabel: 'Superioridade no Meio & Alas',
    strengths: 'Domínio numérico do meio-campo com 5 peças e dois atacantes infiltrando',
    weaknesses: 'Corredores laterais expostos às costas dos alas contra 4-3-3 ou 3-4-3',
  },
  '3-4-3': {
    midControl: 1,
    wingThreat: 4,
    centralBoxPresence: 2,
    centralShield: -1,
    wingBackExposure: 4,
    pressResistance: 1,
    styleLabel: 'Ataque Total pelos Flancos',
    strengths: 'Sobrecarga ofensiva máxima pelos lados e volume na área rival',
    weaknesses: 'Transição defensiva frágil pelas laterais e miolo exposto sem 2º volante',
  },
  '5-3-2': {
    midControl: 1,
    wingThreat: 0,
    centralBoxPresence: 2,
    centralShield: 4,
    wingBackExposure: 0,
    pressResistance: 1,
    styleLabel: 'Bloqueio Defensivo & Ligação Direta',
    strengths: 'Três zagueiros fecham o funil central e neutralizam duplas de ataque',
    weaknesses: 'Menor criatividade pelas pontas ao propor o jogo contra retrancas',
  },
};

export interface TacticalReadout {
  netAtkBonus: number;
  netDefBonus: number;
  midControlBonus: number;
  chanceBonus: number;
  finishingEdge: number;
  staminaDrainMult: number;
  ownAvgStamina: number;
  oppAvgStamina: number;
  synergyLabel: string;
  synergyTone: 'emerald' | 'amber' | 'rose';
  headline: string;
  advice: string;
}

function getEffectiveStarters(club: Club) {
  const slots = club.lineupSlots ?? [];
  const slotPlayers = slots
    .map((s) => {
      const p = club.squad.find((item) => item.id === s.playerId);
      if (!p) return null;
      const fit = getPositionFit(p, s.role);
      const staminaFactor = p.stamina < 60 ? (60 - p.stamina) * 0.14 : 0;
      return {
        ...p,
        effectiveOvr: Math.max(40, Math.round(fit.effectiveOvr - staminaFactor)),
        slotRole: s.role,
        fitPenalty: fit.penalty,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (slotPlayers.length >= 11) return slotPlayers;

  return [...club.squad]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11)
    .map((p) => ({
      ...p,
      effectiveOvr: p.overall,
      slotRole: p.position,
      fitPenalty: 0,
    }));
}

export function evaluateFormationSynergy(
  formation: Formation,
  mentality: TacticalMentality
): { atkDelta: number; defDelta: number; label: string; tone: 'emerald' | 'amber' | 'rose' } {
  switch (mentality) {
    case 'Retranca':
      if (formation === '5-3-2' || formation === '4-4-2') {
        return { atkDelta: -1, defDelta: 3, label: 'Ótima Sinergia Defensiva', tone: 'emerald' };
      }
      if (formation === '3-4-3') {
        return { atkDelta: -2, defDelta: -2, label: 'Conflito Tático (3-4-3 aberto)', tone: 'rose' };
      }
      return { atkDelta: 0, defDelta: 1, label: 'Sinergia Equilibrada', tone: 'amber' };
    case 'Contra-Ataque':
      if (formation === '5-3-2' || formation === '3-5-2' || formation === '4-3-3' || formation === '4-4-2') {
        return { atkDelta: 2, defDelta: 1.5, label: 'Ótima Sinergia de Transição', tone: 'emerald' };
      }
      return { atkDelta: 1, defDelta: 0.5, label: 'Sinergia Boa', tone: 'emerald' };
    case 'Ofensiva':
      if (formation === '4-3-3' || formation === '3-4-3' || formation === '4-2-3-1') {
        return { atkDelta: 2.5, defDelta: -0.5, label: 'Ótima Sinergia Ofensiva', tone: 'emerald' };
      }
      if (formation === '5-3-2') {
        return { atkDelta: 0, defDelta: -1, label: 'Formação Conservadora p/ Ataque', tone: 'amber' };
      }
      return { atkDelta: 1, defDelta: 0, label: 'Sinergia Regular', tone: 'amber' };
    case 'Tudo ou Nada':
      if (formation === '3-4-3' || formation === '4-3-3' || formation === '4-2-3-1') {
        return { atkDelta: 3.5, defDelta: -2, label: 'Pressão Máxima Alinhada', tone: 'emerald' };
      }
      if (formation === '5-3-2') {
        return { atkDelta: 0.5, defDelta: -2, label: 'Desencaixe: 5 zagueiros em pressão', tone: 'rose' };
      }
      return { atkDelta: 1.5, defDelta: -1, label: 'Risco Alto', tone: 'amber' };
    case 'Equilibrada':
    default:
      return { atkDelta: 0.5, defDelta: 0.5, label: 'Estrutura Estável', tone: 'emerald' };
  }
}

export function evaluateTacticalMatchup(ownClub: Club, oppClub: Club): TacticalReadout {
  const ownProfile = FORMATION_TACTICAL_PROFILE[ownClub.formation] ?? FORMATION_TACTICAL_PROFILE['4-3-3'];
  const oppProfile = FORMATION_TACTICAL_PROFILE[oppClub.formation] ?? FORMATION_TACTICAL_PROFILE['4-4-2'];

  const ownStarters = getEffectiveStarters(ownClub);
  const oppStarters = getEffectiveStarters(oppClub);

  const ownAvgStamina = ownStarters.length
    ? Math.round(ownStarters.reduce((s, p) => s + p.stamina, 0) / ownStarters.length)
    : 100;
  const oppAvgStamina = oppStarters.length
    ? Math.round(oppStarters.reduce((s, p) => s + p.stamina, 0) / oppStarters.length)
    : 100;

  const outOfPosPenaltyCount = ownStarters.filter((p) => p.fitPenalty < 0).length;
  const cohesionPenalty = outOfPosPenaltyCount * 1.1;

  // 1. Duelos Táticos entre Formações
  const rawMidDiff = ownProfile.midControl - oppProfile.midControl;
  const midOverloadBonus =
    (ownClub.formation === '3-5-2' || ownClub.formation === '4-2-3-1') &&
    (oppClub.formation === '4-4-2' || oppClub.formation === '4-3-3')
      ? 1.8
      : 0;
  const midControlBonus =
    Math.round((rawMidDiff * 1.35 + midOverloadBonus - cohesionPenalty * 0.65) * 10) / 10;

  const widthBonus =
    (ownClub.formation === '4-3-3' || ownClub.formation === '3-4-3') &&
    (oppClub.formation === '3-5-2' || oppClub.formation === '4-4-2')
      ? 2.4
      : 0;
  const flankOverload =
    Math.max(0, ownProfile.wingThreat + oppProfile.wingBackExposure - 3) * 1.0 + widthBonus;
  const centralFunnelLock =
    Math.max(0, ownProfile.centralShield - oppProfile.centralBoxPresence + 1) * 0.85;
  const pocketExploit =
    ownClub.formation === '4-2-3-1' && oppClub.formation === '4-4-2'
      ? 2.2
      : ownClub.formation === '3-5-2' && oppClub.formation === '4-3-3'
      ? 1.6
      : 0;

  // 2. Postura Tática + Encaixe Real (Retranca vs Pressão vs Contra-Ataque)
  const baseTac = getTacticalModifiers(ownClub.mentality, oppClub.mentality);
  const synergy = evaluateFormationSynergy(ownClub.formation, ownClub.mentality);

  let atkBonus = baseTac.atkMod + synergy.atkDelta + flankOverload + pocketExploit - cohesionPenalty;
  let defBonus = baseTac.defMod + synergy.defDelta + centralFunnelLock - cohesionPenalty;
  let staminaDrainMult = baseTac.staminaDrain;

  // Pressão bem montada quebra retranca
  if (
    oppClub.mentality === 'Retranca' &&
    (ownClub.mentality === 'Ofensiva' || ownClub.mentality === 'Tudo ou Nada') &&
    (ownClub.formation === '4-3-3' || ownClub.formation === '3-4-3' || ownClub.formation === '4-2-3-1')
  ) {
    atkBonus += 3.2;
  }

  // Contra-ataque pune defesas muito adiantadas (e ainda mais se cansadas)
  if (
    ownClub.mentality === 'Contra-Ataque' &&
    (oppClub.mentality === 'Ofensiva' || oppClub.mentality === 'Tudo ou Nada')
  ) {
    atkBonus += oppAvgStamina < 72 ? 4.4 : 3.8;
  }

  // Queda física sob pressão intensa
  let fatigueWarning = false;
  if (
    ownAvgStamina < 60 &&
    (ownClub.mentality === 'Ofensiva' || ownClub.mentality === 'Tudo ou Nada')
  ) {
    atkBonus = atkBonus * 0.45 - 2.0;
    defBonus -= 3.5;
    fatigueWarning = true;
  }

  // 3. Duelos por OVR nos Setores Chave
  const avgRole = (arr: typeof ownStarters, roles: PlayerPosition[], fallback: number) => {
    const filtered = arr.filter((p) => roles.includes(p.slotRole));
    return filtered.length
      ? filtered.reduce((s, p) => s + p.effectiveOvr, 0) / filtered.length
      : fallback;
  };
  const ownTeamAvg = ownStarters.length
    ? ownStarters.reduce((s, p) => s + p.effectiveOvr, 0) / ownStarters.length
    : 72;
  const oppTeamAvg = oppStarters.length
    ? oppStarters.reduce((s, p) => s + p.effectiveOvr, 0) / oppStarters.length
    : 72;

  const ownCreator = avgRole(ownStarters, ['MEI', 'MC', 'PE', 'PD'], ownTeamAvg);
  const oppMid = avgRole(oppStarters, ['VOL', 'MC', 'MEI'], oppTeamAvg);
  const chanceBonus = (ownCreator - oppMid) * 0.007 + midControlBonus * 0.016 + (midOverloadBonus > 0 ? 0.025 : 0);

  const ownFinisher = avgRole(ownStarters, ['CA', 'PE', 'PD'], ownTeamAvg);
  const oppGol = avgRole(oppStarters, ['GOL'], oppTeamAvg);
  const oppZags = oppStarters.filter((p) => p.slotRole === 'ZAG').sort((a, b) => b.effectiveOvr - a.effectiveOvr);
  const oppBestZag = oppZags[0]?.effectiveOvr ?? oppTeamAvg;
  const oppWall = oppGol * 0.55 + oppBestZag * 0.45;
  const finishingEdge = (ownFinisher - oppWall) * 0.0085;

  // 4. Narrative headline + actionable tactical advice
  let headline = `Duelo equilibrado (${ownClub.formation} vs ${oppClub.formation})`;
  if (flankOverload >= 2.2) {
    headline = `Vantagem pelos flancos (${ownClub.formation} explora alas do ${oppClub.formation})`;
  } else if (midControlBonus >= 2.0) {
    headline = `Domínio no meio-campo (${ownClub.formation} supera o ${oppClub.formation} por dentro)`;
  } else if (centralFunnelLock >= 1.9) {
    headline = `Bloqueio central sólido (${ownClub.formation} trava área contra ${oppClub.formation})`;
  } else if (midControlBonus <= -2.0) {
    headline = `Inferioridade no meio (${oppClub.formation} concentra mais peças centrais)`;
  }

  let advice = ownProfile.strengths;
  if (fatigueWarning) {
    advice = `Time cansado (${ownAvgStamina}% energia): faça substituições ou reduza pressão para evitar pane defensiva!`;
  } else if (outOfPosPenaltyCount >= 2) {
    advice = `${outOfPosPenaltyCount} titulares improvisados reduzem o entrosamento tático — ajuste as peças no Time.`;
  } else if (
    (oppClub.mentality === 'Tudo ou Nada' || oppClub.mentality === 'Ofensiva') &&
    ownClub.mentality !== 'Contra-Ataque'
  ) {
    advice = `Rival em ${oppClub.mentality}: usar Contra-Ataque explora as costas adiantadas da defesa!`;
  } else if (oppClub.mentality === 'Retranca' && ownClub.mentality === 'Retranca') {
    advice = `Jogo travado: suba para Ofensiva ou use 4-3-3 / 3-4-3 para abrir a retranca adversária.`;
  } else if (synergy.tone === 'rose') {
    advice = `${synergy.label}: ajuste a formação ou mude a postura para recuperar equilíbrio.`;
  }

  return {
    netAtkBonus: Math.round(atkBonus * 10) / 10,
    netDefBonus: Math.round(defBonus * 10) / 10,
    midControlBonus,
    chanceBonus,
    finishingEdge,
    staminaDrainMult,
    ownAvgStamina,
    oppAvgStamina,
    synergyLabel: fatigueWarning ? 'Queda Física na Pressão' : synergy.label,
    synergyTone: fatigueWarning ? 'rose' : synergy.tone,
    headline,
    advice,
  };
}

export function calculateClubStrength(club: Club): {
  overall: number;
  attack: number;
  midfield: number;
  defense: number;
} {
  const effective = getEffectiveStarters(club);

  if (effective.length === 0) {
    return { overall: 65, attack: 65, midfield: 65, defense: 65 };
  }

  const avg = (arr: typeof effective, fallback: number) =>
    arr.length ? arr.reduce((sum, p) => sum + p.effectiveOvr, 0) / arr.length : fallback;

  const baseOverall = avg(effective, 72);
  const outOfPosCount = effective.filter((p) => p.fitPenalty < 0).length;
  const cohesionMod = outOfPosCount * 0.4;

  const finishers = effective.filter((p) => p.slotRole === 'CA' || p.slotRole === 'PE' || p.slotRole === 'PD');
  const creators = effective.filter((p) => p.slotRole === 'VOL' || p.slotRole === 'MC' || p.slotRole === 'MEI');
  const defenders = effective.filter((p) => p.slotRole === 'ZAG' || p.slotRole === 'LD' || p.slotRole === 'LE');
  const keeper = effective.find((p) => p.slotRole === 'GOL');

  const rawAtk = finishers.length
    ? avg(finishers, baseOverall - 2) * 0.8 + avg(creators.filter((p) => p.slotRole === 'MEI'), baseOverall - 2) * 0.2
    : baseOverall - 2;
  const rawMid = creators.length
    ? avg(creators, baseOverall)
    : baseOverall;
  const rawDef = keeper && defenders.length
    ? keeper.effectiveOvr * 0.3 + avg(defenders, baseOverall - 1) * 0.7
    : avg([...defenders, ...(keeper ? [keeper] : [])], baseOverall - 1);

  return {
    overall: Math.max(45, Math.round(baseOverall - cohesionMod)),
    attack: Math.max(45, Math.round(rawAtk - cohesionMod * 0.5)),
    midfield: Math.max(45, Math.round(rawMid - cohesionMod * 0.5)),
    defense: Math.max(45, Math.round(rawDef - cohesionMod * 0.5)),
  };
}

function getDifficultyFactor(difficulty: BotDifficulty): number {
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

function getPersonalityAuctionProfile(personality: ClubBotPersonality) {
  switch (personality) {
    case 'agressivo':
      return { maxOverpay: 1.35, minReserveRatio: 0.08, starBias: 1.15 };
    case 'galactico':
      return { maxOverpay: 1.42, minReserveRatio: 0.1, starBias: 1.28 };
    case 'economico':
      return { maxOverpay: 0.95, minReserveRatio: 0.28, starBias: 0.9 };
    case 'tatico':
      return { maxOverpay: 1.14, minReserveRatio: 0.18, starBias: 1.0 };
    case 'equilibrado':
    default:
      return { maxOverpay: 1.18, minReserveRatio: 0.16, starBias: 1.05 };
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

  // 100%+ do valor do passe -> clube libera e passa para avaliação do empresário/atleta
  if (ratio >= 1.0) {
    return evaluateAgentResponse(true);
  }

  const sellerStarterPenalty = sellerClub && targetPlayer.isStarter ? 0.12 : 0;
  const diffFactor = sellerClub ? getDifficultyFactor(sellerClub.botDifficulty) : 1.0;

  // 85% a 99% do valor -> chance ponderada do clube aceitar ou fazer contraproposta
  if (ratio >= 0.85) {
    const acceptProb = Math.max(0.18, Math.min(0.65, (ratio - 0.82) * 3.1 - sellerStarterPenalty - (diffFactor - 1) * 0.25));
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

  // Abaixo de 85%: recusa com perda de paciência (abaixo de 65% perde 2 pontos)
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
          bot.finances.wageBill = Math.round(bot.squad.reduce((s, p) => s + p.wage, 0) * 10) / 10;
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

function getTacticalModifiers(
  own: TacticalMentality,
  opp: TacticalMentality
): { atkMod: number; defMod: number; staminaDrain: number } {
  switch (own) {
    case 'Retranca':
      return { atkMod: -5, defMod: 5, staminaDrain: 0.55 };
    case 'Contra-Ataque': {
      const oppExposed = opp === 'Ofensiva' || opp === 'Tudo ou Nada';
      return { atkMod: oppExposed ? 5 : 1, defMod: 2, staminaDrain: 0.75 };
    }
    case 'Ofensiva':
      return { atkMod: 4, defMod: -3, staminaDrain: 1.0 };
    case 'Tudo ou Nada':
      return { atkMod: 7, defMod: -6, staminaDrain: 1.35 };
    case 'Equilibrada':
    default:
      return { atkMod: 0, defMod: 0, staminaDrain: 0.75 };
  }
}

function computeBotLiveAdaptation(
  club: Club,
  oppStrengthOverall: number,
  goalDiff: number,
  prevMin: number,
  nextMin: number,
  allowAIControl: boolean
): { formation: Formation; mentality: TacticalMentality; note?: string } | null {
  if (!allowAIControl) return null;

  const crossed60 = prevMin < 60 && nextMin >= 60;
  const crossed72 = prevMin < 72 && nextMin >= 72;
  const crossed80 = prevMin < 80 && nextMin >= 80;
  if (!crossed60 && !crossed72 && !crossed80) return null;

  const actorTag = club.controller === 'bot' ? 'Bot' : 'IA';

  // Time perdendo no 2º tempo -> abre o time buscando o empate
  if (goalDiff <= -1 && goalDiff >= -2) {
    if (crossed80 && club.mentality !== 'Tudo ou Nada') {
      const nextForm: Formation =
        club.formation === '5-3-2' || club.formation === '4-4-2' ? '3-4-3' : '4-3-3';
      return {
        formation: nextForm,
        mentality: 'Tudo ou Nada',
        note: `📋 ${actorTag} ${club.shortName} vai para o Tudo ou Nada (${nextForm})!`,
      };
    }
    if ((crossed60 || crossed72) && club.mentality !== 'Ofensiva' && club.mentality !== 'Tudo ou Nada') {
      const nextForm: Formation =
        club.formation === '5-3-2' ? '4-3-3' : club.formation;
      return {
        formation: nextForm,
        mentality: 'Ofensiva',
        note: `📋 ${actorTag} ${club.shortName} adianta as linhas para postura Ofensiva (${nextForm}).`,
      };
    }
  }

  // Time vencendo por 1 gol contra rival forte após os 70' -> fecha a casinha
  const clubOvr = calculateClubStrength(club).overall;
  if (goalDiff === 1 && (crossed72 || crossed80) && oppStrengthOverall >= clubOvr - 2) {
    if (crossed80 && club.mentality !== 'Retranca') {
      const nextForm: Formation =
        club.formation === '3-4-3' || club.formation === '4-3-3' ? '5-3-2' : club.formation;
      return {
        formation: nextForm,
        mentality: 'Retranca',
        note: `📋 ${actorTag} ${club.shortName} fecha o time na Retranca (${nextForm}) para segurar o placar.`,
      };
    }
    if (crossed72 && club.mentality !== 'Contra-Ataque' && club.mentality !== 'Retranca') {
      return {
        formation: club.formation,
        mentality: 'Contra-Ataque',
        note: `📋 ${actorTag} ${club.shortName} recua para jogar no Contra-Ataque!`,
      };
    }
  }

  return null;
}

function pickMatchSlotActor(club: Club, roles: PlayerPosition[]): Player | undefined {
  const slots = club.lineupSlots ?? [];
  const slotEntries = slots
    .map((s) => {
      const p = club.squad.find((item) => item.id === s.playerId);
      if (!p) return null;
      return {
        player: p,
        slotRole: s.role,
        effectiveOvr: getPositionFit(p, s.role).effectiveOvr,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (slotEntries.length > 0) {
    const matched = slotEntries.filter(
      (e) => roles.includes(e.slotRole) || roles.includes(e.player.position)
    );
    const pool = matched.length > 0 ? matched : slotEntries.filter((e) => e.slotRole !== 'GOL');
    const candidates = pool.length > 0 ? pool : slotEntries;
    const weights = candidates.map(
      (c) =>
        Math.max(1, Math.pow(Math.max(1, c.effectiveOvr - 58), 1.85)) *
        (0.55 + (c.player.stamina / 100) * 0.45)
    );
    const totalW = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * totalW;
    for (let i = 0; i < candidates.length; i++) {
      r -= weights[i];
      if (r <= 0) return candidates[i].player;
    }
    return candidates[0].player;
  }

  const starters = club.squad.filter((p) => p.isStarter);
  const pool = starters.length > 0 ? starters : club.squad;
  const matched = pool.filter((p) => roles.includes(p.position));
  const candidates = matched.length > 0 ? matched : pool;
  return candidates[0];
}

function buildVariedPlayAction(params: {
  possClub: Club;
  defClub: Club;
  homeHasBall: boolean;
  previousPlayText: string;
}): {
  ballX: number;
  ballY: number;
  fromBallX?: number;
  fromBallY?: number;
  activePlayerId?: string;
  secondaryPlayerId?: string;
  playPhase: PlayPhase;
  text: string;
} {
  const { possClub, defClub, homeHasBall, previousPlayText } = params;

  const wingL = pickMatchSlotActor(possClub, ['PE']);
  const wingR = pickMatchSlotActor(possClub, ['PD']);
  const fbR = pickMatchSlotActor(possClub, ['LD']);
  const fbL = pickMatchSlotActor(possClub, ['LE']);
  const am = pickMatchSlotActor(possClub, ['MEI']);
  const cm = pickMatchSlotActor(possClub, ['MC']);
  const dm = pickMatchSlotActor(possClub, ['VOL']);
  const st = pickMatchSlotActor(possClub, ['CA']);
  const cb = pickMatchSlotActor(possClub, ['ZAG']);
  const oppDef = pickMatchSlotActor(defClub, ['ZAG', 'VOL', 'LD', 'LE']);

  const toAttackX = (pct: number) => (homeHasBall ? pct : 100 - pct);
  const flipY = (y: number) => (homeHasBall ? y : 100 - y);

  type ArchetypeSpec = {
    actor?: Player;
    partner?: Player;
    fromSector: { x: number; y: number };
    toSector: { x: number; y: number };
    phase: PlayPhase;
    texts: string[];
    weight: number;
  };

  const isWideFormation =
    possClub.formation === '4-3-3' || possClub.formation === '3-4-3' || possClub.formation === '4-2-3-1';
  const isCounter = possClub.mentality === 'Contra-Ataque';
  const isPressing = possClub.mentality === 'Ofensiva' || possClub.mentality === 'Tudo ou Nada';

  const archetypes: ArchetypeSpec[] = [
    {
      actor: wingR ?? fbR,
      partner: fbR ?? cm,
      fromSector: { x: 54, y: 76 },
      toSector: { x: 76, y: 84 },
      phase: homeHasBall ? 'ataque_casa' : 'ataque_fora',
      weight: isWideFormation ? 1.5 : 1.0,
      texts: [
        `${fbR?.knownName ?? 'Lateral'} faz a ultrapassagem e tabela com ${wingR?.knownName ?? 'o ponta'} pela direita.`,
        `${wingR?.knownName ?? 'Ponta direita'} recebe aberto de ${fbR?.knownName ?? 'seu lateral'} e encara o marcador.`,
        `${possClub.shortName} acelera pela ponta direita com ${wingR?.knownName ?? 'o atacante'} ganhando a linha de fundo.`,
      ],
    },
    {
      actor: wingL ?? fbL,
      partner: fbL ?? am,
      fromSector: { x: 52, y: 24 },
      toSector: { x: 77, y: 18 },
      phase: homeHasBall ? 'ataque_casa' : 'ataque_fora',
      weight: isWideFormation ? 1.5 : 1.0,
      texts: [
        `${wingL?.knownName ?? 'Ponta esquerda'} corta para dentro no 1x1 e deixa ${oppDef?.knownName ?? 'o marcador'} para trás!`,
        `Dobradinha rápida na esquerda: ${fbL?.knownName ?? 'lateral'} aciona ${wingL?.knownName ?? 'o ponta'} em velocidade.`,
        `${wingL?.knownName ?? 'Atacante'} limpa a marcação pela esquerda buscando espaço para o cruzamento.`,
      ],
    },
    {
      actor: st,
      partner: am ?? cm,
      fromSector: { x: 64, y: 50 },
      toSector: { x: 80, y: 48 },
      phase: homeHasBall ? 'ataque_casa' : 'ataque_fora',
      weight: isPressing ? 1.4 : 1.0,
      texts: [
        `${am?.knownName ?? 'O meia'} enfia passe vertical entrelinhas buscando ${st?.knownName ?? 'o centroavante'} na entrada da área!`,
        `${st?.knownName ?? 'Camisa 9'} faz bem o pivô contra ${oppDef?.knownName ?? 'a zaga'} e ajeita para chegada de ${cm?.knownName ?? 'seu meia'}.`,
        `Infiltração perigosa! ${am?.knownName ?? 'Armador'} deixa ${st?.knownName ?? 'o atacante'} de frente para a área.`,
      ],
    },
    {
      actor: am ?? cm,
      partner: dm ?? cm,
      fromSector: { x: 46, y: 46 },
      toSector: { x: 65, y: 54 },
      phase: 'meio_campo',
      weight: possClub.formation === '3-5-2' || possClub.formation === '4-2-3-1' ? 1.5 : 1.0,
      texts: [
        `Triangulação elegante no meio: ${dm?.knownName ?? 'volante'}, ${cm?.knownName ?? 'meia'} e ${am?.knownName ?? 'armador'} envolvem o ${defClub.shortName}.`,
        `${cm?.knownName ?? 'Meia'} encontra espaço entrelinhas e organiza a posse do ${possClub.shortName}.`,
        `${am?.knownName ?? 'Camisa 10'} gira sobre a marcação e dita o ritmo da partida no setor central.`,
      ],
    },
    {
      actor: wingL ?? wingR ?? st,
      partner: dm ?? cb,
      fromSector: { x: 36, y: 48 },
      toSector: { x: 74, y: 26 },
      phase: homeHasBall ? 'ataque_casa' : 'ataque_fora',
      weight: isCounter ? 1.8 : 0.9,
      texts: [
        `Contra-ataque fulminante! ${dm?.knownName ?? 'Volante'} rouba a bola e lança ${wingL?.knownName ?? st?.knownName ?? 'o ataque'} nas costas da zaga.`,
        `Virada de jogo precisa de ${cm?.knownName ?? dm?.knownName ?? 'meia'} acionando ${wingR?.knownName ?? 'a ponta'} completamente livre.`,
        `Transição em alta velocidade do ${possClub.shortName}: ${st?.knownName ?? 'atacante'} ataca o espaço vazio!`,
      ],
    },
    {
      actor: dm ?? cb,
      partner: oppDef,
      fromSector: { x: 42, y: 56 },
      toSector: { x: 54, y: 50 },
      phase: 'meio_campo',
      weight: possClub.mentality === 'Retranca' ? 1.5 : 0.9,
      texts: [
        `Desarme limpo de ${dm?.knownName ?? cb?.knownName ?? 'defensor'} para retomar a posse para o ${possClub.shortName}.`,
        `${cb?.knownName ?? 'Zagueiro'} antecipa bem a jogada de ${defClub.shortName} e sai jogando com segurança.`,
        `Pressão na saída! ${cm?.knownName ?? dm?.knownName ?? 'Meia'} recupera a bola no campo de ataque.`,
      ],
    },
  ];

  const totalW = archetypes.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * totalW;
  let picked = archetypes[0];
  for (const a of archetypes) {
    r -= a.weight;
    if (r <= 0) {
      picked = a;
      break;
    }
  }

  const candidateTexts = picked.texts.filter((t) => t !== previousPlayText);
  const chosenText =
    candidateTexts[Math.floor(Math.random() * candidateTexts.length)] ??
    picked.texts[0];

  const coord = picked.actor
    ? getPlayerPitchCoords(possClub, picked.actor.id, homeHasBall)
    : null;
  const fromCoord = picked.partner
    ? getPlayerPitchCoords(possClub, picked.partner.id, homeHasBall)
    : null;

  const jitterX = Math.round(Math.random() * 6 - 3);
  const jitterY = Math.round(Math.random() * 8 - 4);
  const baseToX = coord ? Math.round((toAttackX(picked.toSector.x) + coord.x) / 2) : toAttackX(picked.toSector.x);
  const baseToY = coord ? Math.round((flipY(picked.toSector.y) + coord.y) / 2) : flipY(picked.toSector.y);

  return {
    ballX: Math.max(12, Math.min(88, baseToX + jitterX)),
    ballY: Math.max(12, Math.min(88, baseToY + jitterY)),
    fromBallX: fromCoord ? Math.round(fromCoord.x) : toAttackX(picked.fromSector.x),
    fromBallY: fromCoord ? Math.round(fromCoord.y) : flipY(picked.fromSector.y),
    activePlayerId: picked.actor?.id,
    secondaryPlayerId:
      picked.partner && picked.partner.id !== picked.actor?.id ? picked.partner.id : undefined,
    playPhase: picked.phase,
    text: chosenText,
  };
}

function computeAutoLiveSubstitution(
  club: Club,
  subsUsed: number,
  subbedOutIds: string[],
  prevMin: number,
  nextMin: number
): { slotIndex: number; outPlayer: Player; inPlayer: Player } | null {
  const crossedWindow =
    (prevMin < 62 && nextMin >= 62) ||
    (prevMin < 74 && nextMin >= 74) ||
    (prevMin < 82 && nextMin >= 82);
  if (!crossedWindow || subsUsed >= 5) return null;

  const tiredStarters = (club.lineupSlots ?? [])
    .map((slot, slotIndex) => {
      const starter = club.squad.find((p) => p.id === slot.playerId);
      return { slotIndex, slot, starter };
    })
    .filter(
      (item): item is { slotIndex: number; slot: LineupSlot; starter: Player } =>
        Boolean(item.starter) && item.starter!.position !== 'GOL' && item.starter!.stamina <= 58
    )
    .sort((a, b) => a.starter.stamina - b.starter.stamina);

  if (tiredStarters.length === 0) return null;

  const benchPool = club.squad.filter(
    (p) => !p.isStarter && !subbedOutIds.includes(p.id) && p.stamina >= 78 && p.position !== 'GOL'
  );
  if (benchPool.length === 0) return null;

  for (const target of tiredStarters) {
    const starterFitOvr = getPositionFit(target.starter, target.slot.role).effectiveOvr;
    const bestBench = benchPool
      .map((bench) => ({
        bench,
        fitOvr: getPositionFit(bench, target.slot.role).effectiveOvr,
      }))
      .filter((cand) => cand.fitOvr >= starterFitOvr - 5)
      .sort((a, b) => b.fitOvr - a.fitOvr || b.bench.stamina - a.bench.stamina)[0];

    if (bestBench) {
      return {
        slotIndex: target.slotIndex,
        outPlayer: target.starter,
        inPlayer: bestBench.bench,
      };
    }
  }

  return null;
}

function getPlayerPitchCoords(
  club: Club,
  playerId: string | undefined,
  isHome: boolean
): { x: number; y: number } {
  const layout = FORMATION_LAYOUT[club.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const slotIdx = playerId
    ? (club.lineupSlots ?? []).findIndex((s) => s.playerId === playerId)
    : -1;
  const spec = slotIdx >= 0 ? layout[slotIdx] : undefined;
  if (!spec) {
    return { x: isHome ? 45 : 55, y: 50 };
  }
  return isHome
    ? { x: 8 + ((100 - spec.pitchY) / 100) * 60, y: spec.pitchX }
    : { x: 92 - ((100 - spec.pitchY) / 100) * 60, y: 100 - spec.pitchX };
}

function getBaseRoleStaminaDrain(role: PlayerPosition, formation: Formation): number {
  switch (role) {
    case 'GOL':
      return 0.07;
    case 'ZAG':
      return 0.24;
    case 'CA':
      return 0.33;
    case 'MEI':
      return 0.36;
    case 'VOL':
      return 0.41;
    case 'MC':
      return 0.42;
    case 'PE':
    case 'PD':
      return 0.44;
    case 'LD':
    case 'LE':
      return formation === '3-5-2' || formation === '3-4-3' ? 0.5 : 0.45;
  }
}

function getMentalityStaminaIntensity(mentality: TacticalMentality): number {
  switch (mentality) {
    case 'Retranca':
      return 0.78;
    case 'Contra-Ataque':
      return 0.92;
    case 'Ofensiva':
      return 1.18;
    case 'Tudo ou Nada':
      return 1.4;
    case 'Equilibrada':
    default:
      return 1.0;
  }
}

function computeClubPlayerDrains(
  club: Club,
  stepMinutes: number,
  activePlayerId?: string,
  secondaryPlayerId?: string
): Record<string, number> {
  const drains: Record<string, number> = {};
  const intensity = getMentalityStaminaIntensity(club.mentality);
  const slotByPlayerId = new Map<string, PlayerPosition>();
  (club.lineupSlots ?? []).forEach((s) => slotByPlayerId.set(s.playerId, s.role));

  club.squad.forEach((p) => {
    if (!p.isStarter) return;
    const role = slotByPlayerId.get(p.id) ?? p.position;
    let drain = getBaseRoleStaminaDrain(role, club.formation) * intensity * stepMinutes;
    if (p.id === activePlayerId) {
      drain += (role === 'GOL' ? 0.18 : 0.42) * stepMinutes;
    } else if (p.id === secondaryPlayerId) {
      drain += (role === 'GOL' ? 0.2 : 0.28) * stepMinutes;
    }
    drains[p.id] = Math.round(drain * 100) / 100;
  });
  return drains;
}

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
  homeTacticUpdate?: { formation: Formation; mentality: TacticalMentality };
  awayTacticUpdate?: { formation: Formation; mentality: TacticalMentality };
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
  const nextMinute = Math.min(90, prevMin + stepMinutes);
  const enteredHalftime = prevMin < 45 && nextMinute >= 45 && stepMinutes <= 3;

  const baseHomeStr = calculateClubStrength(homeClub);
  const baseAwayStr = calculateClubStrength(awayClub);

  const manualList = match.manualControlClubs ?? [];
  const homeAllowAI = homeClub.controller === 'bot' || !manualList.includes(homeClub.id);
  const awayAllowAI = awayClub.controller === 'bot' || !manualList.includes(awayClub.id);

  // Adaptação tática automática (Bots + players humanos offline no momento)
  const homeAdapt = computeBotLiveAdaptation(
    homeClub,
    baseAwayStr.overall,
    match.homeGoals - match.awayGoals,
    prevMin,
    nextMinute,
    homeAllowAI
  );
  const awayAdapt = computeBotLiveAdaptation(
    awayClub,
    baseHomeStr.overall,
    match.awayGoals - match.homeGoals,
    prevMin,
    nextMinute,
    awayAllowAI
  );

  const homeSubPick = homeAllowAI
    ? computeAutoLiveSubstitution(
        homeClub,
        match.homeSubsUsed,
        match.homeSubbedOutIds,
        prevMin,
        nextMinute
      )
    : null;
  const awaySubPick = awayAllowAI
    ? computeAutoLiveSubstitution(
        awayClub,
        match.awaySubsUsed,
        match.awaySubbedOutIds,
        prevMin,
        nextMinute
      )
    : null;

  const applyClubSubSnapshot = (
    club: Club,
    sub: { slotIndex: number; outPlayer: Player; inPlayer: Player } | null
  ): Club => {
    if (!sub) return club;
    const nextSlots = (club.lineupSlots ?? []).map((s, idx) =>
      idx === sub.slotIndex ? { ...s, playerId: sub.inPlayer.id } : s
    );
    const starterIds = new Set(nextSlots.map((s) => s.playerId));
    return {
      ...club,
      lineupSlots: nextSlots,
      squad: club.squad.map((p) => ({ ...p, isStarter: starterIds.has(p.id) })),
    };
  };

  let effHomeClub: Club = homeAdapt
    ? { ...homeClub, formation: homeAdapt.formation, mentality: homeAdapt.mentality }
    : homeClub;
  effHomeClub = applyClubSubSnapshot(effHomeClub, homeSubPick);

  let effAwayClub: Club = awayAdapt
    ? { ...awayClub, formation: awayAdapt.formation, mentality: awayAdapt.mentality }
    : awayClub;
  effAwayClub = applyClubSubSnapshot(effAwayClub, awaySubPick);

  const homeStr = homeAdapt || homeSubPick ? calculateClubStrength(effHomeClub) : baseHomeStr;
  const awayStr = awayAdapt || awaySubPick ? calculateClubStrength(effAwayClub) : baseAwayStr;
  const homeReadout = evaluateTacticalMatchup(effHomeClub, effAwayClub);
  const awayReadout = evaluateTacticalMatchup(effAwayClub, effHomeClub);

  const homeAtk = homeStr.attack + homeReadout.netAtkBonus + 1.8; // +1.8 mando
  const awayDef = awayStr.defense + awayReadout.netDefBonus;
  const awayAtk = awayStr.attack + awayReadout.netAtkBonus;
  const homeDef = homeStr.defense + homeReadout.netDefBonus + 1.0;

  const newEvents: MatchEvent[] = [...match.events];
  const stats = { ...match.stats };
  let homeGoals = match.homeGoals;
  let awayGoals = match.awayGoals;

  const pickScorer = (
    club: Club
  ): { scorer: string; assist?: string; scorerPlayer?: Player; assistPlayer?: Player } => {
    const slots = club.lineupSlots ?? [];
    const starters = club.squad.filter((p) => p.isStarter);
    const pool = starters.length > 0 ? starters : club.squad;

    const scorerRoles: PlayerPosition[] =
      club.formation === '4-3-3' || club.formation === '3-4-3'
        ? ['CA', 'PE', 'PD', 'MEI']
        : club.formation === '3-5-2' || club.formation === '4-4-2'
        ? ['CA', 'MEI', 'MC', 'PE', 'PD']
        : ['CA', 'MEI', 'PE', 'PD', 'MC'];

    const scorerPlayer = pickMatchSlotActor(club, scorerRoles);

    const assistRoles: PlayerPosition[] =
      club.formation === '4-2-3-1'
        ? ['MEI', 'PE', 'PD', 'LD', 'LE', 'MC']
        : club.formation === '3-5-2'
        ? ['MEI', 'MC', 'LD', 'LE', 'CA']
        : ['MEI', 'PE', 'PD', 'MC', 'LD', 'LE'];

    const assistPool = pool.filter((p) => p.id !== scorerPlayer?.id && p.position !== 'GOL');
    const slotRoleMap = new Map<string, PlayerPosition>();
    slots.forEach((s) => slotRoleMap.set(s.playerId, s.role));

    const weightedAssisters = assistPool
      .map((p) => {
        const role = slotRoleMap.get(p.id) ?? p.position;
        const roleMult = assistRoles.includes(role) ? 2.2 : 0.7;
        return {
          p,
          w: Math.max(1, (p.overall - 62) * roleMult * (0.6 + (p.stamina / 100) * 0.4)),
        };
      })
      .sort((a, b) => b.w - a.w)
      .slice(0, 6);

    let assistPlayer: Player | undefined;
    if (weightedAssisters.length > 0) {
      const totalAW = weightedAssisters.reduce((s, x) => s + x.w, 0);
      let r = Math.random() * totalAW;
      for (const cand of weightedAssisters) {
        r -= cand.w;
        if (r <= 0) {
          assistPlayer = cand.p;
          break;
        }
      }
      assistPlayer = assistPlayer ?? weightedAssisters[0].p;
    }

    return {
      scorer: scorerPlayer?.knownName ?? 'Atacante',
      assist: assistPlayer?.knownName,
      scorerPlayer,
      assistPlayer,
    };
  };

  const mentalityPossShift = (m: TacticalMentality) =>
    m === 'Ofensiva' || m === 'Tudo ou Nada' ? 2.2 : m === 'Retranca' ? -2.8 : 0;

  const midDiff =
    homeStr.midfield -
    awayStr.midfield +
    (homeReadout.midControlBonus - awayReadout.midControlBonus) +
    (mentalityPossShift(effHomeClub.mentality) - mentalityPossShift(effAwayClub.mentality)) +
    1.5;
  const homePossChance = Math.min(0.76, Math.max(0.24, 0.5 + midDiff * 0.022));
  const homeHasBall = Math.random() < homePossChance;
  const possClub = homeHasBall ? effHomeClub : effAwayClub;
  const defClub = homeHasBall ? effAwayClub : effHomeClub;
  const possReadout = homeHasBall ? homeReadout : awayReadout;

  const targetPoss = Math.round(homePossChance * 100);
  stats.homePossession = Math.max(
    24,
    Math.min(76, Math.round(stats.homePossession * 0.85 + targetPoss * 0.15))
  );

  const computeGoalProbPerMinute = (
    netEdge: number,
    finishingEdge: number,
    isHome: boolean
  ): number => {
    const baseRate = isHome ? 0.022 : 0.019;
    const edgeFactor =
      netEdge >= 0
        ? netEdge * 0.0032 + Math.max(0, netEdge - 4) * 0.0022
        : netEdge * 0.0018;
    const raw = (baseRate + edgeFactor + finishingEdge * 0.45) * stepMinutes;
    return Math.min(0.095, Math.max(0.004, raw));
  };

  const homeNetEdge = homeAtk - awayDef;
  const awayNetEdge = awayAtk - homeDef;
  const homeGoalProb = computeGoalProbPerMinute(homeNetEdge, homeReadout.finishingEdge, true);
  const awayGoalProb = computeGoalProbPerMinute(awayNetEdge, awayReadout.finishingEdge, false);
  const possEdge = homeHasBall ? homeNetEdge : awayNetEdge;
  const chanceProb = Math.min(
    0.58,
    Math.max(0.14, (0.24 + possReadout.chanceBonus + Math.max(-0.08, possEdge * 0.014)) * stepMinutes)
  );

  const keeper = pickMatchSlotActor(defClub, ['GOL']);
  const varied = buildVariedPlayAction({
    possClub,
    defClub,
    homeHasBall,
    previousPlayText: match.lastPlayText,
  });

  let ballX = varied.ballX;
  let ballY = varied.ballY;
  let fromBallX = varied.fromBallX;
  let fromBallY = varied.fromBallY;
  let activePlayerId = varied.activePlayerId;
  let secondaryPlayerId = varied.secondaryPlayerId;
  let playPhase: PlayPhase = varied.playPhase;

  let lastPlayText = homeAdapt?.note ?? awayAdapt?.note ?? varied.text;

  if (homeHasBall && Math.random() < homeGoalProb) {
    homeGoals += 1;
    const { scorer, assist, scorerPlayer, assistPlayer } = pickScorer(effHomeClub);
    const scorerBase = getPlayerPitchCoords(effHomeClub, scorerPlayer?.id, true);
    const scorerShotX = Math.max(78, Math.min(90, scorerBase.x + 18));
    const scorerShotY = Math.max(28, Math.min(72, scorerBase.y));

    stats.homeShots += 1;
    stats.homeOnTarget += 1;
    activePlayerId = scorerPlayer?.id;
    secondaryPlayerId = assistPlayer?.id;
    fromBallX = Math.round(scorerShotX);
    fromBallY = Math.round(scorerShotY);
    ballX = 97;
    ballY = Math.round(46 + Math.random() * 8);
    playPhase = 'gol_casa';
    const goalVariants = [
      `GOOOL do ${effHomeClub.name}! ${scorer} enche o pé para estufar a rede${assist ? ` após passe de ${assist}` : ''}!`,
      `GOOOL do ${effHomeClub.name}! ${scorer} aparece livre na área e bate colocado${assist ? ` (assist. ${assist})` : ''}!`,
      `GOOOL do ${effHomeClub.name}! Cabeceio firme de ${scorer} sem chances para o goleiro${assist ? ` — cruzamento de ${assist}` : ''}!`,
    ];
    lastPlayText = goalVariants[Math.floor(Math.random() * goalVariants.length)];
    newEvents.push({
      minute: nextMinute,
      type: 'gol',
      clubId: effHomeClub.id,
      playerName: scorer,
      assistName: assist,
      description: `⚽ ${scorer}${assist ? ` (${assist})` : ''}`,
    });
  } else if (!homeHasBall && Math.random() < awayGoalProb) {
    awayGoals += 1;
    const { scorer, assist, scorerPlayer, assistPlayer } = pickScorer(effAwayClub);
    const scorerBase = getPlayerPitchCoords(effAwayClub, scorerPlayer?.id, false);
    const scorerShotX = Math.min(22, Math.max(10, scorerBase.x - 18));
    const scorerShotY = Math.max(28, Math.min(72, scorerBase.y));

    stats.awayShots += 1;
    stats.awayOnTarget += 1;
    activePlayerId = scorerPlayer?.id;
    secondaryPlayerId = assistPlayer?.id;
    fromBallX = Math.round(scorerShotX);
    fromBallY = Math.round(scorerShotY);
    ballX = 3;
    ballY = Math.round(46 + Math.random() * 8);
    playPhase = 'gol_fora';
    const goalVariants = [
      `GOOOL do ${effAwayClub.name}! ${scorer} manda no ângulo${assist ? ` com assistência de ${assist}` : ''}!`,
      `GOOOL do ${effAwayClub.name}! ${scorer} finaliza de primeira na pequena área${assist ? ` após jogada de ${assist}` : ''}!`,
      `GOOOL do ${effAwayClub.name}! Contrataque mortal concluído por ${scorer}${assist ? ` (${assist})` : ''}!`,
    ];
    lastPlayText = goalVariants[Math.floor(Math.random() * goalVariants.length)];
    newEvents.push({
      minute: nextMinute,
      type: 'gol',
      clubId: effAwayClub.id,
      playerName: scorer,
      assistName: assist,
      description: `⚽ ${scorer}${assist ? ` (${assist})` : ''}`,
    });
  } else if (Math.random() < chanceProb) {
    const shooter = pickMatchSlotActor(possClub, ['CA', 'PE', 'PD', 'MEI', 'MC']);
    const shooterBase = getPlayerPitchCoords(possClub, shooter?.id, homeHasBall);
    const shooterX = homeHasBall
      ? Math.max(74, Math.min(86, shooterBase.x + 16))
      : Math.min(26, Math.max(14, shooterBase.x - 16));
    const shooterY = Math.max(22, Math.min(78, shooterBase.y));

    const shotQuality = 0.48 + possReadout.finishingEdge * 2.4;
    const onTarget = Math.random() < Math.min(0.78, Math.max(0.32, shotQuality));

    if (homeHasBall) {
      stats.homeShots += 1;
      if (onTarget) stats.homeOnTarget += 1;
      playPhase = 'finalizacao_casa';
    } else {
      stats.awayShots += 1;
      if (onTarget) stats.awayOnTarget += 1;
      playPhase = 'finalizacao_fora';
    }

    fromBallX = Math.round(shooterX);
    fromBallY = Math.round(shooterY);
    activePlayerId = shooter?.id;

    if (onTarget) {
      secondaryPlayerId = keeper?.id;
      ballX = homeHasBall ? 93 : 7;
      ballY = Math.round(45 + Math.random() * 10);
      if (Math.random() < 0.42) {
        if (homeHasBall) stats.homeCorners += 1;
        else stats.awayCorners += 1;
        lastPlayText = `🧤 Defesaça! ${keeper?.knownName ?? 'Goleiro'} desvia bomba de ${shooter?.knownName ?? 'atacante'} para escanteio!`;
      } else {
        lastPlayText = `🧤 ${keeper?.knownName ?? 'Goleiro'} espalma firme a finalização de ${shooter?.knownName ?? 'atacante'}!`;
      }
    } else {
      secondaryPlayerId = varied.activePlayerId !== shooter?.id ? varied.activePlayerId : undefined;
      ballX = homeHasBall ? 96 : 4;
      ballY = shooterY < 50 ? 28 : 72;
      const missVariants = [
        `⚡ ${shooter?.knownName ?? 'Atacante'} (${possClub.shortName}) solta a bomba e tira tinta da trave!`,
        `⚡ Chute colocado de ${shooter?.knownName ?? 'atacante'} passa raspando o travessão!`,
        `⚡ ${shooter?.knownName ?? 'Atacante'} bate cruzado pela linha de fundo após boa jogada do ${possClub.shortName}.`,
      ];
      lastPlayText = missVariants[Math.floor(Math.random() * missVariants.length)];
    }
  } else if (Math.random() < 0.032) {
    const carded = pickMatchSlotActor(defClub, ['ZAG', 'VOL', 'LD', 'LE']);
    const cardedPos = getPlayerPitchCoords(defClub, carded?.id, !homeHasBall);
    if (carded) {
      lastPlayText = `🟨 Cartão amarelo para ${carded.knownName} (${defClub.shortName}) por falta dura.`;
      newEvents.push({
        minute: nextMinute,
        type: 'cartao_amarelo',
        clubId: defClub.id,
        playerName: carded.knownName,
        description: `🟨 ${carded.knownName} (${defClub.shortName})`,
      });
    }
    activePlayerId = carded?.id;
    secondaryPlayerId = varied.activePlayerId;
    ballX = Math.round(cardedPos.x);
    ballY = Math.round(cardedPos.y);
    fromBallX = undefined;
    fromBallY = undefined;
    playPhase = 'meio_campo';
  }

  if (homeSubPick) {
    const desc = `🔄 IA (${effHomeClub.shortName}): entra ${homeSubPick.inPlayer.knownName}, sai ${homeSubPick.outPlayer.knownName}`;
    newEvents.push({
      minute: nextMinute,
      type: 'substituicao',
      clubId: effHomeClub.id,
      playerName: homeSubPick.inPlayer.knownName,
      description: desc,
    });
  }
  if (awaySubPick) {
    const desc = `🔄 IA (${effAwayClub.shortName}): entra ${awaySubPick.inPlayer.knownName}, sai ${awaySubPick.outPlayer.knownName}`;
    newEvents.push({
      minute: nextMinute,
      type: 'substituicao',
      clubId: effAwayClub.id,
      playerName: awaySubPick.inPlayer.knownName,
      description: desc,
    });
  }

  const homePlayerDrains = computeClubPlayerDrains(
    effHomeClub,
    stepMinutes,
    activePlayerId,
    secondaryPlayerId
  );
  const awayPlayerDrains = computeClubPlayerDrains(
    effAwayClub,
    stepMinutes,
    activePlayerId,
    secondaryPlayerId
  );

  return {
    match: {
      ...match,
      homeGoals,
      awayGoals,
      currentMinute: nextMinute,
      isHalftime: enteredHalftime,
      halftimeRemainingSec: enteredHalftime ? 30 : 0,
      status: nextMinute >= 90 ? 'finalizada' : 'ao_vivo',
      homeSubsUsed: homeSubPick ? match.homeSubsUsed + 1 : match.homeSubsUsed,
      awaySubsUsed: awaySubPick ? match.awaySubsUsed + 1 : match.awaySubsUsed,
      homeSubbedOutIds: homeSubPick
        ? [...match.homeSubbedOutIds, homeSubPick.outPlayer.id]
        : match.homeSubbedOutIds,
      awaySubbedOutIds: awaySubPick
        ? [...match.awaySubbedOutIds, awaySubPick.outPlayer.id]
        : match.awaySubbedOutIds,
      ballX: Math.round(ballX),
      ballY: Math.round(ballY),
      activePlayerId,
      secondaryPlayerId,
      fromBallX,
      fromBallY,
      possessionClubId: possClub.id,
      playPhase,
      lastPlayText:
        nextMinute >= 90
          ? `Fim de jogo! ${effHomeClub.shortName} ${homeGoals} x ${awayGoals} ${effAwayClub.shortName}.`
          : enteredHalftime
          ? 'Intervalo! 30s para mexer na tática e substituições.'
          : lastPlayText,
      stats,
      events: newEvents.sort((a, b) => a.minute - b.minute),
    },
    homeStaminaDrain: homeReadout.staminaDrainMult * stepMinutes,
    awayStaminaDrain: awayReadout.staminaDrainMult * stepMinutes,
    homePlayerDrains,
    awayPlayerDrains,
    homeTacticUpdate: homeAdapt
      ? { formation: homeAdapt.formation, mentality: homeAdapt.mentality }
      : undefined,
    awayTacticUpdate: awayAdapt
      ? { formation: awayAdapt.formation, mentality: awayAdapt.mentality }
      : undefined,
    homeAutoSub: homeSubPick
      ? {
          slotIndex: homeSubPick.slotIndex,
          outPlayerId: homeSubPick.outPlayer.id,
          inPlayerId: homeSubPick.inPlayer.id,
        }
      : undefined,
    awayAutoSub: awaySubPick
      ? {
          slotIndex: awaySubPick.slotIndex,
          outPlayerId: awaySubPick.outPlayer.id,
          inPlayerId: awaySubPick.inPlayer.id,
        }
      : undefined,
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
      // Clube humano no fim de temporada: quem não foi renovado manualmente sai livre de graça
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
    const wageBill = Math.round(built.squad.reduce((s, p) => s + p.wage, 0) * 10) / 10;

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
      const contrib = (p.goals ?? 0) + (p.assists ?? 0);
      const perfDelta =
        contrib >= 20
          ? 2
          : contrib >= 12
          ? 1
          : p.isStarter && p.position !== 'GOL' && contrib === 0 && nextAge >= 28
          ? -1
          : 0;
      const ageDelta = nextAge <= 23 ? (Math.random() < 0.55 ? 2 : 1) : nextAge >= 33 ? -1 : 0;
      const ovrDelta = Math.max(-2, Math.min(3, ageDelta + perfDelta));
      const nextOvr = Math.min(94, Math.max(65, p.overall + ovrDelta));
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
        marketValue: nextVal,
        monthlySalary: nextSalary,
        wage: Math.max(0.1, Math.round((nextSalary / 1000) * 10) / 10),
        stamina: 100,
        goals: 0,
        assists: 0,
      };
    });

    const built = buildLineupSlots(evolvedSquad, c.formation, c.lineupSlots);
    const wageBill = Math.round(built.squad.reduce((s, p) => s + p.wage, 0) * 10) / 10;

    return {
      ...c,
      squad: built.squad,
      lineupSlots: built.lineupSlots,
      titlesWon: c.titlesWon + (isChamp ? 1 : 0),
      dealsThisRound: 0,
      finances: {
        ...c.finances,
        budget: Math.round((c.finances.budget + prize) * 10) / 10,
        prizeIncome: Math.round((c.finances.prizeIncome + prize) * 10) / 10,
        wageBill,
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
        message: `${champion?.name} campeão da T${league.season}! Contratos encerrados liberados para os Livres e janela de 24h aberta.`,
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
      if (!club || club.finances.budget < bid.offerCash) return null;
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

  // Ranking da tabela atual para avaliar projeto esportivo realista na escolha do atleta
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

    const feeRatioBonus = maxFee > 0 ? Math.max(0, ((totalFee / maxFee) - 0.94) / 0.06) * 6 : 0;

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

    // Espaço de titularidade na posição real do atleta
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

    const careerScore = Math.round((salaryScore + feeRatioBonus + prestigeScore + playingTimeScore) * 10) / 10;

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
