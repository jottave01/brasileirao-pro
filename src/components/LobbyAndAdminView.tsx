import React, { useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Crown,
  Link2,
  Lock,
  MapPin,
  Newspaper,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { Club, LeagueState } from '../types/league';
import { calculateClubStrength, inferPlayStyleFromClub, normalizePosture } from '../engine/botAI';
import { formatMillionsBRL } from '../data/seedData';
import { BrasileiraoTrophyLogo, ClubCrest, ControllerTag, OvrBadge } from './ClubBadge';

interface LobbyAndAdminViewProps {
  league: LeagueState;
  onOpenLoginModal: (mode?: 'login' | 'careers' | 'new_career') => void;
  onStartClubSelection: () => void;
  onClaimClub: (clubId: string) => void;
  onConfirmClubsToWindow: () => void;
  onPreStartChangeHumanCount: (newHumanCount: number) => void;
  onNavigateTab: (tab: 'mercado' | 'campeonato' | 'clube') => void;
}

function sortStandings(clubs: Club[]): Club[] {
  return [...clubs].sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
    const sgA = a.standing.goalsFor - a.standing.goalsAgainst;
    const sgB = b.standing.goalsFor - b.standing.goalsAgainst;
    if (sgB !== sgA) return sgB - sgA;
    return b.standing.goalsFor - a.standing.goalsFor;
  });
}

const FEED_CATEGORY_META: Record<
  string,
  { label: string; border: string; badge: string }
> = {
  mercado: {
    label: 'Mercado',
    border: 'border-l-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300',
  },
  partida: {
    label: 'Partida',
    border: 'border-l-amber-400',
    badge: 'bg-amber-400/15 text-amber-300',
  },
  tatica: {
    label: 'Tática',
    border: 'border-l-sky-400',
    badge: 'bg-sky-500/15 text-sky-300',
  },
  admin: {
    label: 'Liga',
    border: 'border-l-rose-400',
    badge: 'bg-rose-500/15 text-rose-300',
  },
  convite: {
    label: 'Sala',
    border: 'border-l-slate-400',
    badge: 'bg-white/10 text-slate-300',
  },
};

export const LobbyAndAdminView: React.FC<LobbyAndAdminViewProps> = ({
  league,
  onOpenLoginModal,
  onStartClubSelection,
  onClaimClub,
  onConfirmClubsToWindow,
  onPreStartChangeHumanCount,
  onNavigateTab,
}) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showDirectory, setShowDirectory] = useState(false);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const isAdmin = currentUser?.isAdmin === true;

  const activeClub =
    league.clubs.find((c) => c.id === (currentUser?.clubId || league.activeHumanClubId)) ??
    league.clubs.find((c) => c.controller === 'human') ??
    league.clubs[0];

  const humanClubs = league.clubs.filter((c) => c.controller === 'human');
  const botClubs = league.clubs.filter((c) => c.controller === 'bot');

  const copy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const allHumansJoined = league.participants.length >= league.config.humanCount;
  const pickedCount = league.participants.filter((p) => Boolean(p.clubId)).length;
  const allParticipantsPicked = league.participants.every((p) => Boolean(p.clubId));

  // Derivados de carreira para a Central Ativa
  const standings = sortStandings(league.clubs);
  const clubRank = activeClub
    ? Math.max(1, standings.findIndex((c) => c.id === activeClub.id) + 1)
    : 1;
  const clubStrength = activeClub ? calculateClubStrength(activeClub) : null;

  const recentMatches = activeClub
    ? league.matches
        .filter(
          (m) =>
            m.status === 'finalizada' &&
            (m.homeClubId === activeClub.id || m.awayClubId === activeClub.id)
        )
        .sort((a, b) => a.round - b.round)
        .slice(-5)
        .map((m) => {
          const isHome = m.homeClubId === activeClub.id;
          const myGoals = isHome ? m.homeGoals : m.awayGoals;
          const oppGoals = isHome ? m.awayGoals : m.homeGoals;
          const oppId = isHome ? m.awayClubId : m.homeClubId;
          const opponent = league.clubs.find((c) => c.id === oppId);
          const result: 'V' | 'E' | 'D' =
            myGoals > oppGoals ? 'V' : myGoals === oppGoals ? 'E' : 'D';
          return {
            id: m.id,
            round: m.round,
            result,
            score: `${m.homeGoals}-${m.awayGoals}`,
            myScore: `${myGoals}-${oppGoals}`,
            opponent,
            isHome,
          };
        })
    : [];

  const nextMatch = activeClub
    ? league.matches.find(
        (m) =>
          m.round === league.currentRound &&
          (m.homeClubId === activeClub.id || m.awayClubId === activeClub.id) &&
          m.status !== 'finalizada'
      ) ??
      league.matches.find(
        (m) =>
          m.round > league.currentRound &&
          (m.homeClubId === activeClub.id || m.awayClubId === activeClub.id) &&
          m.status !== 'finalizada'
      ) ??
      league.matches.find(
        (m) =>
          m.round === league.currentRound &&
          (m.homeClubId === activeClub.id || m.awayClubId === activeClub.id)
      )
    : undefined;

  const nextHomeClub = nextMatch
    ? league.clubs.find((c) => c.id === nextMatch.homeClubId)
    : undefined;
  const nextAwayClub = nextMatch
    ? league.clubs.find((c) => c.id === nextMatch.awayClubId)
    : undefined;
  const nextHomeRank = nextHomeClub
    ? standings.findIndex((c) => c.id === nextHomeClub.id) + 1
    : null;
  const nextAwayRank = nextAwayClub
    ? standings.findIndex((c) => c.id === nextAwayClub.id) + 1
    : null;
  const nextHomeStr = nextHomeClub ? calculateClubStrength(nextHomeClub) : null;
  const nextAwayStr = nextAwayClub ? calculateClubStrength(nextAwayClub) : null;

  const nextMatchDateStr = nextMatch?.scheduledAt
    ? new Date(nextMatch.scheduledAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${league.config.dailyScheduleTimes[0]} BRT`;

  const isPreSeason = league.status === 'lobby' || league.status === 'escolha_clube';

  // =========================================================================
  // MODO PRÉ-TEMPORADA (LOBBY & ESCOLHA DE CLUBE)
  // =========================================================================
  if (isPreSeason) {
    return (
      <div className="space-y-6 pb-8">
        {/* Stage Hero da Sala */}
        <section className="relative console-panel-elevated overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-30"
            style={{ backgroundImage: "url('/assets/tunnel-boardroom.jpg')" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#090C10]/95 via-[#0D1219]/88 to-[#090C10]/90"
          />

          <div className="relative z-10 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <BrasileiraoTrophyLogo size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 font-bold uppercase tracking-wider">
                      Temporada {league.season}
                    </span>
                    <span className="text-amber-300 font-semibold tabular-nums">
                      Rodadas às {league.config.dailyScheduleTimes[0]} &amp;{' '}
                      {league.config.dailyScheduleTimes[1]}
                    </span>
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-wide mt-1 leading-none truncate">
                    {league.config.name}
                  </h1>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdminPanel((s) => !s)}
                className="px-3 py-2 rounded-md bg-[#090C10]/85 hover:bg-white/10 border border-white/12 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition shrink-0"
              >
                <Settings2 className="w-4 h-4 text-emerald-400" />
                <span>Admin &amp; Logs</span>
              </button>
            </div>

            {/* Faixa de Convite da Sala */}
            <div className="bg-[#090C10]/90 border border-white/12 rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  Convite da Sala ({league.inviteCode})
                </div>
                <div className="text-xs font-mono text-emerald-300 truncate mt-0.5">
                  {league.inviteLink}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => copy(league.inviteCode, 'code')}
                  className="px-3 py-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer transition"
                >
                  {copied === 'code' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Código
                </button>
                <button
                  type="button"
                  onClick={() => copy(league.inviteLink, 'link')}
                  className="px-3.5 py-2 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  {copied === 'link' ? 'Link Copiado!' : 'Copiar Convite'}
                </button>
              </div>
            </div>

            {league.status === 'lobby' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div
                  className={`lg:col-span-7 rounded-md p-4 border space-y-2.5 ${
                    allHumansJoined
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-100'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 shrink-0" />
                      {allHumansJoined
                        ? `Sala Completa! (${league.participants.length}/${league.config.humanCount})`
                        : `Aguardando Técnicos (${league.participants.length}/${league.config.humanCount})`}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-black/40 tabular-nums">
                      {league.config.humanCount}H + {league.config.botCount}B
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {allHumansJoined
                      ? 'Todos os técnicos conectados! O Admin já pode liberar a escolha de clubes da Série A.'
                      : 'Envie o código ou link da sala para os amigos entrarem antes de abrir a seleção dos times.'}
                  </p>

                  {isAdmin && (
                    <div className="pt-2.5 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-semibold">
                          Ajustar vagas de amigos humanos
                        </span>
                        <span className="text-emerald-300 font-bold tabular-nums">
                          {league.config.humanCount} humanos • {league.config.botCount} bots
                        </span>
                      </div>
                      <input
                        type="range"
                        min={Math.max(1, league.participants.length)}
                        max={league.config.totalClubs}
                        value={league.config.humanCount}
                        onChange={(e) => onPreStartChangeHumanCount(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                    <button
                      type="button"
                      onClick={() => onOpenLoginModal('login')}
                      disabled={allHumansJoined}
                      className="py-3 px-4 rounded-md bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-400" />
                      Entrar Amigo ({league.participants.length}/{league.config.humanCount})
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={!allHumansJoined}
                        onClick={onStartClubSelection}
                        className="py-3 px-4 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Iniciar Escolha de Clubes
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onOpenLoginModal('new_career')}
                      className="w-full py-2.5 px-3 rounded-md bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/35 text-amber-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Começar Nova Carreira do Zero
                    </button>
                  )}
                </div>
              </div>
            )}

            {league.status === 'escolha_clube' && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/35 rounded-md p-4">
                <div className="text-xs sm:text-sm text-amber-100">
                  <strong>Draft de Clubes Aberto:</strong> cada participante escolhe um dos 20 clubes da Série A 2026 ({pickedCount}/{league.participants.length} definidos).
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onConfirmClubsToWindow}
                    disabled={!allParticipantsPicked}
                    className="py-3 px-5 rounded-md bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {allParticipantsPicked
                      ? 'Abrir Janela de Mercado (24h)'
                      : `Aguardando (${pickedCount}/${league.participants.length})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Painel Admin colapsável */}
        {showAdminPanel && (
          <div className="console-panel p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                Configuração da Sala • 2 rodadas diárias ({league.config.dailyScheduleTimes[0]} e{' '}
                {league.config.dailyScheduleTimes[1]})
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {league.config.humanCount}H + {league.config.botCount}B
              </span>
            </div>
            {league.auditLogs.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06] space-y-1 max-h-28 overflow-y-auto">
                {league.auditLogs.slice(0, 5).map((l) => (
                  <div key={l.id} className="text-xs text-slate-400">
                    <strong className="text-slate-200">{l.action}:</strong> {l.details}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Participantes Conectados */}
        <section className="console-panel p-4 sm:p-5 space-y-3">
          <div className="console-section-title text-sm text-emerald-400">
            <Users className="w-4 h-4 shrink-0" />
            Participantes na Sala ({league.participants.length}/{league.config.humanCount})
          </div>
          <div className="flex flex-wrap gap-2">
            {league.participants.map((p) => {
              const club = p.clubId ? league.clubs.find((c) => c.id === p.clubId) : null;
              const isMe = p.id === league.currentUserId;
              return (
                <div
                  key={p.id}
                  className={`px-3 py-2 rounded-md border text-xs flex items-center gap-2 ${
                    isMe
                      ? 'bg-emerald-500/15 border-emerald-400/60 text-white font-bold'
                      : 'bg-[#090C10] border-white/10 text-slate-300'
                  }`}
                >
                  {p.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {club && <ClubCrest club={club} size="xs" />}
                  <span>{p.name}</span>
                  {isMe && <span className="text-[11px] text-emerald-300">(Você)</span>}
                  {club ? (
                    <span className="text-[11px] text-emerald-300">• {club.shortName}</span>
                  ) : (
                    <span className="text-[11px] text-slate-500">• aguardando escolha</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Corrida de Escolha de Clubes */}
        {league.status === 'escolha_clube' && (
          <section className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="console-section-title text-base text-amber-300 flex-1">
                Escolha seu Clube da Série A
              </div>
              <span className="text-xs text-slate-400">
                Técnico atual: <strong className="text-white">{currentUser?.name}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {league.clubs.map((club) => {
                const str = calculateClubStrength(club);
                const claimedByMe = club.claimedByParticipantId === currentUser?.id;
                const claimedByOther = Boolean(club.claimedByParticipantId) && !claimedByMe;

                return (
                  <button
                    key={club.id}
                    type="button"
                    disabled={claimedByOther}
                    onClick={() => onClaimClub(club.id)}
                    style={{ borderTopWidth: '3px', borderTopColor: club.primaryColor }}
                    className={`console-panel p-3.5 text-left transition flex flex-col justify-between gap-3 cursor-pointer disabled:cursor-not-allowed ${
                      claimedByMe
                        ? 'border-emerald-400 bg-emerald-500/12'
                        : claimedByOther
                        ? 'opacity-45 bg-[#0B0F15]'
                        : 'hover:border-amber-400/70 hover:bg-[#161D27] active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <ClubCrest club={club} size="lg" />
                      <OvrBadge ovr={str.overall} size="md" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-display text-xl font-extrabold text-white uppercase truncate leading-none">
                        {club.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-1">{club.stadium}</div>
                      <div className="text-[11px] text-slate-300 font-semibold tabular-nums mt-1.5">
                        ATA {str.attack} • MEI {str.midfield} • DEF {str.defense}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.07]">
                      <span className="text-xs font-extrabold text-emerald-400 tabular-nums">
                        {formatMillionsBRL(club.finances.budget)}
                      </span>
                      <span
                        className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                          claimedByMe
                            ? 'bg-emerald-500 text-slate-950'
                            : claimedByOther
                            ? 'bg-white/10 text-slate-300'
                            : 'bg-amber-400/15 text-amber-300'
                        }`}
                      >
                        {claimedByMe
                          ? 'Seu Clube'
                          : claimedByOther
                          ? club.managerName
                          : 'Escolher'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  // =========================================================================
  // CENTRAL DA CARREIRA ATIVA (JANELA, CAMPEONATO OU FIM DE TEMPORADA)
  // =========================================================================
  return (
    <div className="space-y-6 pb-8">
      {/* Faixa Discreta de Contexto + Convite / Admin */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold uppercase tracking-wider">
            {league.status === 'janela_mercado'
              ? 'Janela Aberta'
              : league.status === 'fim_temporada'
              ? 'Fim da Temporada'
              : `Rodada ${league.currentRound} de ${league.totalRounds}`}
          </span>
          <span className="text-slate-400 hidden sm:inline">
            • Horários oficiais: {league.config.dailyScheduleTimes[0]} e{' '}
            {league.config.dailyScheduleTimes[1]} (BRT)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copy(league.inviteLink, 'link')}
            className="px-2.5 py-1.5 rounded-md bg-[#11161E] hover:bg-white/[0.07] border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
          >
            {copied === 'link' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{copied === 'link' ? 'Link Copiado' : `Convite (${league.inviteCode})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAdminPanel((s) => !s)}
            className="px-2.5 py-1.5 rounded-md bg-[#11161E] hover:bg-white/[0.07] border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Sala &amp; Admin</span>
          </button>
        </div>
      </div>

      {/* Gaveta Discreta de Sala & Admin */}
      {showAdminPanel && (
        <div className="console-panel p-4 space-y-3 animate-console-enter">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Liga em Andamento • Clubes Travados
              </div>
              <div className="text-xs text-slate-400">
                Código: <span className="font-mono text-emerald-300">{league.inviteCode}</span> •{' '}
                {humanClubs.length} humanos e {botClubs.length} bots na Série A
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copy(league.inviteCode, 'code')}
                className="px-3 py-1.5 rounded-md bg-[#090C10] border border-white/10 text-xs font-semibold text-slate-200 cursor-pointer"
              >
                {copied === 'code' ? 'Código Copiado!' : 'Copiar Código'}
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenLoginModal('careers')}
                    className="px-3 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-xs font-bold text-emerald-300 cursor-pointer"
                  >
                    Gerenciar Carreiras
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenLoginModal('new_career')}
                    className="px-3 py-1.5 rounded-md bg-amber-400/15 border border-amber-400/35 text-xs font-bold text-amber-200 cursor-pointer"
                  >
                    Nova Carreira
                  </button>
                </>
              )}
            </div>
          </div>

          {league.auditLogs.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1 max-h-24 overflow-y-auto">
              {league.auditLogs.slice(0, 4).map((l) => (
                <div key={l.id} className="text-xs text-slate-400">
                  <strong className="text-slate-200">{l.action}:</strong> {l.details}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HERO CINEMATOGRÁFICO: PRÓXIMO JOGO (PRÉ-JOGO) OU CERIMÔNIA DE TÍTULO */}
      <section
        className="relative console-panel-elevated overflow-hidden"
        style={{
          borderTopWidth: '3px',
          borderTopColor: activeClub?.primaryColor ?? '#10B981',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: "url('/assets/tunnel-boardroom.jpg')" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 70% at 20% 50%, ${
              nextHomeClub?.primaryColor ?? activeClub?.primaryColor ?? '#10B981'
            }26, transparent 70%), radial-gradient(ellipse 60% 70% at 80% 50%, ${
              nextAwayClub?.primaryColor ?? '#10B981'
            }20, transparent 70%), linear-gradient(180deg, rgba(9,12,16,0.78) 0%, rgba(11,15,21,0.94) 100%)`,
          }}
        />

        <div className="relative z-10 p-5 sm:p-7">
          {league.status === 'fim_temporada' ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <BrasileiraoTrophyLogo size="lg" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-amber-300">
                    Temporada {league.season} Encerrada
                  </div>
                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase mt-1 leading-none">
                    {standings[0]?.name} Campeão Brasileiro!
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
                    Confira a premiação oficial da Série A e prepare seu clube para a Temporada{' '}
                    {league.season + 1}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('campeonato')}
                className="px-6 py-3.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition shrink-0"
              >
                <Trophy className="w-4 h-4" />
                Ver Premiação &amp; Próxima Temporada
              </button>
            </div>
          ) : nextMatch && nextHomeClub && nextAwayClub ? (
            <div className="space-y-5">
              {/* Cabeçalho da Partida */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/[0.1]">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                    {nextMatch.status === 'ao_vivo' ? (
                      <>
                        <Radio className="w-3.5 h-3.5 text-rose-400" />
                        Ao Vivo • {nextMatch.currentMinute}&apos;
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3.5 h-3.5" />
                        Próximo Jogo • Rodada {nextMatch.round}
                      </>
                    )}
                  </span>
                  <span className="text-xs text-slate-300 font-medium hidden sm:inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {nextHomeClub.stadium}
                  </span>
                </div>

                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 tabular-nums">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{nextMatchDateStr} (BRT)</span>
                </div>
              </div>

              {/* Confronto Cinematográfico */}
              <div className="grid grid-cols-11 items-center gap-1.5 sm:gap-4 py-1">
                {/* Mandante */}
                <div className="col-span-4 min-w-0 flex flex-col sm:flex-row items-center sm:justify-end gap-2 sm:gap-3 text-center sm:text-right">
                  <div className="order-2 sm:order-1 min-w-0 w-full">
                    <div className="font-display text-base sm:text-3xl font-extrabold text-white uppercase leading-none truncate">
                      {nextHomeClub.name}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300 mt-1 flex flex-wrap items-center justify-center sm:justify-end gap-x-1.5 gap-y-0.5 tabular-nums">
                      <span>{nextHomeRank}º</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-amber-300 font-bold">OVR {nextHomeStr?.overall}</span>
                    </div>
                  </div>
                  <div className="order-1 sm:order-2 shrink-0">
                    <ClubCrest club={nextHomeClub} size="2xl" />
                  </div>
                </div>

                {/* Centro VS / Placar */}
                <div className="col-span-3 flex flex-col items-center justify-center text-center">
                  {nextMatch.status === 'agendada' ? (
                    <>
                      <div className="font-display text-2xl sm:text-5xl font-extrabold text-white/90 tracking-widest leading-none">
                        VS
                      </div>
                      <div className="text-[10px] sm:text-[11px] uppercase tracking-widest text-slate-400 mt-1">
                        Casa × Fora
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-2 sm:px-3.5 py-1.5 rounded-md bg-[#090C10]/90 border border-white/15 font-display text-xl sm:text-4xl font-extrabold text-white tabular-nums leading-none whitespace-nowrap">
                        {nextMatch.homeGoals} - {nextMatch.awayGoals}
                      </div>
                      <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-400 mt-1.5 whitespace-nowrap">
                        {nextMatch.status === 'ao_vivo' ? `${nextMatch.currentMinute}' Ao Vivo` : 'Encerrado'}
                      </div>
                    </>
                  )}
                </div>

                {/* Visitante */}
                <div className="col-span-4 min-w-0 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
                  <div className="shrink-0">
                    <ClubCrest club={nextAwayClub} size="2xl" />
                  </div>
                  <div className="min-w-0 w-full">
                    <div className="font-display text-base sm:text-3xl font-extrabold text-white uppercase leading-none truncate">
                      {nextAwayClub.name}
                    </div>
                    <div className="text-[11px] sm:text-xs text-slate-300 mt-1 flex flex-wrap items-center justify-center sm:justify-start gap-x-1.5 gap-y-0.5 tabular-nums">
                      <span className="text-amber-300 font-bold">OVR {nextAwayStr?.overall}</span>
                      <span className="text-slate-600">•</span>
                      <span>{nextAwayRank}º</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações Principais do Pré-Jogo */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                <div className="text-xs text-slate-400 sm:hidden flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {nextHomeClub.stadium}
                </div>
                <div className="hidden sm:flex items-center gap-4 text-xs text-slate-300 tabular-nums">
                  <span>
                    {nextHomeClub.shortName}:{' '}
                    <strong className="text-white">
                      A{nextHomeStr?.attack} M{nextHomeStr?.midfield} D{nextHomeStr?.defense}
                    </strong>
                  </span>
                  <span className="text-slate-600">|</span>
                  <span>
                    {nextAwayClub.shortName}:{' '}
                    <strong className="text-white">
                      A{nextAwayStr?.attack} M{nextAwayStr?.midfield} D{nextAwayStr?.defense}
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => onNavigateTab('clube')}
                    className="flex-1 sm:flex-initial py-2.5 px-4 rounded-md bg-[#11161E] hover:bg-white/10 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Ajustar Time
                  </button>

                  {league.status === 'janela_mercado' ? (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('mercado')}
                      className="flex-1 sm:flex-initial py-2.5 px-5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Ir para Mercado
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('campeonato')}
                      className="flex-1 sm:flex-initial py-2.5 px-5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {nextMatch.status === 'ao_vivo' ? 'Assistir Ao Vivo' : 'Ir para Pré-Jogo'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* CORPO PRINCIPAL 2 COLUNAS: CENTRAL DO CLUBE + NOTÍCIAS DA LIGA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Esquerda (7 cols): Situação do Clube & Últimos Resultados */}
        <div className="lg:col-span-7 space-y-6">
          {activeClub && clubStrength && (
            <section
              className="console-panel p-5 space-y-5"
              style={{
                borderLeftWidth: '3px',
                borderLeftColor: activeClub.primaryColor,
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <ClubCrest club={activeClub} size="xl" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Seu Clube na Série A
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white uppercase truncate leading-none mt-0.5">
                      {activeClub.name}
                    </h2>
                    <div className="text-xs text-slate-400 mt-1 truncate">
                      Técnico: <strong className="text-slate-200">{activeClub.managerName}</strong> •{' '}
                      {activeClub.stadium}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                  <div className="text-left sm:text-right">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">
                      Classificação
                    </div>
                    <div className="font-display text-2xl font-extrabold text-white tabular-nums leading-none mt-0.5">
                      {clubRank}º lugar
                    </div>
                    <div className="text-xs text-emerald-400 font-bold tabular-nums mt-0.5">
                      {activeClub.standing.points} pts ({activeClub.standing.played}J)
                    </div>
                  </div>
                  <OvrBadge ovr={clubStrength.overall} size="lg" />
                </div>
              </div>

              {/* Linha de KPIs do Clube */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                <div className="bg-[#090C10] border border-white/[0.07] rounded-md p-3 min-w-0">
                  <div className="text-[11px] text-slate-400">Caixa Transferências</div>
                  <div className="font-display text-lg font-extrabold text-emerald-400 tabular-nums mt-0.5 whitespace-nowrap truncate">
                    {formatMillionsBRL(activeClub.finances.budget)}
                  </div>
                </div>
                <div className="bg-[#090C10] border border-white/[0.07] rounded-md p-3">
                  <div className="text-[11px] text-slate-400">Formação</div>
                  <div className="font-display text-xl font-extrabold text-white mt-0.5">
                    {activeClub.formation}
                  </div>
                </div>
                <div className="bg-[#090C10] border border-white/[0.07] rounded-md p-3">
                  <div className="text-[11px] text-slate-400">Estilo &amp; Postura</div>
                  <div className="font-display text-lg font-extrabold text-amber-300 mt-0.5 truncate">
                    {inferPlayStyleFromClub(activeClub)} · {normalizePosture(activeClub.mentality)}
                  </div>
                </div>
                <div className="bg-[#090C10] border border-white/[0.07] rounded-md p-3">
                  <div className="text-[11px] text-slate-400">Elenco</div>
                  <div className="font-display text-xl font-extrabold text-white tabular-nums mt-0.5">
                    {activeClub.squad.length} atletas
                  </div>
                </div>
              </div>

              {/* Últimos Resultados */}
              <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-300">
                    Últimos Resultados
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    {activeClub.standing.wins}V • {activeClub.standing.draws}E •{' '}
                    {activeClub.standing.losses}D
                  </span>
                </div>

                {recentMatches.length === 0 ? (
                  <div className="bg-[#090C10] border border-white/[0.06] rounded-md px-3.5 py-3 text-xs text-slate-400">
                    Nenhuma partida finalizada ainda nesta temporada. Ajuste sua escalação antes do pontapé inicial!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {recentMatches.map((rm) => {
                      const badgeCls =
                        rm.result === 'V'
                          ? 'bg-emerald-500 text-slate-950'
                          : rm.result === 'E'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-rose-500 text-white';
                      return (
                        <div
                          key={rm.id}
                          className="bg-[#090C10] border border-white/[0.07] rounded-md p-2.5 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            {rm.opponent && <ClubCrest club={rm.opponent} size="xs" />}
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white truncate">
                                {rm.opponent?.shortName ?? 'ADV'}
                              </div>
                              <div className="text-[11px] text-slate-400 tabular-nums">
                                {rm.myScore} (R{rm.round})
                              </div>
                            </div>
                          </div>
                          <span
                            className={`w-6 h-6 rounded font-display text-xs font-extrabold flex items-center justify-center shrink-0 ${badgeCls}`}
                          >
                            {rm.result}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Atalhos Rápidos */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigateTab('clube')}
                  className="py-2.5 px-3 rounded-md bg-[#171E29] hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer transition"
                >
                  Meu Clube
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('campeonato')}
                  className="py-2.5 px-3 rounded-md bg-[#171E29] hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer transition"
                >
                  Campeonato
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateTab('mercado')}
                  className="py-2.5 px-3 rounded-md bg-[#171E29] hover:bg-white/10 border border-white/10 text-xs font-bold text-white cursor-pointer transition"
                >
                  Mercado
                </button>
              </div>
            </section>
          )}

          {/* Galeria de Campeões */}
          {league.seasonHistory.length > 0 && (
            <section className="console-panel p-5 space-y-3 border-amber-400/25">
              <div className="console-section-title text-sm text-amber-300">
                <Trophy className="w-4 h-4 shrink-0" />
                Galeria de Campeões
              </div>
              <div className="space-y-2">
                {league.seasonHistory.map((h) => (
                  <div
                    key={h.season}
                    className="flex items-center justify-between bg-[#090C10] border border-white/[0.06] rounded-md px-3.5 py-2.5 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-display text-base font-extrabold text-amber-400">
                        T{h.season}
                      </span>
                      {h.championLogoUrl && (
                        <img
                          src={h.championLogoUrl}
                          alt={h.championName}
                          className="w-7 h-7 object-contain shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">{h.championName}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          Técnico: {h.championManager} • Artilheiro: {h.topScorerName} (
                          {h.topScorerGoals}g)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-amber-300 font-bold uppercase tracking-wider shrink-0">
                      Campeão
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Direita (5 cols): Notícias & Acontecimentos da Liga */}
        <aside className="lg:col-span-5 console-panel p-5 space-y-4">
          <div className="console-section-title text-sm text-white">
            <Newspaper className="w-4 h-4 text-emerald-400 shrink-0" />
            Notícias &amp; Acontecimentos
          </div>

          {league.feed.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma movimentação registrada ainda nesta temporada.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {league.feed.slice(0, 10).map((item) => {
                const meta = FEED_CATEGORY_META[item.category] ?? FEED_CATEGORY_META.convite;
                return (
                  <div
                    key={item.id}
                    className={`bg-[#090C10] border border-white/[0.06] border-l-[3px] ${meta.border} rounded-r-md p-3 space-y-1`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${meta.badge}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-xs font-bold text-white truncate">
                          {item.actorName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
                  </div>
                );
              })}
            </div>
          )}
        </aside>
      </div>

      {/* Diretório Secundário da Liga (Técnicos Humanos & Bots IA) */}
      <section className="console-panel overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDirectory((s) => !s)}
          className="w-full px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 text-left">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-display text-base font-extrabold uppercase tracking-wide text-white leading-none">
                Técnicos &amp; Clubes da Série A
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {humanClubs.length} clubes humanos • {botClubs.length} clubes gerenciados por IA
              </div>
            </div>
          </div>
          {showDirectory ? (
            <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          )}
        </button>

        {showDirectory && (
          <div className="px-5 pb-5 pt-2 border-t border-white/[0.08] space-y-6 animate-console-enter">
            {/* Clubes Humanos */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Clubes Humanos ({humanClubs.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {humanClubs.map((club) => {
                  const str = calculateClubStrength(club);
                  const isMine = club.id === activeClub?.id;
                  return (
                    <div
                      key={club.id}
                      style={{ borderLeftWidth: '3px', borderLeftColor: club.primaryColor }}
                      className={`rounded-md p-3.5 border flex items-center justify-between gap-3 ${
                        isMine
                          ? 'bg-emerald-500/[0.09] border-emerald-500/45'
                          : 'bg-[#090C10] border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ClubCrest club={club} size="md" />
                        <div className="min-w-0">
                          <div className="font-display text-lg font-bold text-white uppercase flex items-center gap-1.5 truncate">
                            {club.name}
                            {club.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {club.managerName} • {formatMillionsBRL(club.finances.budget)}
                          </div>
                          <div className="text-[11px] text-emerald-300 font-semibold tabular-nums mt-0.5">
                            OVR {str.overall} • A{str.attack} M{str.midfield} D{str.defense}
                          </div>
                        </div>
                      </div>
                      <ControllerTag club={club} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Clubes Bots IA */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Clubes Bots IA ({botClubs.length})
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090C10] border border-white/[0.08] text-[11px] font-semibold text-slate-300">
                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                  Dificuldade: <strong className="text-sky-300 capitalize">{league.config.botDifficulty}</strong>
                  <span className="text-slate-600">•</span>
                  <span className="capitalize">{league.config.botPersonality}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {botClubs.map((club) => {
                  const str = calculateClubStrength(club);
                  return (
                    <div
                      key={club.id}
                      style={{ borderLeftWidth: '3px', borderLeftColor: club.primaryColor }}
                      className="bg-[#090C10] border border-white/[0.08] rounded-md p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ClubCrest club={club} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate">{club.name}</div>
                            <div className="text-[11px] text-slate-400 tabular-nums truncate">
                              {formatMillionsBRL(club.finances.budget)}
                            </div>
                          </div>
                        </div>
                        <OvrBadge ovr={str.overall} size="sm" />
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1 capitalize text-slate-300">
                          <Lock className="w-3 h-3 text-slate-500" />
                          {club.botDifficulty}
                        </span>
                        <span className="capitalize text-sky-300 font-medium">
                          {club.botPersonality}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
