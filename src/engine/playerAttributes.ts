import { Player, PlayerAttributes, PlayerPosition } from '../types/league';

export type AttributeKey = keyof PlayerAttributes;

export const ATTRIBUTE_KEYS: AttributeKey[] = [
  'passe',
  'visao',
  'finalizacao',
  'drible',
  'velocidade',
  'aceleracao',
  'forca',
  'resistencia',
  'marcacao',
  'desarme',
  'posicionamento',
  'reflexos',
];

export const PHYSICAL_ATTRIBUTES = new Set<AttributeKey>([
  'velocidade',
  'aceleracao',
  'forca',
  'resistencia',
]);

export const PLAYER_ATTRIBUTE_GROUPS: Array<{
  title: string;
  accent: string;
  items: Array<{ key: AttributeKey; label: string; gkLabel?: string }>;
}> = [
  {
    title: 'Técnica & Criação',
    accent: 'text-emerald-400',
    items: [
      { key: 'passe', label: 'Passe', gkLabel: 'Reposição' },
      { key: 'visao', label: 'Visão de Jogo' },
      { key: 'finalizacao', label: 'Finalização' },
      { key: 'drible', label: 'Drible' },
    ],
  },
  {
    title: 'Físico & Ritmo',
    accent: 'text-sky-400',
    items: [
      { key: 'velocidade', label: 'Velocidade' },
      { key: 'aceleracao', label: 'Aceleração' },
      { key: 'forca', label: 'Força Física' },
      { key: 'resistencia', label: 'Resistência' },
    ],
  },
  {
    title: 'Defesa, Tática & Meta',
    accent: 'text-amber-300',
    items: [
      { key: 'marcacao', label: 'Marcação' },
      { key: 'desarme', label: 'Desarme' },
      { key: 'posicionamento', label: 'Posicionamento' },
      { key: 'reflexos', label: 'Reflexos', gkLabel: 'Reflexos (GOL)' },
    ],
  },
];

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
  player: Pick<Player, 'position' | 'secondaryPositions' | 'ambidextrous' | 'overall'>,
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

/** Pesos reais por posição — cada mapa soma exatamente 1.00 */
export const POSITION_OVR_WEIGHTS: Record<PlayerPosition, Record<AttributeKey, number>> = {
  GOL: {
    passe: 0.08,
    visao: 0.05,
    finalizacao: 0,
    drible: 0,
    velocidade: 0.03,
    aceleracao: 0.02,
    forca: 0.08,
    resistencia: 0.02,
    marcacao: 0,
    desarme: 0,
    posicionamento: 0.28,
    reflexos: 0.44,
  },
  ZAG: {
    passe: 0.07,
    visao: 0,
    finalizacao: 0,
    drible: 0,
    velocidade: 0.05,
    aceleracao: 0.03,
    forca: 0.15,
    resistencia: 0.04,
    marcacao: 0.25,
    desarme: 0.23,
    posicionamento: 0.18,
    reflexos: 0,
  },
  LD: {
    passe: 0.12,
    visao: 0,
    finalizacao: 0,
    drible: 0.05,
    velocidade: 0.16,
    aceleracao: 0.14,
    forca: 0.03,
    resistencia: 0.14,
    marcacao: 0.14,
    desarme: 0.14,
    posicionamento: 0.08,
    reflexos: 0,
  },
  LE: {
    passe: 0.12,
    visao: 0,
    finalizacao: 0,
    drible: 0.05,
    velocidade: 0.16,
    aceleracao: 0.14,
    forca: 0.03,
    resistencia: 0.14,
    marcacao: 0.14,
    desarme: 0.14,
    posicionamento: 0.08,
    reflexos: 0,
  },
  VOL: {
    passe: 0.15,
    visao: 0.07,
    finalizacao: 0,
    drible: 0,
    velocidade: 0.03,
    aceleracao: 0,
    forca: 0.1,
    resistencia: 0.12,
    marcacao: 0.18,
    desarme: 0.2,
    posicionamento: 0.15,
    reflexos: 0,
  },
  MC: {
    passe: 0.22,
    visao: 0.18,
    finalizacao: 0.05,
    drible: 0.1,
    velocidade: 0.04,
    aceleracao: 0,
    forca: 0,
    resistencia: 0.14,
    marcacao: 0.06,
    desarme: 0.09,
    posicionamento: 0.12,
    reflexos: 0,
  },
  MEI: {
    passe: 0.22,
    visao: 0.24,
    finalizacao: 0.14,
    drible: 0.18,
    velocidade: 0.04,
    aceleracao: 0.06,
    forca: 0,
    resistencia: 0.02,
    marcacao: 0,
    desarme: 0,
    posicionamento: 0.1,
    reflexos: 0,
  },
  PE: {
    passe: 0.12,
    visao: 0.05,
    finalizacao: 0.15,
    drible: 0.2,
    velocidade: 0.18,
    aceleracao: 0.18,
    forca: 0,
    resistencia: 0.03,
    marcacao: 0,
    desarme: 0,
    posicionamento: 0.09,
    reflexos: 0,
  },
  PD: {
    passe: 0.12,
    visao: 0.05,
    finalizacao: 0.15,
    drible: 0.2,
    velocidade: 0.18,
    aceleracao: 0.18,
    forca: 0,
    resistencia: 0.03,
    marcacao: 0,
    desarme: 0,
    posicionamento: 0.09,
    reflexos: 0,
  },
  CA: {
    passe: 0.06,
    visao: 0,
    finalizacao: 0.3,
    drible: 0.08,
    velocidade: 0.11,
    aceleracao: 0.09,
    forca: 0.13,
    resistencia: 0.03,
    marcacao: 0,
    desarme: 0,
    posicionamento: 0.2,
    reflexos: 0,
  },
};

/** Deslocamentos médios por posição (relativos ao OVR alvo) para perfis realistas */
const POSITION_BASE_OFFSETS: Record<PlayerPosition, PlayerAttributes> = {
  GOL: {
    passe: -12,
    visao: -14,
    finalizacao: -46,
    drible: -40,
    velocidade: -24,
    aceleracao: -22,
    forca: -4,
    resistencia: -6,
    marcacao: -42,
    desarme: -44,
    posicionamento: 1,
    reflexos: 4,
  },
  ZAG: {
    passe: -8,
    visao: -15,
    finalizacao: -28,
    drible: -20,
    velocidade: -5,
    aceleracao: -7,
    forca: 5,
    resistencia: -1,
    marcacao: 4,
    desarme: 3,
    posicionamento: 2,
    reflexos: -48,
  },
  LD: {
    passe: -1,
    visao: -7,
    finalizacao: -16,
    drible: -3,
    velocidade: 4,
    aceleracao: 4,
    forca: -4,
    resistencia: 4,
    marcacao: -1,
    desarme: 0,
    posicionamento: -3,
    reflexos: -48,
  },
  LE: {
    passe: -1,
    visao: -7,
    finalizacao: -16,
    drible: -3,
    velocidade: 4,
    aceleracao: 4,
    forca: -4,
    resistencia: 4,
    marcacao: -1,
    desarme: 0,
    posicionamento: -3,
    reflexos: -48,
  },
  VOL: {
    passe: 1,
    visao: -2,
    finalizacao: -15,
    drible: -6,
    velocidade: -6,
    aceleracao: -6,
    forca: 3,
    resistencia: 5,
    marcacao: 3,
    desarme: 4,
    posicionamento: 2,
    reflexos: -48,
  },
  MC: {
    passe: 4,
    visao: 3,
    finalizacao: -6,
    drible: 1,
    velocidade: -4,
    aceleracao: -4,
    forca: -4,
    resistencia: 4,
    marcacao: -5,
    desarme: -4,
    posicionamento: 1,
    reflexos: -48,
  },
  MEI: {
    passe: 4,
    visao: 5,
    finalizacao: -1,
    drible: 4,
    velocidade: -3,
    aceleracao: -1,
    forca: -10,
    resistencia: -3,
    marcacao: -22,
    desarme: -24,
    posicionamento: 2,
    reflexos: -48,
  },
  PE: {
    passe: -2,
    visao: -3,
    finalizacao: -1,
    drible: 4,
    velocidade: 5,
    aceleracao: 6,
    forca: -10,
    resistencia: -1,
    marcacao: -26,
    desarme: -28,
    posicionamento: -2,
    reflexos: -48,
  },
  PD: {
    passe: -2,
    visao: -3,
    finalizacao: -1,
    drible: 4,
    velocidade: 5,
    aceleracao: 6,
    forca: -10,
    resistencia: -1,
    marcacao: -26,
    desarme: -28,
    posicionamento: -2,
    reflexos: -48,
  },
  CA: {
    passe: -9,
    visao: -8,
    finalizacao: 5,
    drible: -4,
    velocidade: 0,
    aceleracao: -1,
    forca: 2,
    resistencia: -4,
    marcacao: -32,
    desarme: -34,
    posicionamento: 3,
    reflexos: -48,
  },
};

/** Perfis especiais para craques mundiais e destaques do Brasileirão */
const CURATED_PLAYER_PROFILES: Record<string, Partial<PlayerAttributes>> = {
  'Kylian Mbappé': { velocidade: 7, aceleracao: 7, drible: 3, finalizacao: 2, posicionamento: 2, forca: -4, passe: -4 },
  'Erling Haaland': { finalizacao: 6, forca: 6, posicionamento: 4, velocidade: 3, aceleracao: -1, drible: -8, passe: -10 },
  'Vinícius Júnior': { velocidade: 6, aceleracao: 6, drible: 6, finalizacao: -3, forca: -7 },
  'Jude Bellingham': { visao: 2, resistencia: 5, forca: 4, finalizacao: 1, posicionamento: 3, desarme: 8 },
  'Rodri Hernández': { passe: 5, visao: 4, posicionamento: 5, desarme: 4, marcacao: 3, forca: 3, velocidade: -10, aceleracao: -11 },
  'Lamine Yamal': { drible: 6, visao: 5, passe: 3, aceleracao: 3, forca: -14 },
  'Mohamed Salah': { finalizacao: 4, posicionamento: 4, velocidade: 2, aceleracao: 3, drible: 2, resistencia: 3 },
  'Alisson Becker': { reflexos: 3, posicionamento: 3, passe: 4, forca: 2 },
  'Thibaut Courtois': { reflexos: 4, posicionamento: 3, forca: 4, passe: -4 },
  'Ederson Moraes': { passe: 14, visao: 12, reflexos: 0, posicionamento: 1 },
  'Harry Kane': { finalizacao: 7, visao: 10, passe: 8, posicionamento: 5, velocidade: -9, aceleracao: -10 },
  'Virgil van Dijk': { forca: 7, marcacao: 5, posicionamento: 5, desarme: 3, passe: 4, velocidade: -2 },
  'Federico Valverde': { resistencia: 7, velocidade: 5, forca: 3, desarme: 4, passe: 2 },
  'Pedri González': { passe: 6, visao: 7, drible: 5, posicionamento: 3, forca: -8 },
  'Achraf Hakimi': { velocidade: 8, aceleracao: 7, resistencia: 5, passe: 1, marcacao: -5 },
  'Alphonso Davies': { velocidade: 9, aceleracao: 8, drible: 4, marcacao: -6 },
  'Giorgian de Arrascaeta': { visao: 7, passe: 6, drible: 5, finalizacao: 2, velocidade: -6, forca: -6 },
  'Lucas Paquetá': { visao: 4, passe: 4, drible: 4, desarme: 10, resistencia: 3 },
  'Pedro': { finalizacao: 6, posicionamento: 5, forca: 4, passe: 3, velocidade: -8, aceleracao: -8 },
  'Léo Ortiz': { passe: 8, visao: 10, posicionamento: 3, marcacao: 2, desarme: 2 },
  'Agustín Rossi': { reflexos: 4, posicionamento: 2, passe: 2 },
  'Bruno Henrique': { velocidade: 6, aceleracao: 5, forca: 1, finalizacao: 1, passe: -4 },
  'Gustavo Gómez': { marcacao: 5, forca: 6, desarme: 4, posicionamento: 4, velocidade: -4 },
  'Raphael Veiga': { finalizacao: 5, passe: 4, visao: 4, posicionamento: 3, velocidade: -5 },
  'Jhon Arias': { velocidade: 4, aceleracao: 4, resistencia: 6, drible: 3, passe: 2 },
  'Vitor Roque': { aceleracao: 6, velocidade: 5, forca: 4, finalizacao: 2, passe: -5 },
  'Estêvão Willian': { drible: 6, aceleracao: 5, velocidade: 4, visao: 3, forca: -10 },
  'Endrick Felipe': { finalizacao: 4, aceleracao: 6, forca: 4, velocidade: 5 },
  'Alan Patrick': { visao: 7, passe: 6, finalizacao: 3, drible: 3, velocidade: -7 },
  'Rodrigo Garro': { visao: 7, passe: 6, finalizacao: 4, drible: 3, forca: -6 },
  'Memphis Depay': { drible: 4, finalizacao: 3, forca: 4, passe: 4, visao: 5 },
  'Yuri Alberto': { velocidade: 4, aceleracao: 4, finalizacao: 3, forca: 2 },
  'Lucas Moura': { drible: 5, aceleracao: 4, velocidade: 3, visao: 3 },
  'Jonathan Calleri': { forca: 7, posicionamento: 5, finalizacao: 3, velocidade: -6 },
  'Gerson': { passe: 4, drible: 5, forca: 6, visao: 3, resistencia: 4 },
  'Matheus Pereira': { visao: 7, passe: 6, drible: 5, finalizacao: 2 },
  'Hulk': { forca: 10, finalizacao: 7, passe: 4, velocidade: -2 },
  'Gustavo Scarpa': { passe: 7, visao: 6, finalizacao: 2 },
  'Weverton': { reflexos: 3, posicionamento: 4 },
  'Cássio': { reflexos: 4, posicionamento: 3, velocidade: -12 },
  'Hugo Souza': { reflexos: 5, forca: 3, passe: -4 },
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function deterministicHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function calculateOverallFromAttributes(
  attrs: PlayerAttributes,
  position: PlayerPosition
): number {
  const weights = POSITION_OVR_WEIGHTS[position];
  let sum = 0;
  for (const key of ATTRIBUTE_KEYS) {
    sum += (attrs[key] ?? 65) * weights[key];
  }
  return clamp(sum, 45, 99);
}

function getAttrBounds(position: PlayerPosition, key: AttributeKey): [number, number] {
  if (position === 'GOL') {
    if (key === 'reflexos' || key === 'posicionamento') return [52, 99];
    if (key === 'forca' || key === 'resistencia' || key === 'passe' || key === 'visao') {
      return [42, 92];
    }
    return [18, 56];
  }
  if (key === 'reflexos') {
    return [18, 38];
  }
  return [34, 99];
}

export function generatePlayerAttributes(input: {
  name: string;
  position: PlayerPosition;
  secondaryPositions?: PlayerPosition[];
  overall: number;
  age: number;
  ambidextrous?: boolean;
}): PlayerAttributes {
  const { name, position, secondaryPositions = [], overall, age, ambidextrous } = input;
  const targetOvr = clamp(overall, 45, 99);
  const baseOffsets = POSITION_BASE_OFFSETS[position];
  const curated = CURATED_PLAYER_PROFILES[name];
  const weights = POSITION_OVR_WEIGHTS[position];

  const attrs = {} as PlayerAttributes;
  for (let idx = 0; idx < ATTRIBUTE_KEYS.length; idx++) {
    const key = ATTRIBUTE_KEYS[idx];
    const [minB, maxB] = getAttrBounds(position, key);
    const seed = deterministicHash(`${name}:${key}:${position}`);
    const jitter = (seed % 5) - 2; // -2..+2 determinístico

    let ageMod = 0;
    if (age <= 22) {
      if (key === 'aceleracao' || key === 'velocidade') ageMod += 2;
      if (key === 'posicionamento' || key === 'visao') ageMod -= 1;
    } else if (age >= 33) {
      if (key === 'velocidade' || key === 'aceleracao') ageMod -= Math.min(8, (age - 31) * 2);
      if (key === 'resistencia') ageMod -= Math.min(7, age - 31);
      if (key === 'posicionamento' || key === 'visao') ageMod += 2;
    }

    // Posição secundária refina habilidades complementares
    let secMod = 0;
    if (secondaryPositions.includes('CA') && (key === 'finalizacao' || key === 'posicionamento')) {
      secMod += 2;
    }
    if (
      (secondaryPositions.includes('MEI') || secondaryPositions.includes('MC')) &&
      (key === 'passe' || key === 'visao')
    ) {
      secMod += 2;
    }
    if (
      (secondaryPositions.includes('ZAG') || secondaryPositions.includes('VOL')) &&
      (key === 'marcacao' || key === 'desarme')
    ) {
      secMod += 3;
    }
    if (ambidextrous && (key === 'drible' || key === 'passe')) {
      secMod += 1;
    }

    const curatedMod = curated?.[key] ?? 0;
    const raw = targetOvr + baseOffsets[key] + curatedMod + ageMod + secMod + jitter;
    attrs[key] = clamp(raw, minB, maxB);
  }

  // Loop fino de convergência para que calculateOverallFromAttributes(attrs, position) === targetOvr
  const weightedKeys = ATTRIBUTE_KEYS.filter((k) => weights[k] > 0).sort(
    (a, b) => weights[b] - weights[a]
  );

  for (let iter = 0; iter < 90; iter++) {
    const curOvr = calculateOverallFromAttributes(attrs, position);
    const diff = targetOvr - curOvr;
    if (diff === 0) break;

    const dir = diff > 0 ? 1 : -1;
    let moved = false;
    const startIdx = iter % weightedKeys.length;
    for (let step = 0; step < weightedKeys.length; step++) {
      const k = weightedKeys[(startIdx + step) % weightedKeys.length];
      const [minB, maxB] = getAttrBounds(position, k);
      const nextVal = attrs[k] + dir;
      if (nextVal >= minB && nextVal <= maxB) {
        attrs[k] = nextVal;
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }

  return attrs;
}

export function ensurePlayerAttributes(player: Player): PlayerAttributes {
  const a = player.attributes;
  if (
    a &&
    typeof a.passe === 'number' &&
    typeof a.visao === 'number' &&
    typeof a.finalizacao === 'number' &&
    typeof a.drible === 'number' &&
    typeof a.velocidade === 'number' &&
    typeof a.aceleracao === 'number' &&
    typeof a.forca === 'number' &&
    typeof a.resistencia === 'number' &&
    typeof a.marcacao === 'number' &&
    typeof a.desarme === 'number' &&
    typeof a.posicionamento === 'number' &&
    typeof a.reflexos === 'number'
  ) {
    return a;
  }
  return generatePlayerAttributes({
    name: player.name,
    position: player.position,
    secondaryPositions: player.secondaryPositions,
    overall: player.overall,
    age: player.age,
    ambidextrous: player.ambidextrous,
  });
}

/** Evolução/Desevolução anual baseada nos 12 atributos reais, recalculando OVR ao final */
export function evolvePlayerAttributesForSeason(
  player: Player,
  seasonContrib: { goals: number; assists: number; isStarter: boolean }
): { attributes: PlayerAttributes; overall: number } {
  const baseAttrs = { ...ensurePlayerAttributes(player) };
  const nextAge = player.age + 1;
  const contrib = (seasonContrib.goals ?? 0) + (seasonContrib.assists ?? 0);
  const perfScore =
    contrib >= 20
      ? 2
      : contrib >= 11
      ? 1
      : seasonContrib.isStarter && player.position !== 'GOL' && contrib === 0 && nextAge >= 28
      ? -1
      : 0;

  const weights = POSITION_OVR_WEIGHTS[player.position];

  for (const key of ATTRIBUTE_KEYS) {
    const [minB, maxB] = getAttrBounds(player.position, key);
    const isImportant = weights[key] >= 0.08;
    const isPhysical = PHYSICAL_ATTRIBUTES.has(key);

    let delta = 0;
    if (nextAge <= 23) {
      if (isImportant || isPhysical) {
        delta = Math.random() < 0.65 ? 2 : 1;
      } else {
        delta = Math.random() < 0.45 ? 1 : 0;
      }
      delta += Math.max(0, perfScore);
    } else if (nextAge <= 28) {
      if (perfScore > 0 && isImportant) {
        delta = Math.random() < 0.7 ? perfScore : 1;
      } else if (perfScore < 0 && isImportant) {
        delta = Math.random() < 0.5 ? -1 : 0;
      } else if (key === 'posicionamento' || key === 'visao') {
        delta = Math.random() < 0.35 ? 1 : 0;
      }
    } else if (nextAge <= 32) {
      if (isPhysical && key !== 'forca') {
        delta = Math.random() < 0.6 ? -1 : 0;
      } else if (perfScore > 0 && (key === 'posicionamento' || key === 'visao' || key === 'finalizacao' || key === 'reflexos')) {
        delta = Math.random() < 0.5 ? 1 : 0;
      } else if (perfScore < 0 && isImportant) {
        delta = -1;
      }
    } else {
      // Veterano >= 33
      if (key === 'velocidade' || key === 'aceleracao' || key === 'resistencia') {
        delta = nextAge >= 35 ? -2 : -1;
      } else if (isImportant && key !== 'posicionamento' && key !== 'visao') {
        delta = Math.random() < 0.55 ? -1 : 0;
      }
    }

    delta = Math.max(-3, Math.min(3, delta));
    baseAttrs[key] = clamp(baseAttrs[key] + delta, minB, maxB);
  }

  const nextOvr = Math.min(99, Math.max(65, calculateOverallFromAttributes(baseAttrs, player.position)));
  return {
    attributes: baseAttrs,
    overall: nextOvr,
  };
}

/**
 * Avaliação combinada de OVR (42% qualidade geral) + Atributo especialista (58% especialidade),
 * ajustada por encaixe posicional e fadiga progressiva (stamina + resistencia).
 */
export function getEffectiveMatchAttribute(
  player: Player,
  attrKey: AttributeKey,
  slotRole: PlayerPosition,
  options?: { isPressing?: boolean }
): number {
  const attrs = ensurePlayerAttributes(player);
  const fit = getPositionFit(player, slotRole);
  const rawAttr = attrs[attrKey];
  const ovrAnchor = player.overall;

  // Combinação equilibrada: OVR ancora a consistência global sem anular especialidades individuais
  const blended = ovrAnchor * 0.42 + rawAttr * 0.58 + fit.penalty * 0.85;

  // Desgaste progressivo amortecido pela resistência individual
  const stamina = Math.max(10, Math.min(100, player.stamina ?? 100));
  const staminaShield = Math.max(0.65, Math.min(1.25, 0.8 + (attrs.resistencia - 70) * 0.01));
  const isPhys = PHYSICAL_ATTRIBUTES.has(attrKey) || Boolean(options?.isPressing);

  let fatiguePenaltyPct = 0;
  if (stamina < 78) {
    const deficit = 78 - stamina;
    if (stamina >= 55) {
      fatiguePenaltyPct = (deficit / 23) * (isPhys ? 0.1 : 0.05);
    } else {
      const deepDeficit = 55 - stamina;
      fatiguePenaltyPct =
        (isPhys ? 0.1 : 0.05) + (deepDeficit / 45) * (isPhys ? 0.22 : 0.13);
    }
    fatiguePenaltyPct /= staminaShield;
  }

  return Math.max(32, Math.min(99, blended * (1 - fatiguePenaltyPct)));
}

export function getEffectivePlayerMatchOvr(player: Player, slotRole: PlayerPosition): number {
  const fit = getPositionFit(player, slotRole);
  const attrs = ensurePlayerAttributes(player);
  const stamina = Math.max(10, Math.min(100, player.stamina ?? 100));
  const resistFactor = Math.max(0.7, 1 - (attrs.resistencia - 75) * 0.008);
  const fatigueDrop =
    stamina < 76
      ? (stamina < 55
          ? 2.6 + ((55 - stamina) / 45) * 7.5
          : ((76 - stamina) / 21) * 2.6) * resistFactor
      : 0;
  return Math.max(38, Math.round(fit.effectiveOvr - fatigueDrop));
}
