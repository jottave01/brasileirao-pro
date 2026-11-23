import React from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  FileText,
  Handshake,
  RefreshCw,
  Tag,
  Wallet,
  X,
} from 'lucide-react';
import { Club, Player } from '../types/league';
import { ensurePlayerAttributes, PLAYER_ATTRIBUTE_GROUPS } from '../engine/botAI';
import {
  calcAgentMinimumSalary,
  calcMonthlySalary,
  formatMillionsBRL,
  formatMonthlySalary,
} from '../data/seedData';
import {
  ClubCrest,
  CountryFlag,
  OvrBadge,
  PlayerAvatar,
  POSITION_STYLE,
  WorldClubCrest,
} from './ClubBadge';

interface PlayerSpotlightModalProps {
  player: Player;
  club?: Club;
  originType?: 'europa' | 'bot' | 'human' | 'livre';
  isOwned?: boolean;
  onClose: () => void;
  onToggleListForSale?: () => void;
  onRenewContract?: () => void;
  renewDisabled?: boolean;
  onStartNegotiation?: () => void;
  negotiationDisabled?: boolean;
  negotiationLabel?: string;
}

export const PlayerSpotlightModal: React.FC<PlayerSpotlightModalProps> = ({
  player,
  club,
  originType,
  isOwned = false,
  onClose,
  onToggleListForSale,
  onRenewContract,
  renewDisabled = false,
  onStartNegotiation,
  negotiationDisabled = false,
  negotiationLabel = 'Iniciar Negociação',
}) => {
  const monthlySalary = player.monthlySalary ?? calcMonthlySalary(player.overall, club?.tier);
  const contractYears = player.contractYears ?? (originType === 'livre' ? 0 : 2);
  const renewalSalary = club ? calcAgentMinimumSalary(player, club) : monthlySalary;
  const staminaPct = Math.round(Math.max(0, Math.min(100, player.stamina)));
  const accentColor = club?.primaryColor ?? '#10B981';
  const attrs = ensurePlayerAttributes(player);
  const yellows = player.yellowCards ?? 0;
  const reds = player.redCards ?? 0;
  const suspended = (player.suspendedMatches ?? 0) > 0;
  const cycleYellows = yellows % 3;

  const getAttrColor = (val: number) => {
    if (val >= 85) return { text: 'text-emerald-300', bar: 'bg-emerald-400' };
    if (val >= 75) return { text: 'text-sky-300', bar: 'bg-sky-400' };
    if (val >= 65) return { text: 'text-amber-300', bar: 'bg-amber-400' };
    return { text: 'text-slate-400', bar: 'bg-slate-600' };
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[540px] max-h-[92vh] overflow-y-auto bg-[#11161E] border-t sm:border border-white/15 rounded-t-xl sm:rounded-lg shadow-2xl animate-console-enter"
        style={{ borderTopWidth: '3px', borderTopColor: accentColor }}
      >
        {/* Cabeçalho / Card do Atleta */}
        <div
          className="relative px-4 sm:px-5 pt-4 sm:pt-5 pb-4 border-b border-white/[0.08]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accentColor}22 0%, rgba(17, 22, 30, 0.98) 65%)`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha do jogador"
            className="absolute top-3.5 right-3.5 p-2 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 cursor-pointer transition"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-2.5 sm:gap-4 pr-9">
            <div className="relative shrink-0">
              <PlayerAvatar
                player={player}
                size="xl"
                shape="card"
                kitPrimary={
                  club ? (player.position === 'GOL' ? '#eab308' : club.primaryColor) : undefined
                }
                kitSecondary={
                  club ? (player.position === 'GOL' ? '#0f172a' : club.secondaryColor) : undefined
                }
              />
              <div className="mt-1.5 flex items-center justify-center gap-1">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${POSITION_STYLE[player.position]}`}>
                  {player.position}
                </span>
                {player.ambidextrous && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/35 text-[10px] font-bold">
                    PE/PD
                  </span>
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {club ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0B0F15]/90 border border-white/10 text-[11px] font-semibold text-slate-200">
                    <ClubCrest club={club} size="xs" />
                    {club.name}
                  </span>
                ) : originType !== 'livre' && player.currentClubName ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0B0F15]/90 border border-white/10 text-[11px] font-semibold text-sky-300">
                    <WorldClubCrest clubName={player.currentClubName} size="xs" />
                    {player.currentClubName}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0B0F15]/90 border border-white/10 text-[11px] font-semibold text-slate-300">
                    <Building2 className="w-3 h-3 text-emerald-400" />
                    Passe Livre
                  </span>
                )}

                {player.isStarter !== undefined && club && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      player.isStarter
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                        : 'bg-white/[0.06] text-slate-300 border border-white/10'
                    }`}
                  >
                    {player.isStarter ? 'Titular' : 'Banco'}
                  </span>
                )}
              </div>

              <h2 className="font-display text-3xl font-extrabold text-white uppercase tracking-wide mt-1.5 leading-none truncate">
                {player.knownName}
              </h2>
              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <CountryFlag nationality={player.nationality} />
                <span className="text-slate-300 font-medium">{player.name}</span>
                <span>•</span>
                <span>{player.nationality}</span>
                <span>•</span>
                <span className="tabular-nums font-semibold text-slate-200">{player.age} anos</span>
              </div>

              {player.secondaryPositions.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-400">
                  Posições secundárias:{' '}
                  <span className="text-slate-200 font-semibold">
                    {player.secondaryPositions.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-center shrink-0">
              <OvrBadge ovr={player.overall} size="xl" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                OVR
              </span>
            </div>
          </div>
        </div>

        {/* Corpo de Informações Reais */}
        <div className="p-4 sm:p-5 space-y-4">
          {(suspended || cycleYellows === 2) && (
            <div
              className={`rounded-md px-3 py-2 border text-xs flex items-center gap-2 ${
                suspended
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-amber-400/15 border-amber-400/40 text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {suspended
                  ? `Atleta SUSPENSO para a próxima rodada (${reds} vermelhos • ${yellows} amarelos na temporada).`
                  : `Pendurado com 2 cartões amarelos acumulados (mais 1 amarelo gera suspensão automática).`}
              </span>
            </div>
          )}

          {/* Métricas Principais */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#0B0F15] border border-white/[0.07] rounded-md p-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                Gols
              </div>
              <div className="font-display text-2xl font-extrabold text-white tabular-nums mt-0.5">
                {player.goals}
              </div>
            </div>
            <div className="bg-[#0B0F15] border border-white/[0.07] rounded-md p-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Handshake className="w-3.5 h-3.5 text-sky-400" />
                Assistências
              </div>
              <div className="font-display text-2xl font-extrabold text-white tabular-nums mt-0.5">
                {player.assists}
              </div>
            </div>
            <div className="bg-[#0B0F15] border border-white/[0.07] rounded-md p-3">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Condição
              </div>
              <div className="font-display text-2xl font-extrabold text-white tabular-nums mt-0.5">
                {staminaPct}%
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${
                    staminaPct >= 70
                      ? 'bg-emerald-400'
                      : staminaPct >= 45
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${staminaPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* 12 Atributos Individuais Reais */}
          <div className="bg-[#0B0F15] border border-white/[0.07] rounded-md p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <span>Atributos Individuais</span>
              <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                🟨 {yellows} • 🟥 {reds} na temporada
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PLAYER_ATTRIBUTE_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1.5">
                  <div className={`text-[10px] font-extrabold uppercase tracking-wider ${group.accent}`}>
                    {group.title}
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
                      const val = attrs[item.key];
                      const style = getAttrColor(val);
                      const label =
                        player.position === 'GOL' && item.gkLabel ? item.gkLabel : item.label;
                      return (
                        <div key={item.key} className="space-y-0.5">
                          <div className="flex items-center justify-between gap-1 text-[11px]">
                            <span className="text-slate-300 truncate">{label}</span>
                            <span className={`font-bold tabular-nums shrink-0 ${style.text}`}>
                              {val}
                            </span>
                          </div>
                          <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full ${style.bar}`}
                              style={{ width: `${Math.max(5, Math.min(100, val))}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Informações Financeiras e Contratuais */}
          <div className="bg-[#0B0F15] border border-white/[0.07] rounded-md divide-y divide-white/[0.06] text-xs">
            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Valor de Mercado
              </span>
              <span className="font-display text-base font-extrabold text-emerald-400 tabular-nums">
                {originType === 'livre' ? 'Passe Livre' : formatMillionsBRL(player.marketValue)}
              </span>
            </div>

            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Salário Mensal
              </span>
              <span className="font-semibold text-white tabular-nums">
                {originType === 'livre' ? 'Sem contrato atual' : formatMonthlySalary(monthlySalary)}
              </span>
            </div>

            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                Situação Contratual
              </span>
              {contractYears === 0 ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                  Livre para assinar
                </span>
              ) : (
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    contractYears <= 1
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      : 'bg-white/[0.05] text-slate-200'
                  }`}
                >
                  {contractYears === 1 ? '1 ano restante (Último ano)' : `${contractYears} anos restantes`}
                </span>
              )}
            </div>
          </div>

          {/* Ações */}
          {(isOwned || onStartNegotiation) && (
            <div className="flex flex-wrap gap-2.5 pt-1">
              {isOwned && onToggleListForSale && (
                <button
                  type="button"
                  onClick={onToggleListForSale}
                  className={`flex-1 py-2.5 px-3 rounded-md border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                    player.listedForSale
                      ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                      : 'bg-[#171E29] hover:bg-white/10 border-white/15 text-slate-200'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  {player.listedForSale ? 'Remover da Lista de Venda' : 'Colocar à Venda'}
                </button>
              )}

              {isOwned && contractYears <= 1 && onRenewContract && (
                <button
                  type="button"
                  disabled={renewDisabled}
                  onClick={onRenewContract}
                  className="flex-1 py-2.5 px-3 rounded-md bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition tabular-nums"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {renewDisabled
                    ? 'Bloqueado (Déficit Salarial)'
                    : `Renovar (+3a • ${formatMonthlySalary(renewalSalary)})`}
                </button>
              )}

              {onStartNegotiation && (
                <button
                  type="button"
                  disabled={negotiationDisabled}
                  onClick={() => {
                    onClose();
                    onStartNegotiation();
                  }}
                  className="w-full py-3 px-4 rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold uppercase tracking-wider cursor-pointer transition"
                >
                  {negotiationLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
