import React from 'react';
import { Ticket, Users } from 'lucide-react';
import { Club, Match } from '../types/league';
import { FORMATION_LAYOUT, getClubTactics, normalizeMatchStats } from '../engine/botAI';
import { formatMillionsBRL } from '../data/seedData';
import { ClubCrest } from './ClubBadge';

interface LiveMatchPitchProps {
  match: Match;
  homeClub: Club;
  awayClub: Club;
  focusClubId?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function colorDistance(hexA: string, hexB: string): number {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

export const LiveMatchPitch: React.FC<LiveMatchPitchProps> = ({
  match,
  homeClub,
  awayClub,
  focusClubId,
}) => {
  const homeLayout = FORMATION_LAYOUT[homeClub.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const awayLayout = FORMATION_LAYOUT[awayClub.formation] ?? FORMATION_LAYOUT['4-4-2'];
  const homeTactics = getClubTactics(homeClub);
  const awayTactics = getClubTactics(awayClub);
  const homeRedIds = match.simState?.homeRedCardedIds ?? [];
  const awayRedIds = match.simState?.awayRedCardedIds ?? [];
  const homeYellowIds = match.simState?.homeYellowCardedIds ?? [];
  const awayYellowIds = match.simState?.awayYellowCardedIds ?? [];
  const st = normalizeMatchStats(match.stats);

  const clash = colorDistance(homeClub.primaryColor, awayClub.primaryColor) < 115;
  const homeFill = homeClub.primaryColor;
  const homeStroke = homeClub.secondaryColor;
  const awayFill = clash ? '#F8FAFC' : awayClub.primaryColor;
  const awayStroke = clash ? awayClub.primaryColor : awayClub.secondaryColor;

  const homeHasBall = match.possessionClubId === homeClub.id;
  const ballShiftX = ((match.ballX - 50) / 50) * 70;
  const ballShiftY = ((match.ballY - 50) / 50) * 18;

  const mapHomePos = (pitchX: number, pitchY: number, role: string) => {
    const isGk = role === 'GOL';
    const isAttacker = role === 'CA' || role === 'PE' || role === 'PD';
    const isWinger = role === 'PE' || role === 'PD';
    const isMid = role === 'MC' || role === 'MEI' || role === 'VOL';
    const isWingBack = role === 'LD' || role === 'LE';
    const isDefender = role === 'ZAG' || isWingBack;

    const lineShift =
      homeTactics.defensiveLine === 'Adiantada'
        ? isDefender || role === 'VOL'
          ? 24
          : 12
        : homeTactics.defensiveLine === 'Recuada'
        ? isDefender || role === 'VOL'
          ? -24
          : -14
        : 0;

    const pressShift = !homeHasBall
      ? homeTactics.pressing === 'Pressão alta' || homeTactics.pressing === 'Pressão após perda'
        ? isAttacker || isMid
          ? 20
          : 8
        : homeTactics.pressing === 'Pressão baixa'
        ? -20
        : -6
      : 0;

    const offShift = homeHasBall
      ? isWingBack &&
        (homeTactics.offensiveStyle === 'Jogo pelas laterais' ||
          homeTactics.offensiveStyle === 'Cruzamentos')
        ? 30
        : isAttacker && homeTactics.offensiveStyle === 'Transições rápidas'
        ? 28
        : isAttacker
        ? 22
        : isMid
        ? 16
        : 6
      : 0;

    const baseX = 48 + ((100 - pitchY) / 100) * 340;
    const x = isGk
      ? 42
      : Math.max(52, Math.min(548, baseX + ballShiftX * 0.85 + lineShift + pressShift + offShift));

    let adjustedPitchX = pitchX;
    if (homeHasBall) {
      if (
        (isWinger || isWingBack) &&
        (homeTactics.offensiveStyle === 'Jogo pelas laterais' ||
          homeTactics.offensiveStyle === 'Cruzamentos')
      ) {
        adjustedPitchX = pitchX < 50 ? Math.max(6, pitchX - 7) : Math.min(94, pitchX + 7);
      } else if (isWinger && homeTactics.offensiveStyle === 'Ataque pelo meio') {
        adjustedPitchX = pitchX < 50 ? pitchX + 10 : pitchX - 10;
      }
    }

    const y = isGk
      ? 180 + ballShiftY * 0.24
      : Math.max(
          22,
          Math.min(
            338,
            (adjustedPitchX / 100) * 320 + 20 + ballShiftY * (isMid || isAttacker ? 0.56 : 0.4)
          )
        );
    return { x, y };
  };

  const mapAwayPos = (pitchX: number, pitchY: number, role: string) => {
    const isGk = role === 'GOL';
    const isAttacker = role === 'CA' || role === 'PE' || role === 'PD';
    const isWinger = role === 'PE' || role === 'PD';
    const isMid = role === 'MC' || role === 'MEI' || role === 'VOL';
    const isWingBack = role === 'LD' || role === 'LE';
    const isDefender = role === 'ZAG' || isWingBack;

    const lineShift =
      awayTactics.defensiveLine === 'Adiantada'
        ? isDefender || role === 'VOL'
          ? -24
          : -12
        : awayTactics.defensiveLine === 'Recuada'
        ? isDefender || role === 'VOL'
          ? 24
          : 14
        : 0;

    const pressShift = homeHasBall
      ? awayTactics.pressing === 'Pressão alta' || awayTactics.pressing === 'Pressão após perda'
        ? isAttacker || isMid
          ? -20
          : -8
        : awayTactics.pressing === 'Pressão baixa'
        ? 20
        : 6
      : 0;

    const offShift = !homeHasBall
      ? isWingBack &&
        (awayTactics.offensiveStyle === 'Jogo pelas laterais' ||
          awayTactics.offensiveStyle === 'Cruzamentos')
        ? -30
        : isAttacker && awayTactics.offensiveStyle === 'Transições rápidas'
        ? -28
        : isAttacker
        ? -22
        : isMid
        ? -16
        : -6
      : 0;

    const baseX = 552 - ((100 - pitchY) / 100) * 340;
    const x = isGk
      ? 558
      : Math.max(52, Math.min(548, baseX + ballShiftX * 0.85 + lineShift + pressShift + offShift));

    let adjustedPitchX = pitchX;
    if (!homeHasBall) {
      if (
        (isWinger || isWingBack) &&
        (awayTactics.offensiveStyle === 'Jogo pelas laterais' ||
          awayTactics.offensiveStyle === 'Cruzamentos')
      ) {
        adjustedPitchX = pitchX < 50 ? Math.max(6, pitchX - 7) : Math.min(94, pitchX + 7);
      } else if (isWinger && awayTactics.offensiveStyle === 'Ataque pelo meio') {
        adjustedPitchX = pitchX < 50 ? pitchX + 10 : pitchX - 10;
      }
    }

    const y = isGk
      ? 180 + ballShiftY * 0.24
      : Math.max(
          22,
          Math.min(
            338,
            ((100 - adjustedPitchX) / 100) * 320 +
              20 +
              ballShiftY * (isMid || isAttacker ? 0.56 : 0.4)
          )
        );
    return { x, y };
  };

  const ballSvgX = 24 + (match.ballX / 100) * 552;
  const ballSvgY = 20 + (match.ballY / 100) * 320;
  const fromSvgX =
    match.fromBallX !== undefined ? 24 + (match.fromBallX / 100) * 552 : undefined;
  const fromSvgY =
    match.fromBallY !== undefined ? 20 + (match.fromBallY / 100) * 320 : undefined;

  const isGoal = match.playPhase === 'gol_casa' || match.playPhase === 'gol_fora';
  const lastGoal = [...match.events].reverse().find((e) => e.type === 'gol');
  const goalClub =
    match.playPhase === 'gol_casa'
      ? homeClub
      : match.playPhase === 'gol_fora'
      ? awayClub
      : null;

  const showShotTrail =
    match.playPhase === 'finalizacao_casa' ||
    match.playPhase === 'finalizacao_fora' ||
    isGoal;
  const showPassTrail =
    match.playPhase === 'construcao_casa' ||
    match.playPhase === 'construcao_fora' ||
    match.playPhase === 'ataque_casa' ||
    match.playPhase === 'ataque_fora' ||
    match.playPhase === 'contra_ataque_casa' ||
    match.playPhase === 'contra_ataque_fora' ||
    match.playPhase === 'cruzamento_casa' ||
    match.playPhase === 'cruzamento_fora';
  const ballAtFeet = showPassTrail || match.playPhase === 'meio_campo';
  const trailTargetX =
    match.playPhase === 'finalizacao_casa' || match.playPhase === 'gol_casa' ? 578 : 22;
  const renderedBallX = ballAtFeet ? Math.min(574, ballSvgX + 7) : ballSvgX;
  const renderedBallY = ballAtFeet ? Math.min(338, ballSvgY + 4) : ballSvgY;

  const phaseBadge = isGoal
    ? { label: 'GOOOL!', cls: 'bg-amber-400 text-slate-950' }
    : showShotTrail
    ? { label: 'FINALIZAÇÃO', cls: 'bg-rose-500 text-white' }
    : match.playPhase === 'contra_ataque_casa' || match.playPhase === 'contra_ataque_fora'
    ? { label: 'CONTRA-ATAQUE', cls: 'bg-amber-400 text-slate-950' }
    : match.playPhase === 'cruzamento_casa' || match.playPhase === 'cruzamento_fora'
    ? { label: 'CRUZAMENTO', cls: 'bg-emerald-400 text-slate-950' }
    : match.playPhase === 'ataque_casa' || match.playPhase === 'ataque_fora'
    ? { label: 'ATAQUE', cls: 'bg-emerald-500 text-slate-950' }
    : match.playPhase === 'falta'
    ? { label: 'FALTA', cls: 'bg-amber-500 text-slate-950' }
    : match.playPhase === 'impedimento'
    ? { label: 'IMPEDIMENTO', cls: 'bg-slate-600 text-white' }
    : { label: 'CONSTRUÇÃO', cls: 'bg-sky-400 text-slate-950' };

  // Resultado final elegante para Apito Final
  const homeWon = match.homeGoals > match.awayGoals;
  const isDraw = match.homeGoals === match.awayGoals;
  const focusIsInMatch = focusClubId === homeClub.id || focusClubId === awayClub.id;
  const focusWon =
    focusIsInMatch &&
    !isDraw &&
    ((focusClubId === homeClub.id && homeWon) || (focusClubId === awayClub.id && !homeWon));
  const finalVerdict = isDraw
    ? { label: 'Empate ao Apito Final', cls: 'bg-[#090C10]/90 border-amber-400/45 text-amber-300' }
    : focusIsInMatch
    ? focusWon
      ? { label: 'Vitória Conquistada!', cls: 'bg-emerald-500/95 border-emerald-200 text-slate-950' }
      : { label: 'Derrota na Rodada', cls: 'bg-rose-600/95 border-rose-300 text-white' }
    : {
        label: `Vitória do ${homeWon ? homeClub.shortName : awayClub.shortName}`,
        cls: 'bg-[#090C10]/90 border-emerald-400/45 text-emerald-300',
      };

  return (
    <div className="console-panel-elevated overflow-hidden">
      {/* Placar Transmissão Esportiva TV */}
      <div className="relative min-h-[78px] bg-[#0B0F15] px-3 sm:px-5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: homeClub.primaryColor }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-1"
          style={{ backgroundColor: awayClub.primaryColor }}
        />

        {/* Mandante */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 justify-end min-w-0">
          <div className="text-right min-w-0">
            <div className="font-display text-lg sm:text-xl font-extrabold text-white truncate uppercase leading-none">
              <span className="sm:hidden">{homeClub.shortName}</span>
              <span className="hidden sm:inline">{homeClub.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center justify-end gap-1">
              {homeRedIds.length > 0 && (
                <span className="px-1 rounded bg-rose-600 text-white text-[9px] font-extrabold shrink-0">
                  🟥 {homeRedIds.length}
                </span>
              )}
              <span>{homeClub.formation}</span>
              <span className="hidden sm:inline">• {homeClub.mentality}</span>
            </div>
          </div>
          <ClubCrest club={homeClub} size="md" />
        </div>

        {/* Placar Central + Cronômetro */}
        <div className="flex flex-col items-center shrink-0 px-2 sm:px-4">
          <div
            key={`${match.homeGoals}-${match.awayGoals}`}
            className={`flex items-center gap-2.5 bg-[#090C10] border border-white/15 rounded-md px-4 py-1 ${
              match.status === 'ao_vivo' && (match.homeGoals > 0 || match.awayGoals > 0)
                ? 'animate-score-pulse'
                : ''
            }`}
          >
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-white tabular-nums leading-none">
              {match.homeGoals}
            </span>
            <span className="text-slate-600 font-bold text-lg leading-none">:</span>
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-white tabular-nums leading-none">
              {match.awayGoals}
            </span>
          </div>
          <div className="mt-1 h-4 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
            {match.isHalftime ? (
              <span className="text-amber-300 tabular-nums">
                INTERVALO ({match.halftimeRemainingSec}s)
              </span>
            ) : match.status === 'ao_vivo' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-rose-400 tabular-nums">AO VIVO {match.currentMinute}&apos;</span>
              </>
            ) : match.status === 'finalizada' ? (
              <span className="text-emerald-400">ENCERRADO 90&apos;</span>
            ) : (
              <span className="text-slate-400">PRÉ-JOGO 0&apos;</span>
            )}
          </div>
        </div>

        {/* Visitante */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <ClubCrest club={awayClub} size="md" />
          <div className="min-w-0">
            <div className="font-display text-lg sm:text-xl font-extrabold text-white truncate uppercase leading-none">
              <span className="sm:hidden">{awayClub.shortName}</span>
              <span className="hidden sm:inline">{awayClub.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
              <span>{awayClub.formation}</span>
              <span className="hidden sm:inline">• {awayClub.mentality}</span>
              {awayRedIds.length > 0 && (
                <span className="px-1 rounded bg-rose-600 text-white text-[9px] font-extrabold shrink-0">
                  🟥 {awayRedIds.length}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Campo 2D Broadcast */}
      <div className="relative bg-[#06150E] p-2 sm:p-3">
        {match.status === 'ao_vivo' && !match.isHalftime && (
          <div className="absolute top-4 left-4 sm:top-5 sm:left-5 z-10 pointer-events-none">
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shadow ${phaseBadge.cls}`}
            >
              {phaseBadge.label}
            </span>
          </div>
        )}

        <svg
          viewBox="0 0 600 360"
          className="w-full h-auto rounded-md border border-emerald-400/25 shadow-inner block"
        >
          <defs>
            <radialGradient id="stadiumFloodlight" cx="50%" cy="48%" r="60%">
              <stop offset="0%" stopColor="rgba(167, 243, 208, 0.14)" />
              <stop offset="65%" stopColor="rgba(16, 185, 129, 0.04)" />
              <stop offset="100%" stopColor="rgba(2, 6, 23, 0.4)" />
            </radialGradient>
            <pattern id="goalNetPattern" width="4" height="4" patternUnits="userSpaceOnUse">
              <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="0.6" />
            </pattern>
            <filter id="playerGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="rgba(0,0,0,0.68)" />
            </filter>
          </defs>

          {Array.from({ length: 12 }, (_, idx) => (
            <rect
              key={idx}
              x={idx * 50}
              y={0}
              width={50}
              height={360}
              fill={idx % 2 === 0 ? '#0C3824' : '#10442C'}
            />
          ))}
          <rect x="0" y="0" width="600" height="360" fill="url(#stadiumFloodlight)" />

          {/* Bancos Técnicos nas Laterais */}
          <rect x="210" y="3" width="70" height="7" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />
          <rect x="320" y="3" width="70" height="7" rx="2" fill="rgba(15,23,42,0.85)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.8" />

          {/* Linhas Oficiais do Gramado */}
          <g stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" fill="none">
            <rect x="24" y="18" width="552" height="324" />
            <line x1="300" y1="18" x2="300" y2="342" />
            <circle cx="300" cy="180" r="46" />
            <circle cx="300" cy="180" r="2.8" fill="rgba(255,255,255,0.75)" />
            <rect x="24" y="88" width="84" height="184" />
            <rect x="24" y="132" width="32" height="96" />
            <circle cx="80" cy="180" r="2.2" fill="rgba(255,255,255,0.7)" />
            <path d="M 108 142 A 38 38 0 0 1 108 218" />
            <rect x="492" y="88" width="84" height="184" />
            <rect x="544" y="132" width="32" height="96" />
            <circle cx="520" cy="180" r="2.2" fill="rgba(255,255,255,0.7)" />
            <path d="M 492 142 A 38 38 0 0 0 492 218" />
            <path d="M 24 27 A 9 9 0 0 0 33 18" />
            <path d="M 567 18 A 9 9 0 0 0 576 27" />
            <path d="M 24 333 A 9 9 0 0 1 33 342" />
            <path d="M 567 342 A 9 9 0 0 1 576 333" />
            <rect x="12" y="152" width="12" height="56" fill="url(#goalNetPattern)" stroke="rgba(255,255,255,0.82)" strokeWidth="2" />
            <rect x="576" y="152" width="12" height="56" fill="url(#goalNetPattern)" stroke="rgba(255,255,255,0.82)" strokeWidth="2" />
          </g>

          {showPassTrail && fromSvgX !== undefined && fromSvgY !== undefined && (
            <line
              x1={fromSvgX}
              y1={fromSvgY}
              x2={ballSvgX}
              y2={ballSvgY}
              stroke="rgba(52, 211, 153, 0.72)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
          )}

          {showShotTrail && (
            <line
              x1={fromSvgX ?? ballSvgX}
              y1={fromSvgY ?? ballSvgY}
              x2={fromSvgX !== undefined ? ballSvgX : trailTargetX}
              y2={fromSvgY !== undefined ? ballSvgY : 180}
              stroke="rgba(250, 204, 21, 0.88)"
              strokeWidth="2.6"
              strokeDasharray="6 4"
            />
          )}

          {/* Jogadores da Casa (remove expulsos do campo) */}
          {homeLayout.map((spec, idx) => {
            const slot = homeClub.lineupSlots?.[idx];
            const player = slot ? homeClub.squad.find((p) => p.id === slot.playerId) : undefined;
            if (player && homeRedIds.includes(player.id)) return null;
            const hasYellow = Boolean(player && homeYellowIds.includes(player.id));
            const isActive = Boolean(player && player.id === match.activePlayerId);
            const isSecondary = Boolean(player && player.id === match.secondaryPlayerId);
            const staminaPct = Math.max(0, Math.min(100, player?.stamina ?? 100));
            const staminaColor =
              staminaPct >= 70 ? '#34D399' : staminaPct >= 45 ? '#FBBF24' : '#F43F5E';

            let pos = mapHomePos(spec.pitchX, spec.pitchY, spec.role);
            if (isActive) {
              pos =
                showShotTrail && fromSvgX !== undefined && fromSvgY !== undefined
                  ? { x: fromSvgX, y: fromSvgY }
                  : { x: ballSvgX, y: ballSvgY };
            } else if (
              isSecondary &&
              showPassTrail &&
              fromSvgX !== undefined &&
              fromSvgY !== undefined
            ) {
              pos = { x: fromSvgX, y: fromSvgY };
            }
            return (
              <g
                key={`home-slot-${idx}`}
                filter="url(#playerGlow)"
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  transition: 'transform 1380ms cubic-bezier(0.25, 0.9, 0.35, 1)',
                }}
              >
                {isActive && (
                  <>
                    <circle
                      cx="0"
                      cy="0"
                      r="16.5"
                      fill="rgba(250, 204, 21, 0.14)"
                      stroke="rgba(250, 204, 21, 0.45)"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="13"
                      fill="none"
                      stroke="#FACC15"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  </>
                )}
                {!isActive && isSecondary && (
                  <circle cx="0" cy="0" r="12" fill="none" stroke="#38BDF8" strokeWidth="1.6" />
                )}
                <circle cx="0" cy="2" r="9.5" fill="rgba(0,0,0,0.42)" />
                <circle
                  cx="0"
                  cy="0"
                  r="8.8"
                  fill={spec.role === 'GOL' ? '#F59E0B' : homeFill}
                  stroke={isActive ? '#FDE047' : homeStroke}
                  strokeWidth="2"
                />
                <text x="0" y="3" textAnchor="middle" fontSize="7" fontWeight="800" fill="#ffffff">
                  {idx + 1}
                </text>
                {hasYellow && (
                  <rect x="6.5" y="-9.5" width="4.2" height="5.5" rx="0.8" fill="#FACC15" stroke="#0f172a" strokeWidth="0.6" />
                )}
                {player && (
                  <>
                    <rect x="-9" y="10.5" width="18" height="2" rx="1" fill="rgba(15,23,42,0.85)" />
                    <rect
                      x="-9"
                      y="10.5"
                      width={Math.max(2, (staminaPct / 100) * 18)}
                      height="2"
                      rx="1"
                      fill={staminaColor}
                    />
                    <text
                      x="0"
                      y="20.5"
                      textAnchor="middle"
                      fontSize="6.8"
                      fontWeight={isActive ? '800' : '600'}
                      fill={isActive ? '#FDE047' : 'rgba(255,255,255,0.95)'}
                      stroke="#05160e"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      paintOrder="stroke"
                    >
                      {player.knownName}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Jogadores Visitante (remove expulsos do campo) */}
          {awayLayout.map((spec, idx) => {
            const slot = awayClub.lineupSlots?.[idx];
            const player = slot ? awayClub.squad.find((p) => p.id === slot.playerId) : undefined;
            if (player && awayRedIds.includes(player.id)) return null;
            const hasYellow = Boolean(player && awayYellowIds.includes(player.id));
            const isActive = Boolean(player && player.id === match.activePlayerId);
            const isSecondary = Boolean(player && player.id === match.secondaryPlayerId);
            const staminaPct = Math.max(0, Math.min(100, player?.stamina ?? 100));
            const staminaColor =
              staminaPct >= 70 ? '#34D399' : staminaPct >= 45 ? '#FBBF24' : '#F43F5E';

            let pos = mapAwayPos(spec.pitchX, spec.pitchY, spec.role);
            if (isActive) {
              pos =
                showShotTrail && fromSvgX !== undefined && fromSvgY !== undefined
                  ? { x: fromSvgX, y: fromSvgY }
                  : { x: ballSvgX, y: ballSvgY };
            } else if (
              isSecondary &&
              showPassTrail &&
              fromSvgX !== undefined &&
              fromSvgY !== undefined
            ) {
              pos = { x: fromSvgX, y: fromSvgY };
            }
            return (
              <g
                key={`away-slot-${idx}`}
                filter="url(#playerGlow)"
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  transition: 'transform 1380ms cubic-bezier(0.25, 0.9, 0.35, 1)',
                }}
              >
                {isActive && (
                  <>
                    <circle
                      cx="0"
                      cy="0"
                      r="16.5"
                      fill="rgba(250, 204, 21, 0.14)"
                      stroke="rgba(250, 204, 21, 0.45)"
                      strokeWidth="1.2"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="13"
                      fill="none"
                      stroke="#FACC15"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                  </>
                )}
                {!isActive && isSecondary && (
                  <circle cx="0" cy="0" r="12" fill="none" stroke="#38BDF8" strokeWidth="1.6" />
                )}
                <circle cx="0" cy="2" r="9.5" fill="rgba(0,0,0,0.42)" />
                <circle
                  cx="0"
                  cy="0"
                  r="8.8"
                  fill={spec.role === 'GOL' ? '#0EA5E9' : awayFill}
                  stroke={isActive ? '#FDE047' : awayStroke}
                  strokeWidth="2"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="800"
                  fill={clash && spec.role !== 'GOL' ? '#0F172A' : '#ffffff'}
                >
                  {idx + 1}
                </text>
                {hasYellow && (
                  <rect x="6.5" y="-9.5" width="4.2" height="5.5" rx="0.8" fill="#FACC15" stroke="#0f172a" strokeWidth="0.6" />
                )}
                {player && (
                  <>
                    <rect x="-9" y="10.5" width="18" height="2" rx="1" fill="rgba(15,23,42,0.85)" />
                    <rect
                      x="-9"
                      y="10.5"
                      width={Math.max(2, (staminaPct / 100) * 18)}
                      height="2"
                      rx="1"
                      fill={staminaColor}
                    />
                    <text
                      x="0"
                      y="20.5"
                      textAnchor="middle"
                      fontSize="6.8"
                      fontWeight={isActive ? '800' : '600'}
                      fill={isActive ? '#FDE047' : 'rgba(255,255,255,0.95)'}
                      stroke="#05160e"
                      strokeWidth="2.4"
                      strokeLinejoin="round"
                      paintOrder="stroke"
                    >
                      {player.knownName}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Bola Animada */}
          <g
            style={{
              transform: `translate(${renderedBallX}px, ${renderedBallY}px)`,
              transition: 'transform 1280ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <circle cx="0" cy="2.5" r="6.5" fill="rgba(0,0,0,0.58)" />
            <circle cx="0" cy="0" r="5.6" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="2.1" fill="#0f172a" />
          </g>
        </svg>

        {/* Banner Cinematográfico Rápido de GOOOL! */}
        {isGoal && goalClub && (
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 pointer-events-none animate-goal-banner">
            <div
              className="bg-[#090C10]/95 border border-amber-400/70 rounded-md py-3 px-4 shadow-2xl flex items-center justify-center gap-3.5"
              style={{ borderLeftWidth: '5px', borderLeftColor: goalClub.primaryColor }}
            >
              <ClubCrest club={goalClub} size="md" />
              <div className="text-left min-w-0">
                <div className="font-display text-2xl sm:text-3xl font-extrabold tracking-wider uppercase leading-none text-amber-300">
                  GOOOOL DO {goalClub.name}!
                </div>
                {lastGoal && (
                  <div className="text-xs font-bold text-white mt-1 truncate">
                    {lastGoal.minute}&apos; — {lastGoal.playerName}
                    {lastGoal.assistName ? ` (Assist: ${lastGoal.assistName})` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Faixa Discreta de Apito Final */}
        {match.status === 'finalizada' && !isGoal && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none">
            <div
              className={`px-4 py-1.5 rounded-md border text-xs font-extrabold uppercase tracking-wider shadow-lg whitespace-nowrap ${finalVerdict.cls}`}
            >
              {finalVerdict.label}
            </div>
          </div>
        )}
      </div>

      {/* Narração do Lance + Mini Estatísticas */}
      <div className="px-4 py-3 bg-[#090C10] border-t border-white/[0.08] space-y-2.5">
        <div className="min-h-[36px] flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 shrink-0">
            Lance
          </span>
          <span className="text-xs font-medium text-slate-200 line-clamp-2 leading-snug">
            {match.lastPlayText}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 pt-2.5 border-t border-white/[0.06] text-center text-xs items-center">
          <div>
            <div className="text-[11px] text-slate-400 leading-none">Posse</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {st.homePossession}% - {100 - st.homePossession}%
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 leading-none">Chutes</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {st.homeShots} - {st.awayShots}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 leading-none">No Gol</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {st.homeOnTarget} - {st.awayOnTarget}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 leading-none">Passes %</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {st.homePasses > 0 ? Math.round((st.homePassesCompleted / st.homePasses) * 100) : 0}% -{' '}
              {st.awayPasses > 0 ? Math.round((st.awayPassesCompleted / st.awayPasses) * 100) : 0}%
            </div>
          </div>
        </div>

        {match.boxOfficeReport && (
          <div className="pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2 text-slate-300">
              <span className="inline-flex items-center gap-1 text-slate-200 font-semibold tabular-nums">
                <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                {match.boxOfficeReport.attendance.toLocaleString('pt-BR')} /{' '}
                {match.boxOfficeReport.capacity.toLocaleString('pt-BR')} (
                {match.boxOfficeReport.occupancyPct}%)
              </span>
              {match.boxOfficeReport.highlightLabel && (
                <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/35 text-amber-300 font-bold text-[10px]">
                  {match.boxOfficeReport.highlightLabel}
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 font-bold text-emerald-400 tabular-nums">
              <Ticket className="w-3.5 h-3.5 shrink-0" />
              Bilheteria {homeClub.shortName}: +{formatMillionsBRL(match.boxOfficeReport.revenue)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
