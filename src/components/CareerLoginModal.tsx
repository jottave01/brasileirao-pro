import React, { useState } from 'react';
import {
  Crown,
  KeyRound,
  LogIn,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import { LeagueConfig, LeagueState } from '../types/league';
import { BrasileiraoTrophyLogo, ClubCrest } from './ClubBadge';

interface CareerLoginModalProps {
  league: LeagueState;
  authError: string | null;
  canDismiss: boolean;
  initialMode?: 'login' | 'new_career';
  onClose: () => void;
  onJoinOrLogin: (name: string, pin: string) => void;
  onJoinByInviteCode?: (inviteCode: string, name: string, pin: string) => Promise<void> | void;
  onStartFreshCareer: (config: LeagueConfig, adminName: string, adminPin: string) => void;
  onOpenAdvancedCreator: () => void;
}

const CAREER_PRESETS = [
  { label: '1H + 19B', humans: 1 },
  { label: '2H + 18B', humans: 2 },
  { label: '3H + 17B', humans: 3 },
  { label: '4H + 16B', humans: 4 },
  { label: '8H + 12B', humans: 8 },
  { label: '20H + 0B', humans: 20 },
];

export const CareerLoginModal: React.FC<CareerLoginModalProps> = ({
  league,
  authError,
  canDismiss,
  initialMode = 'login',
  onClose,
  onJoinOrLogin,
  onJoinByInviteCode,
  onStartFreshCareer,
  onOpenAdvancedCreator,
}) => {
  const [mode, setMode] = useState<'login' | 'new_career'>(initialMode);

  // Login / entrar na carreira atual ou por código de outro aparelho
  const [joinInviteCode, setJoinInviteCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('invite')?.toUpperCase() ?? '';
  });
  const [loginName, setLoginName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [joiningRemote, setJoiningRemote] = useState(false);

  // Começar nova carreira do zero
  const [newLeagueName, setNewLeagueName] = useState('Brasileirão Série A 2026');
  const [adminName, setAdminName] = useState('Você (Admin)');
  const [adminPin, setAdminPin] = useState('1234');
  const [humanCount, setHumanCount] = useState(3);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinInviteCode.trim().toUpperCase();
    if (cleanCode && cleanCode !== league.inviteCode.toUpperCase() && onJoinByInviteCode) {
      setJoiningRemote(true);
      try {
        await onJoinByInviteCode(cleanCode, loginName.trim(), loginPin.trim());
      } finally {
        setJoiningRemote(false);
      }
      return;
    }
    onJoinOrLogin(loginName.trim(), loginPin.trim());
  };

  const handleFreshCareerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const safeHumans = Math.max(1, Math.min(20, humanCount));
    const safeBots = 20 - safeHumans;

    const freshConfig: LeagueConfig = {
      ...league.config,
      name: newLeagueName.trim() || 'Brasileirão Série A 2026',
      totalClubs: 20,
      humanCount: safeHumans,
      botCount: safeBots,
      useRealisticBudgets: true,
    };

    onStartFreshCareer(
      freshConfig,
      adminName.trim() || 'Você (Admin)',
      adminPin.length === 4 ? adminPin : '1234'
    );
  };

  return (
    <div className="fixed inset-0 z-50 stadium-bg bg-[#06090E]/96 backdrop-blur-xl overflow-y-auto flex items-start sm:items-center justify-center p-3.5 sm:p-5">
      <div className="w-full max-w-[460px] bg-[#0D121A] border border-white/12 rounded-3xl overflow-hidden shadow-2xl my-auto">
        {/* Topo Broadcast com Taça Oficial */}
        <div className="relative bg-gradient-to-br from-emerald-950/55 via-[#121A26] to-[#0D121A] border-b border-white/[0.08] px-5 pt-5 pb-4">
          {canDismiss && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar login"
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-3.5 pr-8">
            <BrasileiraoTrophyLogo size="md" />
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Central de Carreira • Série A 2026
              </div>
              <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wide mt-1 leading-none">
                Brasileirão PRO
              </h1>
              <p className="text-[11px] text-slate-400 mt-1">
                Entre com sua conta ou comece uma carreira do zero com amigos
              </p>
            </div>
          </div>

          {/* Seletor de Modo */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#06090E]/90 border border-white/[0.08] mt-4">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                mode === 'login'
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar na Carreira
            </button>
            <button
              type="button"
              onClick={() => setMode('new_career')}
              className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                mode === 'new_career'
                  ? 'bg-amber-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Nova Carreira do 0
            </button>
          </div>
        </div>

        <div className="p-5">
          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Info da Liga Ativa */}
              <div className="bg-[#06090E] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Sala Atual • {league.inviteCode}
                  </div>
                  <div className="font-display text-lg font-bold text-white uppercase truncate">
                    {league.config.name}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Temporada {league.season} • {league.clubs.length} Clubes Série A
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-slate-400">Humanos</div>
                  <div className="font-display text-lg font-extrabold text-emerald-300 tabular-nums">
                    {league.participants.length}/{league.config.humanCount}
                  </div>
                </div>
              </div>

              {/* Seleção rápida de participantes já cadastrados */}
              {league.participants.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Toque no seu técnico ou digite um novo nome:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {league.participants.map((p) => {
                      const club = p.clubId
                        ? league.clubs.find((c) => c.id === p.clubId)
                        : null;
                      const selected =
                        loginName.trim().toLowerCase() === p.name.toLowerCase();
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLoginName(p.name)}
                          className={`px-2.5 py-1.5 rounded-xl border text-xs flex items-center gap-1.5 cursor-pointer transition ${
                            selected
                              ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                              : 'bg-[#06090E] border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {p.isAdmin && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                          {club && <ClubCrest club={club} size="xs" />}
                          <span>{p.name}</span>
                          {club && (
                            <span className="text-[10px] text-emerald-300">
                              • {club.shortName}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                  {authError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Código da Sala (se estiver entrando de outro aparelho)
                  </label>
                  <input
                    type="text"
                    value={joinInviteCode}
                    onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                    placeholder={`Atual: ${league.inviteCode}`}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs font-mono uppercase text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Nome do Técnico
                  </label>
                  <input
                    type="text"
                    required
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="Ex: Você (Admin), Gabriel, Rafael..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    PIN de 4 dígitos
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    minLength={4}
                    maxLength={4}
                    value={loginPin}
                    onChange={(e) =>
                      setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="•••• (Admin padrão: 1234)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-sm text-white tracking-widest focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={joiningRemote}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:brightness-105 disabled:opacity-50 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {joiningRemote ? 'Conectando à Sala...' : 'Entrar na Carreira'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleFreshCareerSubmit} className="space-y-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-[11px] text-amber-200 leading-relaxed">
                Cria uma sala nova do zero com os <strong>20 clubes oficiais da Série A 2026</strong>. Depois de criar, basta enviar o link de convite para os seus amigos entrarem!
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nome da Nova Liga
                </label>
                <input
                  type="text"
                  required
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Seu Nome (Admin)
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    PIN (4 díg.)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    minLength={4}
                    maxLength={4}
                    value={adminPin}
                    onChange={(e) =>
                      setAdminPin(e.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white text-center tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Vagas na Série A (20 clubes fixos)
                  </span>
                  <span className="font-bold text-emerald-300">
                    {humanCount}H + {20 - humanCount}B
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CAREER_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setHumanCount(p.humans)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                        humanCount === p.humans
                          ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                          : 'bg-[#06090E] border-white/10 text-slate-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={humanCount}
                  onChange={(e) => setHumanCount(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-emerald-400 hover:brightness-105 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Iniciar Nova Carreira do Zero (20 Clubes Série A)
              </button>

              <button
                type="button"
                onClick={onOpenAdvancedCreator}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Configuração Avançada Completa
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
