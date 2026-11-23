import React, { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  Crown,
  Link2,
  Lock,
  Play,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { BotDifficulty, ClubBotPersonality, LeagueState } from '../types/league';
import { calculateClubStrength } from '../engine/botAI';
import { formatMillionsBRL } from '../data/seedData';
import { BrasileiraoTrophyLogo, ClubCrest, ControllerTag } from './ClubBadge';

interface LobbyAndAdminViewProps {
  league: LeagueState;
  onOpenLoginModal: (mode?: 'login' | 'new_career') => void;
  onStartClubSelection: () => void;
  onClaimClub: (clubId: string) => void;
  onConfirmClubsToWindow: () => void;
  onPreStartChangeHumanCount: (newHumanCount: number) => void;
  onUpdateBotConfig: (
    clubId: string,
    difficulty: BotDifficulty,
    personality: ClubBotPersonality
  ) => void;
  onNavigateTab: (tab: 'mercado' | 'campeonato' | 'clube') => void;
}

export const LobbyAndAdminView: React.FC<LobbyAndAdminViewProps> = ({
  league,
  onOpenLoginModal,
  onStartClubSelection,
  onClaimClub,
  onConfirmClubsToWindow,
  onPreStartChangeHumanCount,
  onUpdateBotConfig,
  onNavigateTab,
}) => {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [editingBots, setEditingBots] = useState(false);

  const currentUser =
    league.participants.find((p) => p.id === league.currentUserId) ?? league.participants[0];
  const isAdmin = currentUser?.isAdmin === true;

  const humanClubs = league.clubs.filter((c) => c.controller === 'human');
  const botClubs = league.clubs.filter((c) => c.controller === 'bot');

  const copy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1800);
  };

  const allHumansJoined = league.participants.length >= league.config.humanCount;
  const pickedCount = league.participants.filter((p) => Boolean(p.clubId)).length;
  const allParticipantsPicked = league.participants.every((p) => Boolean(p.clubId));

  return (
    <div className="space-y-4 pb-6">
      {/* Banner Principal Broadcast */}
      <div className="broadcast-card rounded-2xl p-4 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrasileiraoTrophyLogo size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Temporada {league.season}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300">
                  {league.config.dailyScheduleTimes[0]} & {league.config.dailyScheduleTimes[1]}
                </span>
              </div>
              <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wide mt-0.5 leading-tight">
                {league.config.name}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdminPanel((s) => !s)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer shrink-0"
            title="Painel Admin"
          >
            {league.status === 'lobby' ? <Settings2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </button>
        </div>

        {/* Link de Convite */}
        <div className="bg-[#06090E] border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400">Link de convite ({league.inviteCode})</div>
            <div className="text-[11px] font-mono text-emerald-300 truncate">{league.inviteLink}</div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => copy(league.inviteCode, 'code')}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
              title="Copiar código"
            >
              {copied === 'code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => copy(league.inviteLink, 'link')}
              className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Link2 className="w-3.5 h-3.5" />
              {copied === 'link' ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* CTAs por Estado */}
        {league.status === 'lobby' && (
          <div className="space-y-2.5">
            {/* Sala de Espera / Aguardando Amigos */}
            <div
              className={`rounded-xl p-3 border text-xs space-y-2 ${
                allHumansJoined
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  {allHumansJoined
                    ? `Sala Completa! (${league.participants.length}/${league.config.humanCount})`
                    : `Aguardando Amigos (${league.participants.length}/${league.config.humanCount})`}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/30">
                  {league.config.humanCount}H + {league.config.botCount}B
                </span>
              </div>
              <p className="text-[11px] opacity-85 leading-snug">
                {allHumansJoined
                  ? 'Todos os técnicos conectados! O Admin já pode iniciar a escolha dos clubes.'
                  : 'Envie o código ou link da sala para seus amigos entrarem antes de iniciar a escolha dos times.'}
              </p>

              {isAdmin && (
                <div className="pt-2 border-t border-white/10 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-semibold">Ajustar vagas de amigos</span>
                    <span className="text-emerald-300 font-bold tabular-nums">
                      {league.config.humanCount} humanos • {league.config.botCount} bots
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(1, league.participants.length)}
                    max={league.config.totalClubs}
                    value={league.config.humanCount}
                    onChange={(e) => onPreStartChangeHumanCount(Number(e.target.value))}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenLoginModal('login')}
                disabled={allHumansJoined}
                className="py-3 px-3 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Entrar Amigo ({league.participants.length}/{league.config.humanCount})
              </button>
              {isAdmin && (
                <button
                  type="button"
                  disabled={!allHumansJoined}
                  onClick={onStartClubSelection}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Iniciar Escolha de Clubes
                </button>
              )}
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onOpenLoginModal('new_career')}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Começar Nova Carreira do Zero (20 Clubes Série A)
              </button>
            )}
          </div>
        )}

        {league.status === 'escolha_clube' && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-center justify-between gap-2">
              <span>
                <strong>Escolha seu Clube!</strong> Cada amigo seleciona um dos 20 times da Série A.
              </span>
              <span className="text-[11px] font-bold shrink-0">
                {pickedCount}/{league.participants.length}
              </span>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={onConfirmClubsToWindow}
                disabled={!allParticipantsPicked}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 disabled:opacity-40 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                {allParticipantsPicked
                  ? 'Abrir Janela de Mercado (24h) →'
                  : `Aguardando escolha dos amigos (${pickedCount}/${league.participants.length})`}
              </button>
            )}
          </div>
        )}

        {league.status !== 'lobby' && league.status !== 'escolha_clube' && (
          <button
            type="button"
            onClick={() =>
              onNavigateTab(
                league.status === 'janela_mercado' ? 'mercado' : 'campeonato'
              )
            }
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs cursor-pointer"
          >
            {league.status === 'janela_mercado'
              ? 'Ir para Janela de Mercado (24h) →'
              : 'Continuar Temporada →'}
          </button>
        )}
      </div>

      {/* Painel Admin colapsável */}
      {showAdminPanel && (
        <div className="bg-[#0D121A] border border-white/10 rounded-2xl p-4 space-y-3">
          {league.status === 'lobby' ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Vagas Humanos vs Bots</span>
                <span className="text-emerald-400 font-bold">
                  {league.config.humanCount}H + {league.config.botCount}B
                </span>
              </div>
              <input
                type="range"
                min={Math.max(1, league.participants.length)}
                max={league.config.totalClubs}
                value={league.config.humanCount}
                disabled={!isAdmin}
                onChange={(e) => onPreStartChangeHumanCount(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer disabled:opacity-40"
              />
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                2 rodadas fixas/dia: {league.config.dailyScheduleTimes[0]} e {league.config.dailyScheduleTimes[1]}
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Liga Iniciada • Clubes Travados
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cada técnico gerencia exclusivamente seu próprio clube. As rodadas acontecem às{' '}
                {league.config.dailyScheduleTimes[0]} e {league.config.dailyScheduleTimes[1]}.
              </p>
            </div>
          )}

          {league.auditLogs.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1 max-h-28 overflow-y-auto">
              {league.auditLogs.slice(0, 3).map((l) => (
                <div key={l.id} className="text-[10px] text-slate-400">
                  <strong className="text-slate-200">{l.action}:</strong> {l.details}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Participantes Conectados na Sala (somente leitura, sem pular para conta do amigo!) */}
      {(league.status === 'lobby' || league.status === 'escolha_clube') && (
        <section className="bg-[#0D121A] border border-white/[0.07] rounded-2xl p-4 space-y-2.5">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Participantes na Sala ({league.participants.length}/{league.config.humanCount})
          </div>

          <div className="flex flex-wrap gap-2">
            {league.participants.map((p) => {
              const club = p.clubId ? league.clubs.find((c) => c.id === p.clubId) : null;
              const isMe = p.id === league.currentUserId;
              return (
                <div
                  key={p.id}
                  className={`px-3 py-2 rounded-xl border text-xs flex items-center gap-2 ${
                    isMe
                      ? 'bg-emerald-500/15 border-emerald-400/60 text-white font-bold'
                      : 'bg-[#06090E] border-white/10 text-slate-300'
                  }`}
                >
                  {p.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {club && <ClubCrest club={club} size="xs" />}
                  <span>{p.name}</span>
                  {isMe && <span className="text-[9px] text-emerald-300">(Você)</span>}
                  {club ? (
                    <span className="text-[10px] text-emerald-300">• {club.shortName}</span>
                  ) : (
                    <span className="text-[10px] text-slate-500">sem clube</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Corrida de Escolha de Clubes */}
      {league.status === 'escolha_clube' && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Escolha seu Clube • Quem tocar primeiro leva!
            </h2>
            <span className="text-[11px] text-slate-400">
              Você: <strong className="text-white">{currentUser?.name}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {league.clubs.map((club) => {
              const str = calculateClubStrength(club);
              const claimedByMe = club.claimedByParticipantId === currentUser?.id;
              const claimedByOther = Boolean(club.claimedByParticipantId) && !claimedByMe;

              return (
                <button
                  key={club.id}
                  type="button"
                  disabled={claimedByOther}
                  onClick={() => onClaimClub(club.id)}
                  style={{ borderTopWidth: '3px', borderTopColor: club.primaryColor }}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer disabled:cursor-not-allowed ${
                    claimedByMe
                      ? 'bg-emerald-500/15 border-emerald-400 shadow-lg shadow-emerald-500/10'
                      : claimedByOther
                      ? 'bg-[#090C12] border-white/[0.04] opacity-55'
                      : 'broadcast-card hover:border-amber-400/60 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ClubCrest club={club} size="md" />
                    <div className="min-w-0">
                      <div className="font-display text-base font-bold text-white uppercase truncate leading-tight">
                        {club.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {club.stadium} • OVR {str.overall}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold tabular-nums mt-0.5">
                        ATA {str.attack} • MEI {str.midfield} • DEF {str.defense}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                    <span className="text-[11px] font-extrabold text-emerald-400 tabular-nums">
                      {formatMillionsBRL(club.finances.budget)}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        claimedByMe
                          ? 'bg-emerald-500 text-slate-950'
                          : claimedByOther
                          ? 'bg-white/10 text-slate-300'
                          : 'bg-amber-500/15 text-amber-300'
                      }`}
                    >
                      {claimedByMe
                        ? 'SEU CLUBE'
                        : claimedByOther
                        ? club.managerName
                        : 'ESCOLHER'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Galeria de Troféus */}
      {league.seasonHistory.length > 0 && (
        <section className="bg-[#0D121A] border border-amber-500/25 rounded-2xl p-4 space-y-2.5">
          <div className="font-display text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> Galeria de Campeões
          </div>
          <div className="space-y-2">
            {league.seasonHistory.map((h) => (
              <div
                key={h.season}
                className="flex items-center justify-between bg-[#06090E] border border-white/[0.06] rounded-xl px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-display text-sm font-bold text-amber-400">T{h.season}</span>
                  {h.championLogoUrl && (
                    <img src={h.championLogoUrl} alt={h.championName} className="w-6 h-6 object-contain" />
                  )}
                  <div>
                    <div className="font-bold text-white">{h.championName}</div>
                    <div className="text-[10px] text-slate-400">
                      Técnico: {h.championManager} • Artilheiro: {h.topScorerName} ({h.topScorerGoals}g)
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Campeão</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Resumo de Humanos e Bots após escolha */}
      {league.status !== 'lobby' && league.status !== 'escolha_clube' && (
        <>
          <section className="space-y-2.5">
            <h2 className="font-display text-xs font-bold uppercase tracking-widest text-emerald-400">
              Clubes Humanos ({humanClubs.length})
            </h2>
            <div className="grid grid-cols-1 gap-2.5">
              {humanClubs.map((club) => {
                const str = calculateClubStrength(club);
                const isMine = club.id === league.activeHumanClubId;
                return (
                  <div
                    key={club.id}
                    style={{ borderLeftWidth: '4px', borderLeftColor: club.primaryColor }}
                    className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${
                      isMine
                        ? 'bg-emerald-500/[0.09] border-emerald-500/45'
                        : 'broadcast-card'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ClubCrest club={club} size="md" />
                      <div className="min-w-0">
                        <div className="font-display text-base font-bold text-white uppercase flex items-center gap-1.5 truncate">
                          {club.name}
                          {club.isAdmin && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {club.managerName} • {club.stadium} • {formatMillionsBRL(club.finances.budget)}
                        </div>
                        <div className="text-[10px] text-emerald-300/90 font-semibold tabular-nums mt-0.5">
                          OVR {str.overall} • ATA {str.attack} • MEI {str.midfield} • DEF {str.defense}
                        </div>
                      </div>
                    </div>
                    <ControllerTag club={club} />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xs font-bold uppercase tracking-widest text-slate-400">
                Clubes Bots IA ({botClubs.length})
              </h2>
              {isAdmin && botClubs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEditingBots((e) => !e)}
                  className="text-[11px] text-sky-400 font-semibold cursor-pointer"
                >
                  {editingBots ? 'Concluir IA' : 'Ajustar IA'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {botClubs.map((club) => {
                const str = calculateClubStrength(club);
                return (
                  <div
                    key={club.id}
                    style={{ borderLeftWidth: '3px', borderLeftColor: club.primaryColor }}
                    className="broadcast-card rounded-xl p-2.5 space-y-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <ClubCrest club={club} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{club.name}</div>
                        <div className="text-[10px] text-slate-400 tabular-nums truncate">
                          OVR {str.overall} • {formatMillionsBRL(club.finances.budget)}
                        </div>
                        <div className="text-[9px] text-slate-500 tabular-nums">
                          A{str.attack} M{str.midfield} D{str.defense}
                        </div>
                      </div>
                    </div>
                    {editingBots && isAdmin && (
                      <div className="grid grid-cols-2 gap-1 pt-1 border-t border-white/[0.05]">
                        <select
                          value={club.botDifficulty}
                          onChange={(e) =>
                            onUpdateBotConfig(club.id, e.target.value as BotDifficulty, club.botPersonality)
                          }
                          className="px-1.5 py-1 rounded bg-[#06090E] text-[10px] text-slate-200"
                        >
                          <option value="facil">Fácil</option>
                          <option value="medio">Médio</option>
                          <option value="dificil">Difícil</option>
                          <option value="lendario">Lendário</option>
                        </select>
                        <select
                          value={club.botPersonality}
                          onChange={(e) =>
                            onUpdateBotConfig(club.id, club.botDifficulty, e.target.value as ClubBotPersonality)
                          }
                          className="px-1.5 py-1 rounded bg-[#06090E] text-[10px] text-slate-200"
                        >
                          <option value="agressivo">Agressivo</option>
                          <option value="galactico">Galáctico</option>
                          <option value="economico">Econômico</option>
                          <option value="tatico">Tático</option>
                          <option value="equilibrado">Equilibrado</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
