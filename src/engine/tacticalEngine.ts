import {
  BuildUpStyle,
  Club,
  ClubBotPersonality,
  ClubTactics,
  DefensiveLineHeight,
  Formation,
  LineupSlot,
  OffensiveStyle,
  Player,
  PlayerPosition,
  PressingStyle,
  TacticalIntensity,
  TacticalMentality,
} from '../types/league';
import {
  ensurePlayerAttributes,
  getEffectivePlayerMatchOvr,
  getPositionFit,
} from './playerAttributes';

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

export const BUILD_UP_OPTIONS: BuildUpStyle[] = [
  'Saída curta',
  'Equilibrada',
  'Ligações diretas',
  'Contra-ataques rápidos',
];

export const OFFENSIVE_STYLE_OPTIONS: OffensiveStyle[] = [
  'Posse de bola',
  'Jogo pelas laterais',
  'Ataque pelo meio',
  'Cruzamentos',
  'Transições rápidas',
];

export const PRESSING_OPTIONS: PressingStyle[] = [
  'Pressão baixa',
  'Bloco médio',
  'Pressão alta',
  'Pressão após perda',
];

export const DEFENSIVE_LINE_OPTIONS: DefensiveLineHeight[] = [
  'Recuada',
  'Equilibrada',
  'Adiantada',
];

export const INTENSITY_OPTIONS: TacticalIntensity[] = ['Baixa', 'Normal', 'Alta'];

export const DEFAULT_CLUB_TACTICS: ClubTactics = {
  buildUpStyle: 'Equilibrada',
  offensiveStyle: 'Posse de bola',
  pressing: 'Bloco médio',
  defensiveLine: 'Equilibrada',
  intensity: 'Normal',
};

export interface TacticalPresetSpec {
  id: string;
  name: string;
  shortDesc: string;
  mentality: TacticalMentality;
  tactics: ClubTactics;
}

export const TACTICAL_PRESETS: TacticalPresetSpec[] = [
  {
    id: 'equilibrado',
    name: 'Equilibrado',
    shortDesc: 'Bloco médio sólido, saída segura e ataque balanceado',
    mentality: 'Equilibrada',
    tactics: {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Posse de bola',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    },
  },
  {
    id: 'posse',
    name: 'Posse Controlada',
    shortDesc: 'Saída curta apoiada, triangulações centrais e recomposição pós-perda',
    mentality: 'Ofensiva',
    tactics: {
      buildUpStyle: 'Saída curta',
      offensiveStyle: 'Posse de bola',
      pressing: 'Pressão após perda',
      defensiveLine: 'Adiantada',
      intensity: 'Normal',
    },
  },
  {
    id: 'gegenpressing',
    name: 'Gegenpressing',
    shortDesc: 'Pressão alta sufocante e transições verticais (alto gasto físico)',
    mentality: 'Ofensiva',
    tactics: {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Pressão alta',
      defensiveLine: 'Adiantada',
      intensity: 'Alta',
    },
  },
  {
    id: 'contra_ataque',
    name: 'Contra-Ataque Letal',
    shortDesc: 'Bloco médio/recuado para atrair o rival e ferir nas costas',
    mentality: 'Contra-Ataque',
    tactics: {
      buildUpStyle: 'Contra-ataques rápidos',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Bloco médio',
      defensiveLine: 'Recuada',
      intensity: 'Normal',
    },
  },
  {
    id: 'bloco_baixo',
    name: 'Bloco Baixo',
    shortDesc: 'Área trancada, proteção de placar, mínimo desgaste e ligação direta',
    mentality: 'Retranca',
    tactics: {
      buildUpStyle: 'Ligações diretas',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Pressão baixa',
      defensiveLine: 'Recuada',
      intensity: 'Baixa',
    },
  },
  {
    id: 'pontas',
    name: 'Jogo Pelas Pontas',
    shortDesc: 'Amplitude máxima com laterais/pontas e cruzamentos na área',
    mentality: 'Ofensiva',
    tactics: {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Jogo pelas laterais',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    },
  },
];

export function tacticsEqual(a: ClubTactics, b: ClubTactics): boolean {
  return (
    a.buildUpStyle === b.buildUpStyle &&
    a.offensiveStyle === b.offensiveStyle &&
    a.pressing === b.pressing &&
    a.defensiveLine === b.defensiveLine &&
    a.intensity === b.intensity
  );
}

export function getClubTactics(
  club: Pick<Club, 'tactics' | 'mentality' | 'botPersonality'>
): ClubTactics {
  if (
    club.tactics &&
    club.tactics.buildUpStyle &&
    club.tactics.offensiveStyle &&
    club.tactics.pressing &&
    club.tactics.defensiveLine &&
    club.tactics.intensity
  ) {
    return club.tactics;
  }

  switch (club.mentality) {
    case 'Retranca':
      return {
        buildUpStyle: 'Ligações diretas',
        offensiveStyle: 'Transições rápidas',
        pressing: 'Pressão baixa',
        defensiveLine: 'Recuada',
        intensity: 'Baixa',
      };
    case 'Contra-Ataque':
      return {
        buildUpStyle: 'Contra-ataques rápidos',
        offensiveStyle: 'Transições rápidas',
        pressing: 'Bloco médio',
        defensiveLine: 'Recuada',
        intensity: 'Normal',
      };
    case 'Tudo ou Nada':
      return {
        buildUpStyle: 'Ligações diretas',
        offensiveStyle: 'Jogo pelas laterais',
        pressing: 'Pressão alta',
        defensiveLine: 'Adiantada',
        intensity: 'Alta',
      };
    case 'Ofensiva':
      if (club.botPersonality === 'galactico') {
        return {
          buildUpStyle: 'Saída curta',
          offensiveStyle: 'Posse de bola',
          pressing: 'Pressão após perda',
          defensiveLine: 'Adiantada',
          intensity: 'Normal',
        };
      }
      return {
        buildUpStyle: 'Equilibrada',
        offensiveStyle: 'Jogo pelas laterais',
        pressing: 'Pressão alta',
        defensiveLine: 'Adiantada',
        intensity: 'Alta',
      };
    case 'Equilibrada':
    default:
      return { ...DEFAULT_CLUB_TACTICS };
  }
}

/** Escala os 11 titulares priorizando jogadores elegíveis (não suspensos) */
export function buildLineupSlots(
  squad: Player[],
  formation: Formation,
  preserveExisting?: LineupSlot[]
): { squad: Player[]; lineupSlots: LineupSlot[] } {
  const layout = FORMATION_LAYOUT[formation];
  // Elegíveis ((suspendedMatches ?? 0) === 0) sempre antes dos suspensos
  const sorted = [...squad].sort((a, b) => {
    const aSusp = (a.suspendedMatches ?? 0) > 0 ? 1 : 0;
    const bSusp = (b.suspendedMatches ?? 0) > 0 ? 1 : 0;
    if (aSusp !== bSusp) return aSusp - bSusp;
    return b.overall - a.overall;
  });

  const usedIds = new Set<string>();
  const slots: LineupSlot[] = new Array(layout.length);

  if (preserveExisting && preserveExisting.length === layout.length) {
    layout.forEach((spec, idx) => {
      const prev = preserveExisting[idx];
      const match = prev ? sorted.find((p) => p.id === prev.playerId) : undefined;
      if (
        match &&
        (match.suspendedMatches ?? 0) === 0 &&
        (match.position === spec.role || match.secondaryPositions?.includes(spec.role)) &&
        !usedIds.has(match.id)
      ) {
        usedIds.add(match.id);
        slots[idx] = { slotIndex: idx, role: spec.role, playerId: match.id };
      }
    });
  }

  // 1. Posição natural elegível
  layout.forEach((spec, idx) => {
    if (slots[idx]) return;
    const exact = sorted.find(
      (p) => (p.suspendedMatches ?? 0) === 0 && p.position === spec.role && !usedIds.has(p.id)
    );
    if (exact) {
      usedIds.add(exact.id);
      slots[idx] = { slotIndex: idx, role: spec.role, playerId: exact.id };
    }
  });

  // 2. Posição secundária / ambidestro elegível
  layout.forEach((spec, idx) => {
    if (slots[idx]) return;
    const sec = sorted.find(
      (p) =>
        (p.suspendedMatches ?? 0) === 0 &&
        !usedIds.has(p.id) &&
        (p.secondaryPositions?.includes(spec.role) ||
          (p.ambidextrous &&
            (p.position === 'PE' || p.position === 'PD') &&
            (spec.role === 'PE' || spec.role === 'PD')))
    );
    if (sec) {
      usedIds.add(sec.id);
      slots[idx] = { slotIndex: idx, role: spec.role, playerId: sec.id };
    }
  });

  // 3. Melhor encaixe elegível restante (e fallback suspenso apenas se elenco tiver < 11 elegíveis)
  layout.forEach((spec, idx) => {
    if (slots[idx]) return;
    const bestFit = sorted
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => {
        const aSusp = (a.suspendedMatches ?? 0) > 0 ? 1 : 0;
        const bSusp = (b.suspendedMatches ?? 0) > 0 ? 1 : 0;
        if (aSusp !== bSusp) return aSusp - bSusp;
        return (
          getPositionFit(b, spec.role).effectiveOvr - getPositionFit(a, spec.role).effectiveOvr
        );
      })[0];
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

export function chooseBotTactics(
  personality: ClubBotPersonality,
  squad?: Player[]
): {
  formation: Formation;
  mentality: TacticalMentality;
  tactics: ClubTactics;
} {
  let formation: Formation = '4-4-2';
  let mentality: TacticalMentality = 'Equilibrada';
  let tactics: ClubTactics = { ...DEFAULT_CLUB_TACTICS };

  switch (personality) {
    case 'agressivo':
      formation = '4-3-3';
      mentality = 'Ofensiva';
      tactics = { ...TACTICAL_PRESETS[2].tactics }; // Gegenpressing
      break;
    case 'galactico':
      formation = '4-2-3-1';
      mentality = 'Ofensiva';
      tactics = { ...TACTICAL_PRESETS[1].tactics }; // Posse Controlada
      break;
    case 'tatico':
      formation = '3-5-2';
      mentality = 'Contra-Ataque';
      tactics = { ...TACTICAL_PRESETS[3].tactics }; // Contra-Ataque Letal
      break;
    case 'economico':
      formation = '5-3-2';
      mentality = 'Retranca';
      tactics = { ...TACTICAL_PRESETS[4].tactics }; // Bloco Baixo
      break;
    case 'equilibrado':
    default:
      formation = '4-4-2';
      mentality = 'Equilibrada';
      tactics = { ...TACTICAL_PRESETS[0].tactics };
      break;
  }

  // Ajusta formação e instruções se o elenco real tiver muita afinidade ou falta de peças
  if (squad && squad.length >= 11) {
    const countPos = (roles: PlayerPosition[]) =>
      squad.filter((p) => roles.includes(p.position)).length;
    const zags = countPos(['ZAG']);
    const wingers = countPos(['PE', 'PD']);
    const strikers = countPos(['CA']);
    const mids = countPos(['VOL', 'MC', 'MEI']);

    if ((formation === '3-5-2' || formation === '5-3-2') && zags < 3) {
      formation = mids >= 4 ? '4-2-3-1' : '4-4-2';
    }
    if (formation === '4-3-3' && wingers < 2 && strikers >= 2) {
      formation = zags >= 3 ? '3-5-2' : '4-4-2';
    }

    const starters = buildLineupSlots(squad, formation).lineupSlots.map((s) => ({
      player: squad.find((p) => p.id === s.playerId),
      role: s.role,
    }));
    const cbs = starters.filter((x) => x.role === 'ZAG' && x.player).map((x) => ensurePlayerAttributes(x.player!));
    const avgCbPace = cbs.length ? cbs.reduce((s, a) => s + a.velocidade, 0) / cbs.length : 74;
    if (tactics.defensiveLine === 'Adiantada' && avgCbPace < 70) {
      tactics.defensiveLine = 'Equilibrada';
    }
    const avgCbPass = cbs.length ? cbs.reduce((s, a) => s + a.passe, 0) / cbs.length : 72;
    if (tactics.buildUpStyle === 'Saída curta' && avgCbPass < 66) {
      tactics.buildUpStyle = 'Equilibrada';
    }
  }

  return { formation, mentality, tactics };
}

export interface TacticalCompatibilityReport {
  score: number; // 35..100
  label: string;
  tone: 'emerald' | 'amber' | 'rose';
  strengths: string[];
  warnings: string[];
  cohesionMultiplier: number; // ~0.88..1.05
}

export function evaluateTacticalCompatibility(params: {
  formation: Formation;
  mentality: TacticalMentality;
  tactics: ClubTactics;
  starters?: Array<Player & { slotRole?: PlayerPosition }>;
}): TacticalCompatibilityReport {
  const { formation, mentality, tactics, starters } = params;
  let score = 78;
  const strengths: string[] = [];
  const warnings: string[] = [];

  // 1. Harmonia Formação × Estilo Ofensivo
  if (
    (formation === '4-3-3' || formation === '3-4-3') &&
    (tactics.offensiveStyle === 'Jogo pelas laterais' ||
      tactics.offensiveStyle === 'Cruzamentos' ||
      tactics.offensiveStyle === 'Transições rápidas')
  ) {
    score += 7;
    strengths.push(`${formation} potencializa corredores de ponta no estilo ${tactics.offensiveStyle}.`);
  } else if (
    (formation === '4-2-3-1' || formation === '3-5-2') &&
    (tactics.offensiveStyle === 'Posse de bola' || tactics.offensiveStyle === 'Ataque pelo meio')
  ) {
    score += 7;
    strengths.push(`${formation} garante superioridade interior para ${tactics.offensiveStyle}.`);
  } else if (
    formation === '4-4-2' &&
    (tactics.offensiveStyle === 'Cruzamentos' || tactics.offensiveStyle === 'Transições rápidas')
  ) {
    score += 6;
    strengths.push('Dupla de área no 4-4-2 maximiza cruzamentos e transições.');
  } else if (formation === '5-3-2' && tactics.offensiveStyle === 'Jogo pelas laterais') {
    score -= 7;
    warnings.push('5-3-2 sem pontas naturais perde força em Jogo pelas laterais.');
  } else if (formation === '5-3-2' && tactics.offensiveStyle === 'Posse de bola') {
    score -= 4;
    warnings.push('5-3-2 oferece poucas linhas de passe ofensivas para Posse prolongada.');
  }

  // 2. Coerência entre Pressão × Linha Defensiva (sem deixar buraco entre linhas)
  if (tactics.pressing === 'Pressão alta' && tactics.defensiveLine === 'Recuada') {
    score -= 16;
    warnings.push('Conflito grave: Pressão alta com Linha Recuada abre enorme espaço no meio!');
  } else if (tactics.pressing === 'Pressão baixa' && tactics.defensiveLine === 'Adiantada') {
    score -= 15;
    warnings.push('Conflito grave: Pressão baixa com Linha Adiantada deixa bolas livres nas costas.');
  } else if (
    (tactics.pressing === 'Pressão alta' || tactics.pressing === 'Pressão após perda') &&
    tactics.defensiveLine === 'Adiantada'
  ) {
    score += 6;
    strengths.push('Bloco compacto e coordenado no campo rival para sufocar a saída.');
  } else if (tactics.pressing === 'Pressão baixa' && tactics.defensiveLine === 'Recuada') {
    score += 6;
    strengths.push('Bloco baixo extremamente compacto protegendo a entrada da área.');
  }

  // 3. Mentalidade × Instruções
  if (
    mentality === 'Retranca' &&
    (tactics.pressing === 'Pressão alta' || tactics.defensiveLine === 'Adiantada')
  ) {
    score -= 14;
    warnings.push('Mentalidade Retranca conflita com pressão ou linha defensiva alta.');
  } else if (
    (mentality === 'Ofensiva' || mentality === 'Tudo ou Nada') &&
    tactics.pressing === 'Pressão baixa' &&
    tactics.defensiveLine === 'Recuada'
  ) {
    score -= 11;
    warnings.push('Postura ofensiva perde força se o time recua toda a marcação.');
  } else if (mentality === 'Tudo ou Nada' && tactics.intensity === 'Baixa') {
    score -= 12;
    warnings.push('Tudo ou Nada exige intensidade Normal ou Alta para funcionar.');
  } else if (mentality === 'Retranca' && tactics.intensity === 'Alta') {
    score -= 6;
    warnings.push('Intensidade Alta em Retranca desgasta o time sem propor jogo.');
  } else if (
    mentality === 'Contra-Ataque' &&
    (tactics.buildUpStyle === 'Contra-ataques rápidos' ||
      tactics.offensiveStyle === 'Transições rápidas')
  ) {
    score += 5;
    strengths.push('Transições velozes perfeitamente alinhadas com a postura de Contra-Ataque.');
  }

  // 4. Construção × Estilo Ofensivo
  if (
    tactics.buildUpStyle === 'Saída curta' &&
    (tactics.offensiveStyle === 'Posse de bola' || tactics.offensiveStyle === 'Ataque pelo meio')
  ) {
    score += 4;
  } else if (
    tactics.buildUpStyle === 'Contra-ataques rápidos' &&
    tactics.offensiveStyle === 'Posse de bola'
  ) {
    score -= 6;
    warnings.push('Contra-ataques rápidos conflita com ritmo paciente de Posse de bola.');
  }

  // 5. Compatibilidade com os atributos reais dos titulares
  if (starters && starters.length >= 11) {
    const attrsList = starters.map((p) => ({
      role: p.slotRole ?? p.position,
      ovr: p.overall,
      a: ensurePlayerAttributes(p),
    }));

    const cbs = attrsList.filter((x) => x.role === 'ZAG');
    const mids = attrsList.filter((x) => x.role === 'VOL' || x.role === 'MC' || x.role === 'MEI');
    const attackers = attrsList.filter((x) => x.role === 'CA' || x.role === 'PE' || x.role === 'PD');
    const strikers = attrsList.filter((x) => x.role === 'CA');

    const avg = (arr: number[], fb: number) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : fb;

    const avgCbPace = avg(cbs.map((x) => (x.a.velocidade + x.a.aceleracao) / 2), 73);
    const avgCbPass = avg(cbs.map((x) => x.a.passe), 70);
    const avgMidTech = avg(mids.map((x) => (x.a.passe + x.a.visao) / 2), 75);
    const avgAttPace = avg(attackers.map((x) => (x.a.velocidade + x.a.aceleracao) / 2), 76);
    const avgStaminaAttr = avg(
      attrsList.filter((x) => x.role !== 'GOL').map((x) => x.a.resistencia),
      74
    );
    const avgCaStrength = avg(strikers.map((x) => (x.a.forca + x.a.posicionamento) / 2), 75);

    if (tactics.defensiveLine === 'Adiantada') {
      if (avgCbPace < 69) {
        score -= 7;
        warnings.push(`Linha Adiantada arriscada: zaga lenta (vel. média ${Math.round(avgCbPace)}).`);
      } else if (avgCbPace >= 76) {
        score += 3;
      }
    }

    if (tactics.buildUpStyle === 'Saída curta') {
      if (avgCbPass < 66) {
        score -= 6;
        warnings.push(`Saída curta arriscada: defensores têm passe limitado (${Math.round(avgCbPass)}).`);
      } else if (avgMidTech >= 79) {
        score += 4;
        strengths.push('Meio técnico garante saída curta limpa sob pressão.');
      }
    }

    if (
      (tactics.pressing === 'Pressão alta' || tactics.intensity === 'Alta') &&
      avgStaminaAttr < 72
    ) {
      score -= 6;
      warnings.push('Elenco com baixa resistência sofrerá queda acentuada no 2º tempo.');
    }

    if (
      (tactics.buildUpStyle === 'Contra-ataques rápidos' ||
        tactics.offensiveStyle === 'Transições rápidas') &&
      avgAttPace >= 79
    ) {
      score += 4;
      strengths.push('Ataque veloz potencializa contragolpes em profundidade.');
    }

    if (tactics.offensiveStyle === 'Cruzamentos' && avgCaStrength < 73) {
      score -= 4;
      warnings.push('Cruzamentos perdem eficiência sem centroavante forte na área.');
    }
  }

  const clampedScore = Math.max(35, Math.min(100, Math.round(score)));
  const tone: 'emerald' | 'amber' | 'rose' =
    clampedScore >= 76 ? 'emerald' : clampedScore >= 58 ? 'amber' : 'rose';
  const label =
    clampedScore >= 86
      ? `Encaixe Elite (${clampedScore}%)`
      : clampedScore >= 76
      ? `Boa Sinergia (${clampedScore}%)`
      : clampedScore >= 58
      ? `Ajustável (${clampedScore}%)`
      : `Conflito Tático (${clampedScore}%)`;

  // Fator de coesão justo (boa sinergia dá fluidez real; conflito tático penaliza decisões)
  const cohesionMultiplier = Math.max(0.84, Math.min(1.07, 1.0 + (clampedScore - 72) * 0.0038));

  return {
    score: clampedScore,
    label,
    tone,
    strengths,
    warnings,
    cohesionMultiplier,
  };
}

export interface TacticalBehaviorProfile {
  tactics: ClubTactics;
  compatibility: TacticalCompatibilityReport;
  shortPassWeight: number;
  verticalPassWeight: number;
  longBallWeight: number;
  dribbleWeight: number;
  crossWeight: number;
  wingBias: number; // 0..1
  centralBias: number; // 0..1
  minPressAttZone: 1 | 2 | 3 | 4; // menor zona do atacante onde o defensor pressiona ativamente
  pressAggression: number; // 0.65..1.45
  lineHeight: -1 | 0 | 1;
  offsideTrapRate: number;
  behindLineExposure: number; // maior = mais vulnerável a lançamentos e contragolpes
  boxCompactness: number; // maior = bloqueia mais chutes e reduz qualidade da área
  tempo: number; // ritmo de ações / circulação vs verticalidade imediata
  staminaBurnRate: number;
  foulRiskMod: number;
  shootEagerness: number; // maior = finaliza antes com mais volume; menor = trabalha até boa chance
}

export function computeTacticalBehaviorProfile(
  club: Pick<Club, 'formation' | 'mentality' | 'tactics' | 'botPersonality'>,
  starters?: Array<Player & { slotRole?: PlayerPosition }>,
  redCardCount = 0
): TacticalBehaviorProfile {
  const tactics = getClubTactics(club);
  const compatibility = evaluateTacticalCompatibility({
    formation: club.formation,
    mentality: club.mentality,
    tactics,
    starters,
  });

  let shortPassWeight = 1.0;
  let verticalPassWeight = 1.0;
  let longBallWeight = 0.45;
  let dribbleWeight = 0.7;
  let crossWeight = 0.65;
  let wingBias = 0.48;
  let centralBias = 0.52;
  let tempo = 1.0;
  let shootEagerness = 1.0;

  // Estilo de Construção
  switch (tactics.buildUpStyle) {
    case 'Saída curta':
      shortPassWeight *= 1.44;
      verticalPassWeight *= 0.94;
      longBallWeight *= 0.45;
      tempo *= 0.96;
      break;
    case 'Ligações diretas':
      shortPassWeight *= 0.7;
      longBallWeight *= 1.85;
      verticalPassWeight *= 1.12;
      tempo *= 1.04;
      break;
    case 'Contra-ataques rápidos':
      shortPassWeight *= 0.78;
      verticalPassWeight *= 1.24;
      longBallWeight *= 1.25;
      dribbleWeight *= 1.12;
      tempo *= 1.07;
      break;
    case 'Equilibrada':
    default:
      break;
  }

  // Estilo Ofensivo
  switch (tactics.offensiveStyle) {
    case 'Posse de bola':
      shortPassWeight *= 1.28;
      verticalPassWeight *= 1.04;
      crossWeight *= 0.72;
      centralBias = 0.58;
      wingBias = 0.42;
      tempo *= 0.97;
      shootEagerness *= 1.02;
      break;
    case 'Jogo pelas laterais':
      wingBias = 0.72;
      centralBias = 0.28;
      crossWeight *= 1.38;
      dribbleWeight *= 1.22;
      break;
    case 'Ataque pelo meio':
      centralBias = 0.74;
      wingBias = 0.26;
      verticalPassWeight *= 1.3;
      crossWeight *= 0.55;
      break;
    case 'Cruzamentos':
      wingBias = 0.74;
      centralBias = 0.26;
      crossWeight *= 1.85;
      shootEagerness *= 1.03;
      break;
    case 'Transições rápidas':
      verticalPassWeight *= 1.16;
      dribbleWeight *= 1.12;
      shortPassWeight *= 0.9;
      tempo *= 1.05;
      shootEagerness *= 1.01;
      break;
  }

  // Influência da Formação na ocupação
  if (club.formation === '4-3-3' || club.formation === '3-4-3') {
    wingBias = Math.min(0.8, wingBias + 0.08);
    centralBias = 1 - wingBias;
    dribbleWeight *= 1.1;
  } else if (club.formation === '3-5-2' || club.formation === '4-2-3-1') {
    centralBias = Math.min(0.8, centralBias + 0.08);
    wingBias = 1 - centralBias;
    shortPassWeight *= 1.08;
  } else if (club.formation === '5-3-2') {
    wingBias = Math.max(0.24, wingBias - 0.08);
    centralBias = 1 - wingBias;
  }

  // Pressão (minPressAttZone: 1=pressiona saída no campo rival, 4=espera atrás do meio)
  let minPressAttZone: 1 | 2 | 3 | 4 = 3;
  let pressAggression = 1.0;
  let pressingDrainMult = 1.0;
  let foulRiskMod = 1.0;

  switch (tactics.pressing) {
    case 'Pressão baixa':
      minPressAttZone = 4;
      pressAggression = 0.84;
      pressingDrainMult = 0.92;
      foulRiskMod = 0.88;
      break;
    case 'Bloco médio':
      minPressAttZone = 3;
      pressAggression = 0.98;
      pressingDrainMult = 0.99;
      foulRiskMod = 0.96;
      break;
    case 'Pressão alta':
      minPressAttZone = 1;
      pressAggression = 1.26;
      pressingDrainMult = 1.13;
      foulRiskMod = 1.14;
      break;
    case 'Pressão após perda':
      minPressAttZone = 2;
      pressAggression = 1.18;
      pressingDrainMult = 1.09;
      foulRiskMod = 1.11;
      break;
  }

  // Linha Defensiva
  const lineHeight: -1 | 0 | 1 =
    tactics.defensiveLine === 'Adiantada'
      ? 1
      : tactics.defensiveLine === 'Recuada'
      ? -1
      : 0;

  let behindLineExposure = lineHeight === 1 ? 1.05 : lineHeight === -1 ? 0.96 : 1.0;
  let boxCompactness = lineHeight === -1 ? 1.03 : lineHeight === 1 ? 0.98 : 1.0;
  const offsideTrapRate = lineHeight === 1 ? 0.056 : lineHeight === 0 ? 0.032 : 0.016;

  if (tactics.pressing === 'Pressão alta') {
    behindLineExposure *= 1.02;
  } else if (tactics.pressing === 'Pressão baixa') {
    boxCompactness *= 1.02;
  }

  if (club.formation === '5-3-2') {
    boxCompactness *= 1.02;
  } else if (club.formation === '3-4-3') {
    behindLineExposure *= 1.02;
    boxCompactness *= 0.98;
  }

  // Intensidade
  let intensityDrainMult = 1.0;
  switch (tactics.intensity) {
    case 'Baixa':
      intensityDrainMult = 0.9;
      pressAggression *= 0.92;
      tempo *= 0.96;
      foulRiskMod *= 0.88;
      break;
    case 'Alta':
      intensityDrainMult = 1.13;
      pressAggression *= 1.12;
      tempo *= 1.05;
      foulRiskMod *= 1.13;
      break;
    case 'Normal':
    default:
      break;
  }

  // Mentalidade modula risco e postura
  let mentalityDrainMult = 1.0;
  switch (club.mentality) {
    case 'Retranca':
      boxCompactness *= 1.04;
      behindLineExposure *= 0.95;
      shootEagerness *= 0.82;
      tempo *= 0.95;
      mentalityDrainMult = 0.95;
      break;
    case 'Contra-Ataque':
      verticalPassWeight *= 1.08;
      boxCompactness *= 1.01;
      shootEagerness *= 0.96;
      mentalityDrainMult = 0.98;
      break;
    case 'Ofensiva':
      pressAggression *= 1.06;
      behindLineExposure *= 1.02;
      shootEagerness *= 1.06;
      mentalityDrainMult = 1.04;
      break;
    case 'Tudo ou Nada':
      pressAggression *= 1.12;
      behindLineExposure *= 1.05;
      boxCompactness *= 0.96;
      tempo *= 1.05;
      shootEagerness *= 1.12;
      mentalityDrainMult = 1.1;
      break;
    case 'Equilibrada':
    default:
      break;
  }

  // Impacto realista de jogar com 10 (expulsão)
  if (redCardCount > 0) {
    pressAggression *= redCardCount === 1 ? 0.82 : 0.65;
    shortPassWeight *= 0.9;
    tempo *= 0.92;
    intensityDrainMult *= 1.12; // restantes correm mais
  }

  const staminaBurnRate = Math.max(
    0.8,
    Math.min(1.36, pressingDrainMult * intensityDrainMult * mentalityDrainMult)
  );

  return {
    tactics,
    compatibility,
    shortPassWeight,
    verticalPassWeight,
    longBallWeight,
    dribbleWeight,
    crossWeight,
    wingBias,
    centralBias,
    minPressAttZone,
    pressAggression,
    lineHeight,
    offsideTrapRate,
    behindLineExposure,
    boxCompactness,
    tempo,
    staminaBurnRate,
    foulRiskMod,
    shootEagerness,
  };
}

export function getEffectiveStarters(club: Club, redCardedIds: string[] = []) {
  const slots = club.lineupSlots ?? [];
  const slotPlayers = slots
    .map((s) => {
      if (redCardedIds.includes(s.playerId)) return null;
      const p = club.squad.find((item) => item.id === s.playerId);
      if (!p) return null;
      const fit = getPositionFit(p, s.role);
      const effectiveOvr = getEffectivePlayerMatchOvr(p, s.role);
      return {
        ...p,
        effectiveOvr,
        slotRole: s.role,
        fitPenalty: fit.penalty,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (slotPlayers.length >= 9) return slotPlayers;

  return [...club.squad]
    .filter((p) => !redCardedIds.includes(p.id))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 11)
    .map((p) => ({
      ...p,
      effectiveOvr: getEffectivePlayerMatchOvr(p, p.position),
      slotRole: p.position,
      fitPenalty: 0,
    }));
}

export interface TacticalReadout {
  netAtkBonus: number;
  netDefBonus: number;
  midControlBonus: number;
  chanceBonus: number;
  finishingEdge: number;
  staminaDrainMult: number;
  ownAvgStamina: number;
  oppAvgStamina: number;
  compatibilityScore: number;
  compatibilityWarnings: string[];
  synergyLabel: string;
  synergyTone: 'emerald' | 'amber' | 'rose';
  headline: string;
  advice: string;
}

/** Compatível com evaluateFormationSynergy usada em ClubManagementView e UI tática */
export function evaluateFormationSynergy(
  formation: Formation,
  mentality: TacticalMentality,
  tactics?: ClubTactics,
  club?: Club
): { atkDelta: number; defDelta: number; label: string; tone: 'emerald' | 'amber' | 'rose'; score: number; warnings: string[] } {
  const effTactics = tactics ?? (club ? getClubTactics(club) : getClubTactics({ mentality, botPersonality: 'equilibrado' }));
  const starters = club ? getEffectiveStarters(club) : undefined;
  const report = evaluateTacticalCompatibility({
    formation,
    mentality,
    tactics: effTactics,
    starters,
  });

  const deltaBase = (report.score - 72) * 0.08;
  return {
    atkDelta: Math.round((mentality === 'Ofensiva' || mentality === 'Tudo ou Nada' ? deltaBase + 1 : deltaBase) * 10) / 10,
    defDelta: Math.round((mentality === 'Retranca' || mentality === 'Contra-Ataque' ? deltaBase + 1 : deltaBase) * 10) / 10,
    label: report.label,
    tone: report.tone,
    score: report.score,
    warnings: report.warnings,
  };
}

export function evaluateTacticalMatchup(ownClub: Club, oppClub: Club): TacticalReadout {
  const ownProfile = FORMATION_TACTICAL_PROFILE[ownClub.formation] ?? FORMATION_TACTICAL_PROFILE['4-3-3'];
  const oppProfile = FORMATION_TACTICAL_PROFILE[oppClub.formation] ?? FORMATION_TACTICAL_PROFILE['4-4-2'];

  const ownStarters = getEffectiveStarters(ownClub);
  const oppStarters = getEffectiveStarters(oppClub);
  const ownBehavior = computeTacticalBehaviorProfile(ownClub, ownStarters);
  const oppBehavior = computeTacticalBehaviorProfile(oppClub, oppStarters);

  const ownAvgStamina = ownStarters.length
    ? Math.round(ownStarters.reduce((s, p) => s + p.stamina, 0) / ownStarters.length)
    : 100;
  const oppAvgStamina = oppStarters.length
    ? Math.round(oppStarters.reduce((s, p) => s + p.stamina, 0) / oppStarters.length)
    : 100;

  const outOfPosPenaltyCount = ownStarters.filter((p) => p.fitPenalty < 0).length;
  const cohesionPenalty = outOfPosPenaltyCount * 0.95;

  // Duelos táticos entre formações e instruções
  const rawMidDiff = ownProfile.midControl - oppProfile.midControl;
  const styleMidBias =
    (ownBehavior.tactics.offensiveStyle === 'Posse de bola' ? 1.2 : 0) -
    (oppBehavior.tactics.offensiveStyle === 'Posse de bola' ? 1.2 : 0) +
    (ownBehavior.tactics.pressing === 'Pressão alta' ? 0.6 : 0);

  const midControlBonus =
    Math.round((rawMidDiff * 1.15 + styleMidBias - cohesionPenalty * 0.5) * 10) / 10;

  const flankAttackEdge =
    (ownBehavior.wingBias - 0.45) * 6 +
    (oppProfile.wingBackExposure - ownProfile.wingBackExposure) * 0.65;
  const counterExploitEdge =
    (ownBehavior.tactics.buildUpStyle === 'Contra-ataques rápidos' ||
      ownBehavior.tactics.offensiveStyle === 'Transições rápidas' ||
      ownClub.mentality === 'Contra-Ataque') &&
    oppBehavior.lineHeight === 1
      ? 2.8
      : 0;
  const pressVsShortBuildUp =
    ownBehavior.tactics.pressing === 'Pressão alta' &&
    oppBehavior.tactics.buildUpStyle === 'Saída curta'
      ? 1.8
      : 0;

  const compatBonus = (ownBehavior.compatibility.score - 70) * 0.12;
  let atkBonus =
    compatBonus +
    flankAttackEdge * 0.45 +
    counterExploitEdge +
    pressVsShortBuildUp +
    (ownClub.mentality === 'Ofensiva' ? 1.8 : ownClub.mentality === 'Tudo ou Nada' ? 3.2 : ownClub.mentality === 'Retranca' ? -2.0 : 0) -
    cohesionPenalty;

  let defBonus =
    compatBonus * 0.9 +
    (ownBehavior.boxCompactness - 1) * 8 +
    (ownProfile.centralShield - oppProfile.centralBoxPresence) * 0.55 -
    (ownClub.mentality === 'Ofensiva' ? 1.4 : ownClub.mentality === 'Tudo ou Nada' ? 3.2 : 0) -
    cohesionPenalty;

  let fatigueWarning = false;
  if (
    ownAvgStamina < 58 &&
    (ownBehavior.tactics.intensity === 'Alta' || ownBehavior.tactics.pressing === 'Pressão alta')
  ) {
    atkBonus -= 2.0;
    defBonus -= 3.2;
    fatigueWarning = true;
  }

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
  const chanceBonus = (ownCreator - oppMid) * 0.006 + midControlBonus * 0.012;

  const ownFinisher = avgRole(ownStarters, ['CA', 'PE', 'PD'], ownTeamAvg);
  const oppGol = avgRole(oppStarters, ['GOL'], oppTeamAvg);
  const oppZags = oppStarters
    .filter((p) => p.slotRole === 'ZAG')
    .sort((a, b) => b.effectiveOvr - a.effectiveOvr);
  const oppBestZag = oppZags[0]?.effectiveOvr ?? oppTeamAvg;
  const oppWall = oppGol * 0.55 + oppBestZag * 0.45;
  const finishingEdge = (ownFinisher - oppWall) * 0.008;

  let headline = `Duelo equilibrado (${ownClub.formation} vs ${oppClub.formation})`;
  if (counterExploitEdge >= 2.0) {
    headline = `Contra-ataque letal contra linha ${oppBehavior.tactics.defensiveLine} rival`;
  } else if (flankAttackEdge >= 2.0) {
    headline = `Vantagem pelos corredores (${ownBehavior.tactics.offensiveStyle})`;
  } else if (midControlBonus >= 2.0) {
    headline = `Controle do meio-campo (${ownClub.formation} supera ${oppClub.formation})`;
  } else if (midControlBonus <= -2.0) {
    headline = `Inferioridade no meio contra ${oppClub.formation} (${oppBehavior.tactics.offensiveStyle})`;
  }

  let advice = ownBehavior.compatibility.strengths[0] ?? ownProfile.strengths;
  if (fatigueWarning) {
    advice = `Desgaste crítico (${ownAvgStamina}%): faça substituições ou reduza Intensidade/Pressão!`;
  } else if (ownBehavior.compatibility.warnings.length > 0) {
    advice = ownBehavior.compatibility.warnings[0];
  } else if (outOfPosPenaltyCount >= 2) {
    advice = `${outOfPosPenaltyCount} titulares improvisados — ajuste a escalação para recuperar entrosamento.`;
  } else if (oppBehavior.lineHeight === 1 && ownBehavior.tactics.buildUpStyle === 'Saída curta') {
    advice = `Rival marca em Linha Adiantada: considere Ligações diretas ou Contra-ataques para ferir as costas!`;
  }

  return {
    netAtkBonus: Math.round(atkBonus * 10) / 10,
    netDefBonus: Math.round(defBonus * 10) / 10,
    midControlBonus,
    chanceBonus,
    finishingEdge,
    staminaDrainMult: ownBehavior.staminaBurnRate,
    ownAvgStamina,
    oppAvgStamina,
    compatibilityScore: ownBehavior.compatibility.score,
    compatibilityWarnings: ownBehavior.compatibility.warnings,
    synergyLabel: fatigueWarning ? 'Queda Física na Pressão' : ownBehavior.compatibility.label,
    synergyTone: fatigueWarning ? 'rose' : ownBehavior.compatibility.tone,
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

  const finishers = effective.filter(
    (p) => p.slotRole === 'CA' || p.slotRole === 'PE' || p.slotRole === 'PD'
  );
  const creators = effective.filter(
    (p) => p.slotRole === 'VOL' || p.slotRole === 'MC' || p.slotRole === 'MEI'
  );
  const defenders = effective.filter(
    (p) => p.slotRole === 'ZAG' || p.slotRole === 'LD' || p.slotRole === 'LE'
  );
  const keeper = effective.find((p) => p.slotRole === 'GOL');

  const rawAtk = finishers.length
    ? avg(finishers, baseOverall - 2) * 0.8 +
      avg(creators.filter((p) => p.slotRole === 'MEI'), baseOverall - 2) * 0.2
    : baseOverall - 2;
  const rawMid = creators.length ? avg(creators, baseOverall) : baseOverall;
  const rawDef =
    keeper && defenders.length
      ? keeper.effectiveOvr * 0.3 + avg(defenders, baseOverall - 1) * 0.7
      : avg([...defenders, ...(keeper ? [keeper] : [])], baseOverall - 1);

  return {
    overall: Math.max(45, Math.round(baseOverall - cohesionMod)),
    attack: Math.max(45, Math.round(rawAtk - cohesionMod * 0.5)),
    midfield: Math.max(45, Math.round(rawMid - cohesionMod * 0.5)),
    defense: Math.max(45, Math.round(rawDef - cohesionMod * 0.5)),
  };
}
