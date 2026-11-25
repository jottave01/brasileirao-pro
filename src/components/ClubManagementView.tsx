import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
  Wand2,
  X,
} from 'lucide-react';
import {
  Club,
  ClubTactics,
  Formation,
  LeagueState,
  Player,
  PlayerPosition,
  TacticalMentality,
} from '../types/league';
import {
  calcMonthlyPayrollMillions,
  calculateClubStrength,
  FORMATION_LAYOUT,
  getPositionFit,
  isClubInFinancialDebt,
  PAYROLL_INTERVAL_ROUNDS,
} from '../engine/botAI';
import { TacticalInstructionsPanel } from './TacticalInstructionsPanel';
import {
  calcAgentMinimumSalary,
  calcMonthlySalary,
  formatMillionsBRL,
  formatMonthlySalary,
} from '../data/seedData';
import {
  ClubCrest,
  ControllerTag,
  CountryFlag,
  OvrBadge,
  PlayerAvatar,
  POSITION_STYLE,
} from './ClubBadge';
import { PlayerSpotlightModal } from './PlayerSpotlightModal';

interface ClubManagementViewProps {
  league: LeagueState;
  onUpdateTactics: (
    clubId: string,
    formation: Formation,
    mentality: TacticalMentality,
    tactics?: ClubTactics
  ) => void;
  onAssignSlotPlayer: (clubId: string, slotIndex: number, playerId: string) => void;
  onAutoPickLineup: (clubId: string) => void;
  onToggleListForSale: (clubId: string, playerId: string) => void;
  onRenewPlayerContract: (clubId: string, playerId: string) => void;
  onReallocateBudget: (clubId: string, direction: 'to_wage' | 'to_transfer', amountMillions: number) => void;
  onSetRevenueSplit: (clubId: string, transferPct: number) => void;
  onConfirmSquadAndStartMatches: () => void;
}

const POS_ORDER: Record<PlayerPosition, number> = {
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

function getClubRank(clubs: Club[], targetId: string): number {
  const sorted = [...clubs].sort((a, b) => {
    if (b.standing.points !== a.standing.points) return b.standing.points - a.standing.points;
    if (b.standing.wins !== a.standing.wins) return b.standing.wins - a.standing.wins;
    const sgA = a.standing.goalsFor - a.standing.goalsAgainst;
    const sgB = b.standing.goalsFor - b.standing.goalsAgainst;
    if (sgB !== sgA) return sgB - sgA;
    return b.standing.goalsFor - a.standing.goalsFor;
  });
  return Math.max(1, sorted.findIndex((c) => c.id === targetId) + 1);
}

export const ClubManagementView: React.FC<ClubManagementViewProps> = ({
  league,
  onUpdateTactics,
  onAssignSlotPlayer,
  onAutoPickLineup,
  onToggleListForSale,
  onRenewPlayerContract,
  onReallocateBudget,
  onSetRevenueSplit,
  onConfirmSquadAndStartMatches,
}) => {
  const [subTab, setSubTab] = useState<'campinho' | 'elenco' | 'financas'>('campinho');
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [selectedBenchId, setSelectedBenchId] = useState<string | null>(null);
  const [transferAmountM, setTransferAmountM] = useState<number>(5);

  // Filtros da aba Elenco
  const [squadQuery, setSquadQuery] = useState('');
  const [squadPosFilter, setSquadPosFilter] = useState<PlayerPosition | 'TODOS'>('TODOS');
  const [squadRoleFilter, setSquadRoleFilter] = useState<'todos' | 'titulares' | 'reservas'>('todos');
  const [spotlightPlayer, setSpotlightPlayer] = useState<Player | null>(null);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const club =
    league.clubs.find((c) => c.id === (currentUser?.clubId || league.activeHumanClubId)) ??
    league.clubs[0];

  const isOwned =
    club.controller === 'human' &&
    (!currentUser?.clubId || club.id === currentUser.clubId || club.id === league.activeHumanClubId);

  const strength = calculateClubStrength(club);
  const clubRank = getClubRank(league.clubs, club.id);
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

  const totalMonthlyPayroll = club.squad.reduce(
    (sum, p) => sum + (p.monthlySalary ?? calcMonthlySalary(p.overall, club.tier)),
    0
  );
  const wageBillMillions = calcMonthlyPayrollMillions(club);
  const wageBudget = club.finances.wageBudget ?? Math.round(wageBillMillions * 5 * 100) / 100;
  const inDebt = isClubInFinancialDebt(club);
  const monthsCovered = wageBillMillions > 0 ? Math.max(0, wageBudget / wageBillMillions) : 0;
  const revenueTransferPct = club.finances.revenueTransferPct ?? 45;
  const baseNextPayroll =
    (Math.floor((Math.max(1, league.currentRound) - 1) / PAYROLL_INTERVAL_ROUNDS) + 1) *
    PAYROLL_INTERVAL_ROUNDS;
  const paidCurPayroll = (club.finances.lastPayrollRound ?? 0) >= baseNextPayroll;
  const nextPayrollRound = paidCurPayroll
    ? baseNextPayroll + PAYROLL_INTERVAL_ROUNDS
    : baseNextPayroll;
  const boxOfficeIncome = club.finances.boxOfficeIncome ?? 0;
  const quotaIncome = Math.max(0, Math.round((club.finances.matchIncome - boxOfficeIncome) * 100) / 100);
  const totalWagesPaid = club.finances.totalWagesPaid ?? 0;
  const financeLedger = club.finances.financeLedger ?? [];

  // Próximo compromisso & desempenho recente
  const nextMatch =
    league.matches.find(
      (m) =>
        m.round >= league.currentRound &&
        m.status !== 'finalizada' &&
        (m.homeClubId === club.id || m.awayClubId === club.id)
    ) ??
    league.matches.find(
      (m) =>
        m.round === league.currentRound &&
        (m.homeClubId === club.id || m.awayClubId === club.id)
    );
  const nextOpponent = nextMatch
    ? league.clubs.find(
        (c) => c.id === (nextMatch.homeClubId === club.id ? nextMatch.awayClubId : nextMatch.homeClubId)
      )
    : undefined;
  const nextIsHome = nextMatch?.homeClubId === club.id;

  const recentForm = league.matches
    .filter(
      (m) =>
        m.status === 'finalizada' &&
        (m.homeClubId === club.id || m.awayClubId === club.id)
    )
    .sort((a, b) => a.round - b.round)
    .slice(-5)
    .map((m) => {
      const isHome = m.homeClubId === club.id;
      const gf = isHome ? m.homeGoals : m.awayGoals;
      const ga = isHome ? m.awayGoals : m.homeGoals;
      return {
        id: m.id,
        result: (gf > ga ? 'V' : gf === ga ? 'E' : 'D') as 'V' | 'E' | 'D',
      };
    });

  const sortedSquad = [...club.squad].sort((a, b) => {
    if (Boolean(a.isStarter) !== Boolean(b.isStarter)) return a.isStarter ? -1 : 1;
    return POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall;
  });

  const qLower = squadQuery.trim().toLowerCase();
  const filteredSquad = sortedSquad.filter((p) => {
    if (squadRoleFilter === 'titulares' && !p.isStarter) return false;
    if (squadRoleFilter === 'reservas' && p.isStarter) return false;
    if (squadPosFilter !== 'TODOS' && p.position !== squadPosFilter) return false;
    if (
      qLower &&
      !p.knownName.toLowerCase().includes(qLower) &&
      !p.name.toLowerCase().includes(qLower)
    ) {
      return false;
    }
    return true;
  });

  const starterGroup = filteredSquad.filter((p) => p.isStarter);
  const benchGroup = filteredSquad.filter((p) => !p.isStarter);

  const benchPlayers = [...club.squad]
    .filter((p) => !p.isStarter)
    .sort((a, b) => {
      if (selectedSlotSpec) {
        const fitA = getPositionFit(a, selectedSlotSpec.role);
        const fitB = getPositionFit(b, selectedSlotSpec.role);
        if (fitB.effectiveOvr !== fitA.effectiveOvr) return fitB.effectiveOvr - fitA.effectiveOvr;
      }
      return POS_ORDER[a.position] - POS_ORDER[b.position] || b.overall - a.overall;
    });

  const outOfPosCount = slots.filter((s) => {
    const p = club.squad.find((pl) => pl.id === s.playerId);
    return p && getPositionFit(p, s.role).penalty < 0;
  }).length;
  const suspendedStartersCount = slots.filter((s) => {
    const p = club.squad.find((pl) => pl.id === s.playerId);
    return p && (p.suspendedMatches ?? 0) > 0;
  }).length;

  const totalIncome =
    club.finances.matchIncome + club.finances.prizeIncome + club.finances.transferIncome;
  const totalOutflow = club.finances.transferSpent + totalWagesPaid;
  const cashFlowScale = Math.max(1, totalIncome + totalOutflow);

  const renderSquadRow = (p: Player) => {
    const curSalary = p.monthlySalary ?? calcMonthlySalary(p.overall, club.tier);
    const contractYears = p.contractYears ?? 2;
    const renewalSalary = calcAgentMinimumSalary(p, club);

    return (
      <div
        key={p.id}
        className="bg-[#090C10] hover:bg-[#141B25] border border-white/[0.07] rounded-md p-3 transition flex flex-col md:flex-row md:items-center justify-between gap-2.5 md:gap-3 overflow-hidden"
      >
        {/* Linha Superior: Identidade clicável + OVR Mobile */}
        <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setSpotlightPlayer(p)}
            className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer group"
          >
            <PlayerAvatar
              player={p}
              size="md"
              shape="card"
              kitPrimary={p.position === 'GOL' ? '#eab308' : club.primaryColor}
              kitSecondary={p.position === 'GOL' ? '#0f172a' : club.secondaryColor}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CountryFlag nationality={p.nationality} />
                <span className="text-sm font-bold text-white group-hover:text-emerald-300 transition truncate">
                  {p.knownName}
                </span>
                <span className="text-xs text-slate-500 shrink-0">({p.age}a)</span>
                {(p.suspendedMatches ?? 0) > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/45 text-[10px] font-extrabold text-rose-300 uppercase shrink-0">
                    SUSP
                  </span>
                )}
                {(p.suspendedMatches ?? 0) === 0 && (p.yellowCards ?? 0) % 3 === 2 && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] font-bold text-amber-300 uppercase shrink-0">
                    2 CA
                  </span>
                )}
                {p.listedForSale && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-[10px] font-bold text-amber-300 uppercase shrink-0">
                    À Venda
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${POSITION_STYLE[p.position]}`}>
                  {p.position}
                </span>
                {p.ambidextrous && (p.position === 'PE' || p.position === 'PD') && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 text-[10px] font-bold">
                    PE/PD
                  </span>
                )}
                {p.secondaryPositions.length > 0 && (
                  <span className="text-[11px]">Sec: {p.secondaryPositions.join('/')}</span>
                )}
                <span className="text-[11px] tabular-nums">
                  {p.goals}G / {p.assists}A
                </span>
                <span className="text-[11px] tabular-nums text-slate-300">
                  Vigor {Math.round(p.stamina)}%
                </span>
              </div>
            </div>
          </button>

          <div className="md:hidden shrink-0">
            <OvrBadge ovr={p.overall} size="sm" />
          </div>
        </div>

        {/* Rodapé / Direita: Dados Contratuais + OVR Desktop + Ações */}
        <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.06] shrink-0">
          <div className="text-left md:text-right min-w-0">
            <div className="text-xs font-bold text-emerald-300 tabular-nums">
              {formatMonthlySalary(curSalary)}
            </div>
            <div className="flex flex-wrap items-center md:justify-end gap-x-2 gap-y-1 mt-1 text-[11px]">
              <span className="text-slate-400 tabular-nums">{formatMillionsBRL(p.marketValue)}</span>
              <span
                className={`px-1.5 py-0.5 rounded font-semibold text-[10px] ${
                  contractYears <= 1
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-white/[0.05] text-slate-300'
                }`}
              >
                {contractYears <= 1 ? '1 ano (Último!)' : `${contractYears} anos`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden md:block">
              <OvrBadge ovr={p.overall} size="md" />
            </div>

            <button
              type="button"
              onClick={() => setSpotlightPlayer(p)}
              className="p-2 rounded-md bg-[#11161E] hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer transition"
              title="Ver Ficha Completa"
              aria-label={`Ver ficha de ${p.knownName}`}
            >
              <Eye className="w-4 h-4" />
            </button>

            {isOwned && (
              <button
                type="button"
                onClick={() => onToggleListForSale(club.id, p.id)}
                className={`p-2 rounded-md border cursor-pointer transition ${
                  p.listedForSale
                    ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                    : 'bg-[#11161E] hover:bg-white/10 border-white/10 text-slate-400'
                }`}
                title="Colocar/Remover da lista de vendas"
                aria-label={`Listar ${p.knownName} para venda`}
              >
                <Tag className="w-4 h-4" />
              </button>
            )}

            {isOwned && contractYears <= 1 && (
              <button
                type="button"
                disabled={inDebt}
                onClick={() => onRenewPlayerContract(club.id, p.id)}
                className="px-2.5 py-2 rounded-md bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition tabular-nums shrink-0"
                title={
                  inDebt
                    ? 'Quite o déficit salarial na aba Finanças antes de renovar contratos'
                    : `Renovar por +3 anos (${formatMonthlySalary(renewalSalary)})`
                }
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Renovar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* HEADER DE COMANDO DO CLUBE */}
      <section
        className="console-panel-elevated p-4 sm:p-6 space-y-4"
        style={{
          borderTopWidth: '3px',
          borderTopColor: club.primaryColor,
          backgroundImage: `radial-gradient(ellipse 65% 85% at 10% 0%, ${club.primaryColor}26, transparent 62%)`,
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Esquerda: Escudo + Identidade */}
          <div className="flex items-center gap-4 min-w-0">
            <ClubCrest club={club} size="xl" />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wide leading-none truncate">
                  {club.name}
                </h1>
                <ControllerTag club={club} compact />
              </div>
              <div className="text-xs text-slate-300 truncate">
                Técnico <strong className="text-white">{club.managerName}</strong> • {club.stadium}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                <span className="px-2 py-0.5 rounded bg-[#090C10] border border-white/10 text-slate-200 font-bold tabular-nums">
                  {clubRank}º na Série A ({club.standing.points} pts)
                </span>
                {recentForm.length > 0 && (
                  <span className="inline-flex items-center gap-1">
                    {recentForm.map((rf) => (
                      <span
                        key={rf.id}
                        className={`w-5 h-5 rounded text-[10px] font-extrabold flex items-center justify-center ${
                          rf.result === 'V'
                            ? 'bg-emerald-500 text-slate-950'
                            : rf.result === 'E'
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        {rf.result}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Direita: KPIs de Comando */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-[#090C10]/90 border border-white/[0.08] rounded-md px-3.5 py-2.5 flex items-center gap-2.5">
              <OvrBadge ovr={strength.overall} size="md" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Elenco</div>
                <div className="text-xs font-bold text-white tabular-nums whitespace-nowrap">
                  A{strength.attack} M{strength.midfield} D{strength.defense}
                </div>
              </div>
            </div>

            <div className="bg-[#090C10]/90 border border-white/[0.08] rounded-md px-3.5 py-2.5 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Caixa Transferências
              </div>
              <div className="font-display text-base sm:text-lg font-extrabold text-emerald-400 tabular-nums leading-tight whitespace-nowrap mt-0.5">
                {formatMillionsBRL(club.finances.budget)}
              </div>
            </div>

            <div
              className={`bg-[#090C10]/90 border rounded-md px-3.5 py-2.5 min-w-0 ${
                inDebt ? 'border-rose-500/50 bg-rose-500/10' : 'border-white/[0.08]'
              }`}
            >
              <div className="flex items-center justify-between gap-1 text-[10px] uppercase tracking-wider text-slate-400">
                <span>Fundo Salarial</span>
                <span
                  className={`font-bold ${inDebt ? 'text-rose-400' : 'text-sky-300'}`}
                >
                  {inDebt ? 'DÉFICIT' : `${monthsCovered.toFixed(1)}m`}
                </span>
              </div>
              <div
                className={`font-display text-base sm:text-lg font-extrabold tabular-nums leading-tight whitespace-nowrap mt-0.5 ${
                  inDebt ? 'text-rose-400' : 'text-amber-300'
                }`}
              >
                {wageBudget < 0
                  ? `-${formatMillionsBRL(Math.abs(wageBudget))}`
                  : formatMillionsBRL(wageBudget)}
              </div>
            </div>

            <div className="bg-[#090C10]/90 border border-white/[0.08] rounded-md px-3.5 py-2.5 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" /> Próx. Jogo
              </div>
              <div className="font-display text-base sm:text-lg font-extrabold text-white leading-tight whitespace-nowrap mt-0.5 truncate">
                {nextOpponent
                  ? `${nextIsHome ? 'vs' : '@'} ${nextOpponent.shortName} (R${nextMatch?.round})`
                  : 'Temporada Encerrada'}
              </div>
            </div>
          </div>
        </div>

        {league.status === 'janela_mercado' && (
          <button
            type="button"
            onClick={onConfirmSquadAndStartMatches}
            className="w-full sm:w-auto px-5 py-2.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            Ir para Campeonato (Manter Escalação)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </section>

      {/* SUB-NAVEGAÇÃO CONSOLE */}
      <div className="flex items-center border-b border-white/[0.08] gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'campinho', label: 'Tática & Campo' },
          { id: 'elenco', label: `Elenco (${club.squad.length})` },
          { id: 'financas', label: 'Finanças' },
        ].map((t) => {
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as 'campinho' | 'elenco' | 'financas')}
              className={`relative px-4 py-3 text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer transition ${
                active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="font-display text-base uppercase tracking-wider">{t.label}</span>
              {active && <span className="absolute bottom-0 inset-x-2 h-[2.5px] bg-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* ABA 1: PRANCHETA TÁTICA & CAMPO                                   */}
      {/* ================================================================= */}
      {subTab === 'campinho' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Esquerda (7 cols): Campo Tático Ampliado */}
          <div className="lg:col-span-7 console-panel p-3.5 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-display text-base font-extrabold uppercase tracking-wider text-white flex items-center gap-2 whitespace-nowrap">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Escalação • <span className="whitespace-nowrap">{club.formation}</span></span>
              </span>
              {outOfPosCount > 0 ? (
                <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-amber-300 font-bold text-[11px]">
                  {outOfPosCount} fora de posição
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 font-bold text-[11px]">
                  100% nas posições reais
                </span>
              )}
            </div>

            {/* Campinho Vertical com Gramado Listrado */}
            {suspendedStartersCount > 0 && (
              <div className="px-3 py-2 rounded-md bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {suspendedStartersCount} titular(es) suspenso(s) na escalação! Troque antes da partida ou clique em Auto.
                </span>
              </div>
            )}
            <div className="relative w-full h-[450px] sm:h-[520px] lg:h-[560px] rounded-md pitch-surface border border-emerald-400/30 overflow-hidden select-none shadow-inner">
              <div className="absolute inset-3 border border-white/22 rounded-sm pointer-events-none">
                <div className="absolute top-1/2 inset-x-0 border-t border-white/22" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/22" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/50" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 sm:w-52 h-16 border border-b-0 border-white/22" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-7 border border-b-0 border-white/20" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 sm:w-52 h-16 border border-t-0 border-white/22" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 border border-t-0 border-white/20" />
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
                      className={`relative rounded-full p-0.5 transition ${
                        isSelected
                          ? 'ring-2 ring-amber-400 scale-110'
                          : fit?.fit === 'critico'
                          ? 'ring-2 ring-rose-500'
                          : fit?.fit === 'improvisado'
                          ? 'ring-2 ring-amber-400/80'
                          : fit?.fit === 'secundaria'
                          ? 'ring-1 ring-sky-400/75'
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
                      <span className="absolute -top-1 -left-2 px-1 rounded bg-[#090C10] border border-white/25 text-[9px] font-bold text-slate-200">
                        {spec.label}
                      </span>
                      {player && (player.suspendedMatches ?? 0) > 0 && (
                        <span className="absolute -top-1 -right-2 px-1 rounded bg-rose-600 text-white text-[8px] font-extrabold border border-rose-200">
                          SUSP
                        </span>
                      )}
                      {player && fit && (
                        <span
                          className={`absolute -bottom-1 -right-2 px-1.5 rounded text-[10px] font-extrabold border tabular-nums ${
                            fit.penalty === 0
                              ? 'bg-[#090C10] text-emerald-300 border-emerald-400/70'
                              : fit.penalty === -2
                              ? 'bg-sky-500 text-slate-950 border-sky-200'
                              : fit.penalty <= -12
                              ? 'bg-rose-500 text-white border-rose-200'
                              : 'bg-amber-400 text-slate-950 border-amber-200'
                          }`}
                        >
                          {fit.effectiveOvr}
                        </span>
                      )}
                    </div>
                    <div className="px-1.5 py-0.5 rounded bg-[#090C10]/85 border border-white/10 max-w-[64px] sm:max-w-[84px] flex flex-col items-center">
                      <span className="text-[9px] sm:text-[10px] font-semibold text-white whitespace-nowrap max-w-[58px] sm:max-w-[78px] truncate leading-none">
                        {player ? player.knownName : spec.role}
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
          </div>

          {/* Direita (5 cols): Controles Táticos + Banco de Reservas */}
          <div className="lg:col-span-5 space-y-4">
            {/* Estilo de Jogo, Formação, Postura e Auto-Pick */}
            <div className="console-panel p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-extrabold uppercase tracking-wider text-white">
                  Tática da Equipe
                </span>
                {isOwned && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotIdx(null);
                      setSelectedBenchId(null);
                      onAutoPickLineup(club.id);
                    }}
                    className="px-3 py-1.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" /> Auto Escalar
                  </button>
                )}
              </div>

              <TacticalInstructionsPanel
                club={club}
                disabled={!isOwned}
                onChangeTactics={(nextFormation, nextMentality, nextTactics) => {
                  if (nextFormation !== club.formation) {
                    setSelectedSlotIdx(null);
                    setSelectedBenchId(null);
                  }
                  onUpdateTactics(club.id, nextFormation, nextMentality, nextTactics);
                }}
              />

              {isOwned && (
                <div
                  className={`rounded-md px-3 py-2.5 border text-xs flex items-center justify-between gap-2 ${
                    selectedSlotPlayer || selectedBenchPlayer
                      ? 'bg-amber-400/10 border-amber-400/40 text-amber-100'
                      : 'bg-[#090C10] border-white/[0.06] text-slate-400'
                  }`}
                >
                  <span className="leading-snug">
                    {selectedSlotPlayer && selectedSlotSpec ? (
                      <>
                        Selecionado:{' '}
                        <strong className="text-white">{selectedSlotPlayer.knownName}</strong> (
                        {selectedSlotSpec.label}) — toque noutro titular p/ inverter ou num reserva p/ substituir.
                      </>
                    ) : selectedBenchPlayer ? (
                      <>
                        Reserva:{' '}
                        <strong className="text-white">{selectedBenchPlayer.knownName}</strong> — toque no titular que dará lugar a ele.
                      </>
                    ) : (
                      'Toque em 2 titulares no campo para inverter, ou em um reserva abaixo para substituir.'
                    )}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {(selectedSlotPlayer || selectedBenchPlayer) && (
                      <button
                        type="button"
                        onClick={() =>
                          setSpotlightPlayer(selectedSlotPlayer ?? selectedBenchPlayer ?? null)
                        }
                        className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold cursor-pointer"
                      >
                        Ficha
                      </button>
                    )}
                    {(selectedSlotIdx !== null || selectedBenchId !== null) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSlotIdx(null);
                          setSelectedBenchId(null);
                        }}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                        aria-label="Cancelar seleção"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Banco de Reservas */}
            {isOwned && (
              <div className="console-panel p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-extrabold uppercase tracking-wider text-emerald-400">
                    Banco de Reservas ({benchPlayers.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedSlotSpec
                      ? `OVR na vaga ${selectedSlotSpec.label}`
                      : 'Toque p/ escalar'}
                  </span>
                </div>

                {benchPlayers.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-4">
                    Nenhum reserva disponível no banco.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
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
                          className={`w-full text-left p-2.5 rounded-md border flex items-center justify-between gap-2.5 transition cursor-pointer ${
                            isBenchSelected
                              ? 'bg-emerald-500/15 border-emerald-400'
                              : 'bg-[#090C10] border-white/[0.06] hover:border-emerald-400/50'
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
                                {(p.suspendedMatches ?? 0) > 0 && (
                                  <span className="px-1 rounded bg-rose-600 text-white text-[9px] font-extrabold shrink-0">
                                    SUSP
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span
                                  className={`px-1.5 rounded text-[10px] font-bold ${
                                    POSITION_STYLE[p.position]
                                  }`}
                                >
                                  {p.position}
                                </span>
                                {p.ambidextrous && (p.position === 'PE' || p.position === 'PD') && (
                                  <span className="px-1 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                                    PE/PD
                                  </span>
                                )}
                                {p.secondaryPositions.length > 0 && (
                                  <span>Sec: {p.secondaryPositions.join('/')}</span>
                                )}
                                <span className="tabular-nums">• {Math.round(p.stamina)}%</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`font-display text-lg font-extrabold tabular-nums leading-none ${ovrColor}`}>
                              OVR {ovrValue}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
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
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 2: ELENCO HÍBRIDO DE CONSOLE + FICHA DO ATLETA                */}
      {/* ================================================================= */}
      {subTab === 'elenco' && (
        <div className="space-y-4">
          {/* Barra de Filtros do Elenco */}
          <div className="console-panel p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={squadQuery}
                  onChange={(e) => setSquadQuery(e.target.value)}
                  placeholder="Filtrar atleta por nome..."
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-[#090C10] border border-white/12 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'titulares', label: 'Titulares' },
                    { id: 'reservas', label: 'Reservas' },
                  ] as const
                ).map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setSquadRoleFilter(rf.id)}
                    className={`px-3 py-2 rounded-md text-xs font-bold cursor-pointer transition ${
                      squadRoleFilter === rf.id
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-[#090C10] text-slate-300 border border-white/10 hover:border-white/25'
                    }`}
                  >
                    {rf.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {(['TODOS', 'GOL', 'LD', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PE', 'PD', 'CA'] as const).map(
                (pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setSquadPosFilter(pos)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold shrink-0 cursor-pointer transition ${
                      squadPosFilter === pos
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

          {/* Lista Estruturada: Titulares & Reservas */}
          {filteredSquad.length === 0 ? (
            <div className="console-panel p-8 text-center text-xs text-slate-400">
              Nenhum jogador encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-5">
              {starterGroup.length > 0 && (
                <section className="console-panel p-4 space-y-2.5">
                  <div className="console-section-title text-sm text-emerald-400">
                    Titulares ({starterGroup.length})
                  </div>
                  <div className="space-y-2">{starterGroup.map(renderSquadRow)}</div>
                </section>
              )}

              {benchGroup.length > 0 && (
                <section className="console-panel p-4 space-y-2.5">
                  <div className="console-section-title text-sm text-slate-300">
                    Reservas &amp; Disponíveis ({benchGroup.length})
                  </div>
                  <div className="space-y-2">{benchGroup.map(renderSquadRow)}</div>
                </section>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA 3: FINANÇAS DO CLUBE (CAIXA × FUNDO SALARIAL & BILHETERIA)    */}
      {/* ================================================================= */}
      {subTab === 'financas' && (
        <div className="space-y-5">
          {inDebt && (
            <div className="p-4 rounded-md bg-rose-500/15 border border-rose-500/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-rose-100">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white uppercase tracking-wide">
                    Fundo Salarial em Déficit ({formatMillionsBRL(Math.abs(wageBudget))})
                  </strong>
                  <p className="text-rose-200/90 mt-0.5 leading-relaxed">
                    Novas contratações e renovações estão bloqueadas até quitar o atraso salarial com verba do Caixa de Transferências, bilheteria ou vendas.
                  </p>
                </div>
              </div>
              {isOwned && club.finances.budget > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    onReallocateBudget(
                      club.id,
                      'to_wage',
                      Math.min(club.finances.budget, Math.abs(wageBudget))
                    )
                  }
                  className="px-4 py-2.5 rounded-md bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs uppercase tracking-wider shrink-0 cursor-pointer transition"
                >
                  Quitar com Caixa ({formatMillionsBRL(Math.min(club.finances.budget, Math.abs(wageBudget)))})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda (5 cols): Dois Fundos + Gestão de Distribuição */}
            <div className="lg:col-span-5 space-y-4">
              {/* Dois Fundos Separados */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
                <div className="console-panel-elevated p-4 sm:p-5 space-y-2.5 border-l-[3px] border-l-emerald-400">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                      Caixa de Transferências
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] font-semibold text-slate-300">
                      Porte {club.tier}
                    </span>
                  </div>
                  <div className="font-display text-3xl sm:text-4xl font-extrabold text-emerald-400 tabular-nums leading-none">
                    {formatMillionsBRL(club.finances.budget)}
                  </div>
                  <div className="text-xs text-slate-400">
                    Orçamento inicial: {formatMillionsBRL(club.finances.initialBudget)}
                  </div>
                </div>

                <div
                  className={`console-panel-elevated p-4 sm:p-5 space-y-2.5 border-l-[3px] ${
                    inDebt ? 'border-l-rose-500' : 'border-l-sky-400'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Fundo da Folha Salarial
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold tabular-nums ${
                        inDebt
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : monthsCovered >= 2
                          ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                          : 'bg-amber-400/15 text-amber-300 border border-amber-400/35'
                      }`}
                    >
                      {inDebt ? 'Em Dívida' : `${monthsCovered.toFixed(1)} meses cobertos`}
                    </span>
                  </div>
                  <div
                    className={`font-display text-3xl sm:text-4xl font-extrabold tabular-nums leading-none ${
                      inDebt ? 'text-rose-400' : 'text-sky-300'
                    }`}
                  >
                    {wageBudget < 0
                      ? `-${formatMillionsBRL(Math.abs(wageBudget))}`
                      : formatMillionsBRL(wageBudget)}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-white/[0.06]">
                    <span>Folha: {formatMonthlySalary(totalMonthlyPayroll)}</span>
                    <span className="text-amber-300 font-semibold tabular-nums">
                      {nextPayrollRound <= league.totalRounds
                        ? `Próx. folha: Rodada ${nextPayrollRound}`
                        : 'Temporada quitada'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Controles de Remanejamento e Divisão de Receitas */}
              {isOwned && (
                <div className="console-panel p-4 sm:p-5 space-y-4">
                  <div className="console-section-title text-sm text-white">
                    <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
                    Administrar Orçamento
                  </div>

                  {/* Mover Verba Entre Fundos */}
                  <div className="space-y-2.5 bg-[#090C10] border border-white/[0.07] rounded-md p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
                        Transferir Entre Fundos
                      </span>
                      <span className="font-bold text-amber-300 tabular-nums">
                        R$ {transferAmountM}M
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {[5, 10, 25].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTransferAmountM(preset)}
                          className={`px-2.5 py-1.5 rounded text-xs font-bold border cursor-pointer transition tabular-nums ${
                            transferAmountM === preset
                              ? 'bg-amber-400 text-slate-950 border-amber-300'
                              : 'bg-[#11161E] border-white/10 text-slate-300 hover:border-white/25'
                          }`}
                        >
                          R$ {preset}M
                        </button>
                      ))}
                      <input
                        type="number"
                        min={1}
                        max={200}
                        value={transferAmountM}
                        onChange={(e) =>
                          setTransferAmountM(Math.max(1, Math.min(200, Number(e.target.value) || 1)))
                        }
                        aria-label="Valor em milhões para transferir"
                        className="w-20 ml-auto px-2.5 py-1.5 rounded bg-[#11161E] border border-white/12 text-xs font-bold text-white text-center tabular-nums"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={club.finances.budget <= 0}
                        onClick={() => onReallocateBudget(club.id, 'to_wage', transferAmountM)}
                        className="py-2 px-2.5 rounded-md bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-35 border border-sky-500/35 text-sky-200 text-[11px] font-bold cursor-pointer transition"
                      >
                        Caixa → Salários
                      </button>
                      <button
                        type="button"
                        disabled={wageBudget <= 0}
                        onClick={() => onReallocateBudget(club.id, 'to_transfer', transferAmountM)}
                        className="py-2 px-2.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-35 border border-emerald-500/35 text-emerald-200 text-[11px] font-bold cursor-pointer transition"
                      >
                        Salários → Caixa
                      </button>
                    </div>
                  </div>

                  {/* Divisão Automática das Novas Receitas */}
                  <div className="space-y-2.5 bg-[#090C10] border border-white/[0.07] rounded-md p-3.5">
                    <div className="text-xs font-semibold text-slate-200">
                      Destino das Novas Receitas (Bilheteria, Cotas &amp; Vendas)
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold tabular-nums">
                      <span className="text-emerald-400">
                        {revenueTransferPct}% p/ Transferências
                      </span>
                      <span className="text-sky-300">
                        {100 - revenueTransferPct}% p/ Folha Salarial
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={revenueTransferPct}
                      onChange={(e) => onSetRevenueSplit(club.id, Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                    <div className="h-2 rounded bg-[#11161E] overflow-hidden flex">
                      <div
                        className="bg-emerald-500 transition-all"
                        style={{ width: `${revenueTransferPct}%` }}
                      />
                      <div
                        className="bg-sky-500 transition-all"
                        style={{ width: `${100 - revenueTransferPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo de Fluxo */}
              <div className="console-panel p-4 space-y-2">
                <div className="flex justify-between text-xs tabular-nums">
                  <span className="text-emerald-300 font-semibold">
                    Entradas: +{formatMillionsBRL(totalIncome)}
                  </span>
                  <span className="text-rose-300 font-semibold">
                    Saídas: -{formatMillionsBRL(totalOutflow)}
                  </span>
                </div>
                <div className="h-2.5 rounded bg-[#090C10] overflow-hidden flex">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${Math.round((totalIncome / cashFlowScale) * 100)}%` }}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${Math.round((totalOutflow / cashFlowScale) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Coluna Direita (7 cols): Balanço + Extrato */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="console-panel p-5 space-y-3">
                  <div className="console-section-title text-sm text-emerald-400">
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    Receitas da Temporada
                  </div>
                  <div className="divide-y divide-white/[0.06] text-xs">
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Bilheteria em casa</span>
                      <span className="font-bold text-emerald-400 tabular-nums shrink-0">
                        +{formatMillionsBRL(boxOfficeIncome)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Cotas &amp; resultados</span>
                      <span className="font-bold text-emerald-300 tabular-nums shrink-0">
                        +{formatMillionsBRL(quotaIncome)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Premiações da liga</span>
                      <span className="font-bold text-amber-300 tabular-nums shrink-0">
                        +{formatMillionsBRL(club.finances.prizeIncome)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Vendas no mercado</span>
                      <span className="font-bold text-emerald-400 tabular-nums shrink-0">
                        +{formatMillionsBRL(club.finances.transferIncome)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="console-panel p-5 space-y-3">
                  <div className="console-section-title text-sm text-rose-400">
                    <TrendingDown className="w-4 h-4 shrink-0" />
                    Despesas &amp; Compromissos
                  </div>
                  <div className="divide-y divide-white/[0.06] text-xs">
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Folha mensal atual</span>
                      <span className="font-bold text-amber-300 tabular-nums shrink-0">
                        {formatMonthlySalary(totalMonthlyPayroll)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Salários pagos (a cada 4 rod.)</span>
                      <span className="font-bold text-rose-300 tabular-nums shrink-0">
                        -{formatMillionsBRL(totalWagesPaid)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Compras no mercado</span>
                      <span className="font-bold text-rose-300 tabular-nums shrink-0">
                        -{formatMillionsBRL(club.finances.transferSpent)}
                      </span>
                    </div>
                    <div className="py-2.5 flex justify-between gap-2">
                      <span className="text-slate-400">Capacidade do estádio</span>
                      <span className="font-bold text-slate-200 tabular-nums shrink-0">
                        {(club.stadiumCapacity ?? 35000).toLocaleString('pt-BR')} lug.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extrato Recente */}
              <div className="console-panel p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="console-section-title text-sm text-slate-200">
                    Extrato Financeiro Recente
                  </div>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {financeLedger.length} lançamentos
                  </span>
                </div>

                {financeLedger.length === 0 ? (
                  <div className="bg-[#090C10] border border-white/[0.06] rounded-md p-5 text-center text-xs text-slate-400">
                    As entradas de bilheteria, cotas, vendas e cobranças da folha aparecerão aqui conforme as rodadas forem jogadas.
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06] max-h-[300px] overflow-y-auto pr-1">
                    {financeLedger.map((entry) => (
                      <div
                        key={entry.id}
                        className="py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">{entry.label}</div>
                          <div className="text-[11px] text-slate-400">
                            Rodada {entry.round} •{' '}
                            {entry.targetFund === 'salarios'
                              ? 'Fundo Salarial'
                              : entry.targetFund === 'transferencias'
                              ? 'Caixa Transf.'
                              : `Dividido (${revenueTransferPct}%/${100 - revenueTransferPct}%)`}
                          </div>
                        </div>
                        <span
                          className={`font-display text-base font-extrabold tabular-nums shrink-0 ${
                            entry.type === 'realocacao'
                              ? 'text-sky-300'
                              : entry.amount >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {entry.type === 'realocacao'
                            ? formatMillionsBRL(entry.amount)
                            : entry.amount >= 0
                            ? `+${formatMillionsBRL(entry.amount)}`
                            : `-${formatMillionsBRL(Math.abs(entry.amount))}`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ficha Detalhada do Atleta */}
      {spotlightPlayer && (
        <PlayerSpotlightModal
          player={spotlightPlayer}
          club={club}
          isOwned={isOwned}
          renewDisabled={inDebt}
          onClose={() => setSpotlightPlayer(null)}
          onToggleListForSale={
            isOwned
              ? () => {
                  onToggleListForSale(club.id, spotlightPlayer.id);
                  setSpotlightPlayer((prev) =>
                    prev ? { ...prev, listedForSale: !prev.listedForSale } : null
                  );
                }
              : undefined
          }
          onRenewContract={
            isOwned
              ? () => {
                  onRenewPlayerContract(club.id, spotlightPlayer.id);
                  setSpotlightPlayer(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
};
