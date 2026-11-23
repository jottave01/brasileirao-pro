import React, { useState } from 'react';
import { Bot, Calendar, Check, Clock, Lock, Shield, Users } from 'lucide-react';
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

const FORMAT_LABELS: Record<LeagueFormat, string> = {
  pontos_corridos: 'Pontos Corridos',
  grupos_mata_mata: 'Fase de Grupos',
  copa_eliminatoria: 'Copa Eliminatória',
};

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
    <form onSubmit={handleSubmit} className="space-y-6 pb-6">
      {/* Cabeçalho da Configuração */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Configuração da Competição
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white uppercase tracking-wide mt-0.5 leading-none">
            Nova Liga Carreira
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Série A 2026 (20 clubes oficiais) • Técnicos humanos, IA e regras de mercado
          </p>
        </div>
        {hasActiveLeague && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-[#11161E] hover:bg-white/10 border border-white/12 text-xs font-semibold text-slate-200 cursor-pointer transition"
          >
            Voltar para Início
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Etapas da Criação */}
        <div className="lg:col-span-8 space-y-5">
          {/* Stepper Console */}
          <div className="grid grid-cols-3 border-b border-white/[0.08] bg-[#11161E] rounded-t-lg">
            {[
              { id: 1, label: '1. Vagas & Admin' },
              { id: 2, label: '2. Regras & IA' },
              { id: 3, label: '3. Janela FIFA' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id as 1 | 2 | 3)}
                className={`relative py-3 px-2 text-xs sm:text-sm font-bold cursor-pointer transition ${
                  step === s.id
                    ? 'text-white bg-white/[0.03]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
                {step === s.id && (
                  <span className="absolute bottom-0 inset-x-4 h-[2.5px] bg-emerald-400" />
                )}
              </button>
            ))}
          </div>

          {step === 1 && (
            <div className="console-panel p-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nome da Liga
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Seu Nome (Admin)
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    PIN (4 dígitos)
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white text-center tracking-widest focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-300">
                  Modelos rápidos (20 clubes da Série A)
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => {
                    const active = humanCount === p.humans;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setHumanCount(p.humans)}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold border cursor-pointer transition ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                            : 'bg-[#090C10] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Clubes</label>
                  <div className="px-3 py-2.5 rounded-md bg-[#090C10] border border-white/10 text-xs sm:text-sm font-bold text-slate-200 truncate">
                    20 (Série A)
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Humanos</label>
                  <input
                    type="number"
                    min={1}
                    max={totalClubs}
                    value={humanCount}
                    onChange={(e) =>
                      setHumanCount(Math.max(1, Math.min(totalClubs, Number(e.target.value) || 1)))
                    }
                    className="w-full px-3 py-2.5 rounded-md bg-[#090C10] border border-emerald-500/50 text-xs sm:text-sm font-bold text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Bots Auto</label>
                  <div className="px-3 py-2.5 rounded-md bg-[#090C10] border border-white/10 text-xs sm:text-sm font-bold text-sky-300">
                    {botCount} bots
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> {humanCount} Humanos
                  </span>
                  <span className="text-sky-300 font-semibold flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> {botCount} Bots
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
                <div className="h-2 rounded bg-[#090C10] overflow-hidden flex">
                  <div className="bg-emerald-500 transition-all" style={{ width: `${humanPct}%` }} />
                  <div className="bg-sky-500 transition-all" style={{ width: `${100 - humanPct}%` }} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer pt-1">
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
            <div className="console-panel p-5 space-y-5">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-emerald-300 cursor-pointer bg-[#090C10] border border-emerald-500/25 rounded-md p-3">
                <input
                  type="checkbox"
                  checked={useRealisticBudgets}
                  onChange={(e) => setUseRealisticBudgets(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                Orçamentos Realistas por Clube (FLA R$ 180M, PAL R$ 175M...)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {!useRealisticBudgets && (
                  <div>
                    <label className="block text-xs text-slate-300 mb-1.5">
                      Orçamento Fixo (R$ Milhões)
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={10}
                      value={initialBudget}
                      onChange={(e) => setInitialBudget(Math.max(50, Number(e.target.value) || 150))}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">
                    Jogadores / Elenco
                  </label>
                  <input
                    type="number"
                    min={16}
                    max={30}
                    value={squadSize}
                    onChange={(e) => setSquadSize(Math.max(16, Math.min(30, Number(e.target.value) || 20)))}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1.5">Formato</label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as LeagueFormat)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                  >
                    <option value="pontos_corridos">Pontos Corridos</option>
                    <option value="grupos_mata_mata">Fase de Grupos</option>
                    <option value="copa_eliminatoria">Copa Eliminatória</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setHomeAndAway(true)}
                  className={`py-2.5 rounded-md text-xs font-bold border cursor-pointer transition ${
                    homeAndAway
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                      : 'bg-[#090C10] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Turno e Returno
                </button>
                <button
                  type="button"
                  onClick={() => setHomeAndAway(false)}
                  className={`py-2.5 rounded-md text-xs font-bold border cursor-pointer transition ${
                    !homeAndAway
                      ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                      : 'bg-[#090C10] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  Turno Único
                </button>
              </div>

              <div className="pt-4 border-t border-white/[0.08] space-y-3">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> 2 Rodadas Fixas por Dia
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">1ª Rodada do Dia</label>
                    <input
                      type="time"
                      value={timeSlot1}
                      onChange={(e) => setTimeSlot1(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">2ª Rodada do Dia</label>
                    <input
                      type="time"
                      value={timeSlot2}
                      onChange={(e) => setTimeSlot2(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-sky-300 uppercase tracking-wider">
                    Inteligência Artificial dos Bots
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                    <Lock className="w-3 h-3" />
                    Travadas permanentemente após criar a carreira
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Dificuldade Bots</label>
                    <select
                      value={botDifficulty}
                      onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                    >
                      <option value="facil">Fácil</option>
                      <option value="medio">Médio</option>
                      <option value="dificil">Difícil</option>
                      <option value="lendario">Lendário</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">Personalidade Bots</label>
                    <select
                      value={botPersonality}
                      onChange={(e) => setBotPersonality(e.target.value as BotPersonality)}
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
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
            </div>
          )}

          {step === 3 && (
            <div className="console-panel p-5 space-y-5">
              <div className="border-l-2 border-emerald-400 bg-emerald-500/10 p-3.5 rounded-r-md text-xs text-emerald-100 leading-relaxed">
                <strong>Mercado Carreira FIFA:</strong> Sem leilão! Todos os técnicos humanos negociam livremente durante a janela com astros internacionais, jogadores de Bots do Brasileirão e amigos.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Duração Janela (h)</label>
                  <input
                    type="number"
                    min={1}
                    max={72}
                    value={windowHours}
                    onChange={(e) => setWindowHours(Math.max(1, Math.min(72, Number(e.target.value) || 24)))}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Negócios / rodada</label>
                  <input
                    type="number"
                    min={1}
                    value={maxDealsPerRound}
                    onChange={(e) => setMaxDealsPerRound(Math.max(1, Number(e.target.value) || 5))}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Taxa liga (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Math.max(0, Math.min(25, Number(e.target.value) || 0)))}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-300 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={windowOpen} onChange={(e) => setWindowOpen(e.target.checked)} className="rounded accent-emerald-500" />
                  Janela aberta ({windowHours}h)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allowDirectPurchase} onChange={(e) => setAllowDirectPurchase(e.target.checked)} className="rounded accent-emerald-500" />
                  Liberação integral FIFA
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={allowBotNegotiations} onChange={(e) => setAllowBotNegotiations(e.target.checked)} className="rounded accent-emerald-500" />
                  Negociar c/ Bots
                </label>
              </div>
            </div>
          )}

          {/* Barra de Navegação entre Etapas (Mobile & Desktop) */}
          <div className="console-panel p-4 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-300">
              <strong className="text-emerald-400">{humanCount}H</strong> +{' '}
              <strong className="text-sky-400">{botCount}B</strong> ({totalClubs} clubes)
            </div>
            <div className="flex items-center gap-2">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                  className="px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-bold text-slate-300 cursor-pointer"
                >
                  Anterior
                </button>
              )}
              {step < 3 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                  className="px-4 py-2.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer transition"
                >
                  Próximo
                </button>
              )}
              <button
                type="submit"
                className="lg:hidden px-4 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition"
              >
                <Check className="w-4 h-4" /> Criar Liga
              </button>
            </div>
          </div>
        </div>

        {/* Coluna Direita (Desktop): Resumo ao Vivo da Liga */}
        <aside className="hidden lg:block lg:col-span-4 console-panel-elevated p-5 space-y-4 sticky top-24">
          <div className="console-section-title text-sm text-amber-300">
            <Shield className="w-4 h-4 shrink-0" />
            Resumo da Liga
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Competição</div>
            <div className="font-display text-2xl font-extrabold text-white uppercase truncate mt-0.5">
              {name.trim() || 'Brasileirão Carreira'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Admin: <strong className="text-slate-200">{adminName.trim() || 'Admin'}</strong>
            </div>
          </div>

          <div className="bg-[#090C10] border border-white/[0.08] rounded-md divide-y divide-white/[0.06] text-xs">
            <div className="px-3.5 py-2.5 flex justify-between">
              <span className="text-slate-400">Vagas na Série A</span>
              <span className="font-bold text-white tabular-nums">
                {humanCount}H + {botCount}B ({totalClubs})
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex justify-between">
              <span className="text-slate-400">Formato</span>
              <span className="font-semibold text-white">
                {FORMAT_LABELS[format]} ({homeAndAway ? '2 Turnos' : 'Único'})
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex justify-between">
              <span className="text-slate-400">Orçamentos</span>
              <span className="font-semibold text-emerald-400">
                {useRealisticBudgets ? 'Realistas por Clube' : `Fixo R$ ${initialBudget}M`}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Horários Diários
              </span>
              <span className="font-semibold text-amber-300 tabular-nums">
                {timeSlot1} &amp; {timeSlot2}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex justify-between">
              <span className="text-slate-400">IA dos Bots</span>
              <span className="font-semibold text-sky-300 capitalize">
                {botDifficulty} • {botPersonality}
              </span>
            </div>
            <div className="px-3.5 py-2.5 flex justify-between">
              <span className="text-slate-400">Janela de Mercado</span>
              <span className="font-semibold text-white tabular-nums">
                {windowOpen ? `Aberta (${windowHours}h)` : 'Fechada'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <Check className="w-4 h-4" />
            Criar Liga Carreira
          </button>
        </aside>
      </div>
    </form>
  );
};
