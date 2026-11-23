import React from 'react';
import { Club, Match } from '../types/league';
import { FORMATION_LAYOUT } from '../engine/botAI';
import { ClubCrest } from './ClubBadge';

interface LiveMatchPitchProps {
  match: Match;
  homeClub: Club;
  awayClub: Club;
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
}) => {
  const homeLayout = FORMATION_LAYOUT[homeClub.formation] ?? FORMATION_LAYOUT['4-3-3'];
  const awayLayout = FORMATION_LAYOUT[awayClub.formation] ?? FORMATION_LAYOUT['4-4-2'];

  const clash = colorDistance(homeClub.primaryColor, awayClub.primaryColor) < 115;
  const homeFill = homeClub.primaryColor;
  const homeStroke = homeClub.secondaryColor;
  const awayFill = clash ? '#F8FAFC' : awayClub.primaryColor;
  const awayStroke = clash ? awayClub.primaryColor : awayClub.secondaryColor;

  const ballShiftX = ((match.ballX - 50) / 50) * 62;
  const ballShiftY = ((match.ballY - 50) / 50) * 16;

  const mapHomePos = (pitchX: number, pitchY: number, isGk: boolean) => {
    const baseX = 48 + ((100 - pitchY) / 100) * 340;
    const x = isGk ? 42 : Math.max(55, Math.min(545, baseX + ballShiftX * 0.82));
    const y = isGk
      ? 180 + ballShiftY * 0.22
      : Math.max(24, Math.min(336, (pitchX / 100) * 320 + 20 + ballShiftY * 0.48));
    return { x, y };
  };

  const mapAwayPos = (pitchX: number, pitchY: number, isGk: boolean) => {
    const baseX = 552 - ((100 - pitchY) / 100) * 340;
    const x = isGk ? 558 : Math.max(55, Math.min(545, baseX + ballShiftX * 0.82));
    const y = isGk
      ? 180 + ballShiftY * 0.22
      : Math.max(24, Math.min(336, ((100 - pitchX) / 100) * 320 + 20 + ballShiftY * 0.48));
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
    match.playPhase === 'ataque_casa' || match.playPhase === 'ataque_fora';
  const ballAtFeet = showPassTrail || match.playPhase === 'meio_campo';
  const trailTargetX =
    match.playPhase === 'finalizacao_casa' || match.playPhase === 'gol_casa' ? 578 : 22;
  const renderedBallX = ballAtFeet ? Math.min(574, ballSvgX + 7) : ballSvgX;
  const renderedBallY = ballAtFeet ? Math.min(338, ballSvgY + 4) : ballSvgY;

  return (
    <div className="bg-[#0D121A] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">
      {/* Placar Transmissão TV com altura fixa para evitar saltos */}
      <div className="h-[74px] bg-gradient-to-r from-[#090D13] via-[#121925] to-[#090D13] px-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
          <div className="text-right min-w-0">
            <div className="font-display text-base font-bold text-white truncate uppercase leading-tight">
              {homeClub.shortName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {homeClub.formation} • {homeClub.mentality}
            </div>
          </div>
          <ClubCrest club={homeClub} size="md" />
        </div>

        <div className="flex flex-col items-center shrink-0 px-2">
          <div className="flex items-center gap-2 bg-[#06090E] border border-white/10 rounded-xl px-3.5 py-1">
            <span className="font-display text-2xl font-extrabold text-white tabular-nums">
              {match.homeGoals}
            </span>
            <span className="text-slate-600 font-bold text-base">:</span>
            <span className="font-display text-2xl font-extrabold text-white tabular-nums">
              {match.awayGoals}
            </span>
          </div>
          <div className="mt-1 h-3.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
            {match.isHalftime ? (
              <span className="text-amber-300 tabular-nums">
                INTERVALO ({match.halftimeRemainingSec}s)
              </span>
            ) : match.status === 'ao_vivo' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-rose-400 tabular-nums">AO VIVO {match.currentMinute}&apos;</span>
              </>
            ) : match.status === 'finalizada' ? (
              <span className="text-emerald-400">ENCERRADO 90&apos;</span>
            ) : (
              <span className="text-slate-400">PRÉ-JOGO 0&apos;</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <ClubCrest club={awayClub} size="md" />
          <div className="min-w-0">
            <div className="font-display text-base font-bold text-white truncate uppercase leading-tight">
              {awayClub.shortName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {awayClub.formation} • {awayClub.mentality}
            </div>
          </div>
        </div>
      </div>

      {/* Campinho 2D SVG */}
      <div className="relative bg-[#081C13] p-2">
        <svg
          viewBox="0 0 600 360"
          className="w-full h-auto rounded-xl border border-emerald-400/20 shadow-inner block"
        >
          {Array.from({ length: 10 }, (_, idx) => (
            <rect
              key={idx}
              x={idx * 60}
              y={0}
              width={60}
              height={360}
              fill={idx % 2 === 0 ? '#0E3B26' : '#11452D'}
            />
          ))}

          <g stroke="rgba(255,255,255,0.42)" strokeWidth="1.8" fill="none">
            <rect x="24" y="18" width="552" height="324" />
            <line x1="300" y1="18" x2="300" y2="342" />
            <circle cx="300" cy="180" r="46" />
            <circle cx="300" cy="180" r="2.5" fill="rgba(255,255,255,0.7)" />
            <rect x="24" y="88" width="84" height="184" />
            <rect x="24" y="132" width="32" height="96" />
            <path d="M 108 142 A 38 38 0 0 1 108 218" />
            <rect x="492" y="88" width="84" height="184" />
            <rect x="544" y="132" width="32" height="96" />
            <path d="M 492 142 A 38 38 0 0 0 492 218" />
            <rect x="14" y="154" width="10" height="52" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
            <rect x="576" y="154" width="10" height="52" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
          </g>

          {showPassTrail && fromSvgX !== undefined && fromSvgY !== undefined && (
            <line
              x1={fromSvgX}
              y1={fromSvgY}
              x2={ballSvgX}
              y2={ballSvgY}
              stroke="rgba(52, 211, 153, 0.55)"
              strokeWidth="1.6"
              strokeDasharray="4 4"
            />
          )}

          {showShotTrail && (
            <line
              x1={fromSvgX ?? ballSvgX}
              y1={fromSvgY ?? ballSvgY}
              x2={fromSvgX !== undefined ? ballSvgX : trailTargetX}
              y2={fromSvgY !== undefined ? ballSvgY : 180}
              stroke="rgba(250, 204, 21, 0.78)"
              strokeWidth="2.2"
              strokeDasharray="5 4"
            />
          )}

          {/* 11 Jogadores da Casa */}
          {homeLayout.map((spec, idx) => {
            const slot = homeClub.lineupSlots?.[idx];
            const player = slot
              ? homeClub.squad.find((p) => p.id === slot.playerId)
              : undefined;
            const isActive = Boolean(player && player.id === match.activePlayerId);
            const isSecondary = Boolean(player && player.id === match.secondaryPlayerId);
            let pos = mapHomePos(spec.pitchX, spec.pitchY, spec.role === 'GOL');
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
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {isActive && (
                  <circle
                    cx="0"
                    cy="0"
                    r="13.5"
                    fill="none"
                    stroke="#FACC15"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                )}
                {!isActive && isSecondary && (
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.6"
                  />
                )}
                <circle cx="0" cy="2" r="9.5" fill="rgba(0,0,0,0.4)" />
                <circle
                  cx="0"
                  cy="0"
                  r="8.5"
                  fill={spec.role === 'GOL' ? '#F59E0B' : homeFill}
                  stroke={isActive ? '#FDE047' : homeStroke}
                  strokeWidth="2"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fontSize="7"
                  fontWeight="800"
                  fill="#ffffff"
                >
                  {idx + 1}
                </text>
                {player && (
                  <text
                    x="0"
                    y="17"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight={isActive ? '800' : '600'}
                    fill={isActive ? '#FDE047' : 'rgba(255,255,255,0.88)'}
                  >
                    {player.knownName}
                  </text>
                )}
              </g>
            );
          })}

          {/* 11 Jogadores Visitante */}
          {awayLayout.map((spec, idx) => {
            const slot = awayClub.lineupSlots?.[idx];
            const player = slot
              ? awayClub.squad.find((p) => p.id === slot.playerId)
              : undefined;
            const isActive = Boolean(player && player.id === match.activePlayerId);
            const isSecondary = Boolean(player && player.id === match.secondaryPlayerId);
            let pos = mapAwayPos(spec.pitchX, spec.pitchY, spec.role === 'GOL');
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
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  transition: 'transform 520ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                {isActive && (
                  <circle
                    cx="0"
                    cy="0"
                    r="13.5"
                    fill="none"
                    stroke="#FACC15"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                )}
                {!isActive && isSecondary && (
                  <circle
                    cx="0"
                    cy="0"
                    r="12"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="1.6"
                  />
                )}
                <circle cx="0" cy="2" r="9.5" fill="rgba(0,0,0,0.4)" />
                <circle
                  cx="0"
                  cy="0"
                  r="8.5"
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
                {player && (
                  <text
                    x="0"
                    y="17"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight={isActive ? '800' : '600'}
                    fill={isActive ? '#FDE047' : 'rgba(255,255,255,0.88)'}
                  >
                    {player.knownName}
                  </text>
                )}
              </g>
            );
          })}

          {/* Bola Animada */}
          <g
            style={{
              transform: `translate(${renderedBallX}px, ${renderedBallY}px)`,
              transition: 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <circle cx="0" cy="2" r="6" fill="rgba(0,0,0,0.55)" />
            <circle cx="0" cy="0" r="5.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="2" fill="#0f172a" />
          </g>
        </svg>

        {/* Banner de GOOOL estático (sem bounce para zero tremor) */}
        {isGoal && goalClub && (
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-500/95 via-emerald-500/95 to-amber-500/95 text-slate-950 rounded-2xl py-2.5 px-4 shadow-2xl border border-white/40 flex items-center justify-center gap-3">
            <ClubCrest club={goalClub} size="md" />
            <div className="text-center">
              <div className="font-display text-2xl font-extrabold tracking-wider uppercase leading-none">
                GOOOOL DO {goalClub.name}!
              </div>
              {lastGoal && (
                <div className="text-xs font-bold mt-0.5">
                  {lastGoal.minute}&apos; — {lastGoal.playerName}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Narração com altura fixa + Estatísticas com altura fixa */}
      <div className="px-3.5 py-2.5 bg-[#090D13] border-t border-white/[0.07] space-y-2">
        <div className="h-10 flex items-center gap-2 overflow-hidden">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-[10px] font-bold uppercase text-emerald-300 shrink-0">
            Lance
          </span>
          <span className="text-xs font-medium text-emerald-300 line-clamp-2 leading-snug">
            {match.lastPlayText}
          </span>
        </div>

        <div className="h-11 grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.05] text-center text-[11px] items-center">
          <div>
            <div className="text-[10px] text-slate-500 leading-none">Posse</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {match.stats.homePossession}% - {100 - match.stats.homePossession}%
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 leading-none">Chutes</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {match.stats.homeShots} - {match.stats.awayShots}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 leading-none">No Gol</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {match.stats.homeOnTarget} - {match.stats.awayOnTarget}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 leading-none">Escanteios</div>
            <div className="font-bold text-white tabular-nums mt-1">
              {match.stats.homeCorners} - {match.stats.awayCorners}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
