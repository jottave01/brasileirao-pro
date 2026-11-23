import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Clock,
  Radio,
  Sliders,
  Trophy,
  X,
} from 'lucide-react';
import {
  Club,
  Formation,
  LeagueState,
  PlayerPosition,
  TacticalMentality,
} from '../types/league';
import {
  calculateClubStrength,
  calculateSeasonPrizes,
  evaluateTacticalMatchup,
  FORMATION_LAYOUT,
  getPositionFit,
} from '../engine/botAI';
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
  onUpdateTactics: (clubId: string, formation: Formation, mentality: TacticalMentality) => void;
  onAssignSlotPlayer: (clubId: string, slotIndex: number, playerId: string) => void;
  onMakeLiveSubstitution: (
    matchId: string,
    clubId: string,
    slotIndex: number,
    subInPlayerId: string
  ) => void;
  onStartNextSeason: () => void;
}

const MENTALITIES: TacticalMentality[] = [
  'Retranca',
  'Contra-Ataque',
  'Equilibrada',
  'Ofensiva',
  'Tudo ou Nada',
];

export const CompetitionView: React.FC<CompetitionViewProps> = ({
  league,
  liveRoundRunning,
  onStartLiveRound,
  onUpdateTactics,
  onAssignSlotPlayer,
  onMakeLiveSubstitution,
  onStartNextSeason,
}) => {
  const [viewTab, setViewTab] = useState<'ao_vivo' | 'tabela' | 'artilharia' | 'assistencias'>('ao_vivo');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [showSubDrawer, setShowSubDrawer] = useState(false);
  const [subOutSlotIdx, setSubOutSlotIdx] = useState<number | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const isAdmin = currentUser?.isAdmin === true;

  const roundMatches = league.matches.filter((m) => m.round === league.currentRound);
  const isCurrentRoundFinished =
    roundMatches.length > 0 && roundMatches.every((m) => m.status === 'finalizada');

  const defaultHumanMatch =
    roundMatches.find(
      (m) =>
        m.homeClubId === league.activeHumanClubId || m.awayClubId === league.activeHumanClubId
    ) ?? roundMatches[0];
  const featuredMatch =
    roundMatches.find((m) => m.id === selectedMatchId) ?? defaultHumanMatch;

  const getClub = (id: string) => league.clubs.find((c) => c.id === id);
  const featuredHome = featuredMatch ? getClub(featuredMatch.homeClubId) : undefined;
  const featuredAway = featuredMatch ? getClub(featuredMatch.awayClubId) : undefined;

  const activeClub = getClub(league.activeHumanClubId);
  const userMatch = roundMatches.find(
    (m) => m.homeClubId === activeClub?.id || m.awayClubId === activeClub?.id
  );
  const userIsHome = userMatch?.homeClubId === activeClub?.id;
  const userOpponentClub = userMatch
    ? getClub(userIsHome ? userMatch.awayClubId : userMatch.homeClubId)
    : undefined;
  const tacticalReadout =
    activeClub && userOpponentClub
      ? evaluateTacticalMatchup(activeClub, userOpponentClub)
      : null;
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
        .filter((p) => !p.isStarter && !subbedOutIds.includes(p.id))
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

  // Tela de Fim de Temporada + Premiação Modo Carreira
  if (league.status === 'fim_temporada') {
    const prizes = calculateSeasonPrizes(league.clubs);
    const champion = standingsClubs[0];
    return (
      <div className="space-y-4 pb-8">
        <div className="bg-gradient-to-b from-amber-500/20 via-[#121925] to-[#0D121A] border border-amber-500/35 rounded-2xl p-5 text-center space-y-3">
          <div className="flex justify-center">
            <BrasileiraoTrophyLogo size="lg" />
          </div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
            Fim da Temporada {league.season}
          </div>
          {champion && (
            <div className="flex flex-col items-center gap-2">
              <ClubCrest club={champion} size="xl" />
              <h1 className="font-display text-3xl font-extrabold text-white uppercase">
                {champion.name} Campeão!
              </h1>
              <p className="text-xs text-slate-300">
                Técnico: {champion.managerName} • {champion.standing.points} pts
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onStartNextSeason}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg"
          >
            Receber Premiações & Iniciar Temporada {league.season + 1} →
          </button>
        </div>

        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-4 space-y-2">
          <div className="font-display text-sm font-bold uppercase text-amber-300 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> Premiação por Colocação
          </div>
          {prizes.map((pr) => {
            const c = getClub(pr.clubId);
            return (
              <div
                key={pr.clubId}
                className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-400 w-5">{pr.rank}º</span>
                  {c && <ClubCrest club={c} size="xs" />}
                  <span className="font-semibold text-white">{pr.clubName}</span>
                </div>
                <span className="font-display text-xs sm:text-sm font-bold text-emerald-400 tabular-nums">
                  +{formatMillionsBRL(pr.prize)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Cabeçalho Broadcast da Rodada (Alinhado sem quebra ao lado do CTA) */}
      <div className="broadcast-card rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 leading-none">
              Brasileirão Série A • Temporada {league.season}
            </div>
            <div className="font-display text-2xl font-extrabold text-white uppercase leading-none mt-1">
              Rodada {league.currentRound} de {league.totalRounds}
            </div>
          </div>

          {!isCurrentRoundFinished ? (
            liveRoundRunning ? (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-extrabold flex items-center gap-1.5 shrink-0">
                <Radio className="w-3.5 h-3.5" />
                AO VIVO
              </div>
            ) : league.currentRound === 1 ? (
              isAdmin ? (
                <button
                  type="button"
                  onClick={onStartLiveRound}
                  className="px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 bg-gradient-to-r from-rose-500 to-rose-600 hover:brightness-110 text-white shadow-lg shadow-rose-500/25 transition"
                >
                  <Radio className="w-3.5 h-3.5" />
                  Iniciar 1ª Rodada
                </button>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300 shrink-0">
                  Aguardando Admin (1ª Rodada)
                </div>
              )
            ) : (
              <div className="px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-[11px] font-bold text-emerald-300 shrink-0">
                Início Automático
              </div>
            )
          ) : (
            <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/35 text-[11px] font-bold text-amber-300 shrink-0">
              {league.currentRound < league.totalRounds
                ? 'Próx. Rodada Automática'
                : 'Temporada Encerrada'}
            </div>
          )}
        </div>

        {/* Faixa de Horários Alinhada em Linha Única */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.07] text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Automático • {league.config.dailyScheduleTimes.join(' & ')} (Brasília)
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-[#06090E] border border-white/10 text-amber-300 font-semibold tabular-nums whitespace-nowrap">
            Próxima: {scheduledDate} (BRT)
          </span>
        </div>

        {/* Sub-tabs Broadcast */}
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[#06090E] border border-white/[0.06]">
          {[
            { id: 'ao_vivo', label: 'Campinho' },
            { id: 'tabela', label: 'Tabela' },
            { id: 'artilharia', label: 'Artilharia' },
            { id: 'assistencias', label: 'Assistências' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() =>
                setViewTab(t.id as 'ao_vivo' | 'tabela' | 'artilharia' | 'assistencias')
              }
              className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition truncate px-1 ${
                viewTab === t.id
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aba Campinho 2D + Táticas & Substituições ao Vivo */}
      {viewTab === 'ao_vivo' && (
        <div className="space-y-4">
          {featuredMatch && featuredHome && featuredAway && (
            <LiveMatchPitch
              match={featuredMatch}
              homeClub={featuredHome}
              awayClub={featuredAway}
            />
          )}

          {/* Controles Táticos & Substituições Ao Vivo do Seu Clube */}
          {activeClub && userMatch && userMatch.status !== 'finalizada' && (
            <div className="bg-[#0D121A] border border-emerald-500/25 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Tática Ao Vivo • {activeClub.shortName}
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-semibold text-slate-300">
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
                  className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    showSubDrawer
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300'
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Escalação &amp; Subs ({subsUsed}/5)
                  {outOfPosStartersCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-extrabold">
                      {outOfPosStartersCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Posturas Táticas */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {MENTALITIES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onUpdateTactics(activeClub.id, activeClub.formation, m)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap border cursor-pointer transition ${
                      activeClub.mentality === m
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-[#06090E] text-slate-300 border-white/10'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Troca rápida de formação durante o jogo */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Formação em campo:</span>
                <select
                  value={activeClub.formation}
                  onChange={(e) => {
                    setSubOutSlotIdx(null);
                    setSelectedBenchId(null);
                    onUpdateTactics(activeClub.id, e.target.value as Formation, activeClub.mentality);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#06090E] border border-white/10 text-xs font-bold text-white"
                >
                  <option value="4-3-3">4-3-3</option>
                  <option value="4-4-2">4-4-2</option>
                  <option value="4-2-3-1">4-2-3-1</option>
                  <option value="3-5-2">3-5-2</option>
                  <option value="3-4-3">3-4-3</option>
                  <option value="5-3-2">5-3-2</option>
                </select>
              </div>

              {/* Leitura Tática Ao Vivo vs Adversário */}
              {tacticalReadout && userOpponentClub && (
                <div className="bg-[#06090E]/90 border border-white/[0.08] rounded-xl p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Leitura Tática vs {userOpponentClub.shortName} ({userOpponentClub.formation} • {userOpponentClub.mentality})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                        tacticalReadout.synergyTone === 'emerald'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : tacticalReadout.synergyTone === 'rose'
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {tacticalReadout.synergyLabel}
                    </span>
                  </div>

                  <div className="text-[11px] font-semibold text-white">
                    {tacticalReadout.headline}
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] tabular-nums">
                    <div className="rounded-lg bg-[#0D121A] border border-white/[0.06] py-1 px-1">
                      <div className="text-slate-400">ATA</div>
                      <div className={`font-bold ${tacticalReadout.netAtkBonus >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {tacticalReadout.netAtkBonus >= 0 ? `+${tacticalReadout.netAtkBonus}` : tacticalReadout.netAtkBonus}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#0D121A] border border-white/[0.06] py-1 px-1">
                      <div className="text-slate-400">MEI</div>
                      <div className={`font-bold ${tacticalReadout.midControlBonus >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {tacticalReadout.midControlBonus >= 0 ? `+${tacticalReadout.midControlBonus}` : tacticalReadout.midControlBonus}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#0D121A] border border-white/[0.06] py-1 px-1">
                      <div className="text-slate-400">DEF</div>
                      <div className={`font-bold ${tacticalReadout.netDefBonus >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                        {tacticalReadout.netDefBonus >= 0 ? `+${tacticalReadout.netDefBonus}` : tacticalReadout.netDefBonus}
                      </div>
                    </div>
                    <div className="rounded-lg bg-[#0D121A] border border-white/[0.06] py-1 px-1">
                      <div className="text-slate-400">Energia</div>
                      <div className={`font-bold ${tacticalReadout.ownAvgStamina >= 65 ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {tacticalReadout.ownAvgStamina}%
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-amber-200/95 leading-snug">
                    💡 {tacticalReadout.advice}
                  </div>
                </div>
              )}

              {/* Escalação Visual em Campinho Vertical (Idêntica à aba Time) */}
              {showSubDrawer && (
                <div className="pt-3 border-t border-white/[0.06] space-y-2.5">
                  {activeStrength && (
                    <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] tabular-nums">
                      <div className="rounded-lg bg-[#06090E] border border-white/[0.07] py-1.5 px-1">
                        <div className="text-slate-400">ATA</div>
                        <div className="font-bold text-white">{activeStrength.attack}</div>
                      </div>
                      <div className="rounded-lg bg-[#06090E] border border-white/[0.07] py-1.5 px-1">
                        <div className="text-slate-400">MEI</div>
                        <div className="font-bold text-white">{activeStrength.midfield}</div>
                      </div>
                      <div className="rounded-lg bg-[#06090E] border border-white/[0.07] py-1.5 px-1">
                        <div className="text-slate-400">DEF</div>
                        <div className="font-bold text-white">{activeStrength.defense}</div>
                      </div>
                      <div
                        className={`rounded-lg border py-1.5 px-1 ${
                          outOfPosStartersCount > 0
                            ? 'bg-amber-500/10 border-amber-400/35 text-amber-300'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        }`}
                      >
                        <div className="text-[9px] uppercase font-bold">Encaixe</div>
                        <div className="font-bold truncate">
                          {outOfPosStartersCount > 0
                            ? `${outOfPosStartersCount} fora de pos.`
                            : '11/11 ideal'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Campinho Vertical Interativo com Gramado Listrado */}
                  <div className="relative w-full h-[430px] rounded-2xl pitch-pattern border border-emerald-400/30 overflow-hidden select-none shadow-inner">
                    <div className="absolute inset-2.5 border border-white/20 rounded-xl pointer-events-none">
                      <div className="absolute top-1/2 inset-x-0 border-t border-white/20" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-14 border border-b-0 border-white/20" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-14 border border-t-0 border-white/20" />
                    </div>

                    {activeLayout.map((spec, idx) => {
                      const slot = activeSlots[idx];
                      const player = slot
                        ? activeClub.squad.find((p) => p.id === slot.playerId)
                        : undefined;
                      const fit = player ? getPositionFit(player, spec.role) : null;
                      const isSelected = subOutSlotIdx === idx;

                      return (
                        <button
                          key={`live-${activeClub.formation}-${idx}`}
                          type="button"
                          onClick={() => {
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
                                size="sm"
                                kitPrimary={spec.role === 'GOL' ? '#eab308' : activeClub.primaryColor}
                                kitSecondary={
                                  spec.role === 'GOL' ? '#0f172a' : activeClub.secondaryColor
                                }
                              />
                            )}
                            <span className="absolute -top-1 -left-1.5 px-1 py-0.2 rounded bg-slate-950/90 border border-white/20 text-[8px] font-bold text-slate-200">
                              {spec.label}
                            </span>
                            {player && fit && (
                              <span
                                className={`absolute -bottom-1 -right-1.5 px-1.5 rounded-full text-[9px] font-extrabold border ${
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
                          <div className="px-1.5 py-0.5 rounded bg-black/75 flex flex-col items-center max-w-[76px]">
                            <span className="text-[9px] font-semibold text-white whitespace-nowrap max-w-[72px] truncate leading-none">
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
                                  style={{ width: `${Math.min(100, Math.max(0, player.stamina))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Instrução Rápida de Troca Direta com 2 Cliques */}
                  <div
                    className={`rounded-xl px-3 py-2 border text-[11px] flex items-center justify-between gap-2 ${
                      selectedLiveSlotPlayer || selectedLiveBenchPlayer
                        ? 'bg-amber-500/10 border-amber-400/40 text-amber-200'
                        : 'bg-[#06090E]/80 border-white/[0.06] text-slate-400'
                    }`}
                  >
                    <span className="leading-snug">
                      {selectedLiveSlotPlayer && selectedLiveSlotSpec ? (
                        <>
                          Selecionado:{' '}
                          <strong className="text-white">{selectedLiveSlotPlayer.knownName}</strong>{' '}
                          ({selectedLiveSlotSpec.label}) — toque em outro titular no campinho p/ inverter posição (0 subs) ou num reserva abaixo p/ substituir.
                        </>
                      ) : selectedLiveBenchPlayer ? (
                        <>
                          Reserva selecionado:{' '}
                          <strong className="text-white">{selectedLiveBenchPlayer.knownName}</strong> — toque no titular no campinho que dará lugar a ele.
                        </>
                      ) : (
                        'Toque em 2 titulares no campinho para inverter posições, ou escolha um reserva abaixo para substituir.'
                      )}
                    </span>
                    {(subOutSlotIdx !== null || selectedBenchId !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubOutSlotIdx(null);
                          setSelectedBenchId(null);
                        }}
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
                        aria-label="Cancelar seleção"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Legenda de Adaptação */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 px-0.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" /> Natural (100%)
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-sky-400" /> Secundária (-2)
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Fora (-6 a -12)
                      </span>
                    </div>
                  </div>

                  {/* Banco de Reservas logo abaixo da Escalação Ao Vivo */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Banco de Reservas ({liveBenchPlayers.length})
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          subsUsed >= 5 ? 'text-rose-400' : 'text-amber-300'
                        }`}
                      >
                        {subsUsed >= 5
                          ? 'Limite 5/5 substituições atingido'
                          : selectedLiveSlotSpec
                          ? `OVR na vaga ${selectedLiveSlotSpec.label} • ${subsUsed}/5 subs`
                          : `${subsUsed}/5 substituições usadas`}
                      </span>
                    </div>

                    {liveBenchPlayers.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-3">
                        Nenhum reserva disponível no banco.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-0.5">
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
                              className={`w-full text-left p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                                isBlocked
                                  ? 'bg-[#06090E]/50 border-white/[0.04] opacity-50 cursor-not-allowed'
                                  : isBenchSelected
                                  ? 'bg-emerald-500/15 border-emerald-400 cursor-pointer'
                                  : 'bg-[#06090E] border-white/[0.06] hover:border-emerald-400/50 cursor-pointer'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <PlayerAvatar
                                  player={bench}
                                  size="sm"
                                  kitPrimary={
                                    bench.position === 'GOL' ? '#eab308' : activeClub.primaryColor
                                  }
                                  kitSecondary={
                                    bench.position === 'GOL' ? '#0f172a' : activeClub.secondaryColor
                                  }
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                    <CountryFlag nationality={bench.nationality} />
                                    <span className="truncate">{bench.knownName}</span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                    <span
                                      className={`px-1.5 rounded font-bold ${
                                        POSITION_STYLE[bench.position]
                                      }`}
                                    >
                                      {bench.position}
                                    </span>
                                    {bench.ambidextrous &&
                                      (bench.position === 'PE' || bench.position === 'PD') && (
                                        <span className="px-1 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                                          PE/PD
                                        </span>
                                      )}
                                    {bench.secondaryPositions.length > 0 && (
                                      <span>Sec: {bench.secondaryPositions.join('/')}</span>
                                    )}
                                    <span className="tabular-nums">
                                      • ⚡ {Math.round(bench.stamina)}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div
                                  className={`font-display text-base font-extrabold tabular-nums ${ovrColor}`}
                                >
                                  OVR {ovrValue}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {fit
                                    ? fit.penalty === 0
                                      ? 'Natural'
                                      : fit.penalty === -2
                                      ? 'Secundária (-2)'
                                      : `Improvisado (${fit.penalty})`
                                    : `Base • ${bench.position}`}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista dos Jogos da Rodada (Trocar Câmera) */}
          <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-3.5 space-y-2">
            <div className="font-display text-xs font-bold uppercase tracking-widest text-slate-400">
              Outros Jogos da Rodada {league.currentRound} (Toque p/ assistir)
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
              {roundMatches.map((m) => {
                const home = getClub(m.homeClubId);
                const away = getClub(m.awayClubId);
                if (!home || !away) return null;
                const isSelected = featuredMatch?.id === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMatchId(m.id)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-400'
                        : 'bg-[#06090E] border-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <ClubCrest club={home} size="xs" />
                      <span className="font-semibold text-white truncate">{home.shortName}</span>
                    </div>
                    <div className="px-2.5 py-0.5 rounded bg-[#121925] font-display font-bold text-sm text-white tabular-nums">
                      {m.homeGoals} - {m.awayGoals}
                    </div>
                    <div className="flex items-center justify-end gap-2 min-w-0 flex-1">
                      <span className="font-semibold text-white truncate">{away.shortName}</span>
                      <ClubCrest club={away} size="xs" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Aba Tabela Oficial Brasileirão Série A */}
      {viewTab === 'tabela' && (
        <div className="broadcast-card rounded-2xl p-3.5 space-y-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-500 text-[10px] uppercase">
                <th className="py-2 pl-2 pr-1">#</th>
                <th className="py-2 px-1">Clube</th>
                <th className="py-2 px-1 text-center font-bold text-slate-300">P</th>
                <th className="py-2 px-1 text-center">J</th>
                <th className="py-2 px-1 text-center">V</th>
                <th className="py-2 px-1 text-center">E</th>
                <th className="py-2 px-1 text-center">D</th>
                <th className="py-2 px-1 text-center">SG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {standingsClubs.map((club, idx) => {
                const rank = idx + 1;
                const sg = club.standing.goalsFor - club.standing.goalsAgainst;
                const isActive = club.id === league.activeHumanClubId;
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
                      isActive ? 'bg-emerald-500/[0.11]' : ''
                    }`}
                  >
                    <td className="py-2 pl-2 pr-1 text-slate-300 font-bold tabular-nums">{rank}</td>
                    <td className="py-2 px-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ClubCrest club={club} size="xs" />
                        <span className="font-semibold text-white truncate max-w-[100px]">{club.name}</span>
                        {club.controller === 'human' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold shrink-0">
                            {club.managerName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-1 text-center font-extrabold text-white tabular-nums">{club.standing.points}</td>
                    <td className="py-2 px-1 text-center text-slate-400 tabular-nums">{club.standing.played}</td>
                    <td className="py-2 px-1 text-center text-slate-300 tabular-nums">{club.standing.wins}</td>
                    <td className="py-2 px-1 text-center text-slate-400 tabular-nums">{club.standing.draws}</td>
                    <td className="py-2 px-1 text-center text-slate-400 tabular-nums">{club.standing.losses}</td>
                    <td className="py-2 px-1 text-center text-slate-300 tabular-nums">{sg > 0 ? `+${sg}` : sg}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Legenda de Zonas do Brasileirão */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.06] text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> G4 Libertadores
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400" /> Pré-Liberta
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Sul-Americana
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Z4 Rebaixamento
            </span>
          </div>
        </div>
      )}

      {/* Abas Artilharia & Assistências (Tabelas Estruturadas estilo Classificação) */}
      {(viewTab === 'artilharia' || viewTab === 'assistencias') && (() => {
        const isAssists = viewTab === 'assistencias';
        const list = isAssists ? topAssisters : topScorers;
        const emptyText = isAssists
          ? 'Nenhuma assistência registrada ainda nesta temporada.'
          : 'Nenhum gol marcado ainda nesta temporada.';
        const topLabel = isAssists ? '1º Rei das Assistências' : '1º Chuteira de Ouro';

        return (
          <div className="broadcast-card rounded-2xl p-3.5 space-y-3 overflow-x-auto">
            {list.length === 0 ? (
              <div className="text-xs text-slate-500 py-8 text-center">
                {emptyText}
              </div>
            ) : (
              <>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-500 text-[10px] uppercase">
                      <th className="py-2 pl-2 pr-1">#</th>
                      <th className="py-2 px-1">Jogador</th>
                      <th className="py-2 px-1">Clube</th>
                      <th className="py-2 px-1 text-center">Pos</th>
                      <th className="py-2 px-1 text-center">OVR</th>
                      <th
                        className={`py-2 px-1 text-center ${
                          isAssists ? 'font-bold text-slate-300' : 'font-bold text-slate-300'
                        }`}
                      >
                        {isAssists ? 'A' : 'G'}
                      </th>
                      <th className="py-2 px-1 text-center">{isAssists ? 'G' : 'A'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {list.map((item, idx) => {
                      const rank = idx + 1;
                      const isMyClub = item.club.id === league.activeHumanClubId;
                      const zoneColor =
                        rank === 1
                          ? 'border-l-amber-400 bg-amber-400/[0.06]'
                          : rank <= 3
                          ? 'border-l-emerald-400'
                          : rank <= 5
                          ? 'border-l-sky-400'
                          : 'border-l-transparent';
                      const rankBadge =
                        rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : rank === 3
                          ? 'bg-amber-700 text-white'
                          : null;
                      return (
                        <tr
                          key={item.player.id}
                          className={`border-l-[3px] ${zoneColor} ${
                            isMyClub ? 'bg-emerald-500/[0.11]' : ''
                          }`}
                        >
                          <td className="py-2 pl-2 pr-1 tabular-nums">
                            {rankBadge ? (
                              <span
                                className={`w-5 h-5 rounded-full text-[10px] font-extrabold inline-flex items-center justify-center ${rankBadge}`}
                              >
                                {rank}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-bold pl-1">{rank}</span>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <PlayerAvatar
                                player={item.player}
                                size="xs"
                                kitPrimary={item.club.primaryColor}
                                kitSecondary={item.club.secondaryColor}
                              />
                              <span className="font-semibold text-white truncate max-w-[92px]">
                                {item.player.knownName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-1">
                            <div className="inline-flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                              <ClubCrest club={item.club} size="xs" />
                              <span>{item.club.shortName}</span>
                            </div>
                          </td>
                          <td className="py-2 px-1 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                POSITION_STYLE[item.player.position]
                              }`}
                            >
                              {item.player.position}
                            </span>
                          </td>
                          <td className="py-2 px-1 text-center font-bold text-amber-300 tabular-nums">
                            {item.player.overall}
                          </td>
                          <td
                            className={`py-2 px-1 text-center font-extrabold tabular-nums ${
                              isAssists ? 'text-sky-400' : 'text-emerald-400'
                            }`}
                          >
                            {isAssists ? item.player.assists : item.player.goals}
                          </td>
                          <td
                            className={`py-2 px-1 text-center font-semibold tabular-nums ${
                              isAssists ? 'text-emerald-300' : 'text-sky-300'
                            }`}
                          >
                            {isAssists ? item.player.goals : item.player.assists}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Legenda de Zonas */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-[10px] text-slate-400">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> {topLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> 2º–3º Pódio
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-400" /> 4º–5º Top 5
                    </span>
                  </div>
                  <span className="text-slate-500 font-medium">
                    {isAssists ? 'A = Assistências • G = Gols' : 'G = Gols • A = Assistências'}
                  </span>
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};
