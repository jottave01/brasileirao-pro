import React, { useCallback, useEffect, useState } from 'react';
import {
  Cloud,
  Crown,
  FolderKanban,
  HardDrive,
  KeyRound,
  Lock,
  LogIn,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  BotDifficulty,
  BotPersonality,
  LeagueConfig,
  LeagueState,
} from '../types/league';
import { listAllCareers, SavedCareerSummary } from '../lib/supabaseSync';
import { BrasileiraoTrophyLogo, ClubCrest } from './ClubBadge';

interface CareerLoginModalProps {
  league: LeagueState;
  isAdminUser: boolean;
  authError: string | null;
  canDismiss: boolean;
  initialMode?: 'login' | 'careers' | 'new_career';
  onClose: () => void;
  onAdminLogin: (email: string, password: string) => boolean;
  onJoinOrLogin: (name: string, pin: string) => void;
  onJoinByInviteCode?: (inviteCode: string, name: string, pin: string) => Promise<void> | void;
  onSelectCareer?: (careerId: string) => Promise<boolean> | boolean;
  onDeleteCareer?: (careerId: string) => Promise<{ ok: boolean; error?: string }>;
  onStartFreshCareer: (config: LeagueConfig, adminName: string, adminPin: string) => void;
  onOpenAdvancedCreator: () => void;
}

const CAREER_STATUS_LABELS: Record<LeagueState['status'], string> = {
  lobby: 'Lobby',
  escolha_clube: 'Escolha de Clubes',
  janela_mercado: 'Janela Aberta',
  campeonato: 'Campeonato',
  fim_temporada: 'Encerrada',
};

const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  facil: 'Fácil',
  medio: 'Médio',
  dificil: 'Difícil',
  lendario: 'Lendário',
};

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
  isAdminUser,
  authError,
  canDismiss,
  initialMode = 'login',
  onClose,
  onAdminLogin,
  onJoinOrLogin,
  onJoinByInviteCode,
  onSelectCareer,
  onDeleteCareer,
  onStartFreshCareer,
  onOpenAdvancedCreator,
}) => {
  const [mode, setMode] = useState<'login' | 'careers' | 'new_career'>(
    isAdminUser ? initialMode : 'login'
  );
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [careers, setCareers] = useState<SavedCareerSummary[]>([]);
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [busyCareerId, setBusyCareerId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [careerActionError, setCareerActionError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminUser) {
      setShowAdminAuth(false);
      setMode(
        initialMode === 'new_career'
          ? 'new_career'
          : initialMode === 'careers'
          ? 'careers'
          : 'login'
      );
    } else {
      setMode('login');
    }
  }, [isAdminUser, initialMode]);

  const activeMode: 'login' | 'careers' | 'new_career' = isAdminUser ? mode : 'login';

  const refreshCareers = useCallback(async () => {
    setLoadingCareers(true);
    setCareerActionError(null);
    try {
      const list = await listAllCareers();
      setCareers(list);
    } catch {
      setCareerActionError('Não foi possível listar as carreiras salvas.');
    } finally {
      setLoadingCareers(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminUser && activeMode === 'careers') {
      refreshCareers();
    }
  }, [isAdminUser, activeMode, refreshCareers]);

  const [joinInviteCode, setJoinInviteCode] = useState(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('invite')?.toUpperCase() ?? '';
  });
  const [loginName, setLoginName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [joiningRemote, setJoiningRemote] = useState(false);

  const [newLeagueName, setNewLeagueName] = useState('Brasileirão Série A 2026');
  const [adminName, setAdminName] = useState('Você (Admin)');
  const [adminPin, setAdminPin] = useState('1234');
  const [humanCount, setHumanCount] = useState(3);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('medio');
  const [botPersonality, setBotPersonality] = useState<BotPersonality>('misto');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinInviteCode.trim().toUpperCase();
    if (onJoinByInviteCode) {
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

  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onAdminLogin(adminEmail.trim(), adminPassword);
    if (ok) {
      setShowAdminAuth(false);
      setAdminPassword('');
      setMode('careers');
    }
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
      botDifficulty,
      botPersonality,
    };

    onStartFreshCareer(
      freshConfig,
      adminName.trim() || 'Você (Admin)',
      adminPin.length === 4 ? adminPin : '1234'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070A0E] overflow-y-auto flex items-start md:items-center justify-center p-3.5 sm:p-6">
      {/* Pano de fundo cinematográfico do estádio */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-cover bg-center opacity-35 pointer-events-none"
        style={{ backgroundImage: "url('/assets/tunnel-boardroom.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-gradient-to-b from-[#090C10]/85 via-[#090C10]/75 to-[#090C10]/95 pointer-events-none"
      />

      <div className="relative z-10 w-full max-w-[880px] console-panel-elevated overflow-hidden my-auto animate-console-enter">
        {canDismiss && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar login"
            className="absolute top-3.5 right-3.5 z-20 p-2 rounded-md bg-black/50 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Coluna Esquerda: Vitrine Cinematográfica do Jogo */}
          <div className="md:col-span-5 relative overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between min-h-[200px] md:min-h-[480px] bg-[#0B0F15]">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center opacity-55"
              style={{ backgroundImage: "url('/assets/tunnel-boardroom.jpg')" }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#090C10] via-[#090C10]/70 to-[#090C10]/45"
            />

            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/35 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5" />
                Série A 2026 • Modo Carreira
              </div>
              <div className="flex items-center gap-3.5">
                <BrasileiraoTrophyLogo size="lg" />
                <div>
                  <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-wide leading-none">
                    Brasileirão PRO
                  </h1>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-[260px]">
                    Assuma o comando técnico, negocie no mercado e dispute o título nacional em tempo real.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 space-y-2.5">
              {canDismiss ? (
                <div className="bg-[#090C10]/90 border border-white/12 rounded-md p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-emerald-400">
                      Sala Ativa
                    </span>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      {league.inviteCode}
                    </span>
                  </div>
                  <div className="font-display text-xl font-bold text-white uppercase truncate leading-none">
                    {league.config.name}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/[0.06]">
                    <span>Temporada {league.season}</span>
                    <span className="font-bold text-emerald-300 tabular-nums">
                      {league.participants.length}/{league.config.humanCount} técnicos
                    </span>
                  </div>
                </div>
              ) : isAdminUser ? (
                <div className="border-l-2 border-emerald-400 pl-3 text-xs text-slate-300 leading-relaxed">
                  Selecione qualquer carreira salva na lista para <strong className="text-white">entrar</strong>, gerencie exclusões ou crie uma{' '}
                  <strong className="text-amber-300">Nova Carreira do 0</strong>.
                </div>
              ) : (
                <div className="border-l-2 border-emerald-400 pl-3 text-xs text-slate-300 leading-relaxed">
                  Entre com o <strong className="text-white">Código da Sala</strong> e seu{' '}
                  <strong className="text-amber-300">PIN de 4 dígitos</strong> para retomar seu clube ou ocupar uma vaga disponível.
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita: Painel de Acesso / Nova Carreira */}
          <div className="md:col-span-7 p-5 sm:p-7 bg-[#11161E] flex flex-col justify-center">
            {/* Barra de Seleção de Modo */}
            <div className={`mb-5 ${canDismiss ? 'pr-11' : ''}`}>
              {isAdminUser ? (
                <div className="grid grid-cols-3 gap-1 p-1 rounded-md bg-[#090C10] border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setMode('careers')}
                    className={`py-2 px-1.5 sm:px-2.5 rounded text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition whitespace-nowrap ${
                      activeMode === 'careers'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                    <span>Carreiras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('new_career')}
                    className={`py-2 px-1.5 sm:px-2.5 rounded text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition whitespace-nowrap ${
                      activeMode === 'new_career'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Nova do 0</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className={`py-2 px-1.5 sm:px-2.5 rounded text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition whitespace-nowrap ${
                      activeMode === 'login'
                        ? 'bg-sky-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    <span className="sm:hidden">Cód. Sala</span>
                    <span className="hidden sm:inline">Entrar Cód.</span>
                  </button>
                </div>
              ) : showAdminAuth ? (
                <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="font-display text-lg font-bold uppercase tracking-wide text-amber-300">
                    Autenticação do Administrador
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <LogIn className="w-4 h-4 text-emerald-400" />
                    <span className="font-display text-lg font-bold uppercase tracking-wide text-white">
                      Acesso à Sala
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Código + PIN Obrigatórios
                  </span>
                </div>
              )}
            </div>

            {showAdminAuth && !isAdminUser ? (
              <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
                {authError && (
                  <div className="p-3 rounded-md bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                    {authError}
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      E-mail de Administrador
                    </label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="Seu e-mail de administrador"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Senha
                    </label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Sua senha de administrador"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Crown className="w-4 h-4" />
                  Entrar como Admin
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdminAuth(false)}
                    className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer"
                  >
                    Voltar para entrada com Código da Sala
                  </button>
                </div>
              </form>
            ) : activeMode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {canDismiss && league.participants.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      Participantes conectados na sala:
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
                            className={`px-2.5 py-1.5 rounded-md border text-xs flex items-center gap-1.5 cursor-pointer transition ${
                              selected
                                ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                                : 'bg-[#090C10] border-white/10 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            {p.isAdmin && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                            {club && <ClubCrest club={club} size="xs" />}
                            <span>{p.name}</span>
                            {club && (
                              <span className="text-[11px] text-emerald-300">
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
                  <div className="p-3 rounded-md bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                    {authError}
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Código da Sala *
                    </label>
                    <input
                      type="text"
                      required
                      value={joinInviteCode}
                      onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código enviado pelo Admin"
                      className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm font-mono uppercase text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Nome do Técnico
                      </label>
                      <input
                        type="text"
                        required
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="Ex: Gabriel, Rafael..."
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        PIN (4 dígitos)
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
                        placeholder="••••"
                        className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white text-center tracking-widest focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={joiningRemote}
                  className="w-full py-3.5 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {joiningRemote ? 'Conectando à Sala...' : 'Entrar na Carreira'}
                </button>

                {!isAdminUser && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdminAuth(true)}
                      className="text-xs text-slate-400 hover:text-amber-300 underline underline-offset-4 transition cursor-pointer"
                    >
                      Entrar como administrador
                    </button>
                  </div>
                )}
              </form>
            ) : activeMode === 'careers' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Painel do Administrador
                    </div>
                    <h2 className="font-display text-xl font-extrabold text-white uppercase leading-none mt-0.5">
                      Carreiras Criadas ({careers.length})
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={refreshCareers}
                      disabled={loadingCareers}
                      aria-label="Atualizar lista de carreiras"
                      className="p-2 rounded-md bg-[#090C10] hover:bg-white/10 border border-white/12 text-slate-300 cursor-pointer transition disabled:opacity-40"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${loadingCareers ? 'animate-spin text-emerald-400' : ''}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('new_career')}
                      className="px-3 py-2 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs flex items-center gap-1 cursor-pointer transition"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      Nova
                    </button>
                  </div>
                </div>

                {(careerActionError || authError) && (
                  <div className="p-3 rounded-md bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200">
                    {careerActionError || authError}
                  </div>
                )}

                {loadingCareers && careers.length === 0 ? (
                  <div className="bg-[#090C10] border border-white/[0.08] rounded-md py-10 text-center text-xs text-slate-400">
                    Carregando carreiras salvas...
                  </div>
                ) : careers.length === 0 ? (
                  <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-6 text-center space-y-3">
                    <div className="text-xs text-slate-300">
                      Nenhuma carreira criada no momento. Crie uma nova liga para começar!
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode('new_career')}
                      className="px-4 py-2.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Plus className="w-4 h-4" />
                      Criar Primeira Carreira
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {careers.map((c) => {
                      const isCurrent = canDismiss && c.id === league.id;
                      const isConfirming = confirmDeleteId === c.id;
                      const isBusy = busyCareerId === c.id;
                      const statusLabel =
                        c.status === 'campeonato'
                          ? `Rodada ${c.currentRound}/${c.totalRounds}`
                          : CAREER_STATUS_LABELS[c.status] ?? c.status;

                      return (
                        <div
                          key={c.id}
                          className={`bg-[#090C10] border rounded-md p-3 space-y-2.5 overflow-hidden transition ${
                            isCurrent
                              ? 'border-emerald-500/50 bg-emerald-500/[0.05]'
                              : 'border-white/[0.08] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-sm text-white truncate">
                                {c.name}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-300 uppercase">
                                  Ativa
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                  c.source === 'cloud'
                                    ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                                    : 'bg-white/[0.05] border-white/10 text-slate-300'
                                }`}
                              >
                                {c.source === 'cloud' ? (
                                  <Cloud className="w-3 h-3" />
                                ) : (
                                  <HardDrive className="w-3 h-3" />
                                )}
                                {c.source === 'cloud' ? 'Nuvem' : 'Local'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                            <span className="font-mono text-emerald-300 bg-white/[0.04] px-1.5 py-0.5 rounded">
                              {c.inviteCode}
                            </span>
                            <span>T{c.season}</span>
                            <span className="text-slate-200 font-semibold">{statusLabel}</span>
                            <span className="tabular-nums">
                              {c.participantsCount}/{c.humanCount}H • {c.botCount}B
                            </span>
                            <span>IA: {BOT_DIFFICULTY_LABELS[c.botDifficulty]}</span>
                          </div>

                          {isConfirming ? (
                            <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/35 flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold text-rose-200">
                                Excluir esta carreira?
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={async () => {
                                    if (!onDeleteCareer) return;
                                    setBusyCareerId(c.id);
                                    setCareerActionError(null);
                                    try {
                                      const res = await onDeleteCareer(c.id);
                                      if (!res.ok) {
                                        setCareerActionError(
                                          res.error ?? 'Falha ao excluir carreira.'
                                        );
                                      } else {
                                        setConfirmDeleteId(null);
                                        await refreshCareers();
                                      }
                                    } finally {
                                      setBusyCareerId(null);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-extrabold text-[11px] cursor-pointer transition"
                                >
                                  {isBusy ? 'Excluindo...' : 'Confirmar'}
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2.5 py-1.5 rounded bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-[11px] cursor-pointer transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-0.5">
                              <button
                                type="button"
                                disabled={isBusy || !onSelectCareer}
                                onClick={async () => {
                                  if (!onSelectCareer) return;
                                  setBusyCareerId(c.id);
                                  setCareerActionError(null);
                                  try {
                                    await onSelectCareer(c.id);
                                  } finally {
                                    setBusyCareerId(null);
                                  }
                                }}
                                className="py-2 px-3 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                {isBusy ? 'Abrindo...' : isCurrent ? 'Continuar' : 'Entrar'}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy || !onDeleteCareer}
                                onClick={() => {
                                  setConfirmDeleteId(c.id);
                                  setCareerActionError(null);
                                }}
                                className="py-2 px-3 rounded-md bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 border border-rose-500/35 text-rose-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleFreshCareerSubmit} className="space-y-4">
                <div className="border-l-2 border-amber-400 bg-amber-500/10 px-3 py-2.5 rounded-r-md text-xs text-amber-100 leading-relaxed">
                  Cria uma nova sala com os <strong>20 clubes oficiais da Série A 2026</strong>. Depois de criar, envie o link de convite para os seus amigos.
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome da Nova Liga
                  </label>
                  <input
                    type="text"
                    required
                    value={newLeagueName}
                    onChange={(e) => setNewLeagueName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Seu Nome (Admin)
                    </label>
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
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
                      className="w-full px-3 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-sm text-white text-center tracking-widest"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">
                      Vagas na Série A (20 clubes)
                    </span>
                    <span className="font-bold text-emerald-300 tabular-nums">
                      {humanCount} Humanos • {20 - humanCount} Bots
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CAREER_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setHumanCount(p.humans)}
                        className={`px-2.5 py-1.5 rounded text-xs font-bold border cursor-pointer transition ${
                          humanCount === p.humans
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                            : 'bg-[#090C10] border-white/10 text-slate-300 hover:border-white/25'
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

                {/* Dificuldade e Perfil dos Bots (Travado após criar) */}
                <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-bold text-sky-300 uppercase tracking-wider">
                      IA dos Bots
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Definida apenas na criação da carreira
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Dificuldade dos Bots
                      </label>
                      <select
                        value={botDifficulty}
                        onChange={(e) => setBotDifficulty(e.target.value as BotDifficulty)}
                        className="w-full px-3 py-2 rounded-md bg-[#11161E] border border-white/12 text-xs font-semibold text-white"
                      >
                        <option value="facil">Fácil</option>
                        <option value="medio">Médio</option>
                        <option value="dificil">Difícil</option>
                        <option value="lendario">Lendário</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Perfil IA dos Bots
                      </label>
                      <select
                        value={botPersonality}
                        onChange={(e) => setBotPersonality(e.target.value as BotPersonality)}
                        className="w-full px-3 py-2 rounded-md bg-[#11161E] border border-white/12 text-xs font-semibold text-white"
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

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Iniciar Nova Carreira do Zero
                  </button>

                  <button
                    type="button"
                    onClick={onOpenAdvancedCreator}
                    className="w-full py-2.5 rounded-md bg-[#090C10] hover:bg-white/[0.06] border border-white/12 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Configuração Avançada Completa
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
