import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  Eye,
  Flame,
  Inbox,
  Lock,
  Search,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { Club, LeagueState, Player, PlayerPosition } from '../types/league';
import { calcMonthlyPayrollMillions, isClubInFinancialDebt } from '../engine/botAI';
import {
  calcAgentMinimumSalary,
  calcImmediateInterestSalary,
  calcMonthlySalary,
  formatCurrencyBRL,
  formatMillionsBRL,
  formatMonthlySalary,
  formatThousandsBRL,
} from '../data/seedData';
import {
  ClubCrest,
  CountryFlag,
  OvrBadge,
  PlayerAvatar,
  POSITION_STYLE,
  WorldClubCrest,
} from './ClubBadge';
import { PlayerSpotlightModal } from './PlayerSpotlightModal';

interface CurrencyReaisInputProps {
  valueReais: number;
  onChangeReais: (nextReais: number) => void;
  className?: string;
}

const CurrencyReaisInput: React.FC<CurrencyReaisInputProps> = ({
  valueReais,
  onChangeReais,
  className = '',
}) => {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={formatCurrencyBRL(valueReais)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        const parsed = digits ? parseInt(digits, 10) / 100 : 0;
        onChangeReais(Math.max(0, parsed));
      }}
      className={className}
    />
  );
};

interface MarketEntry {
  player: Player;
  originType: 'europa' | 'bot' | 'human' | 'livre';
  sellerClub?: Club;
}

interface TransferMarketViewProps {
  league: LeagueState;
  onBuyFreeAgent?: (clubId: string, playerId: string) => void;
  onAttemptFifaBotNegotiation: (
    buyerClubId: string,
    targetPlayerId: string,
    originType: 'europa' | 'bot' | 'livre',
    sellerClubId: string | undefined,
    offerCash: number,
    proposedMonthlySalary: number,
    swapPlayerId?: string
  ) => void;
  onSendHumanOffer: (
    fromClubId: string,
    toClubId: string,
    targetPlayerId: string,
    offerCash: number,
    proposedMonthlySalary?: number,
    swapPlayerId?: string
  ) => void;
  onRespondHumanOffer: (offerId: string, decision: 'aceita' | 'recusada') => void;
  onCloseWindowToMatches: () => void;
}

function formatRemainingWindow(endsAt: string | null, nowMs: number): string {
  if (!endsAt) return '24h 00m';
  const diff = Math.max(0, new Date(endsAt).getTime() - nowMs);
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

interface MarketReopenInfo {
  title: string;
  description: string;
  roundsText: string;
  estimatedDateText: string;
  durationHours: number;
}

function formatScheduledDatePtBr(isoDate: string | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  const datePart = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const timePart = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} às ${timePart}`;
}

function getMarketReopenInfo(league: LeagueState): MarketReopenInfo {
  const windowHours = league.config.transferRules.windowHours || 24;

  if (league.status === 'lobby' || league.status === 'escolha_clube') {
    return {
      title: `Janela Pré-Temporada (T${league.season})`,
      description: `O mercado abrirá assim que os clubes forem definidos e o Admin iniciar a janela de ${windowHours}h.`,
      roundsText: 'Aguardando escolha dos clubes',
      estimatedDateText: 'Logo após a definição dos times no Início',
      durationHours: windowHours,
    };
  }

  if (league.status === 'fim_temporada') {
    return {
      title: `Janela Pré-Temporada (T${league.season + 1})`,
      description: `Temporada ${league.season} concluída. O mercado reabre assim que a Temporada ${league.season + 1} for iniciada na aba Campeonato.`,
      roundsText: `Aguardando início da Temporada ${league.season + 1}`,
      estimatedDateText: 'Imediato ao iniciar a próxima temporada',
      durationHours: windowHours,
    };
  }

  const roundMatches = league.matches.filter((m) => m.round === league.currentRound);
  const isCurrentRoundFinished =
    roundMatches.length > 0 && roundMatches.every((m) => m.status === 'finalizada');

  if (league.config.homeAndAway && !league.midSeasonWindowDone) {
    const halfRound = Math.floor(league.totalRounds / 2);
    const roundsRemaining = Math.max(
      0,
      halfRound - league.currentRound + (isCurrentRoundFinished ? 0 : 1)
    );
    const reopenRefMatch = league.matches.find((m) => m.round === halfRound);
    const formattedDate = formatScheduledDatePtBr(reopenRefMatch?.scheduledAt);

    return {
      title: `Janela da Virada de Turno (após a Rodada ${halfRound})`,
      description: `Durante o 1º turno o mercado permanece fechado. Ele reabrirá automaticamente na virada para o 2º turno.`,
      roundsText:
        roundsRemaining === 0
          ? `Reabre ao avançar para o 2º turno (Rodada ${halfRound + 1})`
          : `Faltam ${roundsRemaining} ${roundsRemaining === 1 ? 'rodada' : 'rodadas'}`,
      estimatedDateText: formattedDate
        ? `Previsão: após ${formattedDate} (duração de ${windowHours}h)`
        : `Duração prevista: ${windowHours}h`,
      durationHours: windowHours,
    };
  }

  const roundsRemaining = Math.max(
    0,
    league.totalRounds - league.currentRound + (isCurrentRoundFinished ? 0 : 1)
  );
  const finalRefMatch = league.matches.find((m) => m.round === league.totalRounds);
  const formattedDate = formatScheduledDatePtBr(finalRefMatch?.scheduledAt);

  return {
    title: `Janela Pré-Temporada • Temporada ${league.season + 1} (após a Rodada ${league.totalRounds})`,
    description: `Não há mais janelas nesta temporada. O mercado reabrirá no início da próxima temporada após a rodada final.`,
    roundsText:
      roundsRemaining === 0
        ? `Reabre no início da Temporada ${league.season + 1}`
        : `Faltam ${roundsRemaining} ${roundsRemaining === 1 ? 'rodada' : 'rodadas'}`,
    estimatedDateText: formattedDate
      ? `Previsão: após ${formattedDate} (duração de ${windowHours}h)`
      : `Duração prevista: ${windowHours}h`,
    durationHours: windowHours,
  };
}

export const TransferMarketView: React.FC<TransferMarketViewProps> = ({
  league,
  onAttemptFifaBotNegotiation,
  onSendHumanOffer,
  onRespondHumanOffer,
  onCloseWindowToMatches,
}) => {
  const [subTab, setSubTab] = useState<'buscar' | 'propostas'>('buscar');
  const [query, setQuery] = useState('');
  const [originFilter, setOriginFilter] = useState<'todos' | 'europa' | 'bot' | 'human' | 'livre'>('todos');
  const [posFilter, setPosFilter] = useState<PlayerPosition | 'TODOS'>('TODOS');
  const [sortBy, setSortBy] = useState<'ovr_desc' | 'price_asc' | 'price_desc'>('ovr_desc');

  const [spotlightEntry, setSpotlightEntry] = useState<MarketEntry | null>(null);
  const [negotiatingEntry, setNegotiatingEntry] = useState<MarketEntry | null>(null);
  const [offerCash, setOfferCash] = useState<number>(0);
  const [proposedSalary, setProposedSalary] = useState<number>(120);
  const [swapPlayerId, setSwapPlayerId] = useState<string>('');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => {
      setNowMs(Date.now());
    }, 5000);
    return () => clearInterval(t);
  }, [league.transferWindowEndsAt]);

  const isWindowExpired = Boolean(
    league.transferWindowEndsAt && nowMs >= new Date(league.transferWindowEndsAt).getTime()
  );
  const isMarketOpen = league.transferWindowOpen && !isWindowExpired;
  const remainingText = formatRemainingWindow(league.transferWindowEndsAt, nowMs);

  useEffect(() => {
    if (!isMarketOpen) {
      setNegotiatingEntry(null);
    }
  }, [isMarketOpen]);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const isAdmin = currentUser?.isAdmin === true;

  const activeClub =
    league.clubs.find((c) => c.id === (currentUser?.clubId || league.activeHumanClubId)) ??
    league.clubs[0];

  const humanClubsCount = league.clubs.filter((c) => c.controller === 'human').length;

  const activeDisputes = (league.transferDisputes ?? []).filter((d) => d.status === 'ativa');
  const reservedCash = activeDisputes.reduce(
    (sum, d) => sum + (d.bids.find((b) => b.clubId === activeClub.id)?.offerCash ?? 0),
    0
  );
  const availableBudget = Math.max(0, activeClub.finances.budget - reservedCash);
  const monthlyPayroll = activeClub.squad.reduce(
    (sum, p) => sum + (p.monthlySalary ?? calcMonthlySalary(p.overall, activeClub.tier)),
    0
  );
  const wageBillMillions = calcMonthlyPayrollMillions(activeClub);
  const wageBudget =
    activeClub.finances.wageBudget ?? Math.round(wageBillMillions * 5 * 100) / 100;
  const inDebt = isClubInFinancialDebt(activeClub);
  const monthsCovered = wageBillMillions > 0 ? Math.max(0, wageBudget / wageBillMillions) : 0;

  const incomingApprovals = league.negotiations.filter(
    (n) => n.toClubId === activeClub.id && n.status === 'aguardando_amigo'
  );

  const allEntries: MarketEntry[] = [];
  league.worldMarket.forEach((p) => {
    allEntries.push({ player: p, originType: 'europa' });
  });
  league.clubs.forEach((c) => {
    if (c.id === activeClub.id) return;
    c.squad.forEach((p) => {
      allEntries.push({
        player: p,
        originType: c.controller === 'bot' ? 'bot' : 'human',
        sellerClub: c,
      });
    });
  });
  league.freeAgents.forEach((p) => {
    allEntries.push({ player: p, originType: 'livre' });
  });

  const qLower = query.trim().toLowerCase();
  const filteredEntries = allEntries
    .filter((entry) => {
      if (originFilter !== 'todos' && entry.originType !== originFilter) return false;
      if (posFilter !== 'TODOS') {
        const isWingMatch =
          Boolean(entry.player.ambidextrous) &&
          (entry.player.position === 'PE' || entry.player.position === 'PD') &&
          (posFilter === 'PE' || posFilter === 'PD');
        if (entry.player.position !== posFilter && !isWingMatch) return false;
      }
      if (qLower) {
        const clubStr = (
          entry.sellerClub?.name ??
          entry.player.currentClubName ??
          ''
        ).toLowerCase();
        const nameMatch =
          entry.player.knownName.toLowerCase().includes(qLower) ||
          entry.player.name.toLowerCase().includes(qLower);
        if (!nameMatch && !clubStr.includes(qLower)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.player.marketValue - b.player.marketValue;
      if (sortBy === 'price_desc') return b.player.marketValue - a.player.marketValue;
      return b.player.overall - a.player.overall;
    })
    .slice(0, 60);

  const openNegotiation = (entry: MarketEntry) => {
    setNegotiatingEntry(entry);
    const key = `${activeClub.id}:${entry.player.id}`;
    const existingPatience = league.botPatienceMap[key];
    const baseSalary =
      entry.player.monthlySalary ?? calcMonthlySalary(entry.player.overall);
    const minAgentSalary = calcAgentMinimumSalary(entry.player, activeClub);
    const activeDispute = activeDisputes.find((d) => d.targetPlayerId === entry.player.id);
    const topBidCash = activeDispute
      ? Math.max(...activeDispute.bids.map((b) => b.offerCash), entry.player.marketValue)
      : entry.player.marketValue;
    const topBidSalary = activeDispute
      ? Math.max(...activeDispute.bids.map((b) => b.proposedMonthlySalary), minAgentSalary, baseSalary)
      : minAgentSalary;

    setOfferCash(
      entry.originType === 'livre'
        ? 0
        : activeDispute
        ? Number((topBidCash + 0.5).toFixed(1))
        : existingPatience?.lastCounter ?? entry.player.marketValue
    );
    setProposedSalary(
      existingPatience?.lastCounterSalary ??
        (activeDispute
          ? Math.max(25, Math.round((topBidSalary + (entry.originType === 'livre' ? 25 : topBidSalary * 0.05)) / 5) * 5)
          : minAgentSalary)
    );
    setSwapPlayerId('');
  };

  const activePatienceKey = negotiatingEntry
    ? `${activeClub.id}:${negotiatingEntry.player.id}`
    : '';
  const patienceState = activePatienceKey
    ? league.botPatienceMap[activePatienceKey] ?? { patience: 3, locked: false }
    : { patience: 3, locked: false };

  // =========================================================================
  // MERCADO FECHADO
  // =========================================================================
  if (!isMarketOpen) {
    const reopenInfo = getMarketReopenInfo(league);
    return (
      <div className="pb-8">
        <section className="relative console-panel-elevated overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: "url('/assets/tunnel-boardroom.jpg')" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-[#090C10]/80 via-[#11161E]/92 to-[#090C10]/96"
          />

          <div className="relative z-10 p-6 sm:p-10 max-w-2xl mx-auto text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-lg bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-rose-400">
                Janela de Transferências Encerrada
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-wide leading-none">
                Mercado Fechado
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {reopenInfo.description}
              </p>
            </div>

            <div className="bg-[#090C10]/95 border border-white/12 rounded-md p-5 text-left space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Próxima Reabertura Programada
              </div>
              <div className="font-display text-xl font-bold text-white leading-snug">
                {reopenInfo.title}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/[0.08] text-xs">
                <div>
                  <div className="text-slate-400">Prazo em rodadas</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {reopenInfo.roundsText}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Previsão
                  </div>
                  <div className="font-semibold text-slate-200 mt-0.5">
                    {reopenInfo.estimatedDateText}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // =========================================================================
  // CENTRAL DE TRANSFERÊNCIAS ATIVA
  // =========================================================================
  return (
    <div className="space-y-6 pb-8">
      {/* Cabeçalho Executivo da Central de Transferências */}
      <section
        className="relative console-panel-elevated overflow-hidden"
        style={{
          borderTopWidth: '3px',
          borderTopColor: activeClub.primaryColor,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{ backgroundImage: "url('/assets/tunnel-boardroom.jpg')" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#090C10]/94 via-[#11161E]/85 to-[#090C10]/94"
        />

        <div className="relative z-10 p-4 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <ClubCrest club={activeClub} size="lg" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Mercado Aberto
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#090C10]/90 border border-white/12 text-xs font-semibold text-slate-200 tabular-nums">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {league.transferWindowLabel} • {remainingText}
                  </span>
                  {activeDisputes.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-xs font-bold text-amber-300">
                      <Flame className="w-3.5 h-3.5" />
                      {activeDisputes.length} {activeDisputes.length === 1 ? 'disputa 3h' : 'disputas 3h'}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase tracking-wide mt-1.5 leading-none truncate">
                  Central de Transferências
                </h1>
                <div className="text-xs text-slate-300 mt-1 truncate">
                  {activeClub.name} • Técnico{' '}
                  <strong className="text-white">{activeClub.managerName}</strong>
                </div>
              </div>
            </div>

            {league.status === 'janela_mercado' && isAdmin && (
              <button
                type="button"
                onClick={onCloseWindowToMatches}
                className="py-3 px-5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition shrink-0"
              >
                Encerrar Janela &amp; Iniciar Partidas
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* KPIs Financeiros de Mercado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.08]">
            <div className="bg-[#090C10]/90 border border-white/[0.08] rounded-md px-4 py-3 min-w-0">
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Caixa Transferências
                </span>
                {reservedCash > 0 && (
                  <span className="text-[10px] text-amber-300 tabular-nums shrink-0">
                    ({formatMillionsBRL(reservedCash)} disp.)
                  </span>
                )}
              </div>
              <div className="font-display text-2xl font-extrabold text-emerald-400 tabular-nums mt-0.5 truncate">
                {formatMillionsBRL(availableBudget)}
              </div>
            </div>

            <div
              className={`bg-[#090C10]/90 border rounded-md px-4 py-3 min-w-0 ${
                inDebt ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <span>Fundo Salarial</span>
                <span
                  className={`font-bold ${inDebt ? 'text-rose-400' : 'text-sky-300'}`}
                >
                  {inDebt ? 'DÉFICIT' : `${monthsCovered.toFixed(1)} meses`}
                </span>
              </div>
              <div
                className={`font-display text-2xl font-extrabold tabular-nums mt-0.5 truncate ${
                  inDebt ? 'text-rose-400' : 'text-sky-300'
                }`}
              >
                {wageBudget < 0
                  ? `-${formatMillionsBRL(Math.abs(wageBudget))}`
                  : formatMillionsBRL(wageBudget)}
              </div>
            </div>

            <div className="bg-[#090C10]/90 border border-white/[0.08] rounded-md px-4 py-3 min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                Folha Mensal ({activeClub.squad.length} atletas)
              </div>
              <div className="font-display text-2xl font-extrabold text-amber-300 tabular-nums mt-0.5 truncate">
                {formatMonthlySalary(monthlyPayroll)}
              </div>
            </div>
          </div>

          {inDebt && (
            <div className="p-3.5 rounded-md bg-rose-500/15 border border-rose-500/45 flex items-start gap-2.5 text-xs text-rose-100">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-white">Mercado Bloqueado por Déficit Salarial:</strong> seu Fundo Salarial está negativo ({formatMillionsBRL(Math.abs(wageBudget))}). Quite o déficit na aba{' '}
                <strong>Meu Clube → Finanças</strong> ou venda atletas para voltar a contratar.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* SUB-NAVEGAÇÃO CONSOLE */}
      <div className="flex items-center border-b border-white/[0.08] gap-2">
        <button
          type="button"
          onClick={() => setSubTab('buscar')}
          className={`relative px-4 py-3 text-xs sm:text-sm font-bold cursor-pointer transition ${
            subTab === 'buscar' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="font-display text-base uppercase tracking-wider">
            Explorar Mercado
          </span>
          {subTab === 'buscar' && (
            <span className="absolute bottom-0 inset-x-2 h-[2.5px] bg-emerald-400" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setSubTab('propostas')}
          className={`relative px-4 py-3 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition ${
            subTab === 'propostas' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4 text-amber-400" />
          <span className="font-display text-base uppercase tracking-wider">
            Propostas &amp; Disputas
          </span>
          {incomingApprovals.length + activeDisputes.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[11px] font-extrabold tabular-nums">
              {incomingApprovals.length + activeDisputes.length}
            </span>
          )}
          {subTab === 'propostas' && (
            <span className="absolute bottom-0 inset-x-2 h-[2.5px] bg-amber-400" />
          )}
        </button>
      </div>

      {/* ================================================================= */}
      {/* ABA 1: EXPLORAR MERCADO                                           */}
      {/* ================================================================= */}
      {subTab === 'buscar' && (
        <div className="space-y-4">
          {/* Painel de Filtros */}
          <div className="console-panel p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar jogador ou clube (ex: Mbappé, River Plate, Real Madrid...)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'ovr_desc' | 'price_asc' | 'price_desc')}
                className="px-3 py-2.5 rounded-md bg-[#090C10] border border-white/12 text-xs font-bold text-white"
              >
                <option value="ovr_desc">Maior OVR ↓</option>
                <option value="price_asc">Menor Preço ↑</option>
                <option value="price_desc">Maior Preço ↓</option>
              </select>
            </div>

            {/* Origens */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {(
                [
                  { id: 'todos', label: 'Todos' },
                  { id: 'europa', label: 'Europa & América Latina' },
                  { id: 'bot', label: 'Série A (Bots)' },
                  { id: 'human', label: 'Amigos' },
                  { id: 'livre', label: 'Livres' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOriginFilter(o.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold shrink-0 cursor-pointer transition ${
                    originFilter === o.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#090C10] text-slate-300 border border-white/10 hover:border-white/25'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Posições */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {(['TODOS', 'GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'CA'] as const).map(
                (pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosFilter(pos)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold shrink-0 cursor-pointer transition ${
                      posFilter === pos
                        ? 'bg-white text-slate-950'
                        : 'bg-[#090C10] text-slate-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Lista Estruturada de Atletas no Mercado */}
          <div className="console-panel p-3 sm:p-4 space-y-2">
            {filteredEntries.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Nenhum jogador encontrado com os filtros atuais.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const { player, originType, sellerClub } = entry;
                const clubLabel = sellerClub?.name ?? player.currentClubName ?? 'Livre';
                const pat = league.botPatienceMap[`${activeClub.id}:${player.id}`];
                const activeDispute = activeDisputes.find((d) => d.targetPlayerId === player.id);
                const myDisputeBid = activeDispute?.bids.find((b) => b.clubId === activeClub.id);
                const topBidCash = activeDispute
                  ? Math.max(...activeDispute.bids.map((b) => b.offerCash))
                  : 0;
                const topBidSalary = activeDispute
                  ? Math.max(...activeDispute.bids.map((b) => b.proposedMonthlySalary))
                  : 0;
                const playerMonthlySalary =
                  player.monthlySalary ?? calcMonthlySalary(player.overall);
                const contractYears = player.contractYears ?? (originType === 'livre' ? 0 : 2);

                return (
                  <div
                    key={`${originType}-${player.id}`}
                    className={`rounded-md p-3 border transition flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3 overflow-hidden ${
                      activeDispute
                        ? 'bg-amber-400/[0.06] border-amber-400/45'
                        : 'bg-[#090C10] border-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    {/* Identidade do Atleta + OVR Mobile */}
                    <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setSpotlightEntry(entry)}
                        className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 text-left cursor-pointer group"
                      >
                        <PlayerAvatar
                          player={player}
                          size="md"
                          shape="card"
                          kitPrimary={
                            sellerClub
                              ? player.position === 'GOL'
                                ? '#eab308'
                                : sellerClub.primaryColor
                              : undefined
                          }
                          kitSecondary={
                            sellerClub
                              ? player.position === 'GOL'
                                ? '#0f172a'
                                : sellerClub.secondaryColor
                              : undefined
                          }
                        />

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <CountryFlag nationality={player.nationality} />
                            <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
                              {player.knownName}
                            </span>
                            <span className="text-xs text-slate-500 shrink-0">({player.age}a)</span>
                            {player.ambidextrous && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold shrink-0">
                                PE/PD
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                POSITION_STYLE[player.position]
                              }`}
                            >
                              {player.position}
                            </span>

                            {sellerClub ? (
                              <span className="inline-flex items-center gap-1.5 min-w-0 text-slate-200">
                                <ClubCrest club={sellerClub} size="xs" />
                                <span className="truncate">{sellerClub.shortName}</span>
                                {originType === 'human' && (
                                  <span className="text-amber-300 font-semibold shrink-0">
                                    ({sellerClub.managerName.split(' ')[0]})
                                  </span>
                                )}
                              </span>
                            ) : originType !== 'livre' ? (
                              <span className="inline-flex items-center gap-1.5 min-w-0 text-sky-300 font-medium">
                                <WorldClubCrest clubName={player.currentClubName} size="xs" />
                                <span className="truncate">{clubLabel}</span>
                              </span>
                            ) : (
                              <span className="text-emerald-300 font-medium">Passe Livre</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400">
                            <span className="tabular-nums">
                              Salário: {formatMonthlySalary(playerMonthlySalary)}
                            </span>
                            {contractYears > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-medium text-[10px] shrink-0">
                                {contractYears}a contrato
                              </span>
                            )}
                          </div>

                          {activeDispute && (
                            <div className="inline-flex flex-wrap items-center gap-1.5 mt-1 px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-[11px] text-amber-300 font-bold">
                              <Flame className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                Disputa ({activeDispute.bids.length} clubes •{' '}
                                {formatRemainingWindow(activeDispute.expiresAt, nowMs)}) • Topo{' '}
                                {originType === 'livre'
                                  ? formatMonthlySalary(topBidSalary)
                                  : formatMillionsBRL(topBidCash)}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* OVR compacto alinhado no topo direito no mobile */}
                      <div className="md:hidden shrink-0">
                        <OvrBadge ovr={player.overall} size="sm" />
                      </div>
                    </div>

                    {/* Valor + OVR (Desktop) + Botões */}
                    <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 sm:gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06] shrink-0">
                      <div className="text-left md:text-right min-w-0">
                        <div className="font-display text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums leading-none whitespace-nowrap">
                          {originType === 'livre' ? 'Passe Livre' : formatMillionsBRL(player.marketValue)}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                          {originType === 'livre' ? 'Sem taxa' : 'Valor de mercado'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <div className="hidden md:block">
                          <OvrBadge ovr={player.overall} size="md" />
                        </div>

                        <button
                          type="button"
                          onClick={() => setSpotlightEntry(entry)}
                          className="p-2 rounded-md bg-[#11161E] hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer transition shrink-0"
                          title="Ver Ficha do Jogador"
                          aria-label={`Ver ficha de ${player.knownName}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {pat?.locked && !activeDispute ? (
                          <span className="px-2.5 sm:px-3 py-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 font-bold whitespace-nowrap shrink-0">
                            Bloqueado
                          </span>
                        ) : activeDispute ? (
                          <button
                            type="button"
                            disabled={!isMarketOpen || inDebt}
                            onClick={() => openNegotiation(entry)}
                            className="px-2.5 sm:px-3.5 py-2 rounded-md bg-amber-400 hover:bg-amber-300 disabled:opacity-35 disabled:cursor-not-allowed text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer transition whitespace-nowrap shrink-0"
                          >
                            {myDisputeBid ? 'Ajustar Lance' : 'Cobrir Lance'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!isMarketOpen || inDebt}
                            onClick={() => openNegotiation(entry)}
                            className="px-2.5 sm:px-3.5 py-2 rounded-md bg-emerald-500/15 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-500/40 disabled:opacity-35 disabled:cursor-not-allowed text-emerald-300 font-extrabold text-xs uppercase tracking-wider cursor-pointer transition whitespace-nowrap shrink-0"
                          >
                            Negociar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 2: PROPOSTAS, DISPUTAS 3H & AUTORIZAÇÕES                      */}
      {/* ================================================================= */}
      {subTab === 'propostas' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Esquerda (6 cols): Disputas Ativas & Autorizações */}
          <div className="lg:col-span-6 space-y-5">
            {/* Disputas Ativas (3h) */}
            <section className="console-panel p-5 space-y-3 border-amber-400/35">
              <div className="flex items-center justify-between gap-2">
                <div className="console-section-title text-sm text-amber-300 flex-1">
                  <Flame className="w-4 h-4 shrink-0" />
                  Disputas Ativas (3h)
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">Maior oferta vence</span>
              </div>

              {activeDisputes.length === 0 ? (
                <div className="text-xs text-slate-400 py-5 text-center bg-[#090C10] border border-white/[0.06] rounded-md">
                  Nenhuma disputa entre técnicos humanos acontecendo agora.
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDisputes.map((dispute) => {
                    const entry = allEntries.find((e) => e.player.id === dispute.targetPlayerId);
                    const sortedBids = [...dispute.bids].sort((a, b) =>
                      dispute.originType === 'livre'
                        ? b.proposedMonthlySalary - a.proposedMonthlySalary
                        : b.offerCash - a.offerCash
                    );
                    return (
                      <div
                        key={dispute.id}
                        className="p-3.5 rounded-md bg-[#090C10] border border-amber-400/30 space-y-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-sm text-white">
                              {dispute.targetPlayerName}
                            </div>
                            <div className="text-[11px] text-amber-300 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              Decisão em {formatRemainingWindow(dispute.expiresAt, nowMs)}
                            </div>
                          </div>
                          {entry && (
                            <button
                              type="button"
                              disabled={!isMarketOpen}
                              onClick={() => openNegotiation(entry)}
                              className="px-3 py-1.5 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer transition"
                            >
                              Cobrir Lance
                            </button>
                          )}
                        </div>
                        <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                          {sortedBids.map((bid) => {
                            const bidder = league.clubs.find((c) => c.id === bid.clubId);
                            const isMine = bid.clubId === activeClub.id;
                            return (
                              <div
                                key={bid.clubId}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs px-2.5 py-1.5 rounded ${
                                  isMine
                                    ? 'bg-emerald-500/15 text-emerald-200 font-bold'
                                    : 'text-slate-300'
                                }`}
                              >
                                <span className="inline-flex items-center gap-2 min-w-0">
                                  {bidder && <ClubCrest club={bidder} size="xs" />}
                                  <span className="truncate">
                                    {bidder?.shortName ?? bid.clubId}
                                    {isMine && ' (Você)'}
                                  </span>
                                </span>
                                <span className="tabular-nums shrink-0 text-[11px] sm:text-xs">
                                  {dispute.originType === 'livre'
                                    ? `Passe Livre • ${formatMonthlySalary(bid.proposedMonthlySalary)}`
                                    : `${formatMillionsBRL(bid.offerCash)} • ${formatMonthlySalary(
                                        bid.proposedMonthlySalary
                                      )}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Autorizações entre Amigos */}
            <section className="console-panel p-5 space-y-3 border-emerald-500/25">
              <div className="console-section-title text-sm text-white">
                Propostas Recebidas no {activeClub.shortName}
              </div>

              {incomingApprovals.length === 0 ? (
                <div className="text-xs text-slate-400 py-5 text-center bg-[#090C10] border border-white/[0.06] rounded-md">
                  Nenhuma proposta de outro técnico aguardando sua autorização.
                </div>
              ) : (
                <div className="space-y-3">
                  {incomingApprovals.map((neg) => {
                    const fromClub = league.clubs.find((c) => c.id === neg.fromClubId);
                    return (
                      <div
                        key={neg.id}
                        className="p-3.5 rounded-md bg-[#090C10] border border-amber-400/35 space-y-3 text-xs"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">
                            {fromClub?.name} ({fromClub?.managerName}) quer {neg.targetPlayerName}
                          </div>
                          <div className="text-xs text-emerald-400 font-semibold tabular-nums mt-0.5">
                            Oferta: {formatMillionsBRL(neg.offerCash)}
                            {neg.swapPlayerName ? ` + ${neg.swapPlayerName}` : ''}
                            {neg.proposedMonthlySalary
                              ? ` • Salário proposto: ${formatMonthlySalary(neg.proposedMonthlySalary)}`
                              : ''}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => onRespondHumanOffer(neg.id, 'aceita')}
                            className="py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition"
                          >
                            <Check className="w-4 h-4" /> Autorizar Venda
                          </button>
                          <button
                            type="button"
                            onClick={() => onRespondHumanOffer(neg.id, 'recusada')}
                            className="py-2 rounded-md bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                          >
                            <X className="w-4 h-4" /> Recusar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Direita (6 cols): Histórico de Negociações */}
          <section className="lg:col-span-6 console-panel p-5 space-y-3">
            <div className="console-section-title text-sm text-slate-300">
              Histórico de Negociações
            </div>

            {league.negotiations.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center bg-[#090C10] border border-white/[0.06] rounded-md">
                Nenhuma negociação registrada ainda nesta janela.
              </div>
            ) : (
              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {league.negotiations.slice(0, 15).map((neg) => (
                  <div
                    key={neg.id}
                    className="p-3 rounded-md bg-[#090C10] border border-white/[0.06] text-xs space-y-1"
                  >
                    <div className="flex justify-between gap-2 items-center">
                      <span className="font-bold text-white">{neg.targetPlayerName}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          neg.status === 'aceita'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : neg.status === 'aguardando_amigo' || neg.status === 'em_disputa'
                            ? 'bg-amber-400/15 text-amber-300'
                            : neg.status === 'contraproposta'
                            ? 'bg-sky-500/15 text-sky-300'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {neg.status === 'aguardando_amigo'
                          ? 'Aguardando amigo'
                          : neg.status === 'em_disputa'
                          ? 'Em disputa (3h)'
                          : neg.status}
                      </span>
                    </div>
                    {neg.proposedMonthlySalary && (
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        {neg.toClubId === 'livre' || neg.offerCash === 0
                          ? `Passe Livre • Salário: ${formatMonthlySalary(neg.proposedMonthlySalary)}`
                          : `Oferta: ${formatMillionsBRL(neg.offerCash)} • Salário: ${formatMonthlySalary(
                              neg.proposedMonthlySalary
                            )}`}
                      </div>
                    )}
                    {neg.botReason && <div className="text-xs text-slate-300">{neg.botReason}</div>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal Ficha Detalhada do Atleta (Mercado) */}
      {spotlightEntry && (
        <PlayerSpotlightModal
          player={spotlightEntry.player}
          club={spotlightEntry.sellerClub}
          originType={spotlightEntry.originType}
          onClose={() => setSpotlightEntry(null)}
          onStartNegotiation={
            isMarketOpen &&
            !inDebt &&
            !(
              league.botPatienceMap[`${activeClub.id}:${spotlightEntry.player.id}`]?.locked &&
              !activeDisputes.some((d) => d.targetPlayerId === spotlightEntry.player.id)
            )
              ? () => openNegotiation(spotlightEntry)
              : undefined
          }
          negotiationDisabled={inDebt}
          negotiationLabel={
            inDebt
              ? 'Bloqueado (Déficit Salarial)'
              : activeDisputes.some((d) => d.targetPlayerId === spotlightEntry.player.id)
              ? 'Entrar / Cobrir Disputa (3h)'
              : 'Abrir Sala de Negociação'
          }
        />
      )}

      {/* ================================================================= */}
      {/* SALA DE NEGOCIAÇÃO CONSOLE (MODAL 2 COLUNAS DESKTOP)              */}
      {/* ================================================================= */}
      {negotiatingEntry && (() => {
        const modalDispute = activeDisputes.find(
          (d) => d.targetPlayerId === negotiatingEntry.player.id
        );
        const modalBaseSalary =
          negotiatingEntry.player.monthlySalary ??
          calcMonthlySalary(negotiatingEntry.player.overall);
        const minBaseAgentSalary = calcAgentMinimumSalary(negotiatingEntry.player, activeClub);
        const starterRivals = activeClub.squad.filter(
          (p) =>
            p.isStarter &&
            (p.position === negotiatingEntry.player.position ||
              (negotiatingEntry.player.ambidextrous &&
                (p.position === 'PE' || p.position === 'PD')))
        );
        const hasHardCompetition = starterRivals.some(
          (p) => p.overall >= negotiatingEntry.player.overall + 2
        );
        const isFreeAgent = negotiatingEntry.originType === 'livre';
        const effectiveMinSalary = hasHardCompetition
          ? Math.max(25, Math.round((minBaseAgentSalary * 1.08) / 5) * 5)
          : minBaseAgentSalary;
        const immediateSalary = calcImmediateInterestSalary(
          negotiatingEntry.player,
          activeClub,
          hasHardCompetition
        );
        const salaryStatus =
          isFreeAgent && !modalDispute
            ? proposedSalary >= immediateSalary
              ? {
                  label:
                    humanClubsCount > 1
                      ? 'Interesse Imediato! Assina na hora'
                      : 'Proposta irrecusável (Empresário empolgado)',
                  cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/45',
                }
              : proposedSalary >= effectiveMinSalary
              ? {
                  label:
                    humanClubsCount > 1
                      ? 'Aceita abrir disputa (3h)'
                      : 'No mínimo exigido (Empresário aceita)',
                  cls: 'bg-amber-400/15 text-amber-300 border-amber-400/35',
                }
              : {
                  label: 'Abaixo do mínimo exigido (Risco de recusa)',
                  cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
                }
            : proposedSalary > effectiveMinSalary
            ? {
                label: 'Acima da pedida (Empresário satisfeito)',
                cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
              }
            : proposedSalary >= effectiveMinSalary
            ? {
                label: 'No mínimo exigido',
                cls: 'bg-amber-400/15 text-amber-300 border-amber-400/35',
              }
            : {
                label: 'Abaixo do mínimo exigido (Risco de recusa)',
                cls: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
              };

        const modalNode = (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-5">
            <div className="w-full max-w-[740px] max-h-[92vh] overflow-y-auto console-panel-elevated rounded-t-xl md:rounded-lg shadow-2xl animate-console-enter">
              {/* Topo Sala de Negociação */}
              <div className="relative p-5 border-b border-white/[0.08] bg-[#0B0F15] flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <PlayerAvatar player={negotiatingEntry.player} size="lg" shape="card" />
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-200 text-[11px] font-bold mb-1">
                      {negotiatingEntry.sellerClub ? (
                        <ClubCrest club={negotiatingEntry.sellerClub} size="xs" />
                      ) : negotiatingEntry.originType !== 'livre' ? (
                        <WorldClubCrest clubName={negotiatingEntry.player.currentClubName} size="xs" />
                      ) : (
                        <Building2 className="w-3.5 h-3.5" />
                      )}
                      {negotiatingEntry.sellerClub?.name ?? negotiatingEntry.player.currentClubName}
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white uppercase leading-none flex items-center gap-2 truncate">
                      <CountryFlag nationality={negotiatingEntry.player.nationality} />
                      <span className="truncate">{negotiatingEntry.player.knownName}</span>
                    </h2>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                      <span>
                        {negotiatingEntry.player.position}
                        {negotiatingEntry.player.ambidextrous ? ' (Ambidestro PE/PD)' : ''}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold tabular-nums">
                        {negotiatingEntry.originType === 'livre'
                          ? 'Passe Livre'
                          : formatMillionsBRL(negotiatingEntry.player.marketValue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <OvrBadge ovr={negotiatingEntry.player.overall} size="lg" />
                  <button
                    type="button"
                    onClick={() => setNegotiatingEntry(null)}
                    aria-label="Fechar negociação"
                    className="p-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 cursor-pointer transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {modalDispute && (
                  <div className="p-3.5 rounded-md bg-amber-400/10 border border-amber-400/35 text-xs space-y-1">
                    <div className="font-bold text-amber-300 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5">
                        <Flame className="w-4 h-4" /> Disputa Aberta (3h)
                      </span>
                      <span className="tabular-nums">
                        Restam {formatRemainingWindow(modalDispute.expiresAt, nowMs)}
                      </span>
                    </div>
                    <div className="text-slate-200">
                      {isFreeAgent ? (
                        <>
                          Maior salário até agora:{' '}
                          <strong className="text-white tabular-nums">
                            {formatMonthlySalary(
                              Math.max(...modalDispute.bids.map((b) => b.proposedMonthlySalary))
                            )}
                          </strong>{' '}
                          ({modalDispute.bids.length} clubes na briga).
                        </>
                      ) : (
                        <>
                          Maior oferta até agora:{' '}
                          <strong className="text-white tabular-nums">
                            {formatMillionsBRL(
                              Math.max(...modalDispute.bids.map((b) => b.offerCash))
                            )}
                          </strong>{' '}
                          ({modalDispute.bids.length} clubes na briga).
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Grade 2 Colunas Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Esquerda (6 cols): Empresário & Salário Mensal */}
                  <div className="md:col-span-6 space-y-3.5">
                    {negotiatingEntry.originType !== 'human' && (
                      <div className="bg-[#090C10] border border-sky-500/25 rounded-md p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-sky-300 uppercase tracking-wider text-[11px]">
                            Exigência do Empresário
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-bold ${salaryStatus.cls}`}
                          >
                            {salaryStatus.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 text-xs">
                          {isFreeAgent && !modalDispute ? (
                            <>
                              <div>
                                <div className="text-slate-400 text-[11px]">
                                  Mínimo Exigido{humanClubsCount > 1 ? ' (3h)' : ''}
                                </div>
                                <div className="font-bold text-amber-300 tabular-nums mt-0.5">
                                  {formatMonthlySalary(effectiveMinSalary)}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400 text-[11px]">
                                  Proposta Irrecusável
                                </div>
                                <div className="font-bold text-emerald-300 tabular-nums mt-0.5">
                                  {formatMonthlySalary(immediateSalary)}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div>
                                <div className="text-slate-400 text-[11px]">Salário Atual</div>
                                <div className="font-bold text-slate-200 tabular-nums mt-0.5">
                                  {isFreeAgent ? 'Sem Clube' : formatMonthlySalary(modalBaseSalary)}
                                </div>
                              </div>
                              <div>
                                <div className="text-slate-400 text-[11px]">Mínimo Exigido</div>
                                <div className="font-bold text-amber-300 tabular-nums mt-0.5">
                                  {formatMonthlySalary(effectiveMinSalary)}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        {isFreeAgent && !modalDispute && proposedSalary < immediateSalary && (
                          <button
                            type="button"
                            onClick={() => setProposedSalary(immediateSalary)}
                            className="w-full py-2 px-3 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold cursor-pointer tabular-nums transition"
                          >
                            Oferecer Irrecusável ({formatMonthlySalary(immediateSalary)})
                          </button>
                        )}
                        {hasHardCompetition && (
                          <div className="text-[11px] text-amber-300 leading-snug">
                            Obs.: você já possui titular forte nessa posição; o empresário pediu +8% pela disputa por vaga.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Salário Mensal Proposto */}
                    <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-semibold">Salário Mensal Proposto</span>
                        <span className="text-sky-300 font-bold tabular-nums">
                          {formatMonthlySalary(proposedSalary)}
                        </span>
                      </div>
                      <CurrencyReaisInput
                        valueReais={Math.round(proposedSalary * 1000)}
                        onChangeReais={(nextReais) => setProposedSalary(nextReais / 1000)}
                        className="w-full px-3 py-2.5 rounded-md bg-[#11161E] border border-white/12 text-sm font-bold text-white text-center tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setProposedSalary((s) => Math.max(25, s - 25))}
                          className="py-2 rounded bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer tabular-nums"
                        >
                          - {formatThousandsBRL(25)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setProposedSalary((s) => s + 25)}
                          className="py-2 rounded bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer tabular-nums"
                        >
                          + {formatThousandsBRL(25)}
                        </button>
                      </div>
                      {humanClubsCount > 1 && negotiatingEntry.originType !== 'human' && (
                        <p className="text-[11px] text-slate-400 leading-snug">
                          Em disputa (3h), propostas próximas (≤ 6%) são decididas por salário, posição na tabela e espaço no elenco.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Direita (6 cols): Clube Vendedor / Paciência / Oferta */}
                  <div className="md:col-span-6 space-y-3.5">
                    {negotiatingEntry.originType === 'human' && negotiatingEntry.sellerClub ? (
                      <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3.5 space-y-3">
                        <div className="text-xs text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded p-3">
                          Clube de <strong>{negotiatingEntry.sellerClub.managerName}</strong>. A
                          transferência é concluída após autorização dele!
                        </div>
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              Sua Proposta pelo Passe (R$)
                            </label>
                            <CurrencyReaisInput
                              valueReais={Math.round(offerCash * 1_000_000)}
                              onChangeReais={(nextReais) => setOfferCash(nextReais / 1_000_000)}
                              className="w-full px-3 py-2.5 rounded-md bg-[#11161E] border border-white/12 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setOfferCash((v) => Math.max(0, Number((v - 0.5).toFixed(2))))
                              }
                              className="py-2 rounded bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer tabular-nums"
                            >
                              - {formatCurrencyBRL(500_000)}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setOfferCash((v) => Number((v + 0.5).toFixed(2)))
                              }
                              className="py-2 rounded bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer tabular-nums"
                            >
                              + {formatCurrencyBRL(500_000)}
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">
                              Incluir Troca (Opcional)
                            </label>
                            <select
                              value={swapPlayerId}
                              onChange={(e) => setSwapPlayerId(e.target.value)}
                              className="w-full px-3 py-2.5 rounded-md bg-[#11161E] border border-white/12 text-xs text-white"
                            >
                              <option value="">Sem troca</option>
                              {activeClub.squad.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.position} • {p.knownName} ({p.overall})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={offerCash > availableBudget || proposedSalary < 25}
                          onClick={() => {
                            onSendHumanOffer(
                              activeClub.id,
                              negotiatingEntry.sellerClub!.id,
                              negotiatingEntry.player.id,
                              offerCash,
                              proposedSalary,
                              swapPlayerId || undefined
                            );
                            setNegotiatingEntry(null);
                          }}
                          className="w-full py-3 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs uppercase tracking-wider cursor-pointer transition"
                        >
                          Enviar Pedido de Autorização
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3.5">
                        {/* Medidor de Paciência */}
                        <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3.5 space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-semibold">
                              {negotiatingEntry.originType === 'livre'
                                ? 'Paciência do Empresário'
                                : 'Paciência (Clube & Empresário)'}
                            </span>
                            <span
                              className={`font-bold tabular-nums ${
                                patienceState.patience >= 3
                                  ? 'text-emerald-400'
                                  : patienceState.patience === 2
                                  ? 'text-amber-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {patienceState.patience}/3
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[1, 2, 3].map((bar) => (
                              <div
                                key={bar}
                                className={`h-2 rounded-sm ${
                                  patienceState.patience >= bar
                                    ? patienceState.patience >= 3
                                      ? 'bg-emerald-500'
                                      : patienceState.patience === 2
                                      ? 'bg-amber-400'
                                      : 'bg-rose-500'
                                    : 'bg-slate-800'
                                }`}
                              />
                            ))}
                          </div>
                          {patienceState.lastMessage && (
                            <div className="text-xs text-amber-200 pt-1 leading-snug">
                              {patienceState.lastMessage}
                            </div>
                          )}
                          {(patienceState.lastCounter !== undefined ||
                            patienceState.lastCounterSalary !== undefined) &&
                            !patienceState.locked && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (patienceState.lastCounter !== undefined) {
                                    setOfferCash(patienceState.lastCounter);
                                  }
                                  if (patienceState.lastCounterSalary !== undefined) {
                                    setProposedSalary(patienceState.lastCounterSalary);
                                  }
                                }}
                                className="mt-1 px-3 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 text-xs font-bold cursor-pointer transition"
                              >
                                Ajustar para pedida atual
                              </button>
                            )}
                        </div>

                        {/* Feedback Pós-Contratação ou Controles de Proposta */}
                        {activeClub.squad.some((p) => p.id === negotiatingEntry.player.id) ? (
                          <div className="p-4 rounded-md bg-emerald-500/15 border border-emerald-500/45 text-xs text-emerald-200 font-bold flex items-center gap-2.5 animate-console-enter">
                            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                            Contratação concluída! {negotiatingEntry.player.knownName} já integra o elenco do {activeClub.shortName}.
                          </div>
                        ) : (
                          (!patienceState.locked || Boolean(modalDispute)) && (
                            <div className="bg-[#090C10] border border-white/[0.08] rounded-md p-3.5 space-y-3">
                              {negotiatingEntry.originType !== 'livre' && !modalDispute && (
                                <button
                                  type="button"
                                  disabled={
                                    availableBudget < negotiatingEntry.player.marketValue ||
                                    proposedSalary < 25
                                  }
                                  onClick={() => {
                                    onAttemptFifaBotNegotiation(
                                      activeClub.id,
                                      negotiatingEntry.player.id,
                                      negotiatingEntry.originType === 'europa' ? 'europa' : 'bot',
                                      negotiatingEntry.sellerClub?.id,
                                      negotiatingEntry.player.marketValue,
                                      proposedSalary
                                    );
                                  }}
                                  className="w-full py-3 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition"
                                >
                                  <Sparkles className="w-4 h-4" />
                                  Pagar Valor Integral (
                                  {formatMillionsBRL(negotiatingEntry.player.marketValue)})
                                </button>
                              )}

                              {isFreeAgent ? (
                                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-100 leading-relaxed">
                                  <strong>Passe Livre:</strong> zero custo de transferência! Negociação{' '}
                                  <strong>100% focada no salário mensal</strong>.
                                  {!modalDispute && humanClubsCount > 1 && (
                                    <>
                                      {' '}
                                      Oferecendo o valor <strong>irrecusável</strong> (
                                      {formatMonthlySalary(immediateSalary)}), fecha na hora sem disputa de 3h.
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-2.5 pt-1 border-t border-white/[0.06]">
                                  <div className="text-xs text-slate-400">
                                    {modalDispute
                                      ? `Cobrir lance (caixa livre: ${formatMillionsBRL(availableBudget)}):`
                                      : `Negociar valores (caixa livre: ${formatMillionsBRL(availableBudget)}):`}
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Proposta pelo Passe (R$)
                                    </label>
                                    <CurrencyReaisInput
                                      valueReais={Math.round(offerCash * 1_000_000)}
                                      onChangeReais={(nextReais) =>
                                        setOfferCash(nextReais / 1_000_000)
                                      }
                                      className="w-full px-3 py-2 rounded-md bg-[#11161E] border border-white/12 text-sm font-bold text-white tabular-nums focus:outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOfferCash((v) =>
                                          Math.max(0, Number((v - 0.5).toFixed(2)))
                                        )
                                      }
                                      className="py-1.5 rounded bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer tabular-nums"
                                    >
                                      - {formatCurrencyBRL(500_000)}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOfferCash((v) => Number((v + 0.5).toFixed(2)))
                                      }
                                      className="py-1.5 rounded bg-white/[0.06] hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer tabular-nums"
                                    >
                                      + {formatCurrencyBRL(500_000)}
                                    </button>
                                  </div>
                                  <div>
                                    <label className="block text-xs text-slate-400 mb-1">
                                      Troca (Opcional)
                                    </label>
                                    <select
                                      value={swapPlayerId}
                                      onChange={(e) => setSwapPlayerId(e.target.value)}
                                      className="w-full px-3 py-2 rounded-md bg-[#11161E] border border-white/12 text-xs text-white"
                                    >
                                      <option value="">Sem troca</option>
                                      {activeClub.squad.map((p) => (
                                        <option key={p.id} value={p.id}>
                                          {p.position} • {p.knownName} ({p.overall})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                disabled={
                                  (!isFreeAgent &&
                                    (offerCash > availableBudget || offerCash <= 0)) ||
                                  proposedSalary < 25
                                }
                                onClick={() => {
                                  onAttemptFifaBotNegotiation(
                                    activeClub.id,
                                    negotiatingEntry.player.id,
                                    isFreeAgent
                                      ? 'livre'
                                      : negotiatingEntry.originType === 'europa'
                                      ? 'europa'
                                      : 'bot',
                                    negotiatingEntry.sellerClub?.id,
                                    isFreeAgent ? 0 : offerCash,
                                    proposedSalary,
                                    isFreeAgent ? undefined : swapPlayerId || undefined
                                  );
                                }}
                                className="w-full py-3 rounded-md bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/45 disabled:opacity-40 text-amber-200 font-extrabold text-xs cursor-pointer tabular-nums transition"
                              >
                                {isFreeAgent
                                  ? modalDispute
                                    ? `Cobrir Lance Salarial (${formatMonthlySalary(
                                        proposedSalary
                                      )})`
                                    : proposedSalary >= immediateSalary && humanClubsCount > 1
                                    ? `Fechar Contrato na Hora (${formatMonthlySalary(
                                        proposedSalary
                                      )})`
                                    : `Enviar Proposta Salarial (${formatMonthlySalary(
                                        proposedSalary
                                      )})`
                                  : modalDispute
                                  ? `Registrar Lance (${formatMillionsBRL(
                                      offerCash
                                    )} • ${formatMonthlySalary(proposedSalary)})`
                                  : `Enviar Oferta (${formatMillionsBRL(
                                      offerCash
                                    )} • ${formatMonthlySalary(proposedSalary)})`}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

        return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
      })()}
    </div>
  );
};
