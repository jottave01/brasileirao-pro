import React from 'react';
import { AlertTriangle, CheckCircle2, Compass, Zap } from 'lucide-react';
import {
  BuildUpStyle,
  Club,
  ClubTactics,
  DefensiveLineHeight,
  Formation,
  OffensiveStyle,
  PressingStyle,
  TacticalIntensity,
  TacticalMentality,
} from '../types/league';
import {
  BUILD_UP_OPTIONS,
  DEFENSIVE_LINE_OPTIONS,
  evaluateTacticalCompatibility,
  getClubTactics,
  INTENSITY_OPTIONS,
  OFFENSIVE_STYLE_OPTIONS,
  PRESSING_OPTIONS,
  TACTICAL_PRESETS,
  tacticsEqual,
} from '../engine/botAI';

interface TacticalInstructionsPanelProps {
  club: Club;
  disabled?: boolean;
  compact?: boolean;
  onChangeTactics: (formation: Formation, mentality: TacticalMentality, tactics: ClubTactics) => void;
}

export const TacticalInstructionsPanel: React.FC<TacticalInstructionsPanelProps> = ({
  club,
  disabled = false,
  compact = false,
  onChangeTactics,
}) => {
  const curTactics = getClubTactics(club);
  const starters = (club.lineupSlots ?? [])
    .map((s) => {
      const p = club.squad.find((item) => item.id === s.playerId);
      return p ? { ...p, slotRole: s.role } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const compat = evaluateTacticalCompatibility({
    formation: club.formation,
    mentality: club.mentality,
    tactics: curTactics,
    starters,
  });

  const updateField = <K extends keyof ClubTactics>(key: K, value: ClubTactics[K]) => {
    onChangeTactics(club.formation, club.mentality, {
      ...curTactics,
      [key]: value,
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = TACTICAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    onChangeTactics(club.formation, preset.mentality, { ...preset.tactics });
  };

  return (
    <div className="space-y-3">
      {/* Presets Rápidos de 1 Clique */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            Estilos Táticos (1 Clique)
          </span>
          <span className="text-slate-500">ou ajuste livre abaixo</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {TACTICAL_PRESETS.map((preset) => {
            const isActive =
              club.mentality === preset.mentality && tacticsEqual(curTactics, preset.tactics);
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                onClick={() => applyPreset(preset.id)}
                title={preset.shortDesc}
                className={`px-2 py-1.5 rounded border text-[11px] font-bold text-left truncate transition cursor-pointer disabled:opacity-55 ${
                  isActive
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-[#090C10] border-white/[0.08] text-slate-300 hover:border-white/25 hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 Instruções Táticas Reais */}
      <div className={`grid ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'} gap-2`}>
        <label className="space-y-1 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Construção
          </span>
          <select
            value={curTactics.buildUpStyle}
            disabled={disabled}
            onChange={(e) => updateField('buildUpStyle', e.target.value as BuildUpStyle)}
            className="w-full px-2.5 py-1.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-semibold text-white disabled:opacity-60"
          >
            {BUILD_UP_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Estilo Ofensivo
          </span>
          <select
            value={curTactics.offensiveStyle}
            disabled={disabled}
            onChange={(e) => updateField('offensiveStyle', e.target.value as OffensiveStyle)}
            className="w-full px-2.5 py-1.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-semibold text-white disabled:opacity-60"
          >
            {OFFENSIVE_STYLE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Pressão
          </span>
          <select
            value={curTactics.pressing}
            disabled={disabled}
            onChange={(e) => updateField('pressing', e.target.value as PressingStyle)}
            className="w-full px-2.5 py-1.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-semibold text-white disabled:opacity-60"
          >
            {PRESSING_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Linha Def.
            </span>
            <select
              value={curTactics.defensiveLine}
              disabled={disabled}
              onChange={(e) => updateField('defensiveLine', e.target.value as DefensiveLineHeight)}
              className="w-full px-2 py-1.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-semibold text-white disabled:opacity-60"
            >
              {DEFENSIVE_LINE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Intensidade
            </span>
            <select
              value={curTactics.intensity}
              disabled={disabled}
              onChange={(e) => updateField('intensity', e.target.value as TacticalIntensity)}
              className="w-full px-2 py-1.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-semibold text-white disabled:opacity-60"
            >
              {INTENSITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Leitor de Compatibilidade Tática (Formação × Instruções × Elenco) */}
      <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 min-w-0 truncate">
            <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            Compatibilidade Tática
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
              compat.tone === 'emerald'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35'
                : compat.tone === 'rose'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/35'
                : 'bg-amber-400/15 text-amber-300 border border-amber-400/35'
            }`}
          >
            {compat.label}
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all ${
              compat.tone === 'emerald'
                ? 'bg-emerald-400'
                : compat.tone === 'rose'
                ? 'bg-rose-500'
                : 'bg-amber-400'
            }`}
            style={{ width: `${compat.score}%` }}
          />
        </div>

        {compat.strengths.slice(0, compact ? 1 : 2).map((str, idx) => (
          <div key={idx} className="text-[11px] text-emerald-300/90 flex items-start gap-1.5 leading-snug">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
            <span>{str}</span>
          </div>
        ))}

        {compat.warnings.slice(0, compact ? 1 : 2).map((warn, idx) => (
          <div key={idx} className="text-[11px] text-amber-300 flex items-start gap-1.5 leading-snug">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>{warn}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
