export type LeagueFormat =
  | 'pontos_corridos'
  | 'grupos_mata_mata'
  | 'copa_eliminatoria';

export type BotDifficulty = 'facil' | 'medio' | 'dificil' | 'lendario';

export type BotPersonality =
  | 'misto'
  | 'agressivo'
  | 'economico'
  | 'equilibrado'
  | 'galactico'
  | 'tatico';

export type ClubBotPersonality = Exclude<BotPersonality, 'misto'>;

export type PlayerPosition =
  | 'GOL'
  | 'ZAG'
  | 'LD'
  | 'LE'
  | 'VOL'
  | 'MC'
  | 'MEI'
  | 'PE'
  | 'PD'
  | 'CA';

export type Formation =
  | '4-3-3'
  | '4-4-2'
  | '4-2-3-1'
  | '3-5-2'
  | '3-4-3'
  | '5-3-2';

export type TacticalMentality =
  | 'Retranca'
  | 'Contra-Ataque'
  | 'Equilibrada'
  | 'Ofensiva'
  | 'Tudo ou Nada';

export interface PlayerAppearance {
  skin: number; // 0..5
  hairStyle: number; // 0..7
  hairColor: string;
  beard?: boolean;
  headband?: boolean;
}

export interface LineupSlot {
  slotIndex: number;
  role: PlayerPosition;
  playerId: string;
}

export interface TransferRules {
  windowOpen: boolean;
  windowHours: number; // padrão 24h (1 dia)
  maxDealsPerRound: number;
  allowDirectPurchase: boolean;
  allowBotNegotiations: boolean;
  taxPercent: number;
}

export interface LeagueConfig {
  name: string;
  totalClubs: number;
  humanCount: number;
  botCount: number;
  initialBudget: number;
  useRealisticBudgets: boolean;
  squadSize: number;
  format: LeagueFormat;
  homeAndAway: boolean;
  dailyScheduleTimes: [string, string];
  transferRules: TransferRules;
  botDifficulty: BotDifficulty;
  botPersonality: BotPersonality;
}

export interface Player {
  id: string;
  name: string;
  knownName: string;
  position: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  ambidextrous?: boolean;
  overall: number;
  age: number;
  nationality: string;
  nationalityFlag?: string;
  currentClubName?: string;
  isWorldMarket?: boolean;
  appearance?: PlayerAppearance;
  marketValue: number;
  monthlySalary?: number; // R$ mil/mês (ex: 1615 = R$ 1.615.000,00/mês)
  wage: number;
  stamina: number; // 0..100
  goals: number;
  assists: number;
  isStarter?: boolean;
  listedForSale?: boolean;
  askingPrice?: number;
}

export interface ClubFinances {
  budget: number;
  initialBudget: number;
  wageBill: number;
  transferSpent: number;
  transferIncome: number;
  matchIncome: number;
  prizeIncome: number;
}

export interface ClubStanding {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  tier: 1 | 2 | 3 | 4;
  realisticBudget: number;
  controller: 'human' | 'bot';
  claimedByParticipantId?: string;
  managerName: string;
  isAdmin?: boolean;
  inviteClaimed: boolean;
  botPersonality: ClubBotPersonality;
  botDifficulty: BotDifficulty;
  formation: Formation;
  mentality: TacticalMentality;
  squad: Player[];
  lineupSlots: LineupSlot[];
  finances: ClubFinances;
  standing: ClubStanding;
  dealsThisRound: number;
  titlesWon: number;
  group?: 'A' | 'B' | 'C' | 'D';
}

export interface LobbyParticipant {
  id: string;
  name: string;
  pin: string;
  isAdmin: boolean;
  clubId: string | null;
  joinedAt: string;
}

export interface BotNegotiationPatience {
  patience: number; // 3 -> 0
  locked: boolean;
  lastCounter?: number;
  lastCounterSalary?: number;
  lastMessage?: string;
}

export type PlayPhase =
  | 'kickoff'
  | 'meio_campo'
  | 'ataque_casa'
  | 'ataque_fora'
  | 'finalizacao_casa'
  | 'finalizacao_fora'
  | 'gol_casa'
  | 'gol_fora';

export interface MatchStats {
  homePossession: number;
  homeShots: number;
  awayShots: number;
  homeOnTarget: number;
  awayOnTarget: number;
  homeCorners: number;
  awayCorners: number;
}

export interface MatchEvent {
  minute: number;
  type: 'gol' | 'chute' | 'defesa' | 'escanteio' | 'cartao_amarelo' | 'substituicao';
  clubId: string;
  playerName: string;
  assistName?: string;
  description: string;
}

export interface Match {
  id: string;
  round: number;
  phaseLabel?: string;
  scheduledAt: string;
  homeClubId: string;
  awayClubId: string;
  homeGoals: number;
  awayGoals: number;
  status: 'agendada' | 'ao_vivo' | 'finalizada';
  currentMinute: number;
  isHalftime: boolean;
  halftimeRemainingSec: number;
  homeSubsUsed: number;
  awaySubsUsed: number;
  homeSubbedOutIds: string[];
  awaySubbedOutIds: string[];
  manualControlClubs?: string[];
  ballX: number;
  ballY: number;
  activePlayerId?: string;
  secondaryPlayerId?: string;
  fromBallX?: number;
  fromBallY?: number;
  possessionClubId: string;
  playPhase: PlayPhase;
  lastPlayText: string;
  stats: MatchStats;
  events: MatchEvent[];
}

export interface TransferDisputeBid {
  clubId: string;
  clubName: string;
  offerCash: number;
  swapPlayerId?: string;
  swapPlayerName?: string;
  swapValue: number;
  proposedMonthlySalary: number; // R$ mil/mês
  submittedAt: string;
}

export interface TransferDispute {
  id: string;
  targetPlayerId: string;
  targetPlayerName: string;
  originType: 'europa' | 'bot' | 'livre';
  sellerClubId?: string;
  sellerClubName: string;
  expiresAt: string; // ISO (+3 horas após 1ª proposta válida)
  bids: TransferDisputeBid[];
  status: 'ativa' | 'encerrada';
  winnerClubId?: string;
  resolutionReason?: string;
}

export interface NegotiationOffer {
  id: string;
  fromClubId: string;
  toClubId: string;
  targetPlayerId: string;
  targetPlayerName: string;
  offerCash: number;
  proposedMonthlySalary?: number;
  swapPlayerId?: string;
  swapPlayerName?: string;
  status: 'aguardando_amigo' | 'em_disputa' | 'aceita' | 'recusada' | 'contraproposta';
  counterCash?: number;
  counterSalary?: number;
  botReason?: string;
  createdAt: string;
}

export interface ActivityFeedItem {
  id: string;
  category: 'mercado' | 'partida' | 'tatica' | 'admin' | 'convite';
  actorName: string;
  actorType: 'human' | 'bot' | 'system';
  message: string;
  timestamp: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminName: string;
  action: string;
  details: string;
}

export interface SeasonHistoryEntry {
  season: number;
  championClubId: string;
  championName: string;
  championManager: string;
  championLogoUrl: string;
  runnerUpName: string;
  topScorerName: string;
  topScorerGoals: number;
  prizesAwarded: Array<{
    clubId: string;
    clubName: string;
    rank: number;
    prize: number;
  }>;
}

export interface LeagueState {
  id: string;
  season: number;
  seasonHistory: SeasonHistoryEntry[];
  config: LeagueConfig;
  status: 'lobby' | 'escolha_clube' | 'janela_mercado' | 'campeonato' | 'fim_temporada';
  inviteCode: string;
  inviteLink: string;
  participants: LobbyParticipant[];
  currentUserId: string;
  clubs: Club[];
  activeHumanClubId: string;
  currentRound: number;
  totalRounds: number;
  matches: Match[];
  freeAgents: Player[];
  worldMarket: Player[];
  transferWindowOpen: boolean;
  transferWindowEndsAt: string | null;
  transferWindowLabel: string;
  midSeasonWindowDone: boolean;
  botPatienceMap: Record<string, BotNegotiationPatience>;
  negotiations: NegotiationOffer[];
  transferDisputes?: TransferDispute[];
  feed: ActivityFeedItem[];
  auditLogs: AuditLogEntry[];
}
