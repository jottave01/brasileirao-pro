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
  PlayStyle,
  PressingStyle,
  TacticalIntensity,
  TacticalMentality,
  TacticalPosture,
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

export interface FormationOptionMeta {
  id: Formation;
  label: string;
  tag?: string;
}

export const FORMATION_OPTIONS: FormationOptionMeta[] = [
  { id: '4-4-2', label: '4-4-2' },
  { id: '4-3-3', label: '4-3-3' },
  { id: '3-5-2', label: '3-5-2' },
  { id: '3-4-3', label: '3-4-3' },
  { id: '5-4-1', label: '5-4-1', tag: 'Retranca' },
  { id: '4-2-4', label: '4-2-4', tag: 'Tudo ou nada' },
  { id: '4-2-3-1', label: '4-2-3-1' },
  { id: '4-1-4-1', label: '4-1-4-1' },
  { id: '4-3-1-2', label: '4-3-1-2' },
  { id: '4-4-2 losango', label: '4-4-2 losango' },
  { id: '5-3-2', label: '5-3-2', tag: 'Retranca' },
  { id: '3-4-2-1', label: '3-4-2-1' },
];

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
  '5-4-1': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 12, pitchY: 67 },
    { role: 'ZAG', label: 'ZAG', pitchX: 31, pitchY: 74 },
    { role: 'ZAG', label: 'ZAG', pitchX: 50, pitchY: 75 },
    { role: 'ZAG', label: 'ZAG', pitchX: 69, pitchY: 74 },
    { role: 'LD', label: 'LD', pitchX: 88, pitchY: 67 },
    { role: 'PE', label: 'ME', pitchX: 17, pitchY: 47 },
    { role: 'VOL', label: 'VOL', pitchX: 39, pitchY: 52 },
    { role: 'MC', label: 'MC', pitchX: 61, pitchY: 52 },
    { role: 'PD', label: 'MD', pitchX: 83, pitchY: 47 },
    { role: 'CA', label: 'CA', pitchX: 50, pitchY: 18 },
  ],
  '4-2-4': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 15, pitchY: 71 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 74 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 74 },
    { role: 'LD', label: 'LD', pitchX: 85, pitchY: 71 },
    { role: 'VOL', label: 'VOL', pitchX: 36, pitchY: 50 },
    { role: 'MC', label: 'MC', pitchX: 64, pitchY: 50 },
    { role: 'PE', label: 'PE', pitchX: 15, pitchY: 22 },
    { role: 'CA', label: 'CA', pitchX: 38, pitchY: 15 },
    { role: 'CA', label: 'CA', pitchX: 62, pitchY: 15 },
    { role: 'PD', label: 'PD', pitchX: 85, pitchY: 22 },
  ],
  '4-1-4-1': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 15, pitchY: 70 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 85, pitchY: 70 },
    { role: 'VOL', label: 'VOL', pitchX: 50, pitchY: 56 },
    { role: 'PE', label: 'ME', pitchX: 17, pitchY: 38 },
    { role: 'MC', label: 'MC', pitchX: 38, pitchY: 41 },
    { role: 'MEI', label: 'MEI', pitchX: 62, pitchY: 41 },
    { role: 'PD', label: 'MD', pitchX: 83, pitchY: 38 },
    { role: 'CA', label: 'CA', pitchX: 50, pitchY: 15 },
  ],
  '4-3-1-2': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 15, pitchY: 70 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 85, pitchY: 70 },
    { role: 'MC', label: 'MC', pitchX: 28, pitchY: 50 },
    { role: 'VOL', label: 'VOL', pitchX: 50, pitchY: 54 },
    { role: 'MC', label: 'MC', pitchX: 72, pitchY: 50 },
    { role: 'MEI', label: 'MEI', pitchX: 50, pitchY: 34 },
    { role: 'CA', label: 'CA', pitchX: 36, pitchY: 16 },
    { role: 'CA', label: 'CA', pitchX: 64, pitchY: 16 },
  ],
  '4-4-2 losango': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'LE', label: 'LE', pitchX: 14, pitchY: 69 },
    { role: 'ZAG', label: 'ZAG', pitchX: 37, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 63, pitchY: 73 },
    { role: 'LD', label: 'LD', pitchX: 86, pitchY: 69 },
    { role: 'VOL', label: 'VOL', pitchX: 50, pitchY: 57 },
    { role: 'MC', label: 'MC', pitchX: 28, pitchY: 44 },
    { role: 'MC', label: 'MC', pitchX: 72, pitchY: 44 },
    { role: 'MEI', label: 'MEI', pitchX: 50, pitchY: 32 },
    { role: 'CA', label: 'CA', pitchX: 36, pitchY: 16 },
    { role: 'CA', label: 'CA', pitchX: 64, pitchY: 16 },
  ],
  '3-4-2-1': [
    { role: 'GOL', label: 'GOL', pitchX: 50, pitchY: 89 },
    { role: 'ZAG', label: 'ZAG', pitchX: 25, pitchY: 73 },
    { role: 'ZAG', label: 'ZAG', pitchX: 50, pitchY: 74 },
    { role: 'ZAG', label: 'ZAG', pitchX: 75, pitchY: 73 },
    { role: 'LE', label: 'ALA E', pitchX: 15, pitchY: 49 },
    { role: 'VOL', label: 'VOL', pitchX: 39, pitchY: 53 },
    { role: 'MC', label: 'MC', pitchX: 61, pitchY: 53 },
    { role: 'LD', label: 'ALA D', pitchX: 85, pitchY: 49 },
    { role: 'MEI', label: 'MEI', pitchX: 34, pitchY: 31 },
    { role: 'MEI', label: 'MEI', pitchX: 66, pitchY: 31 },
    { role: 'CA', label: 'CA', pitchX: 50, pitchY: 14 },
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
    styleLabel: 'Amplitude & Pressão',
    strengths: 'Ataque forte pelas pontas (PE/PD) e pressão equilibrada na saída rival',
    weaknesses: 'Pode sofrer superioridade numérica contra 5 meio-campistas',
  },
  '4-4-2': {
    midControl: 0,
    wingThreat: 2,
    centralBoxPresence: 3,
    centralShield: 1,
    wingBackExposure: 1,
    pressResistance: 0,
    styleLabel: 'Linhas Compactas & Dupla',
    strengths: 'Dupla de área e duas linhas compactas para defender e contra-atacar',
    weaknesses: 'Espaço entrelinhas vulnerável contra um camisa 10 (4-2-3-1)',
  },
  '4-2-3-1': {
    midControl: 3,
    wingThreat: 2,
    centralBoxPresence: 1,
    centralShield: 2,
    wingBackExposure: 1,
    pressResistance: 3,
    styleLabel: 'Controle & Camisa 10',
    strengths: 'Dupla de volantes e meia armador controlam o ritmo e protegem a área',
    weaknesses: 'Centroavante isolado se os pontas ficarem presos na marcação',
  },
  '3-5-2': {
    midControl: 4,
    wingThreat: 1,
    centralBoxPresence: 3,
    centralShield: 2,
    wingBackExposure: 3,
    pressResistance: 2,
    styleLabel: 'Força no Meio & Alas',
    strengths: 'Superioridade no meio-campo com 5 peças e dois atacantes infiltrando',
    weaknesses: 'Corredores laterais expostos às costas dos alas contra pontas abertos',
  },
  '3-4-3': {
    midControl: 1,
    wingThreat: 4,
    centralBoxPresence: 2,
    centralShield: -1,
    wingBackExposure: 4,
    pressResistance: 1,
    styleLabel: 'Ataque pelos Flancos',
    strengths: 'Sobrecarga ofensiva máxima pelos lados e volume na área rival',
    weaknesses: 'Transição defensiva frágil pelas laterais e miolo exposto',
  },
  '5-4-1': {
    midControl: 0,
    wingThreat: 1,
    centralBoxPresence: 0,
    centralShield: 4,
    wingBackExposure: 0,
    pressResistance: 0,
    styleLabel: 'Retranca & Bloqueio Total',
    strengths: 'Duas linhas muito fechadas que reduzem ao máximo as chances do adversário',
    weaknesses: 'Pouca presença ofensiva se tentar propor posse ou pressão alta',
  },
  '4-2-4': {
    midControl: -2,
    wingThreat: 4,
    centralBoxPresence: 4,
    centralShield: -2,
    wingBackExposure: 3,
    pressResistance: -1,
    styleLabel: 'Tudo ou Nada Ofensivo',
    strengths: 'Quatro atacantes pressionando a última linha e máximo poder de fogo',
    weaknesses: 'Meio-campo com apenas dois homens sofre contra contra-ataques e posse',
  },
  '4-1-4-1': {
    midControl: 3,
    wingThreat: 2,
    centralBoxPresence: 1,
    centralShield: 3,
    wingBackExposure: 1,
    pressResistance: 2,
    styleLabel: 'Cobertura & Equilíbrio',
    strengths: 'Primeiro volante protege a zaga enquanto quatro meias fecham espaços e apoiam',
    weaknesses: 'Centroavante precisa de apoio rápido dos meias para não ficar isolado',
  },
  '4-3-1-2': {
    midControl: 3,
    wingThreat: 0,
    centralBoxPresence: 3,
    centralShield: 1,
    wingBackExposure: 2,
    pressResistance: 2,
    styleLabel: 'Funil Central & Tabela',
    strengths: 'Triangulação letal por dentro com camisa 10 servindo dois atacantes',
    weaknesses: 'Sem pontas abertos, sofre para defender os lados do campo',
  },
  '4-4-2 losango': {
    midControl: 4,
    wingThreat: 0,
    centralBoxPresence: 3,
    centralShield: 2,
    wingBackExposure: 3,
    pressResistance: 3,
    styleLabel: 'Losango Técnico Central',
    strengths: 'Domínio no miolo com volante, dois meias e armador atrás da dupla de área',
    weaknesses: 'Laterais ficam sobrecarregados na marcação pelos flancos',
  },
  '5-3-2': {
    midControl: 1,
    wingThreat: 0,
    centralBoxPresence: 2,
    centralShield: 4,
    wingBackExposure: 0,
    pressResistance: 1,
    styleLabel: 'Retranca & Ligação Direta',
    strengths: 'Três zagueiros fecham o funil central e neutralizam duplas de ataque',
    weaknesses: 'Menor amplitude para propor jogo contra outras retrancas',
  },
  '3-4-2-1': {
    midControl: 3,
    wingThreat: 2,
    centralBoxPresence: 2,
    centralShield: 1,
    wingBackExposure: 2,
    pressResistance: 3,
    styleLabel: 'Dois Meias Entrelinhas',
    strengths: 'Dois armadores entrelinhas alimentam o centroavante com apoio dos alas',
    weaknesses: 'Costas dos alas exigem cobertura rápida dos zagueiros abertos',
  },
};

export interface PlayStyleSpec {
  id: PlayStyle;
  label: string;
  description: string;
  recommendedFormations: Formation[];
  tacticsBase: Omit<ClubTactics, 'playStyle'>;
}

export const PLAY_STYLE_OPTIONS: PlayStyle[] = [
  'Equilibrado',
  'Posse de bola',
  'Contra-ataque',
  'Jogo pelas pontas',
  'Ataque pelo meio',
  'Pressão alta',
  'Ligação direta',
];

export const PLAY_STYLE_SPECS: Record<PlayStyle, PlayStyleSpec> = {
  Equilibrado: {
    id: 'Equilibrado',
    label: 'Equilibrado',
    description: 'Compacto entre defesa e ataque. Alterna passe curto e verticalidade conforme o jogo pede.',
    recommendedFormations: ['4-4-2', '4-3-3', '4-2-3-1', '4-1-4-1'],
    tacticsBase: {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Posse de bola',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    },
  },
  'Posse de bola': {
    id: 'Posse de bola',
    label: 'Posse de bola',
    description: 'Troca de passes curta e paciente para controlar o ritmo. Rende mais com meio técnico; sofre contra pressão forte.',
    recommendedFormations: ['4-2-3-1', '4-3-3', '4-4-2 losango', '3-4-2-1', '4-1-4-1'],
    tacticsBase: {
      buildUpStyle: 'Saída curta',
      offensiveStyle: 'Posse de bola',
      pressing: 'Pressão após perda',
      defensiveLine: 'Adiantada',
      intensity: 'Normal',
    },
  },
  'Contra-ataque': {
    id: 'Contra-ataque',
    label: 'Contra-ataque',
    description: 'Velocidade na frente e defesa firme. Rende mais contra quem se lança ao ataque.',
    recommendedFormations: ['4-3-3', '4-4-2', '5-3-2', '5-4-1', '4-2-3-1', '3-5-2'],
    tacticsBase: {
      buildUpStyle: 'Contra-ataques rápidos',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Bloco médio',
      defensiveLine: 'Recuada',
      intensity: 'Normal',
    },
  },
  'Jogo pelas pontas': {
    id: 'Jogo pelas pontas',
    label: 'Jogo pelas pontas',
    description: 'Amplitude máxima com pontas e laterais buscando a linha de fundo e cruzamentos na área.',
    recommendedFormations: ['4-3-3', '3-4-3', '4-2-3-1', '4-4-2', '4-1-4-1', '4-2-4'],
    tacticsBase: {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Jogo pelas laterais',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    },
  },
  'Ataque pelo meio': {
    id: 'Ataque pelo meio',
    label: 'Ataque pelo meio',
    description: 'Triangulações rápidas e passes verticais por dentro com meias criativos infiltrando a área.',
    recommendedFormations: ['4-3-1-2', '4-4-2 losango', '4-2-3-1', '3-5-2', '3-4-2-1'],
    tacticsBase: {
      buildUpStyle: 'Saída curta',
      offensiveStyle: 'Ataque pelo meio',
      pressing: 'Bloco médio',
      defensiveLine: 'Equilibrada',
      intensity: 'Normal',
    },
  },
  'Pressão alta': {
    id: 'Pressão alta',
    label: 'Pressão alta',
    description: 'Sufoca a saída de bola adversária perto do gol rival. Exige fôlego e defensores ágeis.',
    recommendedFormations: ['4-3-3', '4-2-3-1', '3-4-3', '4-2-4', '3-4-2-1'],
    tacticsBase: {
      buildUpStyle: 'Equilibrada',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Pressão alta',
      defensiveLine: 'Adiantada',
      intensity: 'Alta',
    },
  },
  'Ligação direta': {
    id: 'Ligação direta',
    label: 'Ligação direta',
    description: 'Bolas longas da defesa direto para os atacantes e disputa pela segunda bola. Quebra marcação alta.',
    recommendedFormations: ['4-4-2', '5-3-2', '5-4-1', '3-5-2', '4-2-4'],
    tacticsBase: {
      buildUpStyle: 'Ligações diretas',
      offensiveStyle: 'Transições rápidas',
      pressing: 'Pressão baixa',
      defensiveLine: 'Recuada',
      intensity: 'Normal',
    },
  },
};

export const TACTICAL_POSTURES: Array<{
  id: TacticalPosture;
  label: string;
  shortDesc: string;
}> = [
  { id: 'Atacar', label: 'Atacar', shortDesc: 'Time mais adiantado buscando o gol com maior volume ofensivo' },
  { id: 'Equilibrado', label: 'Equilibrado', shortDesc: 'Equilíbrio sólido entre proteção defensiva e chegada ao ataque' },
  { id: 'Defender', label: 'Defender', shortDesc: 'Prioriza fechar a área e proteger o placar com linhas baixas' },
  { id: 'Pressão total', label: 'Pressão total', shortDesc: 'Marcação máxima em todo o campo (alto gasto físico e risco)' },
];

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
  playStyle: 'Equilibrado',
  ...PLAY_STYLE_SPECS.Equilibrado.tacticsBase,
};

export interface TacticalPresetSpec {
  id: string;
  name: string;
  shortDesc: string;
  playStyle: PlayStyle;
  mentality: TacticalPosture;
  tactics: ClubTactics;
}

export function normalizePosture(mentality?: TacticalMentality): TacticalPosture {
  switch (mentality) {
    case 'Atacar':
    case 'Ofensiva':
      return 'Atacar';
    case 'Defender':
    case 'Retranca':
      return 'Defender';
    case 'Pressão total':
    case 'Tudo ou Nada':
      return 'Pressão total';
    case 'Equilibrado':
    case 'Equilibrada':
    case 'Contra-Ataque':
    default:
      return 'Equilibrado';
  }
}

export function inferPlayStyleFromClub(
  club: Pick<Club, 'tactics' | 'mentality' | 'botPersonality'>
): PlayStyle {
  if (club.tactics?.playStyle && PLAY_STYLE_SPECS[club.tactics.playStyle]) {
    return club.tactics.playStyle;
  }
  if (club.mentality === 'Contra-Ataque') return 'Contra-ataque';
  if (club.mentality === 'Retranca') return 'Ligação direta';
  if (club.tactics) {
    if (club.tactics.buildUpStyle === 'Contra-ataques rápidos') return 'Contra-ataque';
    if (club.tactics.pressing === 'Pressão alta') return 'Pressão alta';
    if (club.tactics.buildUpStyle === 'Ligações diretas') return 'Ligação direta';
    if (club.tactics.offensiveStyle === 'Jogo pelas laterais' || club.tactics.offensiveStyle === 'Cruzamentos') {
      return 'Jogo pelas pontas';
    }
    if (club.tactics.offensiveStyle === 'Ataque pelo meio') return 'Ataque pelo meio';
    if (club.tactics.offensiveStyle === 'Posse de bola' && club.tactics.buildUpStyle === 'Saída curta') {
      return 'Posse de bola';
    }
  }
  switch (club.botPersonality) {
    case 'agressivo':
      return 'Pressão alta';
    case 'galactico':
      return 'Posse de bola';
    case 'tatico':
      return 'Contra-ataque';
    case 'economico':
      return 'Ligação direta';
    default:
      return 'Equilibrado';
  }
}

export function buildTacticsForPlayStyle(
  playStyle: PlayStyle,
  posture: TacticalMentality = 'Equilibrado'
): ClubTactics {
  const normPosture = normalizePosture(posture);
  const base = { ...PLAY_STYLE_SPECS[playStyle].tacticsBase };

  if (normPosture === 'Atacar') {
    if (base.defensiveLine === 'Recuada') base.defensiveLine = 'Equilibrada';
    if (base.pressing === 'Pressão baixa') base.pressing = 'Bloco médio';
  } else if (normPosture === 'Defender') {
    base.defensiveLine = 'Recuada';
    if (base.pressing === 'Pressão alta') base.pressing = 'Bloco médio';
    if (base.intensity === 'Alta') base.intensity = 'Normal';
  } else if (normPosture === 'Pressão total') {
    base.pressing = 'Pressão alta';
    base.defensiveLine = 'Adiantada';
    base.intensity = 'Alta';
  }

  return {
    playStyle,
    ...base,
  };
}

export const TACTICAL_PRESETS: TacticalPresetSpec[] = [
  {
    id: 'equilibrado',
    name: 'Equilibrado',
    shortDesc: PLAY_STYLE_SPECS.Equilibrado.description,
    playStyle: 'Equilibrado',
    mentality: 'Equilibrado',
    tactics: buildTacticsForPlayStyle('Equilibrado', 'Equilibrado'),
  },
  {
    id: 'posse',
    name: 'Posse de bola',
    shortDesc: PLAY_STYLE_SPECS['Posse de bola'].description,
    playStyle: 'Posse de bola',
    mentality: 'Atacar',
    tactics: buildTacticsForPlayStyle('Posse de bola', 'Atacar'),
  },
  {
    id: 'contra_ataque',
    name: 'Contra-ataque',
    shortDesc: PLAY_STYLE_SPECS['Contra-ataque'].description,
    playStyle: 'Contra-ataque',
    mentality: 'Defender',
    tactics: buildTacticsForPlayStyle('Contra-ataque', 'Defender'),
  },
  {
    id: 'pontas',
    name: 'Jogo pelas pontas',
    shortDesc: PLAY_STYLE_SPECS['Jogo pelas pontas'].description,
    playStyle: 'Jogo pelas pontas',
    mentality: 'Atacar',
    tactics: buildTacticsForPlayStyle('Jogo pelas pontas', 'Atacar'),
  },
  {
    id: 'meio',
    name: 'Ataque pelo meio',
    shortDesc: PLAY_STYLE_SPECS['Ataque pelo meio'].description,
    playStyle: 'Ataque pelo meio',
    mentality: 'Atacar',
    tactics: buildTacticsForPlayStyle('Ataque pelo meio', 'Atacar'),
  },
  {
    id: 'pressao_alta',
    name: 'Pressão alta',
    shortDesc: PLAY_STYLE_SPECS['Pressão alta'].description,
    playStyle: 'Pressão alta',
    mentality: 'Pressão total',
    tactics: buildTacticsForPlayStyle('Pressão alta', 'Pressão total'),
  },
  {
    id: 'ligacao_direta',
    name: 'Ligação direta',
    shortDesc: PLAY_STYLE_SPECS['Ligação direta'].description,
    playStyle: 'Ligação direta',
    mentality: 'Defender',
    tactics: buildTacticsForPlayStyle('Ligação direta', 'Defender'),
  },
];

export function tacticsEqual(a: ClubTactics, b: ClubTactics): boolean {
  return (
    (a.playStyle ?? '') === (b.playStyle ?? '') &&
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
  const playStyle = inferPlayStyleFromClub(club);
  if (
    club.tactics &&
    club.tactics.playStyle &&
    club.tactics.buildUpStyle &&
    club.tactics.offensiveStyle &&
    club.tactics.pressing &&
    club.tactics.defensiveLine &&
    club.tactics.intensity
  ) {
    return club.tactics;
  }
  return buildTacticsForPlayStyle(playStyle, club.mentality);
}

/** Escala os 11 titulares priorizando jogadores elegíveis (não suspensos) */
export function buildLineupSlots(
  squad: Player[],
  formation: Formation,
  preserveExisting?: LineupSlot[]
): { squad: Player[]; lineupSlots: LineupSlot[] } {
  const layout = FORMATION_LAYOUT[formation] ?? FORMATION_LAYOUT['4-3-3'];
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

  // 3. Melhor encaixe elegível restante
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
  mentality: TacticalPosture;
  tactics: ClubTactics;
} {
  let formation: Formation = '4-4-2';
  let playStyle: PlayStyle = 'Equilibrado';
  let mentality: TacticalPosture = 'Equilibrado';

  switch (personality) {
    case 'agressivo':
      formation = '4-3-3';
      playStyle = 'Pressão alta';
      mentality = 'Atacar';
      break;
    case 'galactico':
      formation = '4-2-3-1';
      playStyle = 'Posse de bola';
      mentality = 'Atacar';
      break;
    case 'tatico':
      formation = '3-5-2';
      playStyle = 'Contra-ataque';
      mentality = 'Equilibrado';
      break;
    case 'economico':
      formation = '5-3-2';
      playStyle = 'Ligação direta';
      mentality = 'Defender';
      break;
    case 'equilibrado':
    default:
      formation = '4-4-2';
      playStyle = 'Equilibrado';
      mentality = 'Equilibrado';
      break;
  }

  if (squad && squad.length >= 11) {
    const countPos = (roles: PlayerPosition[]) =>
      squad.filter((p) => roles.includes(p.position)).length;
    const zags = countPos(['ZAG']);
    const wingers = countPos(['PE', 'PD']);
    const strikers = countPos(['CA']);
    const mids = countPos(['VOL', 'MC', 'MEI']);

    if ((['3-5-2', '5-3-2', '5-4-1'] as Formation[]).includes(formation) && zags < 3) {
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
    if (playStyle === 'Pressão alta' && avgCbPace < 69) {
      playStyle = 'Equilibrado';
    }
  }

  return {
    formation,
    mentality,
    tactics: buildTacticsForPlayStyle(playStyle, mentality),
  };
}

export interface TacticalCompatibilityReport {
  score: number; // 35..99
  label: string;
  tone: 'emerald' | 'amber' | 'rose';
  strengths: string[];
  warnings: string[];
  cohesionMultiplier: number; // ~0.85..1.05
}

export function evaluateTacticalCompatibility(params: {
  formation: Formation;
  mentality: TacticalMentality;
  tactics: ClubTactics;
  starters?: Array<Player & { slotRole?: PlayerPosition }>;
}): TacticalCompatibilityReport {
  const { formation, mentality, tactics, starters } = params;
  const playStyle = tactics.playStyle ?? 'Equilibrado';
  const posture = normalizePosture(mentality);
  const spec = PLAY_STYLE_SPECS[playStyle];

  let score = 78;
  const strengths: string[] = [];
  const warnings: string[] = [];

  // 1. Harmonia Formação × Estilo de Jogo
  if (spec.recommendedFormations.includes(formation)) {
    score += 7;
    strengths.push(`${formation} encaixa muito bem com o estilo ${playStyle}.`);
  } else if (
    (formation === '5-4-1' || formation === '5-3-2') &&
    (playStyle === 'Pressão alta' || playStyle === 'Posse de bola')
  ) {
    score -= 10;
    warnings.push(`${formation} é retranca e perde eficiência em ${playStyle}.`);
  } else if (
    formation === '4-2-4' &&
    (playStyle === 'Posse de bola' || playStyle === 'Ataque pelo meio')
  ) {
    score -= 9;
    warnings.push('4-2-4 tem apenas dois meio-campistas para sustentar esse estilo.');
  } else if (
    (formation === '4-3-1-2' || formation === '4-4-2 losango' || formation === '5-3-2') &&
    playStyle === 'Jogo pelas pontas'
  ) {
    score -= 11;
    warnings.push(`${formation} não tem pontas naturais para o Jogo pelas pontas.`);
  } else if (
    (formation === '4-3-3' || formation === '3-4-3') &&
    playStyle === 'Ataque pelo meio'
  ) {
    score -= 4;
    warnings.push(`${formation} abre os pontas e reduz opções por dentro.`);
  }

  // 2. Coerência Postura × Formação × Estilo de Jogo
  if ((formation === '5-4-1' || formation === '5-3-2') && posture === 'Pressão total') {
    score -= 14;
    warnings.push(`Conflito: ${formation} (Retranca) não combina com Pressão total.`);
  } else if ((formation === '5-4-1' || formation === '5-3-2') && posture === 'Atacar') {
    score -= 7;
    warnings.push(`${formation} rende melhor em Defender ou Equilibrado.`);
  } else if (formation === '4-2-4' && posture === 'Defender') {
    score -= 14;
    warnings.push('Conflito: 4-2-4 (Tudo ou nada) deixa buracos se tentar jogar em Defender.');
  } else if (playStyle === 'Contra-ataque' && posture === 'Pressão total') {
    score -= 10;
    warnings.push('Contra-ataque perde espaço nas costas do rival quando o time faz Pressão total.');
  } else if (playStyle === 'Contra-ataque' && (posture === 'Defender' || posture === 'Equilibrado')) {
    score += 4;
    strengths.push('Postura sólida cria o cenário ideal para disparar no contra-ataque.');
  } else if (playStyle === 'Pressão alta' && posture === 'Defender') {
    score -= 13;
    warnings.push('Conflito: Pressão alta exige linha adiantada, não postura Defender.');
  } else if (playStyle === 'Pressão alta' && (posture === 'Pressão total' || posture === 'Atacar')) {
    score += 4;
    strengths.push('Postura agressiva potencializa a recuperação alta de bola.');
  } else if (playStyle === 'Ligação direta' && posture === 'Pressão total') {
    score -= 7;
    warnings.push('Ligação direta pede menos desgaste para brigar pela segunda bola.');
  }

  // 3. Encaixe real dos 11 titulares nas posições e características
  if (starters && starters.length >= 11) {
    const outOfPosCount = starters.filter(
      (p) => getPositionFit(p, p.slotRole ?? p.position).penalty < 0
    ).length;
    const criticalOutCount = starters.filter(
      (p) => getPositionFit(p, p.slotRole ?? p.position).penalty <= -12
    ).length;

    if (outOfPosCount === 0) {
      score += 5;
    } else {
      score -= outOfPosCount * 2.5 + criticalOutCount * 3;
      if (outOfPosCount >= 2) {
        warnings.push(`${outOfPosCount} jogadores improvisados fora de posição reduzem o encaixe.`);
      }
    }

    const attrsList = starters.map((p) => ({
      role: p.slotRole ?? p.position,
      a: ensurePlayerAttributes(p),
    }));
    const avg = (arr: number[], fb: number) =>
      arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : fb;

    const cbs = attrsList.filter((x) => x.role === 'ZAG');
    const mids = attrsList.filter((x) => x.role === 'VOL' || x.role === 'MC' || x.role === 'MEI');
    const attackers = attrsList.filter((x) => x.role === 'CA' || x.role === 'PE' || x.role === 'PD');
    const strikers = attrsList.filter((x) => x.role === 'CA');

    const avgCbPace = avg(cbs.map((x) => (x.a.velocidade + x.a.aceleracao) / 2), 73);
    const avgMidTech = avg(mids.map((x) => (x.a.passe + x.a.visao) / 2), 75);
    const avgAttPace = avg(attackers.map((x) => (x.a.velocidade + x.a.aceleracao) / 2), 76);
    const avgStaminaAttr = avg(
      attrsList.filter((x) => x.role !== 'GOL').map((x) => x.a.resistencia),
      74
    );
    const avgCaStrength = avg(strikers.map((x) => (x.a.forca + x.a.posicionamento) / 2), 75);

    if (playStyle === 'Posse de bola' && avgMidTech >= 78) {
      score += 4;
    } else if (playStyle === 'Posse de bola' && avgMidTech < 70) {
      score -= 5;
      warnings.push('Meio-campo com pouco passe/visão dificulta sustentar Posse de bola.');
    }

    if (playStyle === 'Contra-ataque' && avgAttPace >= 77) {
      score += 5;
    } else if (playStyle === 'Contra-ataque' && avgAttPace < 71) {
      score -= 5;
      warnings.push('Ataque lento perde eficiência na velocidade do Contra-ataque.');
    }

    if ((playStyle === 'Pressão alta' || posture === 'Pressão total') && avgCbPace < 69) {
      score -= 6;
      warnings.push('Zaga lenta fica exposta nas costas jogando com linha alta.');
    }

    if ((playStyle === 'Pressão alta' || posture === 'Pressão total') && avgStaminaAttr < 72) {
      score -= 5;
      warnings.push('Baixa resistência física compromete a pressão no 2º tempo.');
    }

    if ((playStyle === 'Jogo pelas pontas' || playStyle === 'Ligação direta') && avgCaStrength >= 78) {
      score += 4;
    }
  }

  const clampedScore = Math.max(35, Math.min(99, Math.round(score)));
  const tone: 'emerald' | 'amber' | 'rose' =
    clampedScore >= 78 ? 'emerald' : clampedScore >= 62 ? 'amber' : 'rose';
  const label =
    clampedScore >= 85
      ? 'Encaixe Alto'
      : clampedScore >= 72
      ? 'Bom Encaixe'
      : clampedScore >= 58
      ? 'Encaixe Regular'
      : 'Encaixe Ruim';

  // Encaixe ruim penaliza chances reais em campo; encaixe bom garante fluidez
  const cohesionMultiplier = Math.max(0.84, Math.min(1.06, 1.0 + (clampedScore - 76) * 0.0038));

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
  playStyle: PlayStyle;
  posture: TacticalPosture;
  formation: Formation;
  tactics: ClubTactics;
  compatibility: TacticalCompatibilityReport;
  shortPassWeight: number;
  verticalPassWeight: number;
  longBallWeight: number;
  dribbleWeight: number;
  crossWeight: number;
  wingBias: number; // 0..1
  centralBias: number; // 0..1
  minPressAttZone: 1 | 2 | 3 | 4;
  pressAggression: number; // 0.65..1.45
  lineHeight: -1 | 0 | 1;
  offsideTrapRate: number;
  behindLineExposure: number;
  boxCompactness: number;
  tempo: number;
  staminaBurnRate: number;
  foulRiskMod: number;
  shootEagerness: number;
  attackBiasBonus: number;
  defenseBiasBonus: number;
}

export function computeTacticalBehaviorProfile(
  club: Pick<Club, 'formation' | 'mentality' | 'tactics' | 'botPersonality'>,
  starters?: Array<Player & { slotRole?: PlayerPosition }>,
  redCardCount = 0
): TacticalBehaviorProfile {
  const playStyle = inferPlayStyleFromClub(club);
  const posture = normalizePosture(club.mentality);
  const tactics = buildTacticsForPlayStyle(playStyle, posture);

  const compatibility = evaluateTacticalCompatibility({
    formation: club.formation,
    mentality: posture,
    tactics,
    starters,
  });

  let shortPassWeight = 1.0;
  let verticalPassWeight = 1.0;
  let longBallWeight = 0.45;
  let dribbleWeight = 0.72;
  let crossWeight = 0.65;
  let wingBias = 0.48;
  let centralBias = 0.52;
  let tempo = 1.0;
  let shootEagerness = 1.0;
  let minPressAttZone: 1 | 2 | 3 | 4 = 3;
  let pressAggression = 1.0;
  let pressingDrainMult = 1.0;
  let foulRiskMod = 1.0;
  let lineHeight: -1 | 0 | 1 = 0;
  let behindLineExposure = 1.0;
  let boxCompactness = 1.0;
  let attackBiasBonus = 0;
  let defenseBiasBonus = 0;

  // 1. Efeito Real do Estilo de Jogo
  switch (playStyle) {
    case 'Posse de bola':
      shortPassWeight = 1.48;
      verticalPassWeight = 1.02;
      longBallWeight = 0.22;
      crossWeight = 0.52;
      centralBias = 0.58;
      wingBias = 0.42;
      tempo = 0.96;
      minPressAttZone = 2;
      pressAggression = 1.12;
      pressingDrainMult = 1.04;
      lineHeight = 1;
      behindLineExposure = 1.04;
      shootEagerness = 1.0;
      break;
    case 'Contra-ataque':
      shortPassWeight = 0.78;
      verticalPassWeight = 1.32;
      longBallWeight = 0.68;
      dribbleWeight = 0.85;
      tempo = 1.05;
      minPressAttZone = 3;
      pressAggression = 0.94;
      pressingDrainMult = 0.97;
      lineHeight = -1;
      behindLineExposure = 0.94;
      boxCompactness = 1.04;
      defenseBiasBonus += 0.4;
      shootEagerness = 1.02;
      break;
    case 'Jogo pelas pontas':
      shortPassWeight = 1.04;
      verticalPassWeight = 1.06;
      dribbleWeight = 0.96;
      crossWeight = 1.24;
      wingBias = 0.72;
      centralBias = 0.28;
      minPressAttZone = 3;
      pressAggression = 1.0;
      shootEagerness = 1.03;
      break;
    case 'Ataque pelo meio':
      shortPassWeight = 1.24;
      verticalPassWeight = 1.28;
      longBallWeight = 0.28;
      crossWeight = 0.36;
      centralBias = 0.75;
      wingBias = 0.25;
      minPressAttZone = 3;
      pressAggression = 1.02;
      shootEagerness = 1.03;
      break;
    case 'Pressão alta':
      shortPassWeight = 1.04;
      verticalPassWeight = 1.18;
      longBallWeight = 0.38;
      dribbleWeight = 0.78;
      tempo = 1.06;
      minPressAttZone = 1;
      pressAggression = 1.24;
      pressingDrainMult = 1.07;
      foulRiskMod = 1.11;
      lineHeight = 1;
      behindLineExposure = 1.04;
      boxCompactness = 0.99;
      attackBiasBonus += 0.45;
      break;
    case 'Ligação direta':
      shortPassWeight = 0.65;
      verticalPassWeight = 1.12;
      longBallWeight = 1.15;
      crossWeight = 0.82;
      tempo = 1.03;
      minPressAttZone = 4;
      pressAggression = 0.88;
      pressingDrainMult = 0.93;
      foulRiskMod = 0.92;
      lineHeight = -1;
      behindLineExposure = 0.95;
      boxCompactness = 1.03;
      break;
    case 'Equilibrado':
    default:
      break;
  }

  // 2. Influência da Formação na ocupação de campo e proteção
  const formProfile = FORMATION_TACTICAL_PROFILE[club.formation] ?? FORMATION_TACTICAL_PROFILE['4-3-3'];
  if (formProfile.wingThreat >= 3) {
    wingBias = Math.min(0.8, wingBias + 0.08);
    centralBias = 1 - wingBias;
    dribbleWeight *= 1.06;
  } else if (formProfile.wingThreat === 0) {
    wingBias = Math.max(0.22, wingBias - 0.1);
    centralBias = 1 - wingBias;
    shortPassWeight *= 1.05;
  }

  if (formProfile.centralShield >= 3) {
    boxCompactness *= 1.03;
    behindLineExposure *= 0.96;
  } else if (formProfile.centralShield < 0) {
    boxCompactness *= 0.96;
    behindLineExposure *= 1.04;
  }

  if (club.formation === '4-2-4') {
    shootEagerness *= 1.09;
    attackBiasBonus += 0.5;
    defenseBiasBonus -= 0.45;
  } else if (club.formation === '5-4-1' || club.formation === '5-3-2') {
    shootEagerness *= 0.9;
    defenseBiasBonus += 0.45;
  }

  // 3. Efeito Real das 4 Posturas (Atacar / Equilibrado / Defender / Pressão total)
  let postureDrainMult = 1.0;
  switch (posture) {
    case 'Atacar':
      pressAggression *= 1.07;
      behindLineExposure *= 1.03;
      boxCompactness *= 0.97;
      shootEagerness *= 1.08;
      verticalPassWeight *= 1.07;
      tempo *= 1.03;
      postureDrainMult = 1.05;
      attackBiasBonus += 0.65;
      defenseBiasBonus -= 0.35;
      break;
    case 'Defender':
      lineHeight = -1;
      minPressAttZone = 4;
      pressAggression *= 0.88;
      boxCompactness *= 1.05;
      behindLineExposure *= 0.93;
      shootEagerness *= 0.87;
      tempo *= 0.95;
      postureDrainMult = 0.92;
      foulRiskMod *= 0.9;
      attackBiasBonus -= 0.45;
      defenseBiasBonus += 0.7;
      break;
    case 'Pressão total':
      lineHeight = 1;
      minPressAttZone = 1;
      pressAggression = Math.min(1.4, pressAggression * 1.18);
      behindLineExposure *= 1.05;
      boxCompactness *= 0.97;
      tempo *= 1.06;
      shootEagerness *= 1.1;
      postureDrainMult = 1.11;
      foulRiskMod *= 1.14;
      attackBiasBonus += 0.85;
      defenseBiasBonus -= 0.28;
      break;
    case 'Equilibrado':
    default:
      break;
  }

  const offsideTrapRate = lineHeight === 1 ? 0.056 : lineHeight === 0 ? 0.032 : 0.016;

  // Impacto realista de expulsão
  if (redCardCount > 0) {
    pressAggression *= redCardCount === 1 ? 0.82 : 0.65;
    shortPassWeight *= 0.9;
    tempo *= 0.92;
    postureDrainMult *= 1.12;
  }

  const staminaBurnRate = Math.max(
    0.78,
    Math.min(1.22, pressingDrainMult * postureDrainMult)
  );

  return {
    playStyle,
    posture,
    formation: club.formation,
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
    attackBiasBonus,
    defenseBiasBonus,
  };
}

/**
 * Calcula vantagem tática real (pedra-papel-tesoura equilibrado) entre estilos e posturas em confronto.
 * Ex: Contra-ataque rende mais contra quem se lança ao ataque; Ligação direta fura Pressão alta.
 */
export function computeTacticalMatchupModifiers(
  attProfile: TacticalBehaviorProfile,
  defProfile: TacticalBehaviorProfile
): {
  counterAttackBonus: number;
  passScoreEdge: number;
  shotChanceEdge: number;
} {
  let counterAttackBonus = 0;
  let passScoreEdge = 0;
  let shotChanceEdge = 0;

  const defCommitsForward =
    defProfile.posture === 'Atacar' ||
    defProfile.posture === 'Pressão total' ||
    defProfile.playStyle === 'Pressão alta' ||
    defProfile.formation === '4-2-4' ||
    defProfile.formation === '3-4-3';

  const defSitsDeep =
    defProfile.posture === 'Defender' ||
    defProfile.formation === '5-4-1' ||
    defProfile.formation === '5-3-2';

  // Contra-ataque rende mais contra quem se lança ao ataque; sofre para criar contra retrancas
  if (attProfile.playStyle === 'Contra-ataque') {
    if (defCommitsForward) {
      counterAttackBonus += 0.1;
      shotChanceEdge += 1.5;
    } else if (defSitsDeep) {
      shotChanceEdge -= 1.7;
    }
  }

  // Pressão alta sufoca saída curta que não usa Ligação direta ou Contra-ataque rápido
  if (
    attProfile.playStyle === 'Pressão alta' &&
    defProfile.playStyle !== 'Ligação direta' &&
    defProfile.playStyle !== 'Contra-ataque'
  ) {
    passScoreEdge += 0.9;
    shotChanceEdge += 1.1;
  }

  // Ligação direta quebra Pressão alta / Pressão total
  if (
    attProfile.playStyle === 'Ligação direta' &&
    (defProfile.playStyle === 'Pressão alta' || defProfile.posture === 'Pressão total')
  ) {
    passScoreEdge += 2.2;
    counterAttackBonus += 0.08;
  }

  // Jogo pelas pontas castiga formações estreitas sem pontas
  if (
    attProfile.playStyle === 'Jogo pelas pontas' &&
    (defProfile.formation === '4-3-1-2' ||
      defProfile.formation === '4-4-2 losango' ||
      defProfile.formation === '5-3-2')
  ) {
    passScoreEdge += 1.6;
    shotChanceEdge += 1.4;
  }

  // Ataque pelo meio explora formações com pouco povoamento no meio-campo (4-2-4 / 4-4-2)
  if (
    attProfile.playStyle === 'Ataque pelo meio' &&
    (defProfile.formation === '4-2-4' || defProfile.formation === '4-4-2')
  ) {
    passScoreEdge += 1.8;
    shotChanceEdge += 1.2;
  }

  // Posse de bola controla times passivos que não pressionam
  if (
    attProfile.playStyle === 'Posse de bola' &&
    defProfile.posture === 'Equilibrado' &&
    defProfile.playStyle !== 'Contra-ataque'
  ) {
    passScoreEdge += 1.5;
  }

  return { counterAttackBonus, passScoreEdge, shotChanceEdge };
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

export function computeTeamNota(club: Club): number {
  const starters = getEffectiveStarters(club);
  if (starters.length === 0) return 65.0;
  const avg = starters.reduce((sum, p) => sum + p.effectiveOvr, 0) / starters.length;
  return Math.round(avg * 10) / 10;
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

export function evaluateFormationSynergy(
  formation: Formation,
  mentality: TacticalMentality,
  tactics?: ClubTactics,
  club?: Club
): { atkDelta: number; defDelta: number; label: string; tone: 'emerald' | 'amber' | 'rose'; score: number; warnings: string[] } {
  const effTactics = tactics ?? (club ? getClubTactics(club) : buildTacticsForPlayStyle('Equilibrado', mentality));
  const starters = club ? getEffectiveStarters(club) : undefined;
  const report = evaluateTacticalCompatibility({
    formation,
    mentality,
    tactics: effTactics,
    starters,
  });

  const posture = normalizePosture(mentality);
  const deltaBase = (report.score - 74) * 0.08;
  return {
    atkDelta: Math.round((posture === 'Atacar' || posture === 'Pressão total' ? deltaBase + 1 : deltaBase) * 10) / 10,
    defDelta: Math.round((posture === 'Defender' ? deltaBase + 1 : deltaBase) * 10) / 10,
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
  const matchupMods = computeTacticalMatchupModifiers(ownBehavior, oppBehavior);

  const ownAvgStamina = ownStarters.length
    ? Math.round(ownStarters.reduce((s, p) => s + p.stamina, 0) / ownStarters.length)
    : 100;
  const oppAvgStamina = oppStarters.length
    ? Math.round(oppStarters.reduce((s, p) => s + p.stamina, 0) / oppStarters.length)
    : 100;

  const outOfPosPenaltyCount = ownStarters.filter((p) => p.fitPenalty < 0).length;
  const cohesionPenalty = outOfPosPenaltyCount * 0.95;

  const rawMidDiff = ownProfile.midControl - oppProfile.midControl;
  const styleMidBias =
    (ownBehavior.playStyle === 'Posse de bola' || ownBehavior.playStyle === 'Ataque pelo meio' ? 1.2 : 0) -
    (oppBehavior.playStyle === 'Posse de bola' || oppBehavior.playStyle === 'Ataque pelo meio' ? 1.2 : 0) +
    (ownBehavior.playStyle === 'Pressão alta' ? 0.6 : 0);

  const midControlBonus =
    Math.round((rawMidDiff * 1.1 + styleMidBias - cohesionPenalty * 0.5) * 10) / 10;

  const flankAttackEdge =
    (ownBehavior.wingBias - 0.45) * 5.5 +
    (oppProfile.wingBackExposure - ownProfile.wingBackExposure) * 0.6;

  const compatBonus = (ownBehavior.compatibility.score - 72) * 0.12;
  let atkBonus =
    compatBonus +
    flankAttackEdge * 0.4 +
    matchupMods.shotChanceEdge +
    ownBehavior.attackBiasBonus * 2.1 -
    cohesionPenalty;

  let defBonus =
    compatBonus * 0.9 +
    (ownBehavior.boxCompactness - 1) * 8 +
    (ownProfile.centralShield - oppProfile.centralBoxPresence) * 0.5 +
    ownBehavior.defenseBiasBonus * 2.1 -
    cohesionPenalty;

  let fatigueWarning = false;
  if (
    ownAvgStamina < 58 &&
    (ownBehavior.posture === 'Pressão total' || ownBehavior.playStyle === 'Pressão alta')
  ) {
    atkBonus -= 1.8;
    defBonus -= 3.0;
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

  let headline = `Duelo tático: ${ownClub.formation} (${ownBehavior.playStyle}) vs ${oppClub.formation} (${oppBehavior.playStyle})`;
  if (matchupMods.counterAttackBonus >= 0.12) {
    headline = `Contra-ataque encaixado contra a postura ofensiva rival`;
  } else if (flankAttackEdge >= 2.0) {
    headline = `Vantagem pelos corredores (${ownBehavior.playStyle})`;
  } else if (midControlBonus >= 2.0) {
    headline = `Superioridade no meio-campo (${ownClub.formation} vs ${oppClub.formation})`;
  } else if (midControlBonus <= -2.0) {
    headline = `Meio-campo pressionado por ${oppClub.formation} (${oppBehavior.playStyle})`;
  }

  let advice =
    ownBehavior.compatibility.strengths[0] ?? PLAY_STYLE_SPECS[ownBehavior.playStyle].description;
  if (fatigueWarning) {
    advice = `Desgaste elevado (${ownAvgStamina}%): faça substituições ou alivie a pressão!`;
  } else if (ownBehavior.compatibility.warnings.length > 0) {
    advice = ownBehavior.compatibility.warnings[0];
  } else if (outOfPosPenaltyCount >= 2) {
    advice = `${outOfPosPenaltyCount} titulares improvisados reduzem o encaixe (${ownBehavior.compatibility.score}/99).`;
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
    synergyLabel: fatigueWarning
      ? 'Queda Física na Pressão'
      : `Encaixe ${ownBehavior.compatibility.score}/99`,
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
