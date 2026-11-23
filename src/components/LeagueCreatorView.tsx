import React, { useState } from 'react';
import { Bot, Check, Clock, Users } from 'lucide-react';
import {
  BotDifficulty,
  BotPersonality,
  LeagueConfig,
  LeagueFormat,
} from '../types/league';

interface LeagueCreatorViewProps {
  onCreateLeague: (
    config: LeagueConfig,
    adminName: string,
    preClaimFriends: boolean,
    adminPin: string
  ) => void;
  hasActiveLeague: boolean;
  onCancel?: () => void;
}

const TOTAL_SERIE_A_CLUBS = 20;

const PRESETS = [
  { label: '1H + 19B', humans: 1 },
  { label: '2H + 18B', humans: 2 },
  { label: '3H + 17B', humans: 3 },
  { label: '4H + 16B', humans: 4 },
  { label: '8H + 12B', humans: 8 },
  { label: '20H + 0B', humans: 20 },
];

export const LeagueCreatorView: React.FC<LeagueCreatorViewProps> = ({
  onCreateLeague,
  hasActiveLeague,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [adminName, setAdminName] = useState('Você (Admin)');
  const [adminPin, setAdminPin] = useState('1234');
  const [name, setName] = useState('Brasileirão Carreira');
  const totalClubs = TOTAL_SERIE_A_CLUBS;
  const [humanCount, setHumanCount] = useState(3);

  const [useRealisticBudgets, setUseRealisticBudgets] = useState(true);
  const [initialBudget, setInitialBudget] = useState(150);
  const [squadSize, setSquadSize] = useState(20);
  const [format, setFormat] = useState<LeagueFormat>('pontos_corridos');
  const [homeAndAway, setHomeAndAway] = useState(true);
  const [timeSlot1, setTimeSlot1] = useState('12:00');
  const [timeSlot2, setTimeSlot2] = useState('22:00');

  const [windowOpen, setWindowOpen] = useState(true);
  const [windowHours, setWindowHours] = useState(24);
  const [maxDealsPerRound, setMaxDealsPerRound] = useState(5);
  const [allowDirectPurchase, setAllowDirectPurchase] = useState(true);
  const [allowBotNegotiations, setAllowBotNegotiations] = useState(true);
  const [taxPercent, setTaxPercent] = useState(5);

  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medio');
  const [botPersonality, setBotPersonality] = useState<BotPersonality>('misto');
  const [preClaimFriends, setPreClaimFriends] = useState(false);

  const botCount = Math.max(0, totalClubs - humanCount);
  const humanPct = Math.round((humanCount / totalClubs) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateLeague(
      {
        name: name.trim() || 'Brasileirão Carreira',
        totalClubs,
        humanCount,
        botCount,
        initialBudget,
        useRealisticBudgets,
        squadSize,
        format,
        homeAndAway,
        dailyScheduleTimes: [timeSlot1, timeSlot2],
        transferRules: {
          windowOpen,
          windowHours,
          maxDealsPerRound,
          allowDirectPurchase,
          allowBotNegotiations,
          taxPercent,
        },
        botDifficulty,
        botPersonality,
      },
      adminName.trim() || 'Admin',
      preClaimFriends,
      adminPin || '1234'
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wide">
            Nova Liga Carreira
          </h1>
          <p className="text-[11px] text-slate-400">Série A 2026 (20 clubes fixos) • Humanos, bots e regras</p>
        </div>
        {hasActiveLeague && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-white/5 text-xs font-medium text-slate-300 cursor-pointer"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0D121A] border border-white/[0.08]">
        {[
          { id: 1, label: '1. Vagas' },
          { id: 2, label: '2. Regras & IA' },
          { id: 3, label: '3. Janela FIFA' },
        ].map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id as 1 | 2 | 3)}
            className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
              step === s.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Nome da Liga</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-[11px] text-slate-400 mb-1">Seu Nome (Admin)</label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">PIN (4 díg.)</label>
              <input
                type="password"
                maxLength={4}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full px-3 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white text-center"
              />
            </div>
          </div>

          <div>
            <div className="text-[11px] text-slate-400 mb-1.5">Modelos rápidos (20 clubes da Série A)</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => {
                const active = humanCount === p.humans;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setHumanCount(p.humans);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                      active
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                        : 'bg-[#06090E] border-white/10 text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Clubes</label>
              <div className="px-2.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs font-bold text-slate-200 truncate">
                20 (Série A)
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Humanos</label>
              <input
                type="number"
                min={1}
                max={totalClubs}
                value={humanCount}
                onChange={(e) =>
                  setHumanCount(Math.max(1, Math.min(totalClubs, Number(e.target.value) || 1)))
                }
                className="w-full px-2.5 py-2.5 rounded-xl bg-[#06090E] border border-emerald-500/50 text-xs font-bold text-emerald-300"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Bots Auto</label>
              <div className="px-2.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs font-bold text-sky-300">
                {botCount} bots
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-300 font-semibold flex items-center gap-1">
                <Users className="w-3 h-3" /> {humanCount} Humanos
              </span>
              <span className="text-sky-300 font-semibold flex items-center gap-1">
                <Bot className="w-3 h-3" /> {botCount} Bots
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={totalClubs}
              value={humanCount}
              onChange={(e) => setHumanCount(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="h-2 rounded-full bg-[#06090E] overflow-hidden flex">
              <div className="bg-emerald-500" style={{ width: `${humanPct}%` }} />
              <div className="bg-sky-500" style={{ width: `${100 - humanPct}%` }} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={preClaimFriends}
              onChange={(e) => setPreClaimFriends(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            Pré-adicionar amigos de teste (desmarque para entrarem pelo link)
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-4 space-y-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-emerald-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useRealisticBudgets}
              onChange={(e) => setUseRealisticBudgets(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            Orçamentos Realistas por Clube (FLA R$ 180.000.000,00, PAL R$ 175.000.000,00...)
          </label>

          <div className="grid grid-cols-2 gap-3">
            {!useRealisticBudgets && (
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Orçamento Fixo (R$ Milhões)</label>
                <input
                  type="number"
                  min={50}
                  step={10}
                  value={initialBudget}
                  onChange={(e) => setInitialBudget(Math.max(50, Number(e.target.value) || 150))}
                  className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Jogadores / Elenco</label>
              <input
                type="number"
                min={16}
                max={30}
                value={squadSize}
                onChange={(e) => setSquadSize(Math.max(16, Math.min(30, Number(e.target.value) || 20)))}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Formato</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as LeagueFormat)}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              >
                <option value="pontos_corridos">Pontos Corridos</option>
                <option value="grupos_mata_mata">Fase de Grupos</option>
                <option value="copa_eliminatoria">Copa Eliminatória</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHomeAndAway(true)}
              className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                homeAndAway
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                  : 'bg-[#06090E] border-white/10 text-slate-400'
              }`}
            >
              Turno e Returno
            </button>
            <button
              type="button"
              onClick={() => setHomeAndAway(false)}
              className={`py-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                !homeAndAway
                  ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                  : 'bg-[#06090E] border-white/10 text-slate-400'
              }`}
            >
              Turno Único
            </button>
          </div>

          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 2 Rodadas Fixas por Dia
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">1ª Rodada do Dia</label>
                <input
                  type="time"
                  value={timeSlot1}
                  onChange={(e) => setTimeSlot1(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">2ª Rodada do Dia</label>
                <input
                  type="time"
                  value={timeSlot2}
                  onChange={(e) => setTimeSlot2(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06]">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Dificuldade Bots</label>
              <select
                value={botDifficulty}
                onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              >
                <option value="facil">Fácil</option>
                <option value="medio">Médio</option>
                <option value="dificil">Difícil</option>
                <option value="lendario">Lendário</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Personalidade Bots</label>
              <select
                value={botPersonality}
                onChange={(e) => setBotPersonality(e.target.value as BotPersonality)}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              >
                <option value="misto">Misto (Variado)</option>
                <option value="agressivo">Agressivo</option>
                <option value="galactico">Galáctico</option>
                <option value="economico">Econômico</option>
                <option value="tatico">Tático</option>
                <option value="equilibrado">Equilibrado</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-4 space-y-4">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-200 leading-relaxed">
            <strong>Mercado Carreira FIFA:</strong> Sem leilão! Todos os humanos negociam livremente durante a janela com craques da Europa, jogadores de Bots do Brasileirão e amigos.
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Duração Janela (h)</label>
              <input
                type="number"
                min={1}
                max={72}
                value={windowHours}
                onChange={(e) => setWindowHours(Math.max(1, Math.min(72, Number(e.target.value) || 24)))}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Negócios / rodada</label>
              <input
                type="number"
                min={1}
                value={maxDealsPerRound}
                onChange={(e) => setMaxDealsPerRound(Math.max(1, Number(e.target.value) || 5))}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">Taxa liga (%)</label>
              <input
                type="number"
                min={0}
                max={25}
                value={taxPercent}
                onChange={(e) => setTaxPercent(Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-slate-300 pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={windowOpen} onChange={(e) => setWindowOpen(e.target.checked)} className="rounded accent-emerald-500" />
              Janela aberta (24h)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={allowDirectPurchase} onChange={(e) => setAllowDirectPurchase(e.target.checked)} className="rounded accent-emerald-500" />
              Liberação integral FIFA
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={allowBotNegotiations} onChange={(e) => setAllowBotNegotiations(e.target.checked)} className="rounded accent-emerald-500" />
              Negociar c/ Bots
            </label>
          </div>
        </div>
      )}

      <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-300">
          <strong className="text-emerald-400">{humanCount}H</strong> +{' '}
          <strong className="text-sky-400">{botCount}B</strong> ({totalClubs})
        </div>
        <div className="flex items-center gap-2">
          {step < 3 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
            >
              Próximo
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-4 h-4" /> Criar Liga
          </button>
        </div>
      </div>
    </form>
  );
};
