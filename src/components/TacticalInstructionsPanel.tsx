import React from 'react';
import { AlertTriangle, Flame, Shield, Target } from 'lucide-react';
import {
  Club,
  ClubTactics,
  Formation,
  PlayStyle,
  TacticalMentality,
  TacticalPosture,
} from '../types/league';
import {
  buildTacticsForPlayStyle,
  computeTeamNota,
  evaluateTacticalCompatibility,
  FORMATION_OPTIONS,
  inferPlayStyleFromClub,
  normalizePosture,
  PLAY_STYLE_OPTIONS,
  PLAY_STYLE_SPECS,
  TACTICAL_POSTURES,
} from '../engine/botAI';

interface TacticalInstructionsPanelProps {
  club: Club;
  disabled?: boolean;
  compact?: boolean;
  onChangeTactics: (formation: Formation, mentality: TacticalMentality, tactics: ClubTactics) => void;
}

const POSTURE_ICONS: Record<TacticalPosture, typeof Flame> = {
  Atacar: Flame,
  Equilibrado: Target,
  Defender: Shield,
  'Pressão total': Flame,
};

export const TacticalInstructionsPanel: React.FC<TacticalInstructionsPanelProps> = ({
  club,
  disabled = false,
  compact = false,
  onChangeTactics,
}) => {
  const currentStyle = inferPlayStyleFromClub(club);
  const currentPosture = normalizePosture(club.mentality);
  const currentTactics = buildTacticsForPlayStyle(currentStyle, currentPosture);
  const styleSpec = PLAY_STYLE_SPECS[currentStyle];
  const teamNota = computeTeamNota(club);

  const starters = (club.lineupSlots ?? [])
    .map((s) => {
      const p = club.squad.find((item) => item.id === s.playerId);
      return p ? { ...p, slotRole: s.role } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const compat = evaluateTacticalCompatibility({
    formation: club.formation,
    mentality: currentPosture,
    tactics: currentTactics,
    starters,
  });

  const handleStyleChange = (nextStyle: PlayStyle) => {
    const nextTactics = buildTacticsForPlayStyle(nextStyle, currentPosture);
    onChangeTactics(club.formation, currentPosture, nextTactics);
  };

  const handleFormationChange = (nextFormation: Formation) => {
    onChangeTactics(nextFormation, currentPosture, currentTactics);
  };

  const handlePostureChange = (nextPosture: TacticalPosture) => {
    const nextTactics = buildTacticsForPlayStyle(currentStyle, nextPosture);
    onChangeTactics(club.formation, nextPosture, nextTactics);
  };

  const fitColor =
    compat.tone === 'emerald'
      ? 'text-emerald-400'
      : compat.tone === 'rose'
      ? 'text-rose-400'
      : 'text-amber-300';

  return (
    <div className="space-y-3.5">
      {/* 1. Estilo de jogo (card limpo e objetivo igual à referência) */}
      <div className="rounded-lg bg-amber-500/[0.08] border border-amber-400/35 p-3.5 space-y-2.5">
        <label className="block space-y-1.5">
          <span className="text-xs font-extrabold text-white tracking-wide block">
            Estilo de jogo
          </span>
          <select
            value={currentStyle}
            disabled={disabled}
            onChange={(e) => handleStyleChange(e.target.value as PlayStyle)}
            className="w-full px-3 py-2.5 rounded-md bg-[#090C10] border border-amber-400/40 focus:border-amber-300 focus:outline-none text-sm font-bold text-white cursor-pointer disabled:opacity-60"
          >
            {PLAY_STYLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <p className="text-xs text-slate-300 leading-relaxed">{styleSpec.description}</p>

        <div className="pt-1 border-t border-white/[0.08] flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
          <span className="text-slate-300 font-semibold">Encaixe:</span>
          <span className={`font-extrabold tabular-nums ${fitColor}`}>{compat.score}/99</span>
          <span className="text-slate-400">· encaixe ruim reduz suas chances.</span>
        </div>

        {compat.warnings.length > 0 && (
          <div className="flex items-start gap-1.5 text-[11px] text-amber-300 leading-snug pt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>{compat.warnings[0]}</span>
          </div>
        )}
      </div>

      {/* 2. Grade de Formações + NOTA do time titular */}
      <div className="bg-[#090C10] border border-white/[0.08] rounded-lg p-3">
        <div
          className={`flex ${
            compact ? 'flex-col gap-3' : 'flex-col sm:flex-row sm:items-center gap-3'
          }`}
        >
          <div className="grid grid-cols-3 gap-1.5 flex-1">
            {FORMATION_OPTIONS.map((form) => {
              const active = club.formation === form.id;
              return (
                <button
                  key={form.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleFormationChange(form.id)}
                  className={`px-2 py-2 rounded-md border text-center transition cursor-pointer disabled:opacity-60 flex flex-col items-center justify-center min-h-[42px] ${
                    active
                      ? 'bg-amber-400/20 border-amber-400 text-white shadow-sm'
                      : 'bg-[#11161E] border-white/[0.07] text-slate-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span className="text-xs font-extrabold leading-tight whitespace-nowrap">
                    {form.label}
                  </span>
                  {form.tag && (
                    <span
                      className={`text-[9px] font-semibold leading-none mt-0.5 ${
                        active ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {form.tag}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className={`shrink-0 flex ${
              compact
                ? 'items-baseline justify-between px-2 pt-2 border-t border-white/[0.08]'
                : 'sm:flex-col items-center justify-center sm:px-3 sm:border-l sm:border-white/[0.08] pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.08]'
            }`}
          >
            <div className="font-display text-2xl font-extrabold text-amber-400 tabular-nums leading-none">
              {teamNota.toFixed(1)}
            </div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 sm:mt-1">
              NOTA
            </div>
          </div>
        </div>
      </div>

      {/* 3. Postura (4 botões bem definidos: Atacar / Equilibrado / Defender / Pressão total) */}
      <div className="grid grid-cols-2 gap-2">
        {TACTICAL_POSTURES.map((posture) => {
          const Icon = POSTURE_ICONS[posture.id];
          const active = currentPosture === posture.id;
          return (
            <button
              key={posture.id}
              type="button"
              disabled={disabled}
              title={posture.shortDesc}
              onClick={() => handlePostureChange(posture.id)}
              className={`py-2.5 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-60 ${
                active
                  ? 'bg-amber-400/20 border-amber-400 text-amber-200 shadow-sm'
                  : 'bg-[#090C10] border-white/[0.08] text-slate-300 hover:border-white/25 hover:text-white'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 shrink-0 ${
                  active ? 'text-amber-300' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{posture.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
