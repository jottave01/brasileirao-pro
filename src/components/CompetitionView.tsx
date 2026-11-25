import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Radio,
  Sliders,
  Trophy,
  X,
} from 'lucide-react';
import {
  Club,
  ClubTactics,
  Formation,
  LeagueState,
  Match,
  MatchEvent,
  PlayerPosition,
  TacticalMentality,
} from '../types/league';
import {
  calculateClubStrength,
  calculateSeasonPrizes,
  evaluateTacticalMatchup,
  FORMATION_LAYOUT,
  getPositionFit,
  inferPlayStyleFromClub,
  normalizeMatchStats,
  normalizePosture,
} from '../engine/botAI';
import { TacticalInstructionsPanel } from './TacticalInstructionsPanel';
import { formatMillionsBRL } from '../data/seedData';
import {
  BrasileiraoTrophyLogo,
  ClubCrest,
  CountryFlag,
  PlayerAvatar,
  POSITION_STYLE,
} from './ClubBadge';
import { LiveMatchPitch } from './LiveMatchPitch';

interface CompetitionViewProps {
  league: LeagueState;
  liveRoundRunning: boolean;
  onStartLiveRound: () => void;
  onAdvanceRound?: () => void;
  onUpdateTactics: (
    clubId: string,
    formation: Formation,
    mentality: TacticalMentality,
    tactics?: ClubTactics
  ) => void;
  onAssignSlotPlayer: (clubId: string, slotIndex: number, playerId: string) => void;
  onMakeLiveSubstitution: (
    matchId: string,
    clubId: string,
    slotIndex: number,
    subInPlayerId: string
  ) => void;
  onStartNextSeason: () => void;
}

const EVENT_BADGE: Record<MatchEvent['type'], { label: string; cls: string }> = {
  gol: { label: 'GOL', cls: 'bg-emerald-500 text-slate-950' },
  chance_clara: { label: 'PERIGO', cls: 'bg-sky-400 text-slate-950' },
  defesa: { label: 'DEF', cls: 'bg-slate-700 text-white' },
  chute: { label: 'FIN', cls: 'bg-white/10 text-slate-200' },
  escanteio: { label: 'ESC', cls: 'bg-white/10 text-slate-300' },
  falta: { label: 'FAL', cls: 'bg-amber-500/20 text-amber-200' },
  impedimento: { label: 'IMP', cls: 'bg-white/10 text-slate-300' },
  cartao_amarelo: { label: 'CA', cls: 'bg-amber-400 text-slate-950' },
  cartao_vermelho: { label: 'CV', cls: 'bg-rose-600 text-white' },
  substituicao: { label: 'SUB', cls: 'bg-sky-400 text-slate-950' },
  tatica: { label: 'TAT', cls: 'bg-emerald-500/20 text-emerald-300' },
};

export const CompetitionView: React.FC<CompetitionViewProps> = ({
  league,
  liveRoundRunning,
  onStartLiveRound,
  onUpdateTactics,
  onAssignSlotPlayer,
  onMakeLiveSubstitution,
  onStartNextSeason,
}) => {
  const [viewTab, setViewTab] = useState<'ao_vivo' | 'tabela' | 'rodadas' | 'estatisticas'>(
    'ao_vivo'
  );
  const [statsMode, setStatsMode] = useState<'artilharia' | 'assistencias'>('artilharia');
  const [broadcastPanelTab, setBroadcastPanelTab] = useState<'lances' | 'tatica'>('lances');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [browseRound, setBrowseRound] = useState<number>(league.currentRound);
  const [expandedRoundMatchId, setExpandedRoundMatchId] = useState<string | null>(null);
  const [showSubDrawer, setShowSubDrawer] = useState(true);
  const [subOutSlotIdx, setSubOutSlotIdx] = useState<number | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

  useEffect(() => {
    setBrowseRound(league.currentRound);
  }, [league.currentRound]);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const isAdmin = currentUser?.isAdmin === true;

  const roundMatches = league.matches.filter((m) => m.round === league.currentRound);
  const isCurrentRoundFinished =
    roundMatches.length > 0 && roundMatches.every((m) => m.status === 'finalizada');

  const activeClub =
    league.clubs.find((c) => c.id === (currentUser?.clubId || league.activeHumanClubId)) ??
    league.clubs[0];

  const defaultHumanMatch =
    roundMatches.find(
      (m) => m.homeClubId === activeClub?.id || m.awayClubId === activeClub?.id
    ) ?? roundMatches[0];
  const featuredMatch =
    roundMatches.find((m) => m.id === selectedMatchId) ?? defaultHumanMatch;

  const getClub = (id: string) => league.clubs.find((c) => c.id === id);
  const featuredHome = featuredMatch ? getClub(featuredMatch.homeClubId) : undefined;
  const featuredAway = featuredMatch ? getClub(featuredMatch.awayClubId) : undefined;

  const userMatch = roundMatches.find(
    (m) => m.homeClubId === activeClub?.id || m.awayClubId === activeClub?.id
  );
  const userIsHome = userMatch?.homeClubId === activeClub?.id;
  const userOpponentClub = userMatch
    ? getClub(userIsHome ? userMatch.awayClubId : userMatch.homeClubId)
    : undefined;
  const tacticalReadout =
    activeClub && userOpponentClub ? evaluateTacticalMatchup(activeClub, userOpponentClub) : null;
  const subsUsed = userMatch
    ? userIsHome
      ? userMatch.homeSubsUsed
      : userMatch.awaySubsUsed
    : 0;
  const subbedOutIds = userMatch
    ? userIsHome
      ? userMatch.homeSubbedOutIds
      : userMatch.awaySubbedOutIds
    : [];
  const redCardedIds = userMatch
    ? userIsHome
      ? userMatch.simState?.homeRedCardedIds ?? []
      : userMatch.simState?.awayRedCardedIds ?? []
    : [];

  const sortClubs = (list: Club[]) =>
    [...list].sort((a, b) => {
      if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
      if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
      const sgA = a.standing.goalsFor - a.standing.goalsAgainst;
      const sgB = b.standing.goalsFor - b.standing.goalsAgainst;
      if (sgB !== sgA) return sgB - sgA;
      return b.standing.goalsFor - a.standing.goalsFor;
    });

  const standingsClubs = sortClubs(league.clubs);
  const topScorers = league.clubs
    .flatMap((c) => c.squad.map((p) => ({ player: p, club: c })))
    .filter((item) => item.player.goals > 0)
    .sort(
      (a, b) =>
        b.player.goals - a.player.goals ||
        b.player.assists - a.player.assists ||
        b.player.overall - a.player.overall
    )
    .slice(0, 15);

  const topAssisters = league.clubs
    .flatMap((c) => c.squad.map((p) => ({ player: p, club: c })))
    .filter((item) => item.player.assists > 0)
    .sort(
      (a, b) =>
        b.player.assists - a.player.assists ||
        b.player.goals - a.player.goals ||
        b.player.overall - a.player.overall
    )
    .slice(0, 15);

  const activeLayout = activeClub
    ? FORMATION_LAYOUT[activeClub.formation] ?? FORMATION_LAYOUT['4-3-3']
    : FORMATION_LAYOUT['4-3-3'];
  const activeSlots = activeClub?.lineupSlots ?? [];
  const activeStrength = activeClub ? calculateClubStrength(activeClub) : null;
  const selectedLiveSlotSpec = subOutSlotIdx !== null ? activeLayout[subOutSlotIdx] : null;
  const selectedLiveSlotPlayer =
    subOutSlotIdx !== null && activeSlots[subOutSlotIdx]
      ? activeClub?.squad.find((pl) => pl.id === activeSlots[subOutSlotIdx].playerId)
      : undefined;
  const selectedLiveBenchPlayer = selectedBenchId
    ? activeClub?.squad.find(
        (pl) => pl.id === selectedBenchId && !pl.isStarter && !subbedOutIds.includes(pl.id)
      )
    : undefined;

  const livePosOrder: Record<PlayerPosition, number> = {
    GOL: 0,
    LD: 1,
    ZAG: 2,
    LE: 3,
    VOL: 4,
    MC: 5,
    MEI: 6,
    PE: 7,
    PD: 8,
    CA: 9,
  };

  const liveBenchPlayers = activeClub
    ? [...activeClub.squad]
        .filter(
          (p) =>
            !p.isStarter &&
            !subbedOutIds.includes(p.id) &&
            !redCardedIds.includes(p.id) &&
            (p.suspendedMatches ?? 0) === 0
        )
        .sort((a, b) => {
          if (selectedLiveSlotSpec) {
            const fitA = getPositionFit(a, selectedLiveSlotSpec.role);
            const fitB = getPositionFit(b, selectedLiveSlotSpec.role);
            if (fitB.effectiveOvr !== fitA.effectiveOvr) return fitB.effectiveOvr - fitA.effectiveOvr;
          }
          return livePosOrder[a.position] - livePosOrder[b.position] || b.overall - a.overall;
        })
    : [];

  const outOfPosStartersCount = activeSlots.filter((slot) => {
    const p = activeClub?.squad.find((pl) => pl.id === slot.playerId);
    return p && getPositionFit(p, slot.role).penalty < 0;
  }).length;

  const nextRoundMatch =
    isCurrentRoundFinished && league.currentRound < league.totalRounds
      ? league.matches.find((m) => m.round === league.currentRound + 1)
      : roundMatches[0];
  const scheduledDate = nextRoundMatch?.scheduledAt
    ? new Date(nextRoundMatch.scheduledAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : `${league.config.dailyScheduleTimes[0]}`;

  const getClubForm = (clubId: string): Array<'V' | 'E' | 'D'> =>
    league.matches
      .filter(
        (m) => m.status === 'finalizada' && (m.homeClubId === clubId || m.awayClubId === clubId)
      )
      .sort((a, b) => a.round - b.round)
      .slice(-5)
      .map((m) => {
        const isHome = m.homeClubId === clubId;
        const gf = isHome ? m.homeGoals : m.awayGoals;
        const ga = isHome ? m.awayGoals : m.homeGoals;
        return gf > ga ? 'V' : gf === ga ? 'E' : 'D';
      });

  const canManageLiveMatch = Boolean(activeClub && userMatch && userMatch.status !== 'finalizada');

  // =========================================================================
  // TELA DE FIM DE TEMPORADA & PREMIAÇÃO
  // =========================================================================
  if (league.status === 'fim_temporada') {
    const prizes = calculateSeasonPrizes(league.clubs);
    const champion = standingsClubs[0];
    return (
      <div className="space-y-6 pb-8">
        <section className="relative console-panel-elevated overflow-hidden border-amber-400/40">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: "url('/assets/pitch-spotlight.svg')" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[#090C10]/65 via-[#11161E]/85 to-[#090C10]/95"
          />
          <div className="relative z-10 p-6 sm:p-8 text-center space-y-4">
            <div className="flex justify-center">
              <BrasileiraoTrophyLogo size="lg" />
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Fim da Temporada {league.season}
            </div>
            {champion && (
              <div className="flex flex-col items-center gap-2.5">
                <ClubCrest club={champion} size="2xl" />
                <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white uppercase leading-none">
                  {champion.name} Campeão!
                </h1>
                <p className="text-xs sm:text-sm text-slate-300">
                  Técnico: <strong className="text-white">{champion.managerName}</strong> •{' '}
                  <strong className="text-amber-300 tabular-nums">{champion.standing.points} pts</strong>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={onStartNextSeason}
              className="w-full sm:w-auto px-7 py-3.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer transition"
            >
              Receber Premiações &amp; Iniciar Temporada {league.season + 1} →
            </button>
          </div>
        </section>

        <section className="console-panel p-5 space-y-3">
          <div className="console-section-title text-sm text-amber-300">
            <Trophy className="w-4 h-4 shrink-0" />
            Premiação Oficial por Colocação
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 divide-y md:divide-y-0 divide-white/[0.05]">
            {prizes.map((pr) => {
              const c = getClub(pr.clubId);
              return (
                <div
                  key={pr.clubId}
                  className="flex items-center justify-between py-2.5 border-b border-white/[0.05] text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-display text-base font-extrabold text-slate-400 w-6 tabular-nums">
                      {pr.rank}º
                    </span>
                    {c && <ClubCrest club={c} size="xs" />}
                    <span className="font-bold text-white truncate">{pr.clubName}</span>
                  </div>
                  <span className="font-display text-base font-extrabold text-emerald-400 tabular-nums shrink-0">
                    +{formatMillionsBRL(pr.prize)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  // Helper para renderizar tabela de Artilharia / Assistências
  const renderStatLeaderboard = (type: 'artilharia' | 'assistencias') => {
    const isAssists = type === 'assistencias';
    const list = isAssists ? topAssisters : topScorers;
    const leader = list[0];

    return (
      <div className="console-panel p-4 sm:p-5 space-y-4">
        <div className="console-section-title text-sm text-white">
          <Trophy className={`w-4 h-4 shrink-0 ${isAssists ? 'text-sky-400' : 'text-amber-400'}`} />
          {isAssists ? 'Reis das Assistências' : 'Artilharia da Série A'}
        </div>

        {list.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            {isAssists
              ? 'Nenhuma assistência registrada ainda nesta temporada.'
              : 'Nenhum gol marcado ainda nesta temporada.'}
          </div>
        ) : (
          <>
            {/* Destaque Líder #1 */}
            {leader && (
              <div className="bg-[#090C10] border border-amber-400/35 rounded-md p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded bg-amber-400 text-slate-950 font-display text-base font-extrabold flex items-center justify-center shrink-0">
                    1º
                  </span>
                  <PlayerAvatar
                    player={leader.player}
                    size="md"
                    shape="card"
                    kitPrimary={leader.club.primaryColor}
                    kitSecondary={leader.club.secondaryColor}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-white truncate">
                      {leader.player.knownName}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <ClubCrest club={leader.club} size="xs" />
                      <span>{leader.club.name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`font-display text-3xl font-extrabold tabular-nums leading-none ${
                      isAssists ? 'text-sky-400' : 'text-emerald-400'
                    }`}
                  >
                    {isAssists ? leader.player.assists : leader.player.goals}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">
                    {isAssists ? 'Assistências' : 'Gols'}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] text-slate-400 text-[11px] uppercase">
                    <th className="py-2 pl-2 pr-1">#</th>
                    <th className="py-2 px-1">Jogador</th>
                    <th className="py-2 px-1">Clube</th>
                    <th className="py-2 px-1 text-center">Pos</th>
                    <th className="py-2 px-1 text-center">OVR</th>
                    <th className="py-2 px-1 text-center font-bold text-slate-200">
                      {isAssists ? 'A' : 'G'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {list.map((item, idx) => {
                    const rank = idx + 1;
                    const isMyClub = item.club.id === activeClub?.id;
                    return (
                      <tr
                        key={item.player.id}
                        className={isMyClub ? 'bg-emerald-500/[0.1]' : 'hover:bg-white/[0.02]'}
                      >
                        <td className="py-2.5 pl-2 pr-1 font-bold tabular-nums text-slate-300">
                          {rank}
                        </td>
                        <td className="py-2.5 px-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <CountryFlag nationality={item.player.nationality} />
                            <span className="font-semibold text-white truncate max-w-[130px]">
                              {item.player.knownName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1">
                          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300">
                            <ClubCrest club={item.club} size="xs" />
                            <span>{item.club.shortName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              POSITION_STYLE[item.player.position]
                            }`}
                          >
                            {item.player.position}
                          </span>
                        </td>
                        <td className="py-2.5 px-1 text-center font-bold text-amber-300 tabular-nums">
                          {item.player.overall}
                        </td>
                        <td
                          className={`py-2.5 px-1 text-center font-extrabold text-sm tabular-nums ${
                            isAssists ? 'text-sky-400' : 'text-emerald-400'
                          }`}
                        >
                          {isAssists ? item.player.assists : item.player.goals}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  // =========================================================================
  // CAMPEONATO ATIVO
  // =========================================================================
  const selectedRoundMatches = league.matches.filter((m) => m.round === browseRound);

  return (
    <div className="space-y-6 pb-8">
      {/* CABEÇALHO DE TRANSMISSÃO DO CAMPEONATO */}
      <section className="relative console-panel-elevated overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-45"
          style={{ backgroundImage: "url('/assets/pitch-spotlight.svg')" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#090C10]/92 via-[#0D121A]/82 to-[#090C10]/92"
        />

        <div className="relative z-10 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Brasileirão Série A • Temporada {league.season}
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase leading-none mt-1">
                Rodada {league.currentRound} de {league.totalRounds}
              </h1>
            </div>

            {!isCurrentRoundFinished ? (
              liveRoundRunning ? (
                <div className="px-4 py-2.5 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-200 text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  Transmissão Ao Vivo
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="px-3.5 py-2 rounded-md bg-[#090C10]/90 border border-emerald-500/35 text-xs font-bold text-emerald-300">
                    Horário Fixo: {scheduledDate} (BRT)
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={onStartLiveRound}
                      className="px-4 py-2 rounded-md text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer bg-rose-600/90 hover:bg-rose-500 text-white shadow transition"
                      title="Disparar esta rodada manualmente agora sem aguardar o horário fixo"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Iniciar Agora (Manual)
                    </button>
                  )}
                </div>
              )
            ) : (
              <div className="px-3.5 py-2 rounded-md bg-amber-400/15 border border-amber-400/35 text-xs font-bold text-amber-300 shrink-0">
                {league.currentRound < league.totalRounds
                  ? `Próx. Rodada: ${scheduledDate} (BRT)`
                  : 'Temporada Encerrada'}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.08] text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Rodadas automáticas às {league.config.dailyScheduleTimes.join(' & ')} (Brasília)
            </span>
            <span className="px-2.5 py-1 rounded bg-[#090C10]/90 border border-white/10 text-amber-300 font-bold tabular-nums">
              Próxima: {scheduledDate} (BRT)
            </span>
          </div>
        </div>
      </section>

      {/* SUB-NAVEGAÇÃO CONSOLE DO CAMPEONATO */}
      <div className="grid grid-cols-4 sm:flex items-center border-b border-white/[0.08] sm:gap-2">
        {[
          { id: 'ao_vivo', label: 'Partida Ao Vivo', mobileLabel: 'Ao Vivo' },
          { id: 'tabela', label: 'Classificação', mobileLabel: 'Tabela' },
          { id: 'rodadas', label: 'Rodadas', mobileLabel: 'Rodadas' },
          { id: 'estatisticas', label: 'Artilharia & Assistências', mobileLabel: 'Artilharia' },
        ].map((t) => {
          const active = viewTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setViewTab(t.id as 'ao_vivo' | 'tabela' | 'rodadas' | 'estatisticas')
              }
              className={`relative px-1.5 sm:px-4 py-3 text-center sm:text-left font-bold whitespace-nowrap cursor-pointer transition ${
                active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-display text-sm sm:text-base uppercase tracking-wider">
                <span className="sm:hidden">{t.mobileLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </span>
              {active && <span className="absolute bottom-0 inset-x-1 sm:inset-x-2 h-[2.5px] bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* ABA 1: PARTIDA AO VIVO (BROADCAST SPLIT DESKTOP)                  */}
      {/* ================================================================= */}
      {viewTab === 'ao_vivo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Esquerda (7/8 cols): Placar + Campo 2D + Trocar Câmera */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-5">
            {featuredMatch && featuredHome && featuredAway && (
              <LiveMatchPitch
                match={featuredMatch}
                homeClub={featuredHome}
                awayClub={featuredAway}
                focusClubId={activeClub?.id}
              />
            )}

            {/* Outros Jogos da Rodada */}
            <div className="console-panel p-4 space-y-3">
              <div className="console-section-title text-sm text-slate-300">
                Jogos da Rodada {league.currentRound} (Trocar Câmera)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {roundMatches.map((m) => {
                  const home = getClub(m.homeClubId);
                  const away = getClub(m.awayClubId);
                  if (!home || !away) return null;
                  const isSelected = featuredMatch?.id === m.id;
                  const isUserGame =
                    m.homeClubId === activeClub?.id || m.awayClubId === activeClub?.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMatchId(m.id)}
                      className={`p-2.5 rounded-md border flex items-center justify-between gap-2 text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-400'
                          : isUserGame
                          ? 'bg-[#090C10] border-amber-400/40 hover:border-emerald-400/60'
                          : 'bg-[#090C10] border-white/[0.07] hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <ClubCrest club={home} size="xs" />
                        <span className="font-bold text-white truncate">{home.shortName}</span>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-[#171E29] font-display font-extrabold text-sm text-white tabular-nums shrink-0">
                        {m.homeGoals} - {m.awayGoals}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1">
                        <span className="font-bold text-white truncate">{away.shortName}</span>
                        <ClubCrest club={away} size="xs" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Direita (5/4 cols): Lances/Estatísticas + Tática & Subs Ao Vivo */}
          <aside className="lg:col-span-5 xl:col-span-4 console-panel p-4 space-y-4">
            {/* Switcher Lances vs Tática */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-md bg-[#090C10] border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setBroadcastPanelTab('lances')}
                className={`py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                  broadcastPanelTab === 'lances'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                Lances &amp; Stats
              </button>
              <button
                type="button"
                disabled={!canManageLiveMatch}
                onClick={() => setBroadcastPanelTab('tatica')}
                className={`py-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition disabled:opacity-40 ${
                  broadcastPanelTab === 'tatica'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Tática &amp; Subs ({subsUsed}/5)
              </button>
            </div>

            {broadcastPanelTab === 'lances' || !canManageLiveMatch ? (
              <div className="space-y-4">
                {/* Barras Comparativas Reais da Partida em Foco */}
                {featuredMatch && featuredHome && featuredAway && (() => {
                  const st = normalizeMatchStats(featuredMatch.stats);
                  const hPassPct =
                    st.homePasses > 0 ? Math.round((st.homePassesCompleted / st.homePasses) * 100) : 0;
                  const aPassPct =
                    st.awayPasses > 0 ? Math.round((st.awayPassesCompleted / st.awayPasses) * 100) : 0;
                  const primaryRows = [
                    {
                      label: 'Posse de Bola',
                      h: st.homePossession,
                      a: 100 - st.homePossession,
                      hDisplay: `${st.homePossession}%`,
                      aDisplay: `${100 - st.homePossession}%`,
                    },
                    {
                      label: 'Finalizações (No Gol)',
                      h: st.homeShots,
                      a: st.awayShots,
                      hDisplay: `${st.homeShots} (${st.homeOnTarget})`,
                      aDisplay: `${st.awayShots} (${st.awayOnTarget})`,
                    },
                    {
                      label: 'Chances Claras',
                      h: st.homeBigChances,
                      a: st.awayBigChances,
                    },
                    {
                      label: 'Passes Certos',
                      h: st.homePassesCompleted,
                      a: st.awayPassesCompleted,
                      hDisplay: `${st.homePassesCompleted}/${st.homePasses} (${hPassPct}%)`,
                      aDisplay: `${st.awayPassesCompleted}/${st.awayPasses} (${aPassPct}%)`,
                    },
                  ];
                  const secondaryGrid = [
                    { label: 'Defesas GOL', h: st.homeSaves, a: st.awaySaves },
                    { label: 'Desarmes', h: st.homeTackles, a: st.awayTackles },
                    { label: 'Intercept.', h: st.homeInterceptions, a: st.awayInterceptions },
                    { label: 'Cruzam.', h: st.homeCrosses, a: st.awayCrosses },
                    { label: 'Escanteios', h: st.homeCorners, a: st.awayCorners },
                    { label: 'Faltas', h: st.homeFouls, a: st.awayFouls },
                    { label: 'Impedim.', h: st.homeOffsides, a: st.awayOffsides },
                    {
                      label: 'Cartões 🟨/🟥',
                      h: st.homeYellowCards,
                      a: st.awayYellowCards,
                      hDisplay: `${st.homeYellowCards}/${st.homeRedCards}`,
                      aDisplay: `${st.awayYellowCards}/${st.awayRedCards}`,
                    },
                  ];

                  return (
                    <div className="bg-[#090C10] border border-white/[0.07] rounded-md p-3.5 space-y-3">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                        <span>{featuredHome.shortName}</span>
                        <span>Estatísticas Reais</span>
                        <span>{featuredAway.shortName}</span>
                      </div>

                      {primaryRows.map((row) => {
                        const total = Math.max(1, row.h + row.a);
                        const homePct = Math.round((row.h / total) * 100);
                        return (
                          <div key={row.label} className="space-y-1 text-xs">
                            <div className="flex justify-between gap-2 tabular-nums">
                              <span className="font-bold text-white whitespace-nowrap">
                                {row.hDisplay ?? row.h}
                              </span>
                              <span className="text-[11px] text-slate-400 text-center truncate">
                                {row.label}
                              </span>
                              <span className="font-bold text-white whitespace-nowrap">
                                {row.aDisplay ?? row.a}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${homePct}%`,
                                  backgroundColor: featuredHome.primaryColor || '#10B981',
                                }}
                              />
                              <div
                                className="h-full transition-all"
                                style={{
                                  width: `${100 - homePct}%`,
                                  backgroundColor: featuredAway.primaryColor || '#38BDF8',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}

                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/[0.06] text-[11px]">
                        {secondaryGrid.map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-[#11161E] border border-white/[0.05] tabular-nums"
                          >
                            <span className="font-bold text-white">{item.hDisplay ?? item.h}</span>
                            <span className="text-[10px] text-slate-400 truncate">{item.label}</span>
                            <span className="font-bold text-white">{item.aDisplay ?? item.a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Linha do Tempo de Eventos da Partida */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                    <span>Eventos da Partida</span>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {featuredMatch?.events.length ?? 0} registros
                    </span>
                  </div>

                  {!featuredMatch || featuredMatch.events.length === 0 ? (
                    <div className="bg-[#090C10] border border-white/[0.06] rounded-md py-8 px-4 text-center text-xs text-slate-400">
                      {featuredMatch?.status === 'agendada'
                        ? 'A partida ainda não começou. Acompanhe os lances aqui assim que a bola rolar!'
                        : 'Nenhum evento registrado até o momento.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
                      {[...featuredMatch.events].reverse().map((ev, i) => {
                        const evClub = getClub(ev.clubId);
                        const meta = EVENT_BADGE[ev.type] ?? EVENT_BADGE.chute;
                        return (
                          <div
                            key={`${ev.minute}-${ev.type}-${i}`}
                            className="bg-[#090C10] border border-white/[0.06] rounded-md p-2.5 flex items-start gap-2.5 text-xs"
                          >
                            <span className="font-display text-sm font-extrabold text-amber-300 tabular-nums w-7 shrink-0">
                              {ev.minute}&apos;
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${meta.cls}`}
                            >
                              {meta.label}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                {evClub && <ClubCrest club={evClub} size="xs" />}
                                <span className="truncate">{ev.playerName}</span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                {ev.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Controles Táticos & Substituições Ao Vivo do Seu Clube */
              activeClub &&
              userMatch && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <ClubCrest club={activeClub} size="xs" />
                      <span>{activeClub.shortName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-semibold text-slate-300">
                        {userMatch.manualControlClubs?.includes(activeClub.id)
                          ? 'Manual'
                          : 'IA ativa se offline'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSubOutSlotIdx(null);
                        setSelectedBenchId(null);
                        setShowSubDrawer((s) => !s);
                      }}
                      className={`px-2.5 py-1.5 rounded border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                        showSubDrawer
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-[#090C10] border-white/15 text-slate-200'
                      }`}
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      {showSubDrawer ? 'Ocultar Campo' : 'Abrir Campo'}
                      {outOfPosStartersCount > 0 && (
                        <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px]">
                          {outOfPosStartersCount}
                        </span>
                      )}
                    </button>
                  </div>

                  <TacticalInstructionsPanel
                    club={activeClub}
                    compact
                    onChangeTactics={(nextFormation, nextMentality, nextTactics) => {
                      if (nextFormation !== activeClub.formation) {
                        setSubOutSlotIdx(null);
                        setSelectedBenchId(null);
                      }
                      onUpdateTactics(activeClub.id, nextFormation, nextMentality, nextTactics);
                    }}
                  />

                  {/* Leitura Tática vs Adversário */}
                  {tacticalReadout && userOpponentClub && (
                    <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                          vs {userOpponentClub.shortName} ({userOpponentClub.formation} •{' '}
                          {inferPlayStyleFromClub(userOpponentClub)} · {normalizePosture(userOpponentClub.mentality)})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                            tacticalReadout.synergyTone === 'emerald'
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : tacticalReadout.synergyTone === 'rose'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-amber-400/15 text-amber-300'
                          }`}
                        >
                          {tacticalReadout.synergyLabel}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-white">
                        {tacticalReadout.headline}
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] tabular-nums">
                        <div className="rounded bg-[#11161E] border border-white/[0.06] py-1">
                          <div className="text-[10px] text-slate-400">ATA</div>
                          <div
                            className={`font-bold ${
                              tacticalReadout.netAtkBonus >= 0 ? 'text-emerald-300' : 'text-rose-400'
                            }`}
                          >
                            {tacticalReadout.netAtkBonus >= 0
                              ? `+${tacticalReadout.netAtkBonus}`
                              : tacticalReadout.netAtkBonus}
                          </div>
                        </div>
                        <div className="rounded bg-[#11161E] border border-white/[0.06] py-1">
                          <div className="text-[10px] text-slate-400">MEI</div>
                          <div
                            className={`font-bold ${
                              tacticalReadout.midControlBonus >= 0
                                ? 'text-emerald-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {tacticalReadout.midControlBonus >= 0
                              ? `+${tacticalReadout.midControlBonus}`
                              : tacticalReadout.midControlBonus}
                          </div>
                        </div>
                        <div className="rounded bg-[#11161E] border border-white/[0.06] py-1">
                          <div className="text-[10px] text-slate-400">DEF</div>
                          <div
                            className={`font-bold ${
                              tacticalReadout.netDefBonus >= 0 ? 'text-emerald-300' : 'text-rose-400'
                            }`}
                          >
                            {tacticalReadout.netDefBonus >= 0
                              ? `+${tacticalReadout.netDefBonus}`
                              : tacticalReadout.netDefBonus}
                          </div>
                        </div>
                        <div className="rounded bg-[#11161E] border border-white/[0.06] py-1">
                          <div className="text-[10px] text-slate-400">Energia</div>
                          <div
                            className={`font-bold ${
                              tacticalReadout.ownAvgStamina >= 65
                                ? 'text-emerald-300'
                                : 'text-amber-300'
                            }`}
                          >
                            {tacticalReadout.ownAvgStamina}%
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-amber-200 leading-snug">
                        {tacticalReadout.advice}
                      </div>
                    </div>
                  )}

                  {/* Campinho Vertical Interativo + Banco */}
                  {showSubDrawer && (
                    <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
                      {activeStrength && (
                        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] tabular-nums">
                          <div className="rounded bg-[#090C10] border border-white/[0.07] py-1">
                            <div className="text-slate-400">ATA</div>
                            <div className="font-bold text-white">{activeStrength.attack}</div>
                          </div>
                          <div className="rounded bg-[#090C10] border border-white/[0.07] py-1">
                            <div className="text-slate-400">MEI</div>
                            <div className="font-bold text-white">{activeStrength.midfield}</div>
                          </div>
                          <div className="rounded bg-[#090C10] border border-white/[0.07] py-1">
                            <div className="text-slate-400">DEF</div>
                            <div className="font-bold text-white">{activeStrength.defense}</div>
                          </div>
                          <div
                            className={`rounded border py-1 ${
                              outOfPosStartersCount > 0
                                ? 'bg-amber-400/10 border-amber-400/35 text-amber-300'
                                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            <div className="text-[9px] uppercase font-bold">Encaixe</div>
                            <div className="font-bold truncate">
                              {outOfPosStartersCount > 0
                                ? `${outOfPosStartersCount} impr.`
                                : '11/11 ideal'}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="relative w-full h-[380px] rounded-md pitch-surface border border-emerald-400/30 overflow-hidden select-none shadow-inner">
                        <div className="absolute inset-2.5 border border-white/20 rounded-sm pointer-events-none">
                          <div className="absolute top-1/2 inset-x-0 border-t border-white/20" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-white/20" />
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-12 border border-b-0 border-white/20" />
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-12 border border-t-0 border-white/20" />
                        </div>

                        {activeLayout.map((spec, idx) => {
                          const slot = activeSlots[idx];
                          const player = slot
                            ? activeClub.squad.find((p) => p.id === slot.playerId)
                            : undefined;
                          const isExpelled = Boolean(player && redCardedIds.includes(player.id));
                          const fit = player ? getPositionFit(player, spec.role) : null;
                          const isSelected = subOutSlotIdx === idx;

                          return (
                            <button
                              key={`live-${activeClub.formation}-${idx}`}
                              type="button"
                              disabled={isExpelled}
                              onClick={() => {
                                if (isExpelled) return;
                                if (selectedBenchId) {
                                  if (subsUsed < 5) {
                                    onMakeLiveSubstitution(
                                      userMatch.id,
                                      activeClub.id,
                                      idx,
                                      selectedBenchId
                                    );
                                  }
                                  setSelectedBenchId(null);
                                  setSubOutSlotIdx(null);
                                  return;
                                }
                                if (subOutSlotIdx === null) {
                                  setSubOutSlotIdx(idx);
                                  return;
                                }
                                if (subOutSlotIdx === idx) {
                                  setSubOutSlotIdx(null);
                                  return;
                                }
                                if (player) {
                                  onAssignSlotPlayer(activeClub.id, subOutSlotIdx, player.id);
                                }
                                setSubOutSlotIdx(null);
                              }}
                              style={{ left: `${spec.pitchX}%`, top: `${spec.pitchY}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition cursor-pointer active:scale-95"
                            >
                              <div
                                className={`relative rounded-full p-0.5 ${
                                  isSelected
                                    ? 'ring-2 ring-amber-400 scale-110'
                                    : fit?.fit === 'critico'
                                    ? 'ring-2 ring-rose-500'
                                    : fit?.fit === 'improvisado'
                                    ? 'ring-2 ring-amber-400/80'
                                    : fit?.fit === 'secundaria'
                                    ? 'ring-1 ring-sky-400/70'
                                    : ''
                                }`}
                              >
                                {player && (
                                  <PlayerAvatar
                                    player={player}
                                    size="xs"
                                    kitPrimary={
                                      spec.role === 'GOL' ? '#eab308' : activeClub.primaryColor
                                    }
                                    kitSecondary={
                                      spec.role === 'GOL' ? '#0f172a' : activeClub.secondaryColor
                                    }
                                  />
                                )}
                                <span className="absolute -top-1 -left-1.5 px-1 rounded bg-[#090C10] border border-white/20 text-[8px] font-bold text-slate-200">
                                  {spec.label}
                                </span>
                                {isExpelled && (
                                  <span className="absolute -top-1 -right-1.5 px-1 rounded bg-rose-600 text-white text-[8px] font-extrabold border border-rose-200">
                                    EXP
                                  </span>
                                )}
                                {player && fit && (
                                  <span
                                    className={`absolute -bottom-1 -right-1.5 px-1 rounded text-[9px] font-extrabold border ${
                                      fit.penalty === 0
                                        ? 'bg-emerald-500 text-slate-950 border-emerald-200'
                                        : fit.penalty === -2
                                        ? 'bg-sky-400 text-slate-950 border-sky-200'
                                        : fit.penalty <= -12
                                        ? 'bg-rose-500 text-white border-rose-200'
                                        : 'bg-amber-400 text-slate-950 border-amber-200'
                                    }`}
                                  >
                                    {fit.effectiveOvr}
                                  </span>
                                )}
                              </div>
                              <div className="px-1 py-0.5 rounded bg-black/80 flex flex-col items-center max-w-[70px]">
                                <span className="text-[9px] font-semibold text-white whitespace-nowrap max-w-[66px] truncate leading-none">
                                  {player ? player.knownName : 'Vazio'}
                                </span>
                                {player && (
                                  <div className="mt-0.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        player.stamina > 65
                                          ? 'bg-emerald-400'
                                          : player.stamina > 40
                                          ? 'bg-amber-400'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{
                                        width: `${Math.min(100, Math.max(0, player.stamina))}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Instrução Rápida */}
                      <div
                        className={`rounded px-3 py-2 border text-[11px] flex items-center justify-between gap-2 ${
                          selectedLiveSlotPlayer || selectedLiveBenchPlayer
                            ? 'bg-amber-400/10 border-amber-400/40 text-amber-100'
                            : 'bg-[#090C10] border-white/[0.06] text-slate-400'
                        }`}
                      >
                        <span className="leading-snug">
                          {selectedLiveSlotPlayer && selectedLiveSlotSpec ? (
                            <>
                              <strong className="text-white">
                                {selectedLiveSlotPlayer.knownName}
                              </strong>{' '}
                              ({selectedLiveSlotSpec.label}) — toque noutro titular p/ inverter (0
                              subs) ou num reserva abaixo.
                            </>
                          ) : selectedLiveBenchPlayer ? (
                            <>
                              Reserva{' '}
                              <strong className="text-white">
                                {selectedLiveBenchPlayer.knownName}
                              </strong>{' '}
                              — toque no titular que vai sair.
                            </>
                          ) : (
                            'Toque em 2 titulares p/ inverter ou num reserva abaixo p/ substituir.'
                          )}
                        </span>
                        {(subOutSlotIdx !== null || selectedBenchId !== null) && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubOutSlotIdx(null);
                              setSelectedBenchId(null);
                            }}
                            className="p-1 rounded bg-white/10 text-white shrink-0 cursor-pointer"
                            aria-label="Cancelar seleção"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Banco de Reservas Ao Vivo */}
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {liveBenchPlayers.map((bench) => {
                          const fit = selectedLiveSlotSpec
                            ? getPositionFit(bench, selectedLiveSlotSpec.role)
                            : null;
                          const isBenchSelected = selectedBenchId === bench.id;
                          const isBlocked = subsUsed >= 5;
                          const ovrValue = fit ? fit.effectiveOvr : bench.overall;
                          const ovrColor = !fit
                            ? 'text-amber-300'
                            : fit.penalty === 0
                            ? 'text-emerald-400'
                            : fit.penalty === -2
                            ? 'text-sky-300'
                            : fit.penalty <= -12
                            ? 'text-rose-400'
                            : 'text-amber-300';

                          return (
                            <button
                              key={bench.id}
                              type="button"
                              disabled={isBlocked}
                              onClick={() => {
                                if (isBlocked) return;
                                if (subOutSlotIdx !== null) {
                                  onMakeLiveSubstitution(
                                    userMatch.id,
                                    activeClub.id,
                                    subOutSlotIdx,
                                    bench.id
                                  );
                                  setSubOutSlotIdx(null);
                                  setSelectedBenchId(null);
                                  return;
                                }
                                setSelectedBenchId(isBenchSelected ? null : bench.id);
                              }}
                              className={`w-full text-left p-2 rounded border flex items-center justify-between gap-2 transition ${
                                isBlocked
                                  ? 'bg-[#090C10]/50 border-white/[0.04] opacity-50 cursor-not-allowed'
                                  : isBenchSelected
                                  ? 'bg-emerald-500/15 border-emerald-400 cursor-pointer'
                                  : 'bg-[#090C10] border-white/[0.06] hover:border-emerald-400/50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <PlayerAvatar
                                  player={bench}
                                  size="xs"
                                  kitPrimary={
                                    bench.position === 'GOL' ? '#eab308' : activeClub.primaryColor
                                  }
                                  kitSecondary={
                                    bench.position === 'GOL' ? '#0f172a' : activeClub.secondaryColor
                                  }
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white flex items-center gap-1 truncate">
                                    <CountryFlag nationality={bench.nationality} />
                                    <span className="truncate">{bench.knownName}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                    <span
                                      className={`px-1 rounded font-bold ${
                                        POSITION_STYLE[bench.position]
                                      }`}
                                    >
                                      {bench.position}
                                    </span>
                                    <span className="tabular-nums">
                                      {Math.round(bench.stamina)}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={`font-display text-base font-extrabold tabular-nums leading-none ${ovrColor}`}
                                >
                                  OVR {ovrValue}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {fit
                                    ? fit.penalty === 0
                                      ? 'Natural'
                                      : fit.penalty === -2
                                      ? 'Sec. (-2)'
                                      : `Impr. (${fit.penalty})`
                                    : bench.position}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </aside>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 2: CLASSIFICAÇÃO OFICIAL                                      */}
      {/* ================================================================= */}
      {viewTab === 'tabela' && (
        <div className="console-panel p-4 sm:p-6 space-y-4">
          <div className="console-section-title text-base text-white">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            Classificação — Série A
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.1] text-slate-400 text-[11px] uppercase">
                  <th className="py-2.5 pl-2.5 pr-1">#</th>
                  <th className="py-2.5 px-1.5">Clube</th>
                  <th className="py-2.5 px-1.5 text-center font-bold text-white">P</th>
                  <th className="py-2.5 px-1.5 text-center">J</th>
                  <th className="py-2.5 px-1.5 text-center">V</th>
                  <th className="py-2.5 px-1.5 text-center">E</th>
                  <th className="py-2.5 px-1.5 text-center">D</th>
                  <th className="py-2.5 px-1.5 text-center hidden sm:table-cell">GP</th>
                  <th className="py-2.5 px-1.5 text-center hidden sm:table-cell">GC</th>
                  <th className="py-2.5 px-1.5 text-center">SG</th>
                  <th className="py-2.5 px-2 text-right hidden md:table-cell">Últ. 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {standingsClubs.map((club, idx) => {
                  const rank = idx + 1;
                  const sg = club.standing.goalsFor - club.standing.goalsAgainst;
                  const isActive = club.id === activeClub?.id;
                  const form = getClubForm(club.id);
                  const zoneColor =
                    rank <= 4
                      ? 'border-l-emerald-400'
                      : rank <= 6
                      ? 'border-l-sky-400'
                      : rank <= 12
                      ? 'border-l-amber-400'
                      : rank >= standingsClubs.length - 3
                      ? 'border-l-rose-500'
                      : 'border-l-transparent';
                  return (
                    <tr
                      key={club.id}
                      className={`border-l-[3px] ${zoneColor} ${
                        isActive ? 'bg-emerald-500/[0.12]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2.5 pl-2.5 pr-1 text-slate-300 font-bold tabular-nums">
                        {rank}
                      </td>
                      <td className="py-2.5 px-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <ClubCrest club={club} size="xs" />
                          <span
                            className={`font-semibold truncate max-w-[125px] sm:max-w-none ${
                              isActive ? 'text-emerald-300 font-bold' : 'text-white'
                            }`}
                          >
                            {club.name}
                          </span>
                          {club.controller === 'human' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold shrink-0">
                              {club.managerName.split(' ')[0]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-1.5 text-center font-extrabold text-sm text-white tabular-nums">
                        {club.standing.points}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400 tabular-nums">
                        {club.standing.played}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-200 tabular-nums">
                        {club.standing.wins}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400 tabular-nums">
                        {club.standing.draws}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400 tabular-nums">
                        {club.standing.losses}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400 tabular-nums hidden sm:table-cell">
                        {club.standing.goalsFor}
                      </td>
                      <td className="py-2.5 px-1.5 text-center text-slate-400 tabular-nums hidden sm:table-cell">
                        {club.standing.goalsAgainst}
                      </td>
                      <td
                        className={`py-2.5 px-1.5 text-center font-semibold tabular-nums ${
                          sg > 0 ? 'text-emerald-300' : sg < 0 ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {sg > 0 ? `+${sg}` : sg}
                      </td>
                      <td className="py-2.5 px-2 hidden md:table-cell">
                        <div className="flex items-center justify-end gap-1">
                          {form.length === 0 ? (
                            <span className="text-[11px] text-slate-600">—</span>
                          ) : (
                            form.map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className={`w-5 h-5 rounded text-[10px] font-extrabold flex items-center justify-center ${
                                  f === 'V'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : f === 'E'
                                    ? 'bg-amber-400 text-slate-950'
                                    : 'bg-rose-500 text-white'
                                }`}
                              >
                                {f}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-white/[0.08] text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /> G4 Libertadores
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> Pré-Libertadores
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Sul-Americana
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Z4 Rebaixamento
            </span>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 3: RODADAS, PRÓXIMOS JOGOS & HISTÓRICO DE RESULTADOS          */}
      {/* ================================================================= */}
      {viewTab === 'rodadas' && (
        <div className="console-panel p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="font-display text-lg font-extrabold uppercase tracking-wide text-white">
                Calendário &amp; Resultados
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={browseRound <= 1}
                onClick={() => setBrowseRound((r) => Math.max(1, r - 1))}
                className="p-2 rounded-md bg-[#090C10] border border-white/12 text-slate-200 disabled:opacity-40 cursor-pointer"
                aria-label="Rodada anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={browseRound}
                onChange={(e) => setBrowseRound(Number(e.target.value))}
                className="px-3 py-2 rounded-md bg-[#090C10] border border-white/12 text-xs font-bold text-white"
              >
                {Array.from({ length: league.totalRounds }, (_, idx) => idx + 1).map((r) => (
                  <option key={r} value={r}>
                    Rodada {r} {r === league.currentRound ? '(Atual)' : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={browseRound >= league.totalRounds}
                onClick={() => setBrowseRound((r) => Math.min(league.totalRounds, r + 1))}
                className="p-2 rounded-md bg-[#090C10] border border-white/12 text-slate-200 disabled:opacity-40 cursor-pointer"
                aria-label="Próxima rodada"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedRoundMatches.map((m: Match) => {
              const home = getClub(m.homeClubId);
              const away = getClub(m.awayClubId);
              if (!home || !away) return null;
              const isUserGame =
                m.homeClubId === activeClub?.id || m.awayClubId === activeClub?.id;
              const isExpanded = expandedRoundMatchId === m.id;
              const goals = m.events.filter((e) => e.type === 'gol');
              const dateText = m.scheduledAt
                ? new Date(m.scheduledAt).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <div
                  key={m.id}
                  className={`bg-[#090C10] border rounded-md p-3 sm:p-3.5 space-y-2.5 overflow-hidden ${
                    isUserGame ? 'border-emerald-500/45' : 'border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="truncate min-w-0">{home.stadium}</span>
                    <span
                      className={`font-bold uppercase shrink-0 ${
                        m.status === 'ao_vivo'
                          ? 'text-rose-400'
                          : m.status === 'finalizada'
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {m.status === 'ao_vivo'
                        ? `Ao Vivo ${m.currentMinute}'`
                        : m.status === 'finalizada'
                        ? 'Encerrado'
                        : dateText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                      <span className="font-display text-sm sm:text-lg font-bold text-white uppercase truncate sm:hidden">
                        {home.shortName}
                      </span>
                      <span className="font-display text-base sm:text-lg font-bold text-white uppercase truncate hidden sm:inline">
                        {home.name}
                      </span>
                      <ClubCrest club={home} size="sm" />
                    </div>

                    <div className="px-2.5 sm:px-3 py-1 rounded bg-[#171E29] border border-white/10 font-display text-lg sm:text-xl font-extrabold text-white tabular-nums shrink-0 whitespace-nowrap">
                      {m.status === 'agendada' ? 'vs' : `${m.homeGoals} - ${m.awayGoals}`}
                    </div>

                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <ClubCrest club={away} size="sm" />
                      <span className="font-display text-sm sm:text-lg font-bold text-white uppercase truncate sm:hidden">
                        {away.shortName}
                      </span>
                      <span className="font-display text-base sm:text-lg font-bold text-white uppercase truncate hidden sm:inline">
                        {away.name}
                      </span>
                    </div>
                  </div>

                  {m.boxOfficeReport && (
                    <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded bg-[#11161E] border border-white/[0.06] text-[11px]">
                      <span className="text-slate-300 tabular-nums">
                        Público: <strong className="text-white">{m.boxOfficeReport.attendance.toLocaleString('pt-BR')}</strong> ({m.boxOfficeReport.occupancyPct}%)
                      </span>
                      <div className="flex items-center gap-2">
                        {m.boxOfficeReport.highlightLabel && (
                          <span className="text-[10px] font-bold text-amber-300">
                            {m.boxOfficeReport.highlightLabel}
                          </span>
                        )}
                        <span className="font-bold text-emerald-400 tabular-nums">
                          +{formatMillionsBRL(m.boxOfficeReport.revenue)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-[11px]">
                    {m.round === league.currentRound ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMatchId(m.id);
                          setViewTab('ao_vivo');
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold cursor-pointer"
                      >
                        Assistir no Campinho →
                      </button>
                    ) : (
                      <span className="text-slate-500">
                        {goals.length > 0 ? `${goals.length} gol(s) na partida` : 'Sem gols registrados'}
                      </span>
                    )}

                    {m.events.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedRoundMatchId(isExpanded ? null : m.id)}
                        className="text-slate-300 hover:text-white font-semibold cursor-pointer"
                      >
                        {isExpanded ? 'Ocultar súmula' : 'Ver súmula'}
                      </button>
                    )}
                  </div>

                  {isExpanded && m.events.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-1 text-[11px] max-h-40 overflow-y-auto">
                      {m.events.map((ev, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-300">
                          <span className="font-bold text-amber-300 tabular-nums w-6">
                            {ev.minute}&apos;
                          </span>
                          <span className="font-semibold text-white">{ev.playerName}</span>
                          <span className="text-slate-400 truncate">— {ev.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 4: ARTILHARIA & ASSISTÊNCIAS                                  */}
      {/* ================================================================= */}
      {viewTab === 'estatisticas' && (
        <div className="space-y-4">
          {/* Switcher Mobile */}
          <div className="lg:hidden grid grid-cols-2 gap-1.5 p-1 rounded-md bg-[#11161E] border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setStatsMode('artilharia')}
              className={`py-2 rounded text-xs font-bold cursor-pointer ${
                statsMode === 'artilharia' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
              }`}
            >
              Artilharia
            </button>
            <button
              type="button"
              onClick={() => setStatsMode('assistencias')}
              className={`py-2 rounded text-xs font-bold cursor-pointer ${
                statsMode === 'assistencias' ? 'bg-sky-400 text-slate-950' : 'text-slate-400'
              }`}
            >
              Assistências
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className={statsMode === 'artilharia' ? 'block' : 'hidden lg:block'}>
              {renderStatLeaderboard('artilharia')}
            </div>
            <div className={statsMode === 'assistencias' ? 'block' : 'hidden lg:block'}>
              {renderStatLeaderboard('assistencias')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
