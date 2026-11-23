import { Club, Player, PlayerAppearance, PlayerPosition } from '../types/league';
import { generatePlayerAttributes } from '../engine/playerAttributes';
import realPlayersData from './realPlayers.json';

export interface ClubTemplate {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  stadiumCapacity: number;
  tier: 1 | 2 | 3 | 4;
  realisticBudget: number;
}

export const CLUB_TEMPLATES: ClubTemplate[] = [
  // Tier 1
  { id: 'fla', name: 'Flamengo', shortName: 'FLA', logoUrl: '/logos/fla.png', primaryColor: '#dc2626', secondaryColor: '#111827', stadium: 'Maracanã', stadiumCapacity: 78838, tier: 1, realisticBudget: 180 },
  { id: 'pal', name: 'Palmeiras', shortName: 'PAL', logoUrl: '/logos/pal.png', primaryColor: '#15803d', secondaryColor: '#f8fafc', stadium: 'Allianz Parque', stadiumCapacity: 43713, tier: 1, realisticBudget: 175 },
  { id: 'bot', name: 'Botafogo', shortName: 'BOT', logoUrl: '/logos/bot.png', primaryColor: '#0f172a', secondaryColor: '#e2e8f0', stadium: 'Nilton Santos', stadiumCapacity: 44661, tier: 1, realisticBudget: 160 },
  { id: 'cam', name: 'Atlético-MG', shortName: 'CAM', logoUrl: '/logos/cam.png', primaryColor: '#1e293b', secondaryColor: '#f8fafc', stadium: 'Arena MRV', stadiumCapacity: 44892, tier: 1, realisticBudget: 145 },
  // Tier 2
  { id: 'cru', name: 'Cruzeiro', shortName: 'CRU', logoUrl: '/logos/cru.png', primaryColor: '#1d4ed8', secondaryColor: '#f8fafc', stadium: 'Mineirão', stadiumCapacity: 61927, tier: 2, realisticBudget: 130 },
  { id: 'bah', name: 'Bahia', shortName: 'BAH', logoUrl: '/logos/bah.png', primaryColor: '#2563eb', secondaryColor: '#dc2626', stadium: 'Fonte Nova', stadiumCapacity: 47907, tier: 2, realisticBudget: 125 },
  { id: 'sao', name: 'São Paulo', shortName: 'SAO', logoUrl: '/logos/sao.png', primaryColor: '#b91c1c', secondaryColor: '#0f172a', stadium: 'Morumbis', stadiumCapacity: 66795, tier: 2, realisticBudget: 120 },
  { id: 'int', name: 'Internacional', shortName: 'INT', logoUrl: '/logos/int.png', primaryColor: '#e11d48', secondaryColor: '#ffffff', stadium: 'Beira-Rio', stadiumCapacity: 50842, tier: 2, realisticBudget: 115 },
  { id: 'cor', name: 'Corinthians', shortName: 'COR', logoUrl: '/logos/cor.png', primaryColor: '#334155', secondaryColor: '#f8fafc', stadium: 'Neo Química Arena', stadiumCapacity: 47605, tier: 2, realisticBudget: 115 },
  { id: 'gre', name: 'Grêmio', shortName: 'GRE', logoUrl: '/logos/gre.png', primaryColor: '#0284c7', secondaryColor: '#0f172a', stadium: 'Arena do Grêmio', stadiumCapacity: 55662, tier: 2, realisticBudget: 110 },
  { id: 'flu', name: 'Fluminense', shortName: 'FLU', logoUrl: '/logos/flu.png', primaryColor: '#7f1d1d', secondaryColor: '#047857', stadium: 'Maracanã', stadiumCapacity: 78838, tier: 2, realisticBudget: 108 },
  // Tier 3
  { id: 'cap', name: 'Athletico-PR', shortName: 'CAP', logoUrl: '/logos/cap.png', primaryColor: '#991b1b', secondaryColor: '#0f172a', stadium: 'Ligga Arena', stadiumCapacity: 42372, tier: 3, realisticBudget: 95 },
  { id: 'rbb', name: 'RB Bragantino', shortName: 'RBB', logoUrl: '/logos/rbb.png', primaryColor: '#e11d48', secondaryColor: '#f1f5f9', stadium: 'Nabi Abi Chedid', stadiumCapacity: 15010, tier: 3, realisticBudget: 92 },
  { id: 'san', name: 'Santos', shortName: 'SAN', logoUrl: '/logos/san.png', primaryColor: '#475569', secondaryColor: '#ffffff', stadium: 'Vila Belmiro', stadiumCapacity: 16068, tier: 3, realisticBudget: 88 },
  { id: 'vas', name: 'Vasco da Gama', shortName: 'VAS', logoUrl: '/logos/vas.png', primaryColor: '#1f2937', secondaryColor: '#f8fafc', stadium: 'São Januário', stadiumCapacity: 21880, tier: 3, realisticBudget: 84 },
  // Tier 4
  { id: 'vit', name: 'Vitória', shortName: 'VIT', logoUrl: '/logos/vit.png', primaryColor: '#b91c1c', secondaryColor: '#09090b', stadium: 'Barradão', stadiumCapacity: 30793, tier: 4, realisticBudget: 65 },
  { id: 'cfc', name: 'Coritiba', shortName: 'CFC', logoUrl: '/logos/cfc.png', primaryColor: '#15803d', secondaryColor: '#ffffff', stadium: 'Couto Pereira', stadiumCapacity: 40502, tier: 4, realisticBudget: 65 },
  { id: 'mir', name: 'Mirassol', shortName: 'MIR', logoUrl: '/logos/mir.png', primaryColor: '#eab308', secondaryColor: '#15803d', stadium: 'Maião', stadiumCapacity: 15000, tier: 4, realisticBudget: 62 },
  { id: 'cha', name: 'Chapecoense', shortName: 'CHA', logoUrl: '/logos/cha.png', primaryColor: '#16a34a', secondaryColor: '#ffffff', stadium: 'Arena Condá', stadiumCapacity: 20089, tier: 4, realisticBudget: 56 },
  { id: 'rem', name: 'Remo', shortName: 'REM', logoUrl: '/logos/rem.png', primaryColor: '#1e3a8a', secondaryColor: '#ffffff', stadium: 'Mangueirão', stadiumCapacity: 53645, tier: 4, realisticBudget: 55 },
];

export const CLUB_RIVALRIES: Array<[string, string, string]> = [
  ['fla', 'flu', 'Fla-Flu'],
  ['fla', 'vas', 'Clássico dos Milhões'],
  ['fla', 'bot', 'Clássico da Rivalidade'],
  ['flu', 'vas', 'Clássico dos Gigantes'],
  ['flu', 'bot', 'Clássico Vovô'],
  ['bot', 'vas', 'Clássico da Amizade'],
  ['pal', 'cor', 'Derby Paulista'],
  ['pal', 'sao', 'Choque-Rei'],
  ['cor', 'sao', 'Majestoso'],
  ['san', 'sao', 'San-São'],
  ['cor', 'san', 'Clássico Alvinegro'],
  ['pal', 'san', 'Clássico da Saudade'],
  ['int', 'gre', 'Gre-Nal'],
  ['cam', 'cru', 'Clássico Mineiro'],
  ['bah', 'vit', 'Ba-Vi'],
  ['cap', 'cfc', 'Atletiba'],
  ['fla', 'pal', 'Duelo de Gigantes'],
];

export function getMatchRivalryLabel(homeClubId: string, awayClubId: string): string | null {
  const h = homeClubId.split('-')[0].toLowerCase();
  const a = awayClubId.split('-')[0].toLowerCase();
  const found = CLUB_RIVALRIES.find(
    ([c1, c2]) => (c1 === h && c2 === a) || (c1 === a && c2 === h)
  );
  return found ? found[2] : null;
}

export const COUNTRY_FLAGS: Record<string, string> = {
  Brasil: '🇧🇷',
  Brazil: '🇧🇷',
  Argentina: '🇦🇷',
  Uruguai: '🇺🇾',
  Uruguay: '🇺🇾',
  Colômbia: '🇨🇴',
  Colombia: '🇨🇴',
  Paraguai: '🇵🇾',
  Paraguay: '🇵🇾',
  Equador: '🇪🇨',
  Ecuador: '🇪🇨',
  Chile: '🇨🇱',
  Peru: '🇵🇪',
  Venezuela: '🇻🇪',
  Bolívia: '🇧🇴',
  Bolivia: '🇧🇴',
  Panamá: '🇵🇦',
  Panama: '🇵🇦',
  México: '🇲🇽',
  Mexico: '🇲🇽',
  França: '🇫🇷',
  France: '🇫🇷',
  Noruega: '🇳🇴',
  Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Espanha: '🇪🇸',
  Spain: '🇪🇸',
  Egito: '🇪🇬',
  Alemanha: '🇩🇪',
  Holanda: '🇳🇱',
  Netherlands: '🇳🇱',
  Bélgica: '🇧🇪',
  Marrocos: '🇲🇦',
  Morocco: '🇲🇦',
  Portugal: '🇵🇹',
  Itália: '🇮🇹',
  Italy: '🇮🇹',
  Croácia: '🇭🇷',
  Croatia: '🇭🇷',
  Dinamarca: '🇩🇰',
  Denmark: '🇩🇰',
  Canadá: '🇨🇦',
  'DR Congo': '🇨🇩',
  'RD Congo': '🇨🇩',
};

const NATIONALITY_PT: Record<string, string> = {
  Brazil: 'Brasil',
  Brasil: 'Brasil',
  Argentina: 'Argentina',
  Uruguay: 'Uruguai',
  Uruguai: 'Uruguai',
  Colombia: 'Colômbia',
  Colômbia: 'Colômbia',
  Paraguay: 'Paraguai',
  Paraguai: 'Paraguai',
  Ecuador: 'Equador',
  Equador: 'Equador',
  Chile: 'Chile',
  Peru: 'Peru',
  Venezuela: 'Venezuela',
  Bolivia: 'Bolívia',
  Bolívia: 'Bolívia',
  Panama: 'Panamá',
  Panamá: 'Panamá',
  Mexico: 'México',
  México: 'México',
  Portugal: 'Portugal',
  Spain: 'Espanha',
  Espanha: 'Espanha',
  Italy: 'Itália',
  Itália: 'Itália',
  Netherlands: 'Holanda',
  Holanda: 'Holanda',
  England: 'Inglaterra',
  Inglaterra: 'Inglaterra',
  France: 'França',
  França: 'França',
  Denmark: 'Dinamarca',
  Dinamarca: 'Dinamarca',
  Croatia: 'Croácia',
  Croácia: 'Croácia',
  Morocco: 'Marrocos',
  Marrocos: 'Marrocos',
  'DR Congo': 'RD Congo',
};

export interface PlayerMetaOverride {
  knownName?: string;
  position?: PlayerPosition;
  secondaryPositions?: PlayerPosition[];
  ambidextrous?: boolean;
  overall?: number;
  appearance?: PlayerAppearance;
}

/** Auditoria profunda de OVR realistas estilo EA FC/FIFA + nomes conhecidos + posições reais PE/PD e ambidestros */
export const PLAYER_OVERRIDES: Record<string, PlayerMetaOverride> = {
  // === FLAMENGO ===
  'Agustín Rossi': { knownName: 'Rossi', position: 'GOL', secondaryPositions: [], overall: 81, appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  'Andrew': { knownName: 'Andrew', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Dyogo Alves': { knownName: 'Dyogo Alves', position: 'GOL', secondaryPositions: [], overall: 68 },
  'Giorgian de Arrascaeta': { knownName: 'Arrascaeta', position: 'MEI', secondaryPositions: ['PE', 'MC'], overall: 84, appearance: { skin: 1, hairStyle: 1, hairColor: '#2B1D14', beard: true } },
  'Lucas Paquetá': { knownName: 'Paquetá', position: 'MEI', secondaryPositions: ['MC', 'PD', 'PE'], overall: 83, appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: true } },
  'Pedro': { knownName: 'Pedro', position: 'CA', secondaryPositions: [], overall: 82, appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  'Léo Ortiz': { knownName: 'Léo Ortiz', position: 'ZAG', secondaryPositions: ['VOL'], overall: 81, appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  'Nicolás de la Cruz': { knownName: 'De la Cruz', position: 'MC', secondaryPositions: ['MEI', 'VOL'], overall: 81 },
  'Samuel Lino': { knownName: 'S. Lino', position: 'PE', secondaryPositions: ['LE', 'MEI'], overall: 81 },
  'Jorginho': { knownName: 'Jorginho', position: 'VOL', secondaryPositions: ['MC'], overall: 80, appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  'Léo Pereira': { knownName: 'Léo Pereira', position: 'ZAG', secondaryPositions: ['LE'], overall: 80, appearance: { skin: 1, hairStyle: 1, hairColor: '#4A2F1D', beard: true } },
  'Erick Pulgar': { knownName: 'Pulgar', position: 'VOL', secondaryPositions: ['MC', 'ZAG'], overall: 79, appearance: { skin: 1, hairStyle: 1, hairColor: '#111317', beard: true } },
  'Danilo': { knownName: 'Danilo', position: 'LD', secondaryPositions: ['ZAG', 'LE'], overall: 79, appearance: { skin: 3, hairStyle: 0, hairColor: '#111317', beard: true } },
  'Saúl Ñíguez': { knownName: 'Saúl', position: 'MC', secondaryPositions: ['VOL', 'MEI'], overall: 79 },
  'Alex Sandro': { knownName: 'Alex Sandro', position: 'LE', secondaryPositions: ['ZAG'], overall: 79, appearance: { skin: 3, hairStyle: 0, hairColor: '#111317', beard: true } },
  'Guillermo Varela': { knownName: 'Varela', position: 'LD', secondaryPositions: ['LE', 'ZAG'], overall: 78, appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  'Ayrton Lucas': { knownName: 'Ayrton Lucas', position: 'LE', secondaryPositions: ['PE'], overall: 78, appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: false } },
  'Bruno Henrique': { knownName: 'B. Henrique', position: 'PE', secondaryPositions: ['PD', 'CA'], ambidextrous: true, overall: 78, appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: false } },
  'Vitão': { knownName: 'Vitão', position: 'ZAG', secondaryPositions: [], overall: 78 },
  'Jorge Carrascal': { knownName: 'Carrascal', position: 'MEI', secondaryPositions: ['PE', 'PD'], overall: 78 },
  'Emerson Royal': { knownName: 'E. Royal', position: 'LD', secondaryPositions: ['ZAG'], overall: 77, appearance: { skin: 4, hairStyle: 1, hairColor: '#111317', beard: false } },
  'Luiz Araújo': { knownName: 'L. Araújo', position: 'PD', secondaryPositions: ['MEI'], overall: 78 },
  'Gonzalo Plata': { knownName: 'Plata', position: 'PD', secondaryPositions: ['PE', 'MEI'], ambidextrous: true, overall: 78 },
  'Evertton Araújo': { knownName: 'E. Araújo', position: 'VOL', secondaryPositions: ['MC'], overall: 75 },
  'Anthony Valencia': { knownName: 'A. Valencia', position: 'PD', secondaryPositions: ['PE', 'CA'], overall: 74 },
  'Joaquin Freitas': { knownName: 'J. Freitas', position: 'CA', secondaryPositions: ['PE'], overall: 72 },
  'Diego Reyes': { knownName: 'Diego Reyes', position: 'CA', secondaryPositions: [], overall: 72 },
  'Daniel Sales': { knownName: 'D. Sales', position: 'LD', secondaryPositions: ['ZAG'], overall: 69 },
  'João Victor': { knownName: 'João Victor', position: 'ZAG', secondaryPositions: [], overall: 70 },
  'Luiz Felipe': { knownName: 'Luiz Felipe', position: 'MEI', secondaryPositions: ['MC'], overall: 68 },

  // === PALMEIRAS ===
  'Carlos Miguel': { knownName: 'Carlos Miguel', position: 'GOL', secondaryPositions: [], overall: 80 },
  'Marcelo Lomba': { knownName: 'M. Lomba', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Luiz Fernando': { knownName: 'L. Fernando', position: 'GOL', secondaryPositions: [], overall: 67 },
  'Gustavo Gómez': { knownName: 'G. Gómez', position: 'ZAG', secondaryPositions: [], overall: 82, appearance: { skin: 2, hairStyle: 3, hairColor: '#111317', beard: true } },
  'Jhon Arias': { knownName: 'Jhon Arias', position: 'PD', secondaryPositions: ['PE', 'MEI'], ambidextrous: true, overall: 82 },
  'Andreas Pereira': { knownName: 'A. Pereira', position: 'MEI', secondaryPositions: ['MC', 'VOL'], overall: 81 },
  'Murilo': { knownName: 'Murilo', position: 'ZAG', secondaryPositions: [], overall: 80 },
  'Joaquín Piquerez': { knownName: 'Piquerez', position: 'LE', secondaryPositions: ['ZAG'], overall: 80 },
  'Raphael Veiga': { knownName: 'R. Veiga', position: 'MEI', secondaryPositions: ['MC', 'PD'], overall: 80, appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  'Aníbal Moreno': { knownName: 'A. Moreno', position: 'VOL', secondaryPositions: ['MC'], overall: 80 },
  'Richard Ríos': { knownName: 'R. Ríos', position: 'MC', secondaryPositions: ['VOL', 'MEI'], overall: 79 },
  'Vitor Roque': { knownName: 'V. Roque', position: 'CA', secondaryPositions: ['PE', 'PD'], overall: 79 },
  'Felipe Anderson': { knownName: 'F. Anderson', position: 'PD', secondaryPositions: ['PE', 'MEI'], ambidextrous: true, overall: 79 },
  'Paulinho': { knownName: 'Paulinho', position: 'CA', secondaryPositions: ['PE'], overall: 79 },
  'Maurício': { knownName: 'Maurício', position: 'MEI', secondaryPositions: ['PD'], overall: 78 },
  'Marlon Freitas': { knownName: 'M. Freitas', position: 'VOL', secondaryPositions: ['MC'], overall: 78 },
  'José Manuel López': { knownName: 'Flaco López', position: 'CA', secondaryPositions: ['PD'], overall: 78 },
  'Emiliano Martínez': { knownName: 'E. Martínez', position: 'VOL', secondaryPositions: ['MC'], overall: 77 },
  'Agustín Giay': { knownName: 'Giay', position: 'LD', secondaryPositions: ['MC'], overall: 76 },
  'Khellven': { knownName: 'Khellven', position: 'LD', secondaryPositions: ['PD'], overall: 76 },
  'Bruno Fuchs': { knownName: 'B. Fuchs', position: 'ZAG', secondaryPositions: [], overall: 76 },
  'Alexander Barboza': { knownName: 'Barboza', position: 'ZAG', secondaryPositions: [], overall: 78 },
  'Ramón Sosa': { knownName: 'R. Sosa', position: 'PE', secondaryPositions: ['PD'], overall: 78 },

  // === ATLÉTICO-MG ===
  'Éverson': { knownName: 'Éverson', position: 'GOL', secondaryPositions: [], overall: 80 },
  'Gabriel Delfim': { knownName: 'G. Delfim', position: 'GOL', secondaryPositions: [], overall: 70 },
  'Pedro Cobra': { knownName: 'P. Cobra', position: 'GOL', secondaryPositions: [], overall: 67 },
  'Gustavo Scarpa': { knownName: 'G. Scarpa', position: 'MEI', secondaryPositions: ['PD', 'MC'], overall: 79 },
  'Renan Lodi': { knownName: 'Renan Lodi', position: 'LE', secondaryPositions: ['PE'], overall: 79 },
  'Lyanco': { knownName: 'Lyanco', position: 'ZAG', secondaryPositions: ['LD'], overall: 78 },
  'Fred': { knownName: 'Fred', position: 'MC', secondaryPositions: ['VOL'], overall: 78 },
  'Mateo Cassierra': { knownName: 'Cassierra', position: 'CA', secondaryPositions: [], overall: 78 },
  'Alan Franco': { knownName: 'Alan Franco', position: 'VOL', secondaryPositions: ['MC'], overall: 77 },
  'Angelo Preciado': { knownName: 'A. Preciado', position: 'LD', secondaryPositions: ['PD'], overall: 77 },
  'Dudu': { knownName: 'Dudu', position: 'PE', secondaryPositions: ['PD', 'MEI'], ambidextrous: true, overall: 77 },
  'Bernard': { knownName: 'Bernard', position: 'MEI', secondaryPositions: ['PE', 'PD'], overall: 76 },
  'Reinier': { knownName: 'Reinier', position: 'MEI', secondaryPositions: ['CA', 'PE'], overall: 75 },
  'Tomás Cuello': { knownName: 'Cuello', position: 'PE', secondaryPositions: ['PD'], ambidextrous: true, overall: 76 },
  'Alan Minda': { knownName: 'Alan Minda', position: 'PD', secondaryPositions: ['PE', 'CA'], overall: 75 },
  'Thiago Borbas': { knownName: 'T. Borbas', position: 'CA', secondaryPositions: [], overall: 74 },

  // === BOTAFOGO ===
  'Gabriel Batista': { knownName: 'G. Batista', position: 'GOL', secondaryPositions: [], overall: 76 },
  'Warleson': { knownName: 'Warleson', position: 'GOL', secondaryPositions: [], overall: 73 },
  'Raul': { knownName: 'Raul', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Cristhian Loor': { knownName: 'C. Loor', position: 'GOL', secondaryPositions: [], overall: 70 },
  'Alex Telles': { knownName: 'Alex Telles', position: 'LE', secondaryPositions: ['PE'], overall: 79 },
  'Hakim Ziyech': { knownName: 'Ziyech', position: 'MEI', secondaryPositions: ['PD'], overall: 79 },
  'Arthur Cabral': { knownName: 'A. Cabral', position: 'CA', secondaryPositions: [], overall: 78 },
  'Cristian Medina': { knownName: 'Medina', position: 'MC', secondaryPositions: ['MEI', 'VOL'], overall: 78 },
  'Nahuel Ferraresi': { knownName: 'Ferraresi', position: 'ZAG', secondaryPositions: ['LD'], overall: 77 },
  'Vitinho': { knownName: 'Vitinho', position: 'LD', secondaryPositions: ['LE'], overall: 77 },
  'Allan': { knownName: 'Allan', position: 'VOL', secondaryPositions: ['MC'], overall: 77 },
  'Júnior Santos': { knownName: 'Jr. Santos', position: 'PD', secondaryPositions: ['CA'], overall: 77 },
  'Matheus Martins': { knownName: 'M. Martins', position: 'PE', secondaryPositions: ['PD'], overall: 76 },
  'Arthur Chaves': { knownName: 'A. Chaves', position: 'ZAG', secondaryPositions: [], overall: 75 },
  'Fernando Marçal': { knownName: 'Marçal', position: 'LE', secondaryPositions: ['ZAG'], overall: 74 },

  // === SÃO PAULO ===
  'Rafael': { knownName: 'Rafael', position: 'GOL', secondaryPositions: [], overall: 80 },
  'Young': { knownName: 'Young', position: 'GOL', secondaryPositions: [], overall: 70 },
  'Felipe Preis': { knownName: 'F. Preis', position: 'GOL', secondaryPositions: [], overall: 67 },
  'Lucas Moura': { knownName: 'Lucas Moura', position: 'MEI', secondaryPositions: ['PD', 'PE', 'CA'], ambidextrous: true, overall: 80, appearance: { skin: 2, hairStyle: 0, hairColor: '#111317', beard: true } },
  'Jonathan Calleri': { knownName: 'Calleri', position: 'CA', secondaryPositions: [], overall: 79 },
  'Robert Arboleda': { knownName: 'Arboleda', position: 'ZAG', secondaryPositions: [], overall: 79 },
  'Pablo Maia': { knownName: 'Pablo Maia', position: 'VOL', secondaryPositions: ['MC'], overall: 78 },
  'Marcos Antonio': { knownName: 'M. Antonio', position: 'MC', secondaryPositions: ['VOL'], overall: 78 },
  'Wendell': { knownName: 'Wendell', position: 'LE', secondaryPositions: ['PE'], overall: 78 },
  'Alan Franco (SAO)': { knownName: 'Alan Franco', position: 'ZAG', secondaryPositions: [], overall: 78 },
  'Luciano': { knownName: 'Luciano', position: 'CA', secondaryPositions: ['MEI', 'PE'], overall: 78 },
  'Enzo Díaz': { knownName: 'Enzo Díaz', position: 'LE', secondaryPositions: ['ZAG'], overall: 77 },
  'Rafael Tolói': { knownName: 'R. Tolói', position: 'ZAG', secondaryPositions: ['LD'], overall: 77 },
  'Cauly': { knownName: 'Cauly', position: 'MEI', secondaryPositions: ['PE', 'PD'], overall: 77 },
  'Ferreira': { knownName: 'Ferreira', position: 'PE', secondaryPositions: ['PD', 'MEI'], ambidextrous: true, overall: 77 },
  'Tetê': { knownName: 'Tetê', position: 'PD', secondaryPositions: ['MEI'], overall: 77 },
  'Artur': { knownName: 'Artur', position: 'PD', secondaryPositions: ['PE'], overall: 76 },
  'André Silva': { knownName: 'André Silva', position: 'CA', secondaryPositions: ['PD'], overall: 76 },
  'Cédric Soares': { knownName: 'Cédric', position: 'LD', secondaryPositions: ['LE'], overall: 75 },

  // === INTERNACIONAL ===
  'Sergio Rochet': { knownName: 'Rochet', position: 'GOL', secondaryPositions: [], overall: 80 },
  'Anthoni': { knownName: 'Anthoni', position: 'GOL', secondaryPositions: [], overall: 73 },
  'Matheus Cunha (GOL)': { knownName: 'M. Cunha', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Kauan': { knownName: 'Kauan', position: 'GOL', secondaryPositions: [], overall: 69 },
  'Alan Patrick': { knownName: 'Alan Patrick', position: 'MEI', secondaryPositions: ['MC'], overall: 81 },
  'Rafael Borré': { knownName: 'R. Borré', position: 'CA', secondaryPositions: ['PD'], overall: 79 },
  'Alexandro Bernabéi': { knownName: 'Bernabéi', position: 'LE', secondaryPositions: ['PE'], overall: 78 },
  'Guillermo Maripán': { knownName: 'Maripán', position: 'ZAG', secondaryPositions: [], overall: 78 },
  'Johan Carbonero': { knownName: 'Carbonero', position: 'PE', secondaryPositions: ['PD'], overall: 77 },
  'Antonio Sanabria': { knownName: 'Sanabria', position: 'CA', secondaryPositions: [], overall: 77 },
  'Thiago Maia': { knownName: 'Thiago Maia', position: 'VOL', secondaryPositions: ['MC'], overall: 76 },
  'Bruno Tabata': { knownName: 'B. Tabata', position: 'MEI', secondaryPositions: ['PD'], overall: 76 },
  'Alerrandro': { knownName: 'Alerrandro', position: 'CA', secondaryPositions: [], overall: 76 },
  'Vitinho (INT)': { knownName: 'Vitinho', position: 'PE', secondaryPositions: ['PD', 'CA'], ambidextrous: true, overall: 75 },
  'Bruno Henrique Corsini': { knownName: 'B. Henrique', position: 'MC', secondaryPositions: ['VOL'], overall: 75 },
  'Gabriel Mercado': { knownName: 'Mercado', position: 'ZAG', secondaryPositions: ['LD'], overall: 75 },

  // === GRÊMIO ===
  'Weverton': { knownName: 'Weverton', position: 'GOL', secondaryPositions: [], overall: 80, appearance: { skin: 3, hairStyle: 0, hairColor: '#111317', beard: true } },
  'Gabriel Grando': { knownName: 'G. Grando', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Thiago Beltrame': { knownName: 'T. Beltrame', position: 'GOL', secondaryPositions: [], overall: 69 },
  'Mathías Villasanti': { knownName: 'Villasanti', position: 'VOL', secondaryPositions: ['MC'], overall: 80 },
  'Martin Braithwaite': { knownName: 'Braithwaite', position: 'CA', secondaryPositions: ['PE'], overall: 78 },
  'Cristian Pavón': { knownName: 'Pavón', position: 'PD', secondaryPositions: ['PE', 'MEI'], ambidextrous: true, overall: 77 },
  'Francis Amuzu': { knownName: 'Amuzu', position: 'PE', secondaryPositions: ['PD'], overall: 76 },
  'Wálter Kannemann': { knownName: 'Kannemann', position: 'ZAG', secondaryPositions: [], overall: 77 },
  'Marlon': { knownName: 'Marlon', position: 'LE', secondaryPositions: [], overall: 77 },
  'João Pedro (GRE)': { knownName: 'João Pedro', position: 'LD', secondaryPositions: [], overall: 76 },
  'Marcos Rocha': { knownName: 'M. Rocha', position: 'LD', secondaryPositions: ['ZAG'], overall: 75 },

  // === CRUZEIRO ===
  'Cássio': { knownName: 'Cássio', position: 'GOL', secondaryPositions: [], overall: 79, appearance: { skin: 0, hairStyle: 4, hairColor: '#2B1D14', beard: true } },
  'Leó Aragão': { knownName: 'L. Aragão', position: 'GOL', secondaryPositions: [], overall: 71 },
  'Otávio Costa': { knownName: 'O. Costa', position: 'GOL', secondaryPositions: [], overall: 67 },
  'Gerson': { knownName: 'Gerson', position: 'MC', secondaryPositions: ['MEI', 'VOL'], overall: 82 },
  'Matheus Pereira': { knownName: 'M. Pereira', position: 'MEI', secondaryPositions: ['PD', 'MC'], overall: 81 },
  'Fabrício Bruno': { knownName: 'F. Bruno', position: 'ZAG', secondaryPositions: [], overall: 80 },
  'Luis Sinisterra': { knownName: 'Sinisterra', position: 'PE', secondaryPositions: ['PD', 'MEI'], ambidextrous: true, overall: 80 },
  'Kaio Jorge': { knownName: 'Kaio Jorge', position: 'CA', secondaryPositions: ['PE'], overall: 78 },
  'Lucho Rodríguez': { knownName: 'L. Rodríguez', position: 'CA', secondaryPositions: ['PD'], overall: 78 },
  'Gabriel Pec': { knownName: 'Gabriel Pec', position: 'PD', secondaryPositions: ['PE'], overall: 77 },
  'Matheus Henrique': { knownName: 'M. Henrique', position: 'MC', secondaryPositions: ['VOL'], overall: 78 },
  'William': { knownName: 'William', position: 'LD', secondaryPositions: ['LE'], overall: 78 },
  'Kaiki': { knownName: 'Kaiki', position: 'LE', secondaryPositions: [], overall: 77 },
  'Matías Viña': { knownName: 'Viña', position: 'LE', secondaryPositions: ['ZAG'], overall: 77 },
  'Lucas Romero': { knownName: 'L. Romero', position: 'VOL', secondaryPositions: ['MC'], overall: 77 },
  'Lucas Villalba (CRU)': { knownName: 'L. Villalba', position: 'ZAG', secondaryPositions: ['LE'], overall: 76 },
  'Wesley Gassova': { knownName: 'Wesley', position: 'PE', secondaryPositions: ['PD', 'CA'], overall: 75 },
  'Fagner': { knownName: 'Fagner', position: 'LD', secondaryPositions: [], overall: 75 },

  // === CORINTHIANS ===
  'Hugo Souza': { knownName: 'Hugo Souza', position: 'GOL', secondaryPositions: [], overall: 80 },
  'Kauê': { knownName: 'Kauê', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Felipe Longo': { knownName: 'F. Longo', position: 'GOL', secondaryPositions: [], overall: 69 },
  'Memphis Depay': { knownName: 'Depay', position: 'CA', secondaryPositions: ['PE', 'MEI'], overall: 81, appearance: { skin: 3, hairStyle: 7, hairColor: '#111317', beard: true, headband: true } },
  'Rodrigo Garro': { knownName: 'Garro', position: 'MEI', secondaryPositions: ['MC'], overall: 80 },
  'Yuri Alberto': { knownName: 'Yuri Alberto', position: 'CA', secondaryPositions: ['PD'], overall: 80 },
  'Matheuzinho': { knownName: 'Matheuzinho', position: 'LD', secondaryPositions: ['PD'], overall: 78 },
  'Breno Bidon': { knownName: 'B. Bidon', position: 'MC', secondaryPositions: ['VOL', 'MEI'], overall: 77 },
  'Matheus Bidu': { knownName: 'M. Bidu', position: 'LE', secondaryPositions: [], overall: 76 },
  'Raniele': { knownName: 'Raniele', position: 'VOL', secondaryPositions: ['ZAG'], overall: 76 },
  'André Carrillo': { knownName: 'Carrillo', position: 'PD', secondaryPositions: ['PE', 'MEI', 'MC'], ambidextrous: true, overall: 76 },
  'Kaio César': { knownName: 'Kaio César', position: 'PD', secondaryPositions: ['MEI'], overall: 75 },
  'João Pedro Tchoca': { knownName: 'Tchoca', position: 'ZAG', secondaryPositions: [], overall: 74 },
  'Vitinho (COR)': { knownName: 'Vitinho', position: 'PE', secondaryPositions: ['PD', 'CA'], ambidextrous: true, overall: 74 },

  // === BAHIA ===
  'Léo': { knownName: 'Léo', position: 'GOL', secondaryPositions: [], overall: 76 },
  'Ronaldo (BAH)': { knownName: 'Ronaldo', position: 'GOL', secondaryPositions: [], overall: 75 },
  'Victor': { knownName: 'Victor', position: 'GOL', secondaryPositions: [], overall: 68 },
  'Jean Lucas': { knownName: 'Jean Lucas', position: 'MC', secondaryPositions: ['VOL', 'MEI'], overall: 78 },
  'Éverton Ribeiro': { knownName: 'E. Ribeiro', position: 'MEI', secondaryPositions: ['MC', 'PD'], overall: 77 },
  'Caio Alexandre': { knownName: 'C. Alexandre', position: 'VOL', secondaryPositions: ['MC'], overall: 77 },
  'Luciano Juba': { knownName: 'L. Juba', position: 'LE', secondaryPositions: ['PE'], overall: 77 },
  'Santiago Ramos Mingo': { knownName: 'Ramos Mingo', position: 'ZAG', secondaryPositions: ['LE'], overall: 77 },
  'Gabriel Xavier': { knownName: 'G. Xavier', position: 'ZAG', secondaryPositions: [], overall: 76 },
  'Erick Pulga': { knownName: 'E. Pulga', position: 'PE', secondaryPositions: ['PD'], overall: 76 },
  'Ademir': { knownName: 'Ademir', position: 'PD', secondaryPositions: ['PE'], overall: 75 },
  'Rodrigo Nestor': { knownName: 'R. Nestor', position: 'MC', secondaryPositions: ['MEI'], overall: 76 },
  'Willian José': { knownName: 'Willian José', position: 'CA', secondaryPositions: [], overall: 76 },

  // === ATHLETICO-PR ===
  'Santos': { knownName: 'Santos', position: 'GOL', secondaryPositions: [], overall: 77 },
  'Mycael': { knownName: 'Mycael', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Carlos Eduardo': { knownName: 'C. Eduardo', position: 'GOL', secondaryPositions: [], overall: 68 },
  'Lucas Esquivel': { knownName: 'Esquivel', position: 'LE', secondaryPositions: ['ZAG'], overall: 77 },
  'Bruno Zapelli': { knownName: 'Zapelli', position: 'MEI', secondaryPositions: ['MC'], overall: 76 },
  'Léo Pelé': { knownName: 'Léo', position: 'ZAG', secondaryPositions: ['LE'], overall: 75 },
  'Juan Portilla': { knownName: 'Portilla', position: 'VOL', secondaryPositions: ['MC'], overall: 75 },
  'Stiven Mendoza': { knownName: 'Mendoza', position: 'PE', secondaryPositions: ['PD'], ambidextrous: true, overall: 75 },

  // === FLUMINENSE ===
  'Fábio': { knownName: 'Fábio', position: 'GOL', secondaryPositions: [], overall: 79 },
  'Vitor Eudes': { knownName: 'Vitor Eudes', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Marcelo Pitaluga': { knownName: 'Pitaluga', position: 'GOL', secondaryPositions: [], overall: 71 },
  'Thiago Silva': { knownName: 'Thiago Silva', position: 'ZAG', secondaryPositions: [], overall: 81 },
  'Hulk': { knownName: 'Hulk', position: 'CA', secondaryPositions: ['PD'], overall: 80, appearance: { skin: 2, hairStyle: 0, hairColor: '#111317', beard: true } },
  'Guilherme Arana': { knownName: 'G. Arana', position: 'LE', secondaryPositions: ['MEI'], overall: 80 },
  'Luciano Acosta': { knownName: 'L. Acosta', position: 'MEI', secondaryPositions: ['PE'], overall: 80 },
  'Martinelli': { knownName: 'Martinelli', position: 'MC', secondaryPositions: ['VOL'], overall: 78 },
  'Jefferson Savarino': { knownName: 'Savarino', position: 'MEI', secondaryPositions: ['PE', 'PD'], ambidextrous: true, overall: 78 },
  'Kevin Serna': { knownName: 'K. Serna', position: 'PE', secondaryPositions: ['PD'], overall: 76 },
  'Yeferson Soteldo': { knownName: 'Soteldo', position: 'PE', secondaryPositions: ['PD', 'MEI'], ambidextrous: true, overall: 77 },
  'Agustín Canobbio': { knownName: 'Canobbio', position: 'PE', secondaryPositions: ['PD'], ambidextrous: true, overall: 77 },
  'Hércules': { knownName: 'Hércules', position: 'VOL', secondaryPositions: ['MC'], overall: 77 },
  'Germán Cano': { knownName: 'Cano', position: 'CA', secondaryPositions: [], overall: 77 },
  'Juan Pablo Freytes': { knownName: 'Freytes', position: 'ZAG', secondaryPositions: ['LE'], overall: 76 },
  'Facundo Bernal': { knownName: 'F. Bernal', position: 'VOL', secondaryPositions: ['MC'], overall: 76 },
  'Ganso': { knownName: 'Ganso', position: 'MEI', secondaryPositions: ['MC'], overall: 76 },
  'Lima (FLU)': { knownName: 'Lima', position: 'MEI', secondaryPositions: ['MC', 'PD'], overall: 75 },

  // === VASCO ===
  'Léo Jardim': { knownName: 'Léo Jardim', position: 'GOL', secondaryPositions: [], overall: 80 },
  'Daniel Fuzato': { knownName: 'D. Fuzato', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Lucas Piton': { knownName: 'Lucas Piton', position: 'LE', secondaryPositions: ['PE'], overall: 77 },
  'Carlos Cuesta': { knownName: 'C. Cuesta', position: 'ZAG', secondaryPositions: [], overall: 77 },
  'Paulo Henrique': { knownName: 'P. Henrique', position: 'LD', secondaryPositions: [], overall: 77 },
  'Santiago Sosa': { knownName: 'S. Sosa', position: 'VOL', secondaryPositions: ['ZAG'], overall: 77 },
  'Cuiabano': { knownName: 'Cuiabano', position: 'LE', secondaryPositions: ['PE'], overall: 76 },
  'Robert Renan': { knownName: 'Robert Renan', position: 'ZAG', secondaryPositions: ['LE'], overall: 76 },
  'Adson': { knownName: 'Adson', position: 'PD', secondaryPositions: ['MEI'], overall: 75 },
  'David': { knownName: 'David', position: 'PE', secondaryPositions: ['CA'], overall: 75 },
  'Andrés Gómez': { knownName: 'A. Gómez', position: 'PD', secondaryPositions: ['PE'], overall: 75 },
  'Pablo Vegetti': { knownName: 'Vegetti', position: 'CA', secondaryPositions: [], overall: 77 },

  // === RB BRAGANTINO ===
  'Cleiton': { knownName: 'Cleiton', position: 'GOL', secondaryPositions: [], overall: 77 },
  'Tiago Volpi': { knownName: 'T. Volpi', position: 'GOL', secondaryPositions: [], overall: 76 },
  'Fabrício': { knownName: 'Fabrício', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Juninho Capixaba': { knownName: 'J. Capixaba', position: 'LE', secondaryPositions: ['MEI'], overall: 77 },
  'Eduardo Sasha': { knownName: 'E. Sasha', position: 'CA', secondaryPositions: ['PE'], overall: 76 },
  'Isidro Pitta': { knownName: 'Isidro Pitta', position: 'CA', secondaryPositions: [], overall: 76 },
  'Lucas Barbosa': { knownName: 'L. Barbosa', position: 'PD', secondaryPositions: ['MEI'], overall: 75 },
  'Eric Ramires': { knownName: 'E. Ramires', position: 'MC', secondaryPositions: ['VOL', 'MEI'], overall: 75 },
  'Alix Vinicius': { knownName: 'Alix', position: 'ZAG', secondaryPositions: [], overall: 74 },
  'Pedro Henrique': { knownName: 'P. Henrique', position: 'ZAG', secondaryPositions: [], overall: 74 },

  // === SANTOS ===
  'Gabriel Brazão': { knownName: 'G. Brazão', position: 'GOL', secondaryPositions: [], overall: 78 },
  'João Paulo (SAN)': { knownName: 'João Paulo', position: 'GOL', secondaryPositions: [], overall: 76 },
  'Diogenes': { knownName: 'Diogenes', position: 'GOL', secondaryPositions: [], overall: 70 },
  'Neymar': { knownName: 'Neymar Jr.', position: 'MEI', secondaryPositions: ['PE', 'CA'], overall: 83, appearance: { skin: 2, hairStyle: 1, hairColor: '#D4A84F', beard: true } },
  'Gabriel Barbosa': { knownName: 'Gabigol', position: 'CA', secondaryPositions: ['PD'], overall: 80 },
  'Everton': { knownName: 'Cebolinha', position: 'PE', secondaryPositions: ['MEI'], overall: 79 },
  'Philippe Coutinho': { knownName: 'Coutinho', position: 'MEI', secondaryPositions: ['PE', 'MC'], overall: 78 },
  'Álvaro Barreal': { knownName: 'Barreal', position: 'PE', secondaryPositions: ['LE', 'MEI'], overall: 77 },
  'Benjamín Rollheiser': { knownName: 'Rollheiser', position: 'PD', secondaryPositions: ['MEI'], overall: 77 },
  'Rony': { knownName: 'Rony', position: 'CA', secondaryPositions: ['PE', 'PD'], ambidextrous: true, overall: 76 },
  'Gabriel Menino': { knownName: 'G. Menino', position: 'MC', secondaryPositions: ['LD', 'VOL'], overall: 76 },
  'Willian Arão': { knownName: 'W. Arão', position: 'VOL', secondaryPositions: ['ZAG'], overall: 76 },
  'Adonis Frías': { knownName: 'A. Frías', position: 'ZAG', secondaryPositions: [], overall: 76 },
  'Mayke': { knownName: 'Mayke', position: 'LD', secondaryPositions: [], overall: 75 },
  'Igor Vinícius': { knownName: 'I. Vinícius', position: 'LD', secondaryPositions: [], overall: 75 },

  // === VITÓRIA ===
  'Lucas Arcanjo': { knownName: 'L. Arcanjo', position: 'GOL', secondaryPositions: [], overall: 76 },
  'Thiago Couto': { knownName: 'T. Couto', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Matheuzinho (VIT)': { knownName: 'Matheuzinho', position: 'MEI', secondaryPositions: ['PD', 'PE'], overall: 76 },
  'Gabriel Baralhas': { knownName: 'Baralhas', position: 'VOL', secondaryPositions: ['MC'], overall: 75 },
  'Renato Kayzer': { knownName: 'R. Kayzer', position: 'CA', secondaryPositions: [], overall: 75 },
  'Tomás Pochettino': { knownName: 'Pochettino', position: 'MEI', secondaryPositions: ['MC'], overall: 75 },
  'Marinho': { knownName: 'Marinho', position: 'PD', secondaryPositions: ['PE'], overall: 74 },
  'Luan Cândido': { knownName: 'L. Cândido', position: 'LE', secondaryPositions: ['ZAG'], overall: 74 },
  'Camutanga': { knownName: 'Camutanga', position: 'ZAG', secondaryPositions: [], overall: 74 },
  'Ivan (VIT)': { knownName: 'Ivan', position: 'ZAG', secondaryPositions: [], overall: 71 },

  // === CORITIBA ===
  'Pedro Morisco': { knownName: 'Pedro Morisco', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Pedro Rangel': { knownName: 'Pedro Rangel', position: 'GOL', secondaryPositions: [], overall: 71 },
  'Fabricio Bustos': { knownName: 'F. Bustos', position: 'LD', secondaryPositions: ['LE'], overall: 75 },
  'Tinga': { knownName: 'Tinga', position: 'LD', secondaryPositions: ['ZAG'], overall: 72 },
  'Maicon': { knownName: 'Maicon', position: 'ZAG', secondaryPositions: [], overall: 73 },
  'Rodrigo Moledo': { knownName: 'R. Moledo', position: 'ZAG', secondaryPositions: [], overall: 73 },
  'Bruno Melo': { knownName: 'Bruno Melo', position: 'ZAG', secondaryPositions: ['LE'], overall: 72 },
  'Felipe Jonatan': { knownName: 'F. Jonatan', position: 'LE', secondaryPositions: ['MEI'], overall: 74 },
  'Sebastián Gómez': { knownName: 'S. Gómez', position: 'VOL', secondaryPositions: ['MC'], overall: 74 },
  'Nicolás Fonseca': { knownName: 'N. Fonseca', position: 'VOL', secondaryPositions: ['MC'], overall: 74 },
  'Josué': { knownName: 'Josué', position: 'MEI', secondaryPositions: ['MC'], overall: 75 },
  'Lucas Ronier': { knownName: 'L. Ronier', position: 'PD', secondaryPositions: ['MEI'], overall: 75 },
  'Breno Lopes': { knownName: 'Breno Lopes', position: 'PE', secondaryPositions: ['PD', 'CA'], ambidextrous: true, overall: 74 },
  'Pedro Rocha': { knownName: 'Pedro Rocha', position: 'PE', secondaryPositions: ['CA'], overall: 74 },
  'Keno': { knownName: 'Keno', position: 'PE', secondaryPositions: ['PD'], ambidextrous: true, overall: 74 },
  'Brian Ocampo': { knownName: 'Ocampo', position: 'PE', secondaryPositions: ['MEI'], overall: 74 },
  'Rodrigo Rodrigues': { knownName: 'R. Rodrigues', position: 'CA', secondaryPositions: [], overall: 73 },

  // === MIRASSOL ===
  'Walter': { knownName: 'Walter', position: 'GOL', secondaryPositions: [], overall: 75 },
  'Alex Muralha': { knownName: 'A. Muralha', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Reinaldo': { knownName: 'Reinaldo', position: 'LE', secondaryPositions: ['PE'], overall: 75 },
  'Daniel Borges': { knownName: 'D. Borges', position: 'LD', secondaryPositions: ['LE'], overall: 73 },
  'Igor Formiga': { knownName: 'Igor Formiga', position: 'LD', secondaryPositions: [], overall: 72 },
  'João Victor (MIR)': { knownName: 'João Victor', position: 'ZAG', secondaryPositions: [], overall: 73 },
  'Lucas Oliveira': { knownName: 'L. Oliveira', position: 'ZAG', secondaryPositions: ['VOL'], overall: 73 },
  'Willian Machado': { knownName: 'W. Machado', position: 'ZAG', secondaryPositions: [], overall: 72 },
  'Neto Moura': { knownName: 'Neto Moura', position: 'VOL', secondaryPositions: ['MC'], overall: 74 },
  'Eduardo (MIR)': { knownName: 'Eduardo', position: 'MEI', secondaryPositions: ['MC'], overall: 74 },
  'Shaylon': { knownName: 'Shaylon', position: 'MEI', secondaryPositions: ['PD'], overall: 74 },
  'Chico Kim': { knownName: 'Chico Kim', position: 'MEI', secondaryPositions: ['PE'], overall: 73 },
  'Alesson': { knownName: 'Alesson', position: 'PE', secondaryPositions: ['CA'], overall: 73 },
  'Negueba': { knownName: 'Negueba', position: 'PD', secondaryPositions: [], overall: 73 },
  'Edson Carioca': { knownName: 'E. Carioca', position: 'PE', secondaryPositions: [], overall: 73 },
  'Zé Roberto': { knownName: 'Zé Roberto', position: 'CA', secondaryPositions: [], overall: 73 },
  'André Luis': { knownName: 'André Luis', position: 'CA', secondaryPositions: ['PD'], overall: 73 },

  // === CHAPECOENSE ===
  'Anderson': { knownName: 'Anderson', position: 'GOL', secondaryPositions: [], overall: 73 },
  'Rafael Santos': { knownName: 'R. Santos', position: 'GOL', secondaryPositions: [], overall: 72 },
  'Rafael Thyere': { knownName: 'R. Thyere', position: 'ZAG', secondaryPositions: [], overall: 74 },
  'Bruno Leonardo': { knownName: 'B. Leonardo', position: 'ZAG', secondaryPositions: [], overall: 72 },
  'Bruno Pacheco': { knownName: 'B. Pacheco', position: 'LE', secondaryPositions: [], overall: 74 },
  'Heitor': { knownName: 'Heitor', position: 'LD', secondaryPositions: [], overall: 72 },
  'Marcos Vinicius': { knownName: 'M. Vinicius', position: 'LD', secondaryPositions: [], overall: 72 },
  'Camilo Reijers': { knownName: 'Camilo', position: 'VOL', secondaryPositions: ['MC'], overall: 73 },
  'Higor Meritão': { knownName: 'H. Meritão', position: 'VOL', secondaryPositions: ['MC'], overall: 73 },
  'Giovanni Augusto': { knownName: 'G. Augusto', position: 'MEI', secondaryPositions: ['MC'], overall: 74 },
  'Jean Carlos': { knownName: 'Jean Carlos', position: 'MEI', secondaryPositions: ['PE'], overall: 73 },
  'Yannick Bolasie': { knownName: 'Bolasie', position: 'PE', secondaryPositions: ['PD', 'CA'], ambidextrous: true, overall: 75 },
  'Dylan Borrero': { knownName: 'Borrero', position: 'PD', secondaryPositions: ['MEI'], overall: 74 },
  'Marcinho': { knownName: 'Marcinho', position: 'PD', secondaryPositions: ['CA'], overall: 73 },
  'Perotti': { knownName: 'Perotti', position: 'CA', secondaryPositions: [], overall: 73 },
  'Bruno Tubarão': { knownName: 'B. Tubarão', position: 'PD', secondaryPositions: ['LD'], overall: 72 },

  // === REMO ===
  'Marcelo Rangel': { knownName: 'M. Rangel', position: 'GOL', secondaryPositions: [], overall: 74 },
  'Ivan': { knownName: 'Ivan', position: 'GOL', secondaryPositions: [], overall: 73 },
  'Marllon': { knownName: 'Marllon', position: 'ZAG', secondaryPositions: [], overall: 73 },
  'Zé Ivaldo': { knownName: 'Zé Ivaldo', position: 'ZAG', secondaryPositions: [], overall: 74 },
  'Klaus': { knownName: 'Klaus', position: 'ZAG', secondaryPositions: [], overall: 72 },
  'Matheus Alexandre': { knownName: 'M. Alexandre', position: 'LD', secondaryPositions: [], overall: 73 },
  'Mayk': { knownName: 'Mayk', position: 'LE', secondaryPositions: ['PE'], overall: 73 },
  'Patrick de Paula': { knownName: 'P. de Paula', position: 'VOL', secondaryPositions: ['MC'], overall: 74 },
  'Zé Welison': { knownName: 'Zé Welison', position: 'VOL', secondaryPositions: ['MC'], overall: 73 },
  'Vítor Bueno': { knownName: 'Vítor Bueno', position: 'MEI', secondaryPositions: ['PD'], overall: 74 },
  'Jáderson': { knownName: 'Jáderson', position: 'MC', secondaryPositions: ['MEI'], overall: 72 },
  'Yago Pikachu': { knownName: 'Y. Pikachu', position: 'PD', secondaryPositions: ['LD', 'MEI'], overall: 75 },
  'Alef Manga': { knownName: 'Alef Manga', position: 'PE', secondaryPositions: ['PD', 'CA'], ambidextrous: true, overall: 74 },
  'Jajá': { knownName: 'Jajá', position: 'CA', secondaryPositions: ['PE'], overall: 74 },
  'Gabriel Taliari': { knownName: 'G. Taliari', position: 'CA', secondaryPositions: ['PD'], overall: 73 },
};

const GENERIC_FIRST_NAMES = new Set([
  'guillermo', 'giorgian', 'agustín', 'agustin', 'jonathan', 'germán', 'german',
  'joaquín', 'joaquin', 'pablo', 'philippe', 'dimitri', 'franco', 'martin',
  'nicolás', 'nicolas', 'tomás', 'tomas', 'rodrigo', 'gabriel', 'rafael',
  'matías', 'matias', 'alexander', 'sebastián', 'sebastian', 'federico',
  'julian', 'julián', 'cristian', 'cristián', 'emiliano', 'facundo', 'gonzalo',
]);

export function resolveKnownName(fullName: string): string {
  if (PLAYER_OVERRIDES[fullName]?.knownName) {
    return PLAYER_OVERRIDES[fullName].knownName!;
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];

  const firstLower = parts[0].toLowerCase();
  if (GENERIC_FIRST_NAMES.has(firstLower)) {
    return parts[parts.length - 1];
  }
  if (fullName.length <= 13) return fullName;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function mapRawPosition(raw: string, index: number): { pos: PlayerPosition; sec: PlayerPosition[] } {
  switch (raw) {
    case 'GOL':
      return { pos: 'GOL', sec: [] };
    case 'ZAG':
      return { pos: 'ZAG', sec: index % 4 === 0 ? ['VOL'] : [] };
    case 'LAT':
      return index % 2 === 0
        ? { pos: 'LD', sec: ['LE'] }
        : { pos: 'LE', sec: ['LD'] };
    case 'MEI':
      if (index % 3 === 0) return { pos: 'VOL', sec: ['MC', 'ZAG'] };
      if (index % 3 === 1) return { pos: 'MC', sec: ['VOL', 'MEI'] };
      return { pos: 'MEI', sec: ['MC', index % 2 === 0 ? 'PE' : 'PD'] };
    case 'ATA':
      if (index % 3 === 0) return { pos: 'PE', sec: ['CA', 'MEI'] };
      if (index % 3 === 1) return { pos: 'PD', sec: ['CA', 'MEI'] };
      return { pos: 'CA', sec: [index % 2 === 0 ? 'PE' : 'PD'] };
    default:
      return { pos: 'MC', sec: ['MEI'] };
  }
}

function realisticFallbackOverall(age: number, tier: 1 | 2 | 3 | 4): number {
  const tierOffset = tier === 1 ? 1 : tier === 4 ? -2 : 0;
  if (age <= 20) return Math.max(65, 67 + tierOffset);
  if (age <= 23) return Math.max(68, 70 + tierOffset);
  return Math.max(70, 73 + tierOffset);
}

interface RawPlayerSeed {
  name: string;
  position: string;
  age: number;
  nationality: string;
  clubKey: string;
}

const REAL_PLAYERS: RawPlayerSeed[] = realPlayersData.players as RawPlayerSeed[];

export interface WorldStarSpec {
  name: string;
  knownName: string;
  position: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  ambidextrous?: boolean;
  overall: number;
  age: number;
  nationality: string;
  currentClubName: string;
  appearance: PlayerAppearance;
}

/** Craques da Europa e do mundo para busca no Mercado FIFA */
export const WORLD_MARKET_PLAYERS: WorldStarSpec[] = [
  { name: 'Kylian Mbappé', knownName: 'Mbappé', position: 'CA', secondaryPositions: ['PE'], overall: 92, age: 27, nationality: 'França', currentClubName: 'Real Madrid', appearance: { skin: 4, hairStyle: 0, hairColor: '#111317', beard: false } },
  { name: 'Erling Haaland', knownName: 'Haaland', position: 'CA', secondaryPositions: [], overall: 92, age: 26, nationality: 'Noruega', currentClubName: 'Manchester City', appearance: { skin: 0, hairStyle: 6, hairColor: '#D4A84F', beard: false, headband: true } },
  { name: 'Vinícius Júnior', knownName: 'Vini Jr.', position: 'PE', secondaryPositions: ['CA'], overall: 91, age: 26, nationality: 'Brasil', currentClubName: 'Real Madrid', appearance: { skin: 4, hairStyle: 2, hairColor: '#111317', beard: false } },
  { name: 'Jude Bellingham', knownName: 'Bellingham', position: 'MEI', secondaryPositions: ['MC', 'CA'], overall: 91, age: 23, nationality: 'Inglaterra', currentClubName: 'Real Madrid', appearance: { skin: 3, hairStyle: 1, hairColor: '#111317', beard: false } },
  { name: 'Rodri Hernández', knownName: 'Rodri', position: 'VOL', secondaryPositions: ['MC', 'ZAG'], overall: 91, age: 30, nationality: 'Espanha', currentClubName: 'Manchester City', appearance: { skin: 0, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  { name: 'Lamine Yamal', knownName: 'L. Yamal', position: 'PD', secondaryPositions: ['MEI'], overall: 90, age: 19, nationality: 'Espanha', currentClubName: 'Barcelona', appearance: { skin: 2, hairStyle: 7, hairColor: '#111317', beard: false } },
  { name: 'Mohamed Salah', knownName: 'Salah', position: 'PD', secondaryPositions: ['CA'], overall: 90, age: 34, nationality: 'Egito', currentClubName: 'Liverpool', appearance: { skin: 2, hairStyle: 2, hairColor: '#111317', beard: true } },
  { name: 'Alisson Becker', knownName: 'Alisson', position: 'GOL', secondaryPositions: [], overall: 90, age: 33, nationality: 'Brasil', currentClubName: 'Liverpool', appearance: { skin: 0, hairStyle: 3, hairColor: '#4A2F1D', beard: true } },
  { name: 'Raphinha Belloli', knownName: 'Raphinha', position: 'PD', secondaryPositions: ['PE', 'MEI'], ambidextrous: true, overall: 89, age: 29, nationality: 'Brasil', currentClubName: 'Barcelona', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: true } },
  { name: 'Harry Kane', knownName: 'Harry Kane', position: 'CA', secondaryPositions: ['MEI'], overall: 89, age: 33, nationality: 'Inglaterra', currentClubName: 'Bayern de Munique', appearance: { skin: 0, hairStyle: 3, hairColor: '#4A2F1D', beard: true } },
  { name: 'Virgil van Dijk', knownName: 'Van Dijk', position: 'ZAG', secondaryPositions: [], overall: 89, age: 35, nationality: 'Holanda', currentClubName: 'Liverpool', appearance: { skin: 3, hairStyle: 4, hairColor: '#111317', beard: true } },
  { name: 'Thibaut Courtois', knownName: 'Courtois', position: 'GOL', secondaryPositions: [], overall: 89, age: 34, nationality: 'Bélgica', currentClubName: 'Real Madrid', appearance: { skin: 0, hairStyle: 3, hairColor: '#4A2F1D', beard: true } },
  { name: 'Lautaro Martínez', knownName: 'Lautaro', position: 'CA', secondaryPositions: ['PD'], overall: 89, age: 29, nationality: 'Argentina', currentClubName: 'Inter de Milão', appearance: { skin: 1, hairStyle: 1, hairColor: '#111317', beard: false } },
  { name: 'Federico Valverde', knownName: 'Valverde', position: 'MC', secondaryPositions: ['VOL', 'LD'], overall: 89, age: 28, nationality: 'Uruguai', currentClubName: 'Real Madrid', appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: false } },
  { name: 'Bukayo Saka', knownName: 'Saka', position: 'PD', secondaryPositions: ['MEI', 'LE'], overall: 88, age: 25, nationality: 'Inglaterra', currentClubName: 'Arsenal', appearance: { skin: 5, hairStyle: 0, hairColor: '#111317', beard: false } },
  { name: 'Pedri González', knownName: 'Pedri', position: 'MC', secondaryPositions: ['MEI', 'VOL'], overall: 88, age: 24, nationality: 'Espanha', currentClubName: 'Barcelona', appearance: { skin: 0, hairStyle: 3, hairColor: '#2B1D14', beard: false } },
  { name: 'Rodrygo Goes', knownName: 'Rodrygo', position: 'PD', secondaryPositions: ['PE', 'CA', 'MEI'], ambidextrous: true, overall: 88, age: 25, nationality: 'Brasil', currentClubName: 'Real Madrid', appearance: { skin: 3, hairStyle: 1, hairColor: '#111317', beard: false } },
  { name: 'Bruno Guimarães', knownName: 'B. Guimarães', position: 'MC', secondaryPositions: ['VOL'], overall: 88, age: 28, nationality: 'Brasil', currentClubName: 'Newcastle', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: true } },
  { name: 'Gabriel Magalhães', knownName: 'G. Magalhães', position: 'ZAG', secondaryPositions: [], overall: 88, age: 28, nationality: 'Brasil', currentClubName: 'Arsenal', appearance: { skin: 3, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Marquinhos Corrêa', knownName: 'Marquinhos', position: 'ZAG', secondaryPositions: ['VOL', 'LD'], overall: 88, age: 32, nationality: 'Brasil', currentClubName: 'PSG', appearance: { skin: 1, hairStyle: 1, hairColor: '#2B1D14', beard: true } },
  { name: 'Jamal Musiala', knownName: 'Musiala', position: 'MEI', secondaryPositions: ['PE', 'PD', 'MC'], overall: 88, age: 23, nationality: 'Alemanha', currentClubName: 'Bayern de Munique', appearance: { skin: 3, hairStyle: 1, hairColor: '#111317', beard: false } },
  { name: 'Achraf Hakimi', knownName: 'Hakimi', position: 'LD', secondaryPositions: ['LE', 'PD'], overall: 88, age: 28, nationality: 'Marrocos', currentClubName: 'PSG', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: true } },
  { name: 'William Saliba', knownName: 'Saliba', position: 'ZAG', secondaryPositions: [], overall: 88, age: 25, nationality: 'França', currentClubName: 'Arsenal', appearance: { skin: 5, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Cole Palmer', knownName: 'Cole Palmer', position: 'MEI', secondaryPositions: ['PD'], overall: 87, age: 24, nationality: 'Inglaterra', currentClubName: 'Chelsea', appearance: { skin: 0, hairStyle: 3, hairColor: '#4A2F1D', beard: false } },
  { name: 'Julián Álvarez', knownName: 'J. Álvarez', position: 'CA', secondaryPositions: ['PE', 'MEI'], overall: 87, age: 26, nationality: 'Argentina', currentClubName: 'Atlético de Madrid', appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: false } },
  { name: 'Ederson Moraes', knownName: 'Ederson', position: 'GOL', secondaryPositions: [], overall: 87, age: 33, nationality: 'Brasil', currentClubName: 'Manchester City', appearance: { skin: 2, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Murillo Santiago', knownName: 'Murillo', position: 'ZAG', secondaryPositions: [], overall: 84, age: 24, nationality: 'Brasil', currentClubName: 'Nottingham Forest', appearance: { skin: 3, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Estêvão Willian', knownName: 'Estêvão', position: 'PD', secondaryPositions: ['MEI'], overall: 84, age: 19, nationality: 'Brasil', currentClubName: 'Chelsea', appearance: { skin: 3, hairStyle: 2, hairColor: '#111317', beard: false } },
  { name: 'Endrick Felipe', knownName: 'Endrick', position: 'CA', secondaryPositions: ['PD'], overall: 83, age: 20, nationality: 'Brasil', currentClubName: 'Real Madrid', appearance: { skin: 4, hairStyle: 2, hairColor: '#111317', beard: false } },
  { name: 'Savinho Moreira', knownName: 'Savinho', position: 'PD', secondaryPositions: ['PE', 'MEI'], ambidextrous: true, overall: 83, age: 22, nationality: 'Brasil', currentClubName: 'Manchester City', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: false } },
  { name: 'Éder Militão', knownName: 'É. Militão', position: 'ZAG', secondaryPositions: ['LD'], overall: 86, age: 28, nationality: 'Brasil', currentClubName: 'Real Madrid', appearance: { skin: 3, hairStyle: 1, hairColor: '#111317', beard: true } },
  { name: 'Bremer Silva', knownName: 'Bremer', position: 'ZAG', secondaryPositions: [], overall: 86, age: 29, nationality: 'Brasil', currentClubName: 'Juventus', appearance: { skin: 4, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Alphonso Davies', knownName: 'A. Davies', position: 'LE', secondaryPositions: ['PE'], overall: 86, age: 26, nationality: 'Canadá', currentClubName: 'Bayern de Munique', appearance: { skin: 5, hairStyle: 7, hairColor: '#111317', beard: false } },
  { name: 'Matheus Cunha', knownName: 'M. Cunha', position: 'CA', secondaryPositions: ['MEI', 'PE'], overall: 84, age: 27, nationality: 'Brasil', currentClubName: 'Manchester United', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: true } },
  { name: 'Yan Couto', knownName: 'Yan Couto', position: 'LD', secondaryPositions: ['PD'], overall: 81, age: 24, nationality: 'Brasil', currentClubName: 'Borussia Dortmund', appearance: { skin: 2, hairStyle: 1, hairColor: '#D4A84F', beard: false } },
  { name: 'Bento Krepski', knownName: 'Bento', position: 'GOL', secondaryPositions: [], overall: 82, age: 27, nationality: 'Brasil', currentClubName: 'Al-Nassr', appearance: { skin: 0, hairStyle: 3, hairColor: '#2B1D14', beard: true } },

  // América Latina (Libertadores & Sul-Americana)
  { name: 'Franco Mastantuono', knownName: 'Mastantuono', position: 'MEI', secondaryPositions: ['PD'], overall: 80, age: 19, nationality: 'Argentina', currentClubName: 'River Plate', appearance: { skin: 0, hairStyle: 3, hairColor: '#2B1D14', beard: false } },
  { name: 'Paulo Díaz', knownName: 'Paulo Díaz', position: 'ZAG', secondaryPositions: ['LD'], overall: 80, age: 31, nationality: 'Chile', currentClubName: 'River Plate', appearance: { skin: 1, hairStyle: 3, hairColor: '#111317', beard: true } },
  { name: 'Miguel Borja', knownName: 'M. Borja', position: 'CA', secondaryPositions: [], overall: 79, age: 33, nationality: 'Colômbia', currentClubName: 'River Plate', appearance: { skin: 4, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Germán Pezzella', knownName: 'Pezzella', position: 'ZAG', secondaryPositions: [], overall: 79, age: 35, nationality: 'Argentina', currentClubName: 'River Plate', appearance: { skin: 0, hairStyle: 3, hairColor: '#4A2F1D', beard: true } },
  { name: 'Edinson Cavani', knownName: 'Cavani', position: 'CA', secondaryPositions: [], overall: 80, age: 39, nationality: 'Uruguai', currentClubName: 'Boca Juniors', appearance: { skin: 1, hairStyle: 6, hairColor: '#111317', beard: true } },
  { name: 'Miguel Merentiel', knownName: 'Merentiel', position: 'CA', secondaryPositions: ['PE'], overall: 79, age: 30, nationality: 'Uruguai', currentClubName: 'Boca Juniors', appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  { name: 'Kevin Zenón', knownName: 'K. Zenón', position: 'MEI', secondaryPositions: ['PE', 'LE'], overall: 79, age: 25, nationality: 'Argentina', currentClubName: 'Boca Juniors', appearance: { skin: 1, hairStyle: 1, hairColor: '#2B1D14', beard: false } },
  { name: 'Luis Advíncula', knownName: 'Advíncula', position: 'LD', secondaryPositions: ['PD'], overall: 78, age: 36, nationality: 'Peru', currentClubName: 'Boca Juniors', appearance: { skin: 5, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Juanfer Quintero', knownName: 'J. Quintero', position: 'MEI', secondaryPositions: ['PD'], overall: 80, age: 33, nationality: 'Colômbia', currentClubName: 'Racing Club', appearance: { skin: 2, hairStyle: 0, hairColor: '#111317', beard: true } },
  { name: 'Adrián Martínez', knownName: 'Maravilla', position: 'CA', secondaryPositions: [], overall: 79, age: 33, nationality: 'Argentina', currentClubName: 'Racing Club', appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  { name: 'Gastón Martirena', knownName: 'Martirena', position: 'LD', secondaryPositions: ['PD'], overall: 78, age: 26, nationality: 'Uruguai', currentClubName: 'Racing Club', appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: false } },
  { name: 'Leonardo Fernández', knownName: 'Léo Fernández', position: 'MEI', secondaryPositions: ['MC', 'PE'], overall: 80, age: 27, nationality: 'Uruguai', currentClubName: 'Peñarol', appearance: { skin: 1, hairStyle: 1, hairColor: '#2B1D14', beard: true } },
  { name: 'Maximiliano Silvera', knownName: 'M. Silvera', position: 'CA', secondaryPositions: ['PD'], overall: 77, age: 28, nationality: 'Uruguai', currentClubName: 'Peñarol', appearance: { skin: 1, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  { name: 'Sebastián Coates', knownName: 'Coates', position: 'ZAG', secondaryPositions: [], overall: 78, age: 35, nationality: 'Uruguai', currentClubName: 'Nacional', appearance: { skin: 0, hairStyle: 3, hairColor: '#2B1D14', beard: true } },
  { name: 'Nicolás López', knownName: 'Diente López', position: 'CA', secondaryPositions: ['PD', 'MEI'], overall: 78, age: 32, nationality: 'Uruguai', currentClubName: 'Nacional', appearance: { skin: 0, hairStyle: 1, hairColor: '#4A2F1D', beard: false } },
  { name: 'Arturo Vidal', knownName: 'A. Vidal', position: 'VOL', secondaryPositions: ['MC'], overall: 78, age: 39, nationality: 'Chile', currentClubName: 'Colo-Colo', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: true } },
  { name: 'Carlos Palacios', knownName: 'C. Palacios', position: 'MEI', secondaryPositions: ['PE'], overall: 78, age: 25, nationality: 'Chile', currentClubName: 'Colo-Colo', appearance: { skin: 2, hairStyle: 1, hairColor: '#111317', beard: false } },
  { name: 'Brayan Cortés', knownName: 'B. Cortés', position: 'GOL', secondaryPositions: [], overall: 78, age: 31, nationality: 'Chile', currentClubName: 'Colo-Colo', appearance: { skin: 2, hairStyle: 3, hairColor: '#111317', beard: true } },
  { name: 'Kendry Páez', knownName: 'Kendry Páez', position: 'MEI', secondaryPositions: ['PD', 'MC'], overall: 79, age: 19, nationality: 'Equador', currentClubName: 'Independiente del Valle', appearance: { skin: 4, hairStyle: 2, hairColor: '#111317', beard: false } },
];

const FIRST_NAMES = [
  'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Bruno', 'Felipe', 'Gustavo', 'Rodrigo',
  'Thiago', 'Diego', 'Leonardo', 'Caio', 'Igor', 'Pedro', 'João', 'Danilo',
  'Santiago', 'Nicolás', 'Facundo', 'Agustín', 'Mateo', 'Emiliano',
];

const LAST_NAMES = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida',
  'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro',
  'González', 'Rodríguez', 'Morales', 'Castro', 'Mendoza',
];

const LATAM_COUNTRIES = ['Brasil', 'Brasil', 'Brasil', 'Argentina', 'Uruguai', 'Colômbia', 'Paraguai'];

let playerCounter = 1;

/** Valor de mercado 100% estilo FIFA (console/PC) baseado no Overall real */
export function calcMarketValue(overall: number): number {
  const table: Record<number, number> = {
    94: 145,
    93: 132,
    92: 120,
    91: 108,
    90: 95,
    89: 84,
    88: 75,
    87: 66,
    86: 58,
    85: 52,
    84: 44,
    83: 38,
    82: 32,
    81: 27,
    80: 22,
    79: 18,
    78: 14,
    77: 11.5,
    76: 9.5,
    75: 7.5,
    74: 6,
    73: 4.5,
    72: 3.5,
    71: 2.8,
    70: 2.2,
    69: 1.8,
    68: 1.5,
    67: 1.2,
  };
  if (table[overall] !== undefined) return table[overall];
  if (overall > 94) return 155;
  return 1.0;
}

const BRL_FORMATTER = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrencyBRL(valueInReais: number): string {
  return BRL_FORMATTER.format(Number.isFinite(valueInReais) ? valueInReais : 0);
}

/** Formata valores armazenados em milhões (ex.: 81.5 -> R$ 81.500.000,00) */
export function formatMillionsBRL(millions?: number): string {
  return formatCurrencyBRL(Math.round((millions ?? 0) * 1_000_000));
}

/** Formata valores armazenados em milhares (ex.: 1615 -> R$ 1.615.000,00) */
export function formatThousandsBRL(thousands?: number): string {
  return formatCurrencyBRL(Math.round((thousands ?? 0) * 1_000));
}

function calcBaseSalaryByOvr(overall: number): number {
  if (overall >= 92) return 1800;
  if (overall >= 90) return 1500;
  if (overall >= 88) return 1300;
  if (overall >= 86) return 1050;
  if (overall >= 84) return 850;
  if (overall >= 82) return 650;
  if (overall >= 80) return 500;
  if (overall >= 78) return 360;
  if (overall >= 76) return 250;
  if (overall >= 74) return 170;
  if (overall >= 72) return 115;
  if (overall >= 70) return 80;
  return 50;
}

/** Salário mensal realista em R$ mil/mês relativo ao porte/orçamento do clube */
export function calcMonthlySalary(overall: number, clubTierOrBudget?: number): number {
  const base = calcBaseSalaryByOvr(overall);
  let mult = 1.0;
  if (clubTierOrBudget !== undefined) {
    if (clubTierOrBudget <= 4) {
      mult =
        clubTierOrBudget === 1
          ? 1.12
          : clubTierOrBudget === 2
          ? 0.84
          : clubTierOrBudget === 3
          ? 0.62
          : 0.44;
    } else {
      mult = Math.max(0.4, Math.min(1.2, clubTierOrBudget / 150));
    }
  }
  return Math.max(25, Math.round((base * mult) / 5) * 5);
}

/** Anos iniciais de contrato (1..4 anos), garantindo parte do elenco no último ano */
export function calcInitialContractYears(age: number, indexSeed = 0): number {
  if (indexSeed % 4 === 0) return 1;
  if (age >= 32) return indexSeed % 2 === 0 ? 1 : 2;
  if (age <= 22) return 3 + (indexSeed % 2);
  return 2 + (indexSeed % 3);
}

export function formatMonthlySalary(salaryK?: number): string {
  return `${formatThousandsBRL(salaryK ?? 80)}/mês`;
}

/** Salário mensal mínimo exigido pelo empresário/atleta relativo ao clube comprador (em R$ mil/mês) */
export function calcAgentMinimumSalary(
  player: Pick<Player, 'overall' | 'monthlySalary'>,
  buyerClub?: Pick<Club, 'tier' | 'realisticBudget'>
): number {
  const clubRefSalary = calcMonthlySalary(player.overall, buyerClub?.tier);
  const currentSal = player.monthlySalary ?? clubRefSalary;
  const baseRef = Math.max(
    clubRefSalary,
    Math.round(currentSal * 0.65 + clubRefSalary * 0.35)
  );
  const starFactor =
    player.overall >= 85 ? 0.16 : player.overall >= 80 ? 0.12 : 0.08;
  return Math.max(30, Math.round((baseRef * (1 + starFactor)) / 5) * 5);
}

/** Salário "Irrecusável" que gera interesse imediato de jogador Livre (assina na hora) */
export function calcImmediateInterestSalary(
  player: Pick<Player, 'overall' | 'monthlySalary'>,
  buyerClub?: Pick<Club, 'tier' | 'realisticBudget'>,
  hasHardCompetition = false
): number {
  const minSalary = calcAgentMinimumSalary(player, buyerClub);
  const mult = hasHardCompetition ? 1.32 : 1.25;
  return Math.max(35, Math.round((minSalary * mult) / 5) * 5);
}

export function calcWage(marketValue: number): number {
  return Math.max(0.1, Math.round(marketValue * 0.025 * 10) / 10);
}

export function createPlayer(
  position: PlayerPosition,
  overall: number,
  options?: Partial<Player> & { clubTier?: number }
): Player {
  const id = `p-${playerCounter++}-${Math.random().toString(36).slice(2, 6)}`;
  const first = FIRST_NAMES[(playerCounter * 7 + overall) % FIRST_NAMES.length];
  const last = LAST_NAMES[(playerCounter * 13 + position.charCodeAt(0)) % LAST_NAMES.length];
  const fullName = options?.name ?? `${first} ${last}`;
  const override = PLAYER_OVERRIDES[fullName];

  const age = options?.age ?? (20 + ((playerCounter * 3) % 13));
  const rawNat = options?.nationality ?? LATAM_COUNTRIES[playerCounter % LATAM_COUNTRIES.length];
  const nationality = NATIONALITY_PT[rawNat] ?? rawNat;
  const finalOvr = options?.overall ?? override?.overall ?? overall;
  const marketValue = options?.marketValue ?? calcMarketValue(finalOvr);
  const monthlySalary =
    options?.monthlySalary ?? calcMonthlySalary(finalOvr, options?.clubTier);
  const contractYears =
    options?.contractYears ??
    (options?.currentClubName === 'Livre' || options?.currentClubName === 'Sem Clube'
      ? 0
      : calcInitialContractYears(age, playerCounter));
  const wage = options?.wage ?? Math.max(0.1, Math.round((monthlySalary / 1000) * 10) / 10);
  const finalPos = options?.position ?? override?.position ?? position;
  const secondaryPositions = options?.secondaryPositions ?? override?.secondaryPositions ?? [];
  const ambidextrous = options?.ambidextrous ?? override?.ambidextrous ?? false;
  const knownName = options?.knownName ?? override?.knownName ?? resolveKnownName(fullName);
  const attributes =
    options?.attributes ??
    generatePlayerAttributes({
      name: fullName,
      position: finalPos,
      secondaryPositions,
      overall: finalOvr,
      age,
      ambidextrous,
    });

  return {
    id,
    name: fullName,
    knownName,
    position: finalPos,
    secondaryPositions,
    ambidextrous,
    overall: finalOvr,
    attributes,
    age,
    nationality,
    nationalityFlag: COUNTRY_FLAGS[nationality] ?? COUNTRY_FLAGS[rawNat] ?? '🇧🇷',
    currentClubName: options?.currentClubName,
    isWorldMarket: options?.isWorldMarket ?? false,
    appearance: options?.appearance ?? override?.appearance,
    marketValue,
    monthlySalary,
    contractYears,
    wage,
    stamina: options?.stamina ?? 100,
    goals: 0,
    assists: 0,
    yellowCards: options?.yellowCards ?? 0,
    redCards: options?.redCards ?? 0,
    suspendedMatches: options?.suspendedMatches ?? 0,
    isStarter: options?.isStarter ?? false,
    listedForSale: options?.listedForSale ?? false,
    askingPrice: options?.askingPrice,
  };
}

export function generateBaseSquad(
  targetSize: number,
  _clubSeedIndex: number,
  clubTemplate?: ClubTemplate
): Player[] {
  const clubId = clubTemplate?.id;
  const tier = clubTemplate?.tier ?? 2;
  const minCount = Math.max(16, targetSize);

  const clubRaw = clubId ? REAL_PLAYERS.filter((p) => p.clubKey === clubId) : [];

  // Converte e ordena 100% dos jogadores reais do clube do maior OVR para o menor (sem corte de 17!)
  const clubMapped = clubRaw
    .map((rp, idx) => {
      const ov = PLAYER_OVERRIDES[rp.name];
      const mapped = mapRawPosition(rp.position, idx);
      const ovr = ov?.overall ?? realisticFallbackOverall(rp.age, tier);
      return createPlayer(ov?.position ?? mapped.pos, ovr, {
        name: rp.name,
        knownName: ov?.knownName ?? resolveKnownName(rp.name),
        secondaryPositions: ov?.secondaryPositions ?? mapped.sec,
        ambidextrous: ov?.ambidextrous ?? false,
        overall: ovr,
        age: rp.age,
        nationality: rp.nationality,
        currentClubName: clubTemplate?.name,
        appearance: ov?.appearance,
        clubTier: tier,
        monthlySalary: calcMonthlySalary(ovr, tier),
        contractYears: calcInitialContractYears(rp.age, idx + _clubSeedIndex),
      });
    })
    .sort((a, b) => b.overall - a.overall);

  const squad: Player[] = [];
  const usedNames = new Set<string>();

  // Garante todos os goleiros reais do clube primeiro
  for (const gk of clubMapped.filter((p) => p.position === 'GOL')) {
    if (!usedNames.has(gk.name)) {
      squad.push(gk);
      usedNames.add(gk.name);
    }
  }
  // Inclui 100% dos jogadores de linha reais do plantel oficial
  for (const p of clubMapped) {
    if (!usedNames.has(p.name)) {
      squad.push(p);
      usedNames.add(p.name);
    }
  }

  // Fallback apenas se algum clube genérico não tiver elenco completo
  const fillPositions: PlayerPosition[] = ['GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'CA'];
  let fIdx = 0;
  while (squad.length < minCount) {
    const pos = fillPositions[fIdx % fillPositions.length];
    const age = 21 + (fIdx % 6);
    const fallbackOvr = realisticFallbackOverall(age, tier);
    squad.push(
      createPlayer(pos, fallbackOvr, {
        age,
        currentClubName: clubTemplate?.name,
        clubTier: tier,
        monthlySalary: calcMonthlySalary(fallbackOvr, tier),
        contractYears: calcInitialContractYears(age, fIdx + _clubSeedIndex),
      })
    );
    fIdx++;
  }

  return squad;
}

export function generateWorldMarketPool(): Player[] {
  return WORLD_MARKET_PLAYERS.map((star) =>
    createPlayer(star.position, star.overall, {
      name: star.name,
      knownName: star.knownName,
      secondaryPositions: star.secondaryPositions,
      ambidextrous: star.ambidextrous ?? false,
      overall: star.overall,
      age: star.age,
      nationality: star.nationality,
      currentClubName: star.currentClubName,
      isWorldMarket: true,
      appearance: star.appearance,
    })
  );
}

const FREE_AGENT_SEEDS: Array<{
  name: string;
  knownName: string;
  position: PlayerPosition;
  sec: PlayerPosition[];
  ambidextrous?: boolean;
  overall: number;
  age: number;
  nationality: string;
}> = [
  { name: 'Diego Costa', knownName: 'Diego Costa', position: 'CA', sec: [], overall: 75, age: 37, nationality: 'Espanha' },
  { name: 'Marcelo Vieira', knownName: 'Marcelo', position: 'LE', sec: ['MEI'], overall: 75, age: 38, nationality: 'Brasil' },
  { name: 'Mariano Ferreira', knownName: 'Mariano', position: 'LD', sec: ['ZAG'], overall: 73, age: 40, nationality: 'Brasil' },
  { name: 'Rodrigo Caio', knownName: 'Rodrigo Caio', position: 'ZAG', sec: ['VOL'], overall: 73, age: 33, nationality: 'Brasil' },
  { name: 'David Luiz', knownName: 'David Luiz', position: 'ZAG', sec: ['VOL'], overall: 74, age: 39, nationality: 'Brasil' },
  { name: 'Felipe Melo', knownName: 'F. Melo', position: 'ZAG', sec: ['VOL'], overall: 73, age: 43, nationality: 'Brasil' },
  { name: 'Rafinha Alcântara', knownName: 'Rafinha', position: 'MEI', sec: ['MC'], overall: 75, age: 33, nationality: 'Brasil' },
  { name: 'Gabriel Pires', knownName: 'G. Pires', position: 'MC', sec: ['VOL'], overall: 73, age: 33, nationality: 'Brasil' },
  { name: 'Diego Pituca', knownName: 'Pituca', position: 'VOL', sec: ['MC'], overall: 74, age: 34, nationality: 'Brasil' },
  { name: 'Luan Santana Dias', knownName: 'Luan Dias', position: 'MEI', sec: ['PE'], overall: 72, age: 29, nationality: 'Brasil' },
  { name: 'Yago Cezar', knownName: 'Yago Cezar', position: 'PD', sec: ['CA'], overall: 71, age: 27, nationality: 'Brasil' },
  { name: 'Paulo Victor Mileo', knownName: 'P. Victor', position: 'GOL', sec: [], overall: 73, age: 39, nationality: 'Brasil' },
  { name: 'César Bernardo', knownName: 'César', position: 'GOL', sec: [], overall: 72, age: 34, nationality: 'Brasil' },
  { name: 'Douglas Friedrich', knownName: 'Douglas', position: 'GOL', sec: [], overall: 72, age: 37, nationality: 'Brasil' },
  { name: 'Gino Peruzzi', knownName: 'Peruzzi', position: 'LD', sec: ['LE'], overall: 72, age: 34, nationality: 'Argentina' },
  { name: 'Emanuel Mas', knownName: 'E. Mas', position: 'LE', sec: ['ZAG'], overall: 72, age: 37, nationality: 'Argentina' },
  { name: 'Federico Mancuello', knownName: 'Mancuello', position: 'MC', sec: ['MEI'], overall: 73, age: 37, nationality: 'Argentina' },
  { name: 'Luiz Phellype', knownName: 'L. Phellype', position: 'CA', sec: [], overall: 72, age: 33, nationality: 'Brasil' },
  { name: 'Leandro Damião', knownName: 'L. Damião', position: 'CA', sec: [], overall: 73, age: 37, nationality: 'Brasil' },
  { name: 'Gilberto Moraes', knownName: 'Gilberto Moraes', position: 'CA', sec: [], overall: 74, age: 37, nationality: 'Brasil' },
  { name: 'Nikão Cardoso', knownName: 'Nikão', position: 'MEI', sec: ['PD'], overall: 73, age: 34, nationality: 'Brasil' },
  { name: 'Romarinho Silva', knownName: 'Romarinho', position: 'PE', sec: ['PD', 'CA'], ambidextrous: true, overall: 74, age: 35, nationality: 'Brasil' },
  { name: 'Mateus Vital', knownName: 'M. Vital', position: 'MEI', sec: ['PE'], overall: 73, age: 28, nationality: 'Brasil' },
  { name: 'Matheus Babi', knownName: 'M. Babi', position: 'CA', sec: [], overall: 71, age: 29, nationality: 'Brasil' },
  { name: 'Bruno Méndez', knownName: 'B. Méndez', position: 'ZAG', sec: ['LD'], overall: 74, age: 27, nationality: 'Uruguai' },
  { name: 'Christian Bernardi', knownName: 'Bernardi', position: 'MC', sec: ['MEI'], overall: 72, age: 36, nationality: 'Argentina' },
  { name: 'Gustavo Cuéllar', knownName: 'Cuéllar', position: 'VOL', sec: ['MC'], overall: 75, age: 34, nationality: 'Colômbia' },
  { name: 'Juan Cazares', knownName: 'Cazares', position: 'MEI', sec: ['PD'], overall: 73, age: 34, nationality: 'Equador' },
];

export function generateFreeAgentsPool(count = 28): Player[] {
  return FREE_AGENT_SEEDS.slice(0, count)
    .map((fa) =>
      createPlayer(fa.position, fa.overall, {
        name: fa.name,
        knownName: fa.knownName,
        secondaryPositions: fa.sec,
        ambidextrous: fa.ambidextrous ?? false,
        overall: fa.overall,
        age: fa.age,
        nationality: fa.nationality,
        currentClubName: 'Livre',
        contractYears: 0,
        marketValue: 0,
      })
    )
    .sort((a, b) => b.overall - a.overall);
}
