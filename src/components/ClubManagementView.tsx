import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Tag, Wand2, X } from 'lucide-react';
import {
  Formation,
  LeagueState,
  PlayerPosition,
  TacticalMentality,
} from '../types/league';
import {
  calculateClubStrength,
  evaluateFormationSynergy,
  FORMATION_LAYOUT,
  FORMATION_TACTICAL_PROFILE,
  getPositionFit,
} from '../engine/botAI';
import {
  calcMonthlySalary,
  formatMonthlySalary,
} from '../data/seedData';
import {
  ClubCrest,
  ControllerTag,
  CountryFlag,
  PlayerAvatar,
  POSITION_STYLE,
} from './ClubBadge';

interface ClubManagementViewProps {
  league: LeagueState;
  onUpdateTactics: (clubId: string, formation: Formation, mentality: TacticalMentality) => void;
  onAssignSlotPlayer: (clubId: string, slotIndex: number, playerId: string) => void;
  onAutoPickLineup: (clubId: string) => void;
  onToggleListForSale: (clubId: string, playerId: string) => void;
  onUpdatePlayerSalary: (clubId: string, playerId: string, newMonthlySalary: number) => void;
  onConfirmSquadAndStartMatches: () => void;
}

export const ClubManagementView: React.FC<ClubManagementViewProps> = ({
  league,
  onUpdateTactics,
  onAssignSlotPlayer,
  onAutoPickLineup,
  onToggleListForSale,
  onUpdatePlayerSalary,
  onConfirmSquadAndStartMatches,
}) => {
  const [subTab, setSubTab] = useState<'campinho' | 'elenco' | 'financas'>('campinho');
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const club =
    league.clubs.find((c) => c.id === (currentUser?.clubId || league.activeHumanClubId)) ??
    league.clubs[0];

  const isOwned =
    club.controller === 'human' &&
    (!currentUser?.clubId || club.id === currentUser.clubId || club.id === league.activeHumanClubId);
  const strength = calculateClubStrength(club);
  const layout = FORMATION_LAYOUT[club.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const slots = club.lineupSlots ?? [];
  const selectedSlotSpec = selectedSlotIdx !== null ? layout[selectedSlotIdx] : null;
  const selectedSlotPlayer =
    selectedSlotIdx !== null && slots[selectedSlotIdx]
      ? club.squad.find((p) => p.id === slots[selectedSlotIdx].playerId)
      : undefined;
  const selectedBenchPlayer = selectedBenchId
    ? club.squad.find((p) => p.id === selectedBenchId && !p.isStarter)
    : undefined;

  const posOrder: Record<PlayerPosition, number> = {
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

  const totalMonthlyPayroll = club.squad.reduce(
    (sum, p) => sum + (p.monthlySalary ?? calcMonthlySalary(p.overall)),
    0
  );

  const sortedSquadForSlot = [...club.squad].sort((a, b) => {
    if (selectedSlotSpec) {
      const fitA = getPositionFit(a, selectedSlotSpec.role);
      const fitB = getPositionFit(b, selectedSlotSpec.role);
      if (fitB.effectiveOvr !== fitA.effectiveOvr) return fitB.effectiveOvr - fitA.effectiveOvr;
    }
    if (Boolean(a.isStarter) !== Boolean(b.isStarter)) return a.isStarter ? -1 : 1;
    return posOrder[a.position] - posOrder[b.position] || b.overall - a.overall;
  });

  const benchPlayers = [...club.squad]
    .filter((p) => !p.isStarter)
    .sort((a, b) => {
      if (selectedSlotSpec) {
        const fitA = getPositionFit(a, selectedSlotSpec.role);
        const fitB = getPositionFit(b, selectedSlotSpec.role);
        if (fitB.effectiveOvr !== fitA.effectiveOvr) return fitB.effectiveOvr - fitA.effectiveOvr;
      }
      return posOrder[a.position] - posOrder[b.position] || b.overall - a.overall;
    });

  const outOfPosCount = slots.filter((s) => {
    const p = club.squad.find((pl) => pl.id === s.playerId);
    return p && getPositionFit(p, s.role).penalty < 0;
  }).length;
  const formationProfile =
    FORMATION_TACTICAL_PROFILE[club.formation] ?? FORMATION_TACTICAL_PROFILE['4-3-3'];
  const synergy = evaluateFormationSynergy(club.formation, club.mentality);

  return (
    <div className="space-y-4 pb-6">
      {/* Header do Clube Broadcast */}
      <div
        className="broadcast-card rounded-2xl p-3.5 space-y-3"
        style={{
          borderTopWidth: '3px',
          borderTopColor: club.primaryColor,
          backgroundImage: `linear-gradient(135deg, ${club.primaryColor}1A 0%, rgba(13,18,26,0.96) 55%)`,
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <ClubCrest club={club} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display text-xl font-extrabold text-white uppercase truncate leading-none">
                  {club.name}
                </h1>
                <ControllerTag club={club} compact />
              </div>
              <div className="text-[11px] text-slate-300 mt-1 truncate">
                {club.managerName} • {club.stadium}
              </div>
              <div className="text-[11px] text-slate-400">
                OVR <strong className="text-amber-300">{strength.overall}</strong> •{' '}
                <strong className="text-emerald-400 tabular-nums">€{club.finances.budget.toFixed(1)}M</strong>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Folha Mensal
            </div>
            <div className="font-display text-lg font-extrabold text-amber-300 tabular-nums leading-tight">
              {formatMonthlySalary(totalMonthlyPayroll)}
            </div>
          </div>
        </div>

        {league.status === 'janela_mercado' && (
          <button
            type="button"
            onClick={onConfirmSquadAndStartMatches}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Ir para Jogos (Manter Escalação)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Sub-tabs Mobile */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D121A] border border-white/[0.08]">
        {[
          { id: 'campinho', label: 'Campinho' },
          { id: 'elenco', label: `Elenco (${club.squad.length})` },
          { id: 'financas', label: 'Finanças' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id as 'campinho' | 'elenco' | 'financas')}
            className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
              subTab === t.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Aba Campinho */}
      {subTab === 'campinho' && (
        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-3.5 space-y-3">
          {/* Controles de Formação & Postura */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <select
                value={club.formation}
                disabled={!isOwned}
                onChange={(e) => {
                  setSelectedSlotIdx(null);
                  setSelectedBenchId(null);
                  onUpdateTactics(club.id, e.target.value as Formation, club.mentality);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-white/10 text-xs font-bold text-white disabled:opacity-60"
              >
                <option value="4-3-3">4-3-3</option>
                <option value="4-4-2">4-4-2</option>
                <option value="4-2-3-1">4-2-3-1</option>
                <option value="3-5-2">3-5-2</option>
                <option value="3-4-3">3-4-3</option>
                <option value="5-3-2">5-3-2</option>
              </select>
              <select
                value={club.mentality}
                disabled={!isOwned}
                onChange={(e) =>
                  onUpdateTactics(club.id, club.formation, e.target.value as TacticalMentality)
                }
                className="px-2.5 py-1.5 rounded-lg bg-[#06090E] border border-white/10 text-xs font-semibold text-white disabled:opacity-60"
              >
                <option value="Retranca">Retranca</option>
                <option value="Contra-Ataque">Contra-Ataque</option>
                <option value="Equilibrada">Equilibrada</option>
                <option value="Ofensiva">Ofensiva</option>
                <option value="Tudo ou Nada">Tudo ou Nada</option>
              </select>
            </div>

            {isOwned && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSlotIdx(null);
                  setSelectedBenchId(null);
                  onAutoPickLineup(club.id);
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" /> Auto
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>
              ATA <strong className="text-white">{strength.attack}</strong> • MEI{' '}
              <strong className="text-white">{strength.midfield}</strong> • DEF{' '}
              <strong className="text-white">{strength.defense}</strong>
            </span>
            {outOfPosCount > 0 ? (
              <span className="text-amber-300 font-semibold">{outOfPosCount} fora de posição</span>
            ) : (
              <span className="text-emerald-400 font-semibold">100% nas posições reais</span>
            )}
          </div>

          {/* Prancheta Tática da Formação & Sinergia */}
          <div className="bg-[#06090E]/90 border border-white/[0.07] rounded-xl p-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-white truncate">
                {club.formation} • {formationProfile.styleLabel}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                  synergy.tone === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : synergy.tone === 'rose'
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {synergy.label}
              </span>
            </div>
            <div className="text-[10px] text-emerald-300/90 leading-snug">
              + {formationProfile.strengths}
            </div>
            <div className="text-[10px] text-slate-400 leading-snug">
              − {formationProfile.weaknesses}
            </div>
          </div>

          {/* Campinho Vertical Mobile com Gramado Listrado */}
          <div className="relative w-full h-[430px] rounded-2xl pitch-pattern border border-emerald-400/30 overflow-hidden select-none shadow-inner">
            <div className="absolute inset-2.5 border border-white/20 rounded-xl pointer-events-none">
              <div className="absolute top-1/2 inset-x-0 border-t border-white/20" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-40 h-14 border border-b-0 border-white/20" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-14 border border-t-0 border-white/20" />
            </div>

            {layout.map((spec, idx) => {
              const slot = slots[idx];
              const player = slot ? club.squad.find((p) => p.id === slot.playerId) : undefined;
              const fit = player ? getPositionFit(player, spec.role) : null;
              const isSelected = selectedSlotIdx === idx;

              return (
                <button
                  key={`${club.formation}-${idx}`}
                  type="button"
                  disabled={!isOwned}
                  onClick={() => {
                    if (!isOwned) return;
                    if (selectedBenchId) {
                      onAssignSlotPlayer(club.id, idx, selectedBenchId);
                      setSelectedBenchId(null);
                      setSelectedSlotIdx(null);
                      return;
                    }
                    if (selectedSlotIdx === null) {
                      setSelectedSlotIdx(idx);
                      return;
                    }
                    if (selectedSlotIdx === idx) {
                      setSelectedSlotIdx(null);
                      return;
                    }
                    if (player) {
                      onAssignSlotPlayer(club.id, selectedSlotIdx, player.id);
                    }
                    setSelectedSlotIdx(null);
                  }}
                  style={{ left: `${spec.pitchX}%`, top: `${spec.pitchY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 transition ${
                    isOwned ? 'cursor-pointer active:scale-95' : 'cursor-default'
                  }`}
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
                        kitPrimary={spec.role === 'GOL' ? '#eab308' : club.primaryColor}
                        kitSecondary={spec.role === 'GOL' ? '#0f172a' : club.secondaryColor}
                      />
                    )}
                    <span className="absolute -top-1 -left-1.5 px-1 rounded bg-[#06090E] border border-white/20 text-[8px] font-bold text-slate-200">
                      {spec.label}
                    </span>
                    {player && fit && (
                      <span
                        className={`absolute -bottom-1 -right-1.5 px-1.5 rounded-full text-[9px] font-extrabold border ${
                          fit.penalty === 0
                            ? 'bg-[#06090E] text-emerald-300 border-emerald-400/60'
                            : fit.penalty === -2
                            ? 'bg-sky-500 text-slate-950 border-sky-200'
                            : fit.penalty <= -12
                            ? 'bg-rose-500 text-white border-rose-200'
                            : 'bg-amber-500 text-slate-950 border-amber-200'
                        }`}
                      >
                        {fit.effectiveOvr}
                      </span>
                    )}
                  </div>
                  <span className="px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-semibold text-white whitespace-nowrap max-w-[74px] truncate">
                    {player ? player.knownName : spec.role}
                  </span>
                </button>
              );
            })}
          </div>

          {isOwned && (
            <>
              {/* Instrução Rápida de Troca Direta com 2 Cliques */}
              <div
                className={`rounded-xl px-3 py-2 border text-[11px] flex items-center justify-between gap-2 ${
                  selectedSlotPlayer || selectedBenchPlayer
                    ? 'bg-amber-500/10 border-amber-400/40 text-amber-200'
                    : 'bg-[#06090E]/80 border-white/[0.06] text-slate-400'
                }`}
              >
                <span className="leading-snug">
                  {selectedSlotPlayer && selectedSlotSpec ? (
                    <>
                      Selecionado: <strong className="text-white">{selectedSlotPlayer.knownName}</strong> ({selectedSlotSpec.label}) — toque em outro titular no campinho p/ inverter posição ou num reserva abaixo p/ substituir.
                    </>
                  ) : selectedBenchPlayer ? (
                    <>
                      Reserva selecionado: <strong className="text-white">{selectedBenchPlayer.knownName}</strong> — toque no titular no campinho que dará lugar a ele.
                    </>
                  ) : (
                    'Toque em 2 titulares no campinho para inverter posições, ou selecione um reserva abaixo para substituir.'
                  )}
                </span>
                {(selectedSlotIdx !== null || selectedBenchId !== null) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotIdx(null);
                      setSelectedBenchId(null);
                    }}
                    className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0 cursor-pointer"
                    aria-label="Cancelar seleção"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Banco de Reservas logo abaixo da Escalação */}
              <div className="pt-2 border-t border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Banco de Reservas ({benchPlayers.length})
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {selectedSlotSpec
                      ? `OVR na vaga ${selectedSlotSpec.label}`
                      : 'Toque p/ entrar em campo'}
                  </span>
                </div>

                {benchPlayers.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-3">
                    Nenhum reserva disponível no banco.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                    {benchPlayers.map((p) => {
                      const fit = selectedSlotSpec ? getPositionFit(p, selectedSlotSpec.role) : null;
                      const isBenchSelected = selectedBenchId === p.id;
                      const ovrValue = fit ? fit.effectiveOvr : p.overall;
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
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (selectedSlotIdx !== null) {
                              onAssignSlotPlayer(club.id, selectedSlotIdx, p.id);
                              setSelectedSlotIdx(null);
                              setSelectedBenchId(null);
                              return;
                            }
                            setSelectedBenchId(isBenchSelected ? null : p.id);
                          }}
                          className={`w-full text-left p-2 rounded-xl border flex items-center justify-between gap-2 transition cursor-pointer ${
                            isBenchSelected
                              ? 'bg-emerald-500/15 border-emerald-400'
                              : 'bg-[#06090E] border-white/[0.06] hover:border-emerald-400/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <PlayerAvatar
                              player={p}
                              size="sm"
                              kitPrimary={p.position === 'GOL' ? '#eab308' : club.primaryColor}
                              kitSecondary={p.position === 'GOL' ? '#0f172a' : club.secondaryColor}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                <CountryFlag nationality={p.nationality} />
                                <span className="truncate">{p.knownName}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span className={`px-1.5 rounded font-bold ${POSITION_STYLE[p.position]}`}>
                                  {p.position}
                                </span>
                                {p.ambidextrous && (p.position === 'PE' || p.position === 'PD') && (
                                  <span className="px-1 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                                    PE/PD
                                  </span>
                                )}
                                {p.secondaryPositions.length > 0 && (
                                  <span>Sec: {p.secondaryPositions.join('/')}</span>
                                )}
                                <span className="tabular-nums">• ⚡ {Math.round(p.stamina)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`font-display text-base font-extrabold tabular-nums ${ovrColor}`}>
                              OVR {ovrValue}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {fit
                                ? fit.penalty === 0
                                  ? 'Natural'
                                  : fit.penalty === -2
                                  ? 'Secundária (-2)'
                                  : `Improvisado (${fit.penalty})`
                                : `Base • ${p.position}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Aba Elenco com Salário Mensal Ajustável */}
      {subTab === 'elenco' && (
        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-3.5 space-y-2 max-h-[540px] overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-white/[0.06]">
            <span className="text-slate-400">Plantel Oficial ({club.squad.length} atletas)</span>
            <span className="text-amber-300 font-bold tabular-nums">
              Folha Mensal: {formatMonthlySalary(totalMonthlyPayroll)}
            </span>
          </div>

          {sortedSquadForSlot.map((p) => {
            const curSalary = p.monthlySalary ?? calcMonthlySalary(p.overall);
            const step = curSalary >= 500 ? 50 : 25;
            return (
              <div
                key={p.id}
                className="p-2.5 rounded-xl bg-[#06090E] border border-white/[0.05] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar
                      player={p}
                      size="sm"
                      kitPrimary={p.position === 'GOL' ? '#eab308' : club.primaryColor}
                      kitSecondary={p.position === 'GOL' ? '#0f172a' : club.secondaryColor}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                        <CountryFlag nationality={p.nationality} />
                        <span className="truncate">{p.knownName}</span>
                        <span className="text-[10px] font-normal text-slate-500 truncate">
                          ({p.name})
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className={`px-1.5 rounded font-bold ${POSITION_STYLE[p.position]}`}>
                          {p.position}
                        </span>
                        {p.ambidextrous && (p.position === 'PE' || p.position === 'PD') && (
                          <span className="px-1 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-bold">
                            Ambidestro
                          </span>
                        )}
                        {p.secondaryPositions.length > 0 && (
                          <span>Sec: {p.secondaryPositions.join('/')}</span>
                        )}
                        <span className="font-bold text-amber-300">OVR {p.overall}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${
                        p.isStarter
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {p.isStarter ? 'Titular' : 'Banco'}
                    </span>
                    {isOwned && (
                      <button
                        type="button"
                        onClick={() => onToggleListForSale(club.id, p.id)}
                        className={`p-1.5 rounded-lg cursor-pointer ${
                          p.listedForSale
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-white/5 text-slate-400'
                        }`}
                        title="Colocar à venda"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Controle de Salário Mensal do Jogador */}
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.04] text-[10px]">
                  <span className="text-slate-400">
                    Salário mensal:{' '}
                    <strong className="text-emerald-300 tabular-nums">
                      {formatMonthlySalary(curSalary)}
                    </strong>
                  </span>
                  {isOwned && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={curSalary <= 30}
                        onClick={() =>
                          onUpdatePlayerSalary(club.id, p.id, Math.max(30, curSalary - step))
                        }
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-35 text-slate-200 font-bold cursor-pointer"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        disabled={curSalary >= 3000}
                        onClick={() =>
                          onUpdatePlayerSalary(club.id, p.id, Math.min(3000, curSalary + step))
                        }
                        className="px-2 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-35 text-emerald-300 font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Aba Finanças */}
      {subTab === 'financas' && (
        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-4 space-y-3">
          <div className="p-4 rounded-xl bg-[#06090E] border border-white/[0.06]">
            <div className="text-xs text-slate-400">Saldo Disponível</div>
            <div className="font-display text-3xl font-extrabold text-emerald-400 tabular-nums">
              €{club.finances.budget.toFixed(1)}M
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Orçamento base realista (Porte {club.tier}): €{club.finances.initialBudget}M
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400">Folha salarial mensal</span>
              <span className="font-semibold text-amber-300">
                {formatMonthlySalary(totalMonthlyPayroll)}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400">Desconto salarial / rodada</span>
              <span className="font-semibold text-amber-300">-€{club.finances.wageBill.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400">Compras no mercado</span>
              <span className="font-semibold text-rose-300">-€{club.finances.transferSpent.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400">Vendas realizadas</span>
              <span className="font-semibold text-emerald-400">+€{club.finances.transferIncome.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-white/[0.05]">
              <span className="text-slate-400">Premiações Modo Carreira</span>
              <span className="font-semibold text-amber-300">+€{club.finances.prizeIncome.toFixed(1)}M</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Bilheteria & resultados</span>
              <span className="font-semibold text-emerald-400">+€{club.finances.matchIncome.toFixed(1)}M</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
