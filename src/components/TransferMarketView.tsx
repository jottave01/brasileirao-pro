import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock,
  Flame,
  Inbox,
  Lock,
  Search,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { Club, LeagueState, Player, PlayerPosition } from '../types/league';
import { calcMonthlySalary, formatMonthlySalary } from '../data/seedData';
import { ClubCrest, CountryFlag, PlayerAvatar, POSITION_STYLE, WorldClubCrest } from './ClubBadge';

interface MarketEntry {
  player: Player;
  originType: 'europa' | 'bot' | 'human' | 'livre';
  sellerClub?: Club;
}

interface TransferMarketViewProps {
  league: LeagueState;
  onBuyFreeAgent: (clubId: string, playerId: string) => void;
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
      description: `Temporada ${league.season} concluída. O mercado reabre assim que a Temporada ${league.season + 1} for iniciada na aba Jogos.`,
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
  onBuyFreeAgent,
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
    (sum, p) => sum + (p.monthlySalary ?? calcMonthlySalary(p.overall)),
    0
  );

  const incomingApprovals = league.negotiations.filter(
    (n) => n.toClubId === activeClub.id && n.status === 'aguardando_amigo'
  );

  // Monta lista unificada estilo FIFA: Europa + Bots Série A + Amigos + Livres
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
    const activeDispute = activeDisputes.find((d) => d.targetPlayerId === entry.player.id);
    const topBidCash = activeDispute
      ? Math.max(...activeDispute.bids.map((b) => b.offerCash), entry.player.marketValue)
      : entry.player.marketValue;
    const topBidSalary = activeDispute
      ? Math.max(...activeDispute.bids.map((b) => b.proposedMonthlySalary), baseSalary)
      : baseSalary;

    setOfferCash(
      activeDispute
        ? Number((topBidCash + 0.5).toFixed(1))
        : existingPatience?.lastCounter ?? entry.player.marketValue
    );
    setProposedSalary(activeDispute ? Math.round(topBidSalary * 1.05) : baseSalary);
    setSwapPlayerId('');
  };

  // Mantém entry sincronizado se o jogador foi comprado/removido
  const activePatienceKey = negotiatingEntry
    ? `${activeClub.id}:${negotiatingEntry.player.id}`
    : '';
  const patienceState = activePatienceKey
    ? league.botPatienceMap[activePatienceKey] ?? { patience: 3, locked: false }
    : { patience: 3, locked: false };

  if (!isMarketOpen) {
    const reopenInfo = getMarketReopenInfo(league);
    return (
      <div className="space-y-4 pb-6">
        <div className="broadcast-card rounded-2xl p-6 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400">
              Janela de Transferências Encerrada
            </div>
            <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wide">
              Mercado Fechado
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
              {reopenInfo.description}
            </p>
          </div>

          <div className="bg-[#06090E] border border-white/[0.08] rounded-xl p-4 text-left space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Próxima Reabertura
            </div>
            <div className="text-sm font-bold text-white leading-snug">
              {reopenInfo.title}
            </div>
            <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-white/[0.06] text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Prazo em rodadas</span>
                <span className="font-semibold text-emerald-400 text-right">
                  {reopenInfo.roundsText}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" /> Previsão
                </span>
                <span className="font-medium text-slate-200 text-right">
                  {reopenInfo.estimatedDateText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Cabeçalho Executivo Broadcast da Central de Transferências */}
      <div className="broadcast-card rounded-2xl overflow-hidden border-emerald-500/35 bg-gradient-to-br from-[#0F1E1A] via-[#0B111A] to-[#080C12] shadow-xl">
        <div className="p-4 space-y-3.5">
          {/* Linha superior: Identidade do Clube + Status da Janela */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <ClubCrest club={activeClub} size="md" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Mercado Aberto
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-semibold text-slate-300 tabular-nums">
                    <Clock className="w-3 h-3 text-amber-400" />
                    {league.transferWindowLabel} • {remainingText}
                  </span>
                  {activeDisputes.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/35 text-[10px] font-bold text-amber-300">
                      <Flame className="w-3 h-3" />
                      {activeDisputes.length} {activeDisputes.length === 1 ? 'disputa 3h' : 'disputas 3h'}
                    </span>
                  )}
                </div>

                <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wide mt-1 leading-none truncate">
                  Central de Transferências
                </h1>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {activeClub.name} • Técnico{' '}
                  <span className="text-slate-200 font-semibold">{activeClub.managerName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Linha de KPIs Financeiros (Caixa Livre vs Folha Mensal) */}
          <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-white/[0.07]">
            <div className="rounded-xl bg-[#070B11]/90 border border-white/[0.08] px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-emerald-400 shrink-0" />
                  Caixa Livre
                </div>
                <div className="font-display text-xl font-extrabold text-emerald-400 tabular-nums leading-tight mt-0.5">
                  €{availableBudget.toFixed(1)}M
                </div>
                {reservedCash > 0 ? (
                  <div className="text-[10px] text-amber-300 tabular-nums truncate">
                    €{reservedCash.toFixed(1)}M em disputa 3h
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    Total: €{activeClub.finances.budget.toFixed(1)}M
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[#070B11]/90 border border-white/[0.08] px-3 py-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Folha Mensal ({activeClub.squad.length} atl.)
                </div>
                <div className="font-display text-xl font-extrabold text-sky-300 tabular-nums leading-tight mt-0.5">
                  {formatMonthlySalary(monthlyPayroll)}
                </div>
                <div className="text-[10px] text-slate-500">
                  comprometidos/mês
                </div>
              </div>
            </div>
          </div>

          {league.status === 'janela_mercado' && isAdmin && (
            <button
              type="button"
              onClick={onCloseWindowToMatches}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 hover:brightness-105 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer transition"
            >
              Encerrar Janela &amp; Iniciar Partidas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Mercado */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0D121A] border border-white/[0.08]">
        <button
          type="button"
          onClick={() => setSubTab('buscar')}
          className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
            subTab === 'buscar' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          Buscar Jogadores (FIFA)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('propostas')}
          className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
            subTab === 'propostas' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Propostas &amp; Disputas
          {incomingApprovals.length + activeDisputes.length > 0 && (
            <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px]">
              {incomingApprovals.length + activeDisputes.length}
            </span>
          )}
        </button>
      </div>

      {/* Aba Busca Unificada FIFA */}
      {subTab === 'buscar' && (
        <div className="space-y-3">
          {/* Barra de Busca + Ordenação */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar jogador ou clube (ex: Mbappé, River Plate, Real Madrid...)"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#0D121A] border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'ovr_desc' | 'price_asc' | 'price_desc')}
              className="px-2.5 py-2.5 rounded-xl bg-[#0D121A] border border-white/10 text-xs text-white"
            >
              <option value="ovr_desc">OVR ↓</option>
              <option value="price_asc">Preço ↑</option>
              <option value="price_desc">Preço ↓</option>
            </select>
          </div>

          {/* Filtro Origem */}
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
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer ${
                  originFilter === o.id
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-[#0D121A] text-slate-300 border border-white/10'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>

          {/* Filtro 10 Posições (PE / PD separados) */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {(['TODOS', 'GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'CA'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPosFilter(pos)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 cursor-pointer ${
                  posFilter === pos
                    ? 'bg-white text-slate-950'
                    : 'bg-[#0D121A] text-slate-400 border border-white/10'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Lista de Jogadores */}
          <div className="space-y-2">
            {filteredEntries.map((entry) => {
              const { player, originType, sellerClub } = entry;
              const clubLabel = sellerClub?.name ?? player.currentClubName ?? 'Livre';
              const pat = league.botPatienceMap[`${activeClub.id}:${player.id}`];
              const activeDispute = activeDisputes.find((d) => d.targetPlayerId === player.id);
              const myDisputeBid = activeDispute?.bids.find((b) => b.clubId === activeClub.id);
              const topBidCash = activeDispute
                ? Math.max(...activeDispute.bids.map((b) => b.offerCash))
                : 0;
              const playerMonthlySalary =
                player.monthlySalary ?? calcMonthlySalary(player.overall);

              return (
                <div
                  key={`${originType}-${player.id}`}
                  className={`broadcast-card rounded-2xl p-3 flex items-center justify-between gap-2.5 transition ${
                    activeDispute
                      ? 'border-amber-500/45 bg-amber-500/[0.04]'
                      : 'hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <PlayerAvatar
                      player={player}
                      size="md"
                      kitPrimary={sellerClub ? (player.position === 'GOL' ? '#eab308' : sellerClub.primaryColor) : undefined}
                      kitSecondary={sellerClub ? (player.position === 'GOL' ? '#0f172a' : sellerClub.secondaryColor) : undefined}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 min-w-0">
                        <CountryFlag nationality={player.nationality} />
                        <span className="truncate">{player.knownName}</span>
                        <span className="text-[10px] font-normal text-slate-500 shrink-0">({player.age}a)</span>
                        {player.ambidextrous && (
                          <span className="px-1 rounded bg-sky-500/20 text-sky-300 text-[9px] font-bold shrink-0">
                            PE/PD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400 truncate">
                        <span className={`px-1.5 rounded font-bold ${POSITION_STYLE[player.position]}`}>
                          {player.position}
                        </span>
                        <span className="font-bold text-amber-300">OVR {player.overall}</span>
                        <span>•</span>
                        {sellerClub ? (
                          <span className="inline-flex items-center gap-1 truncate">
                            <ClubCrest club={sellerClub} size="xs" />
                            {sellerClub.shortName}
                            {originType === 'human' && (
                              <span className="text-amber-300">({sellerClub.managerName.split(' ')[0]})</span>
                            )}
                          </span>
                        ) : originType !== 'livre' ? (
                          <span className="inline-flex items-center gap-1 truncate text-sky-300 font-medium">
                            <WorldClubCrest clubName={player.currentClubName} size="xs" />
                            <span className="truncate">{clubLabel}</span>
                          </span>
                        ) : (
                          <span className="truncate text-slate-400">{clubLabel}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500 tabular-nums">
                        <span>Salário: {formatMonthlySalary(playerMonthlySalary)}</span>
                        {activeDispute && (
                          <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                            <Flame className="w-3 h-3" />
                            Disputa ({activeDispute.bids.length} clubes •{' '}
                            {formatRemainingWindow(activeDispute.expiresAt, nowMs)}) • Topo €
                            {topBidCash.toFixed(1)}M
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="font-display text-base font-extrabold text-emerald-400 tabular-nums leading-none">
                      €{player.marketValue.toFixed(1)}M
                    </div>
                    {pat?.locked && !activeDispute ? (
                      <span className="text-[10px] text-rose-400 font-semibold">Bloqueado</span>
                    ) : originType === 'livre' && !activeDispute && humanClubsCount <= 1 ? (
                      <button
                        type="button"
                        disabled={!isMarketOpen || availableBudget < player.marketValue}
                        onClick={() => onBuyFreeAgent(activeClub.id, player.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500 disabled:bg-white/5 disabled:text-slate-600 text-slate-950 font-bold text-[11px] cursor-pointer"
                      >
                        Contratar
                      </button>
                    ) : activeDispute ? (
                      <button
                        type="button"
                        disabled={!isMarketOpen}
                        onClick={() => openNegotiation(entry)}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-35 text-slate-950 font-extrabold text-[11px] cursor-pointer transition"
                      >
                        {myDisputeBid ? 'Ajustar Lance' : 'Cobrir Lance'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!isMarketOpen}
                        onClick={() => openNegotiation(entry)}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-emerald-500 hover:text-slate-950 disabled:opacity-35 text-white font-bold text-[11px] cursor-pointer transition"
                      >
                        Negociar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aba Propostas, Disputas 3h & Autorizações */}
      {subTab === 'propostas' && (
        <div className="space-y-4">
          {/* Disputas Ativas (3h) */}
          <div className="bg-[#0D121A] border border-amber-500/35 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Disputas Ativas no Mercado (Janela de 3h)
              </div>
              <span className="text-[10px] text-slate-400">Maior oferta ou projeto vence</span>
            </div>
            {activeDisputes.length === 0 ? (
              <div className="text-xs text-slate-500 py-3 text-center">
                Nenhuma disputa entre técnicos humanos acontecendo agora.
              </div>
            ) : (
              activeDisputes.map((dispute) => {
                const entry = allEntries.find((e) => e.player.id === dispute.targetPlayerId);
                const sortedBids = [...dispute.bids].sort((a, b) => b.offerCash - a.offerCash);
                return (
                  <div
                    key={dispute.id}
                    className="p-3 rounded-xl bg-[#06090E] border border-amber-500/25 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-white">{dispute.targetPlayerName}</div>
                        <div className="text-[10px] text-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Decisão em {formatRemainingWindow(dispute.expiresAt, nowMs)}
                        </div>
                      </div>
                      {entry && (
                        <button
                          type="button"
                          disabled={!isMarketOpen}
                          onClick={() => openNegotiation(entry)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                        >
                          Cobrir Lance
                        </button>
                      )}
                    </div>
                    <div className="space-y-1 pt-1 border-t border-white/[0.06]">
                      {sortedBids.map((bid) => {
                        const bidder = league.clubs.find((c) => c.id === bid.clubId);
                        const isMine = bid.clubId === activeClub.id;
                        return (
                          <div
                            key={bid.clubId}
                            className={`flex items-center justify-between text-[11px] px-2 py-1 rounded-lg ${
                              isMine ? 'bg-emerald-500/15 text-emerald-200 font-bold' : 'text-slate-300'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {bidder && <ClubCrest club={bidder} size="xs" />}
                              {bidder?.shortName ?? bid.clubId}
                              {isMine && ' (Você)'}
                            </span>
                            <span className="tabular-nums">
                              €{bid.offerCash.toFixed(1)}M • {formatMonthlySalary(bid.proposedMonthlySalary)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-[#0D121A] border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-bold text-amber-300">
              Propostas recebidas no {activeClub.name} (Exigem sua autorização)
            </div>
            {incomingApprovals.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                Nenhuma proposta de amigo aguardando sua autorização.
              </div>
            ) : (
              incomingApprovals.map((neg) => {
                const fromClub = league.clubs.find((c) => c.id === neg.fromClubId);
                return (
                  <div
                    key={neg.id}
                    className="p-3 rounded-xl bg-[#06090E] border border-amber-500/30 space-y-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {fromClub?.name} ({fromClub?.managerName}) quer {neg.targetPlayerName}
                      </div>
                      <div className="text-[11px] text-emerald-400 font-semibold">
                        Oferta: €{neg.offerCash.toFixed(1)}M
                        {neg.swapPlayerName ? ` + ${neg.swapPlayerName}` : ''}
                        {neg.proposedMonthlySalary
                          ? ` • Salário proposto: ${formatMonthlySalary(neg.proposedMonthlySalary)}`
                          : ''}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onRespondHumanOffer(neg.id, 'aceita')}
                        className="py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Autorizar Venda
                      </button>
                      <button
                        type="button"
                        onClick={() => onRespondHumanOffer(neg.id, 'recusada')}
                        className="py-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Recusar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl p-4 space-y-2">
            <div className="text-xs font-bold text-slate-300">Histórico de Negociações</div>
            {league.negotiations.length === 0 ? (
              <div className="text-xs text-slate-500 py-4 text-center">
                Nenhuma negociação registrada ainda.
              </div>
            ) : (
              league.negotiations.slice(0, 15).map((neg) => (
                <div
                  key={neg.id}
                  className="p-3 rounded-xl bg-[#06090E] border border-white/[0.05] text-xs space-y-1"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-bold text-white">{neg.targetPlayerName}</span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        neg.status === 'aceita'
                          ? 'text-emerald-400'
                          : neg.status === 'aguardando_amigo' || neg.status === 'em_disputa'
                          ? 'text-amber-300'
                          : neg.status === 'contraproposta'
                          ? 'text-sky-300'
                          : 'text-rose-400'
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
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      Oferta: €{neg.offerCash.toFixed(1)}M • Salário:{' '}
                      {formatMonthlySalary(neg.proposedMonthlySalary)}
                    </div>
                  )}
                  {neg.botReason && <div className="text-[11px] text-slate-400">{neg.botReason}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de Negociação FIFA (com Paciência, Salário Mensal e Disputa 3h) */}
      {negotiatingEntry && (() => {
        const modalDispute = activeDisputes.find(
          (d) => d.targetPlayerId === negotiatingEntry.player.id
        );
        const modalBaseSalary =
          negotiatingEntry.player.monthlySalary ??
          calcMonthlySalary(negotiatingEntry.player.overall);

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-[480px] max-h-[90vh] overflow-y-auto bg-[#0D121A] border-t sm:border border-emerald-500/35 rounded-t-3xl sm:rounded-2xl p-5 pb-7 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={negotiatingEntry.player} size="lg" />
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-200 text-[10px] font-bold mb-1">
                      {negotiatingEntry.sellerClub ? (
                        <ClubCrest club={negotiatingEntry.sellerClub} size="xs" />
                      ) : negotiatingEntry.originType !== 'livre' ? (
                        <WorldClubCrest clubName={negotiatingEntry.player.currentClubName} size="xs" />
                      ) : (
                        <Building2 className="w-3 h-3" />
                      )}
                      {negotiatingEntry.sellerClub?.name ?? negotiatingEntry.player.currentClubName}
                    </div>
                    <h2 className="font-display text-2xl font-extrabold text-white uppercase leading-none flex items-center gap-1.5">
                      <CountryFlag nationality={negotiatingEntry.player.nationality} />
                      <span>{negotiatingEntry.player.knownName}</span>
                    </h2>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {negotiatingEntry.player.position}
                      {negotiatingEntry.player.ambidextrous ? ' (Ambidestro PE/PD)' : ''} • OVR{' '}
                      <strong className="text-amber-300">{negotiatingEntry.player.overall}</strong> • Valor:{' '}
                      <strong className="text-emerald-400">
                        €{negotiatingEntry.player.marketValue.toFixed(1)}M
                      </strong>{' '}
                      • Salário:{' '}
                      <strong className="text-sky-300">{formatMonthlySalary(modalBaseSalary)}</strong>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNegotiatingEntry(null)}
                  className="p-2 rounded-xl bg-white/5 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalDispute && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/35 text-xs space-y-1">
                  <div className="font-bold text-amber-300 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5" /> Disputa Aberta (3h)
                    </span>
                    <span className="tabular-nums">
                      Restam {formatRemainingWindow(modalDispute.expiresAt, nowMs)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Maior oferta até agora:{' '}
                    <strong className="text-white">
                      €{Math.max(...modalDispute.bids.map((b) => b.offerCash)).toFixed(1)}M
                    </strong>{' '}
                    ({modalDispute.bids.length} clubes na briga).
                  </div>
                </div>
              )}

              {/* Campo de Salário Mensal Proposto */}
              <div className="bg-[#06090E] border border-white/[0.08] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-semibold">Salário Mensal Proposto</span>
                  <span className="text-sky-300 font-bold tabular-nums">
                    {formatMonthlySalary(proposedSalary)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProposedSalary((s) => Math.max(40, s - 25))}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    -€25k
                  </button>
                  <input
                    type="number"
                    min={40}
                    step={25}
                    value={proposedSalary}
                    onChange={(e) => setProposedSalary(Math.max(40, Number(e.target.value) || 40))}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#0D121A] border border-white/10 text-xs text-white text-center tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setProposedSalary((s) => s + 25)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 cursor-pointer"
                  >
                    +€25k
                  </button>
                </div>
                {humanClubsCount > 1 && negotiatingEntry.originType !== 'human' && (
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Em disputa entre amigos (3h), ofertas semelhantes (diferença ≤ 6%) fazem o atleta
                    escolher por salário mensal, posição na tabela e espaço no elenco.
                  </p>
                )}
              </div>

              {negotiatingEntry.originType === 'human' && negotiatingEntry.sellerClub ? (
                /* Negociação com Amigo Humano */
                <div className="space-y-3">
                  <div className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                    Clube de <strong>{negotiatingEntry.sellerClub.managerName}</strong>. A compra só é concluída após autorização dele!
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Oferta (€M)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={offerCash}
                        onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Incluir Troca</label>
                      <select
                        value={swapPlayerId}
                        onChange={(e) => setSwapPlayerId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
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
                    disabled={offerCash > availableBudget}
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
                    className="w-full py-3 rounded-xl bg-emerald-500 disabled:opacity-40 text-slate-950 font-extrabold text-xs cursor-pointer"
                  >
                    Enviar Pedido de Autorização
                  </button>
                </div>
              ) : (
                /* Negociação FIFA com Bot (Europa, Série A ou Jogador Livre) */
                <div className="space-y-3">
                  {negotiatingEntry.originType !== 'livre' && (
                    <div className="bg-[#06090E] border border-white/[0.07] rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-400">Paciência do Clube</span>
                        <span
                          className={`font-bold ${
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
                            className={`h-2 rounded-full ${
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
                        <div className="text-[11px] text-amber-200 pt-1">{patienceState.lastMessage}</div>
                      )}
                    </div>
                  )}

                  {activeClub.squad.some((p) => p.id === negotiatingEntry.player.id) ? (
                    <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-200 font-bold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      Contratação concluída! {negotiatingEntry.player.knownName} já está no elenco do {activeClub.shortName}.
                    </div>
                  ) : (!patienceState.locked || Boolean(modalDispute)) && (
                    <>
                      {negotiatingEntry.originType !== 'livre' && !modalDispute && (
                        <button
                          type="button"
                          disabled={availableBudget < negotiatingEntry.player.marketValue}
                          onClick={() => {
                            onAttemptFifaBotNegotiation(
                              activeClub.id,
                              negotiatingEntry.player.id,
                              negotiatingEntry.originType === 'europa' ? 'europa' : 'bot',
                              negotiatingEntry.sellerClub?.id,
                              negotiatingEntry.player.marketValue,
                              proposedSalary
                            );
                            setNegotiatingEntry(null);
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4" />
                          Pagar Valor Integral (€{negotiatingEntry.player.marketValue.toFixed(1)}M)
                        </button>
                      )}

                      <div className="pt-2 border-t border-white/[0.06] space-y-2">
                        <div className="text-[11px] text-slate-400">
                          {modalDispute
                            ? `Cobrir lance na disputa (caixa livre: €${availableBudget.toFixed(1)}M):`
                            : negotiatingEntry.originType === 'livre'
                            ? `Luvas + contrato (caixa livre: €${availableBudget.toFixed(1)}M):`
                            : `Ou tente negociar abaixo do valor (caixa livre: €${availableBudget.toFixed(1)}M):`}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">
                              {negotiatingEntry.originType === 'livre' ? 'Luvas / Bônus (€M)' : 'Sua Proposta (€M)'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={offerCash}
                              onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-1">Troca (Opcional)</label>
                            <select
                              value={swapPlayerId}
                              disabled={negotiatingEntry.originType === 'livre'}
                              onChange={(e) => setSwapPlayerId(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-[#06090E] border border-white/10 text-xs text-white disabled:opacity-40"
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
                          disabled={
                            offerCash > availableBudget ||
                            (negotiatingEntry.originType !== 'livre' && offerCash <= 0)
                          }
                          onClick={() => {
                            onAttemptFifaBotNegotiation(
                              activeClub.id,
                              negotiatingEntry.player.id,
                              negotiatingEntry.originType === 'livre'
                                ? 'livre'
                                : negotiatingEntry.originType === 'europa'
                                ? 'europa'
                                : 'bot',
                              negotiatingEntry.sellerClub?.id,
                              offerCash,
                              proposedSalary,
                              swapPlayerId || undefined
                            );
                            if (modalDispute || negotiatingEntry.originType === 'livre') {
                              setNegotiatingEntry(null);
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 disabled:opacity-40 text-amber-200 font-bold text-xs cursor-pointer"
                        >
                          {modalDispute
                            ? `Registrar Lance (€${offerCash.toFixed(1)}M • ${formatMonthlySalary(proposedSalary)})`
                            : `Enviar Oferta (€${offerCash.toFixed(1)}M • ${formatMonthlySalary(proposedSalary)})`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
