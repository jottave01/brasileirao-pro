import React, { useState } from 'react';
import { Bot, Crown, User } from 'lucide-react';
import { Club, ClubBotPersonality, Player, PlayerPosition } from '../types/league';

export const PERSONALITY_LABELS: Record<ClubBotPersonality, string> = {
  agressivo: 'Agressivo',
  economico: 'Econômico',
  equilibrado: 'Equilibrado',
  galactico: 'Galáctico',
  tatico: 'Tático',
};

export const POSITION_STYLE: Record<PlayerPosition, string> = {
  GOL: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
  ZAG: 'bg-sky-500/15 text-sky-300 border border-sky-500/35',
  LD: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35',
  LE: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/35',
  VOL: 'bg-teal-500/15 text-teal-300 border border-teal-500/35',
  MC: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35',
  MEI: 'bg-violet-500/15 text-violet-300 border border-violet-500/35',
  PE: 'bg-rose-500/15 text-rose-300 border border-rose-500/35',
  PD: 'bg-orange-500/15 text-orange-300 border border-orange-500/35',
  CA: 'bg-red-500/20 text-red-300 border border-red-500/40',
};

export const BrasileiraoTrophyLogo: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'sm' }) => {
  const dims = size === 'lg' ? 'h-20 w-auto' : size === 'md' ? 'h-14 w-auto' : 'h-10 w-auto';
  return (
    <img
      src="/trophy-brasileirao.png"
      alt="Taça do Brasileirão"
      className={`${dims} object-contain shrink-0 select-none`}
    />
  );
};

const CREST_CONTRAST_FILTER =
  'drop-shadow(0 0 1.2px rgba(255,255,255,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.75))';

export const WORLD_CLUB_META: Record<
  string,
  {
    slug: string;
    shortName: string;
    primaryColor: string;
    secondaryColor: string;
    region: 'europa' | 'latam';
  }
> = {
  'Real Madrid': { slug: 'real-madrid', shortName: 'RMA', primaryColor: '#F8FAFC', secondaryColor: '#FEBE10', region: 'europa' },
  'Manchester City': { slug: 'manchester-city', shortName: 'MCI', primaryColor: '#6CABDD', secondaryColor: '#1C2C5B', region: 'europa' },
  Barcelona: { slug: 'barcelona', shortName: 'BAR', primaryColor: '#A50044', secondaryColor: '#004D98', region: 'europa' },
  Liverpool: { slug: 'liverpool', shortName: 'LIV', primaryColor: '#C8102E', secondaryColor: '#00B2A9', region: 'europa' },
  'Bayern de Munique': { slug: 'bayern-munich', shortName: 'BAY', primaryColor: '#DC052D', secondaryColor: '#0066B2', region: 'europa' },
  'Inter de Milão': { slug: 'inter-milan', shortName: 'INT', primaryColor: '#010E80', secondaryColor: '#0F172A', region: 'europa' },
  Arsenal: { slug: 'arsenal', shortName: 'ARS', primaryColor: '#EF0107', secondaryColor: '#063672', region: 'europa' },
  Newcastle: { slug: 'newcastle', shortName: 'NEW', primaryColor: '#1F2937', secondaryColor: '#F8FAFC', region: 'europa' },
  PSG: { slug: 'psg', shortName: 'PSG', primaryColor: '#004170', secondaryColor: '#DA291C', region: 'europa' },
  Chelsea: { slug: 'chelsea', shortName: 'CHE', primaryColor: '#034694', secondaryColor: '#DBA111', region: 'europa' },
  'Atlético de Madrid': { slug: 'atletico-madrid', shortName: 'ATM', primaryColor: '#CB3524', secondaryColor: '#272E61', region: 'europa' },
  'Nottingham Forest': { slug: 'nottingham-forest', shortName: 'NFO', primaryColor: '#DD0000', secondaryColor: '#F8FAFC', region: 'europa' },
  Juventus: { slug: 'juventus', shortName: 'JUV', primaryColor: '#0F172A', secondaryColor: '#F8FAFC', region: 'europa' },
  'Manchester United': { slug: 'manchester-united', shortName: 'MUN', primaryColor: '#DA291C', secondaryColor: '#FBE122', region: 'europa' },
  'Borussia Dortmund': { slug: 'borussia-dortmund', shortName: 'BVB', primaryColor: '#FDE100', secondaryColor: '#0F172A', region: 'europa' },
  'Al-Nassr': { slug: 'al-nassr', shortName: 'ALN', primaryColor: '#F7D000', secondaryColor: '#0038A8', region: 'europa' },
  'River Plate': { slug: 'river-plate', shortName: 'RIV', primaryColor: '#F8FAFC', secondaryColor: '#EB192E', region: 'latam' },
  'Boca Juniors': { slug: 'boca-juniors', shortName: 'BOC', primaryColor: '#00338D', secondaryColor: '#F5C400', region: 'latam' },
  'Racing Club': { slug: 'racing-club', shortName: 'RAC', primaryColor: '#66B2E8', secondaryColor: '#F8FAFC', region: 'latam' },
  Peñarol: { slug: 'penarol', shortName: 'PEN', primaryColor: '#F7C600', secondaryColor: '#111827', region: 'latam' },
  Nacional: { slug: 'nacional', shortName: 'NAC', primaryColor: '#003893', secondaryColor: '#CE1126', region: 'latam' },
  'Colo-Colo': { slug: 'colo-colo', shortName: 'COL', primaryColor: '#F8FAFC', secondaryColor: '#111827', region: 'latam' },
  'Independiente del Valle': { slug: 'independiente-del-valle', shortName: 'IDV', primaryColor: '#0F172A', secondaryColor: '#EC4899', region: 'latam' },
};

export const WorldClubCrest: React.FC<{
  clubName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}> = ({ clubName, size = 'xs' }) => {
  const [imgError, setImgError] = useState(false);
  const meta = clubName ? WORLD_CLUB_META[clubName] : undefined;

  const dims =
    size === 'xs'
      ? 'w-5 h-5'
      : size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
      ? 'w-12 h-12'
      : 'w-9 h-9';

  if (meta && !imgError) {
    return (
      <img
        src={`/logos/world/${meta.slug}.png`}
        alt={clubName}
        title={clubName}
        onError={() => setImgError(true)}
        style={{ filter: CREST_CONTRAST_FILTER }}
        className={`${dims} object-contain shrink-0 select-none`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-lg font-display font-bold text-[9px] flex items-center justify-center shrink-0 border border-white/15`}
      style={{
        background: meta
          ? `linear-gradient(135deg, ${meta.primaryColor}, ${meta.secondaryColor})`
          : 'linear-gradient(135deg, #1e293b, #0f172a)',
        color: '#ffffff',
      }}
      title={clubName ?? 'Clube Internacional'}
    >
      {meta?.shortName ?? (clubName ? clubName.slice(0, 3).toUpperCase() : 'INT')}
    </div>
  );
};

export const ClubCrest: React.FC<{ club: Club; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }> = ({
  club,
  size = 'md',
}) => {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'xs'
      ? 'w-5 h-5'
      : size === 'sm'
      ? 'w-7 h-7'
      : size === 'lg'
      ? 'w-12 h-12'
      : size === 'xl'
      ? 'w-16 h-16'
      : 'w-10 h-10';

  if (club.logoUrl && !imgError) {
    return (
      <img
        src={club.logoUrl}
        alt={club.name}
        title={club.name}
        onError={() => setImgError(true)}
        style={{ filter: CREST_CONTRAST_FILTER }}
        className={`${dims} object-contain shrink-0 select-none`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded-full font-display font-bold text-xs flex items-center justify-center shrink-0 border border-white/15`}
      style={{
        background: `linear-gradient(135deg, ${club.primaryColor}, ${club.secondaryColor})`,
        color: '#ffffff',
      }}
      title={club.name}
    >
      {club.shortName}
    </div>
  );
};

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const SKIN_TONES = [
  { base: '#F4C9A8', shadow: '#DCA47E' }, // 0: Claro
  { base: '#E6B484', shadow: '#C88E5B' }, // 1: Latino claro
  { base: '#CE925A', shadow: '#A46A37' }, // 2: Moreno claro
  { base: '#AD703D', shadow: '#834F24' }, // 3: Moreno / Pardo
  { base: '#8B5427', shadow: '#643A16' }, // 4: Negro claro
  { base: '#653A1A', shadow: '#44240D' }, // 5: Negro escuro
];

const HAIR_COLORS = ['#111317', '#2B1D14', '#4A2F1D', '#D4A84F'];

export const PlayerAvatar: React.FC<{
  player: Pick<Player, 'name' | 'position' | 'overall' | 'appearance'>;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  kitPrimary?: string;
  kitSecondary?: string;
}> = ({ player, size = 'md', kitPrimary, kitSecondary }) => {
  const hash = hashString(player.name + player.position);
  const app = player.appearance;

  const skin = SKIN_TONES[(app?.skin ?? hash) % SKIN_TONES.length];
  const hairStyle = app?.hairStyle ?? ((hash >> 3) % 8);
  const hairColor = app?.hairColor ?? HAIR_COLORS[(hash >> 6) % HAIR_COLORS.length];
  const hasBeard = app?.beard ?? (((hash >> 9) % 4) === 0);
  const hasHeadband = app?.headband ?? false;

  const shirtMain =
    kitPrimary ??
    (player.position === 'GOL'
      ? '#eab308'
      : player.overall >= 85
      ? '#10b981'
      : '#334155');
  const shirtTrim =
    kitSecondary ?? (player.position === 'GOL' ? '#0f172a' : '#f8fafc');

  const dims =
    size === 'xs'
      ? 'w-7 h-7'
      : size === 'sm'
      ? 'w-9 h-9'
      : size === 'md'
      ? 'w-11 h-11'
      : size === 'lg'
      ? 'w-16 h-16'
      : 'w-22 h-22';

  const clipId = `pes-clip-${hash}-${size}-${app?.skin ?? 'h'}`;

  return (
    <div
      className={`${dims} rounded-full bg-gradient-to-b from-[#1A2332] via-[#111824] to-[#080B10] border border-white/15 shadow-inner overflow-hidden shrink-0 select-none relative`}
      title={player.name}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="49" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <circle cx="50" cy="36" r="34" fill="rgba(16, 185, 129, 0.08)" />

          {/* Cabelo longo atrás da cabeça (estilo Haaland) */}
          {hairStyle === 6 && (
            <path
              d="M 27 32 C 25 50, 26 68, 34 73 L 66 73 C 74 68, 75 50, 73 32 C 70 15, 30 15, 27 32 Z"
              fill={hairColor}
            />
          )}

          {/* Ombros e Camisa PES */}
          <path
            d="M 14 102 C 16 76, 30 69, 50 69 C 70 69, 84 76, 86 102 Z"
            fill={shirtMain}
          />
          <path d="M 19 88 L 34 71 L 39 73 L 23 93 Z" fill={shirtTrim} opacity="0.88" />
          <path d="M 81 88 L 66 71 L 61 73 L 77 93 Z" fill={shirtTrim} opacity="0.88" />
          <path
            d="M 50 72 L 50 102 L 86 102 C 84 76, 70 69, 50 69 Z"
            fill="rgba(0,0,0,0.16)"
          />

          {/* Pescoço */}
          <rect x="42" y="57" width="16" height="17" rx="6" fill={skin.shadow} />

          {/* Gola V */}
          <path
            d="M 38 69 L 50 82 L 62 69 L 57 67 L 50 76 L 43 67 Z"
            fill={shirtTrim}
          />

          {/* Orelhas */}
          <ellipse cx="31.5" cy="43" rx="3.2" ry="5.5" fill={skin.shadow} />
          <ellipse cx="68.5" cy="43" rx="3.2" ry="5.5" fill={skin.shadow} />

          {/* Rosto estilo PES */}
          <path
            d="M 33 34 C 33 21, 67 21, 67 34 L 66 48 C 65 58, 57 63, 50 63 C 43 63, 35 58, 34 48 Z"
            fill={skin.base}
          />
          <path
            d="M 50 23 C 62 23, 67 27, 67 34 L 66 48 C 65 58, 57 63, 50 63 Z"
            fill={skin.shadow}
            opacity="0.22"
          />

          {/* Traços faciais limpos */}
          <path d="M 39 39 L 46 38.5" stroke="#1E1B18" strokeWidth="1.9" strokeLinecap="round" opacity="0.7" />
          <path d="M 54 38.5 L 61 39" stroke="#1E1B18" strokeWidth="1.9" strokeLinecap="round" opacity="0.7" />
          <circle cx="42.5" cy="42.5" r="1.5" fill="#1E1B18" opacity="0.75" />
          <circle cx="57.5" cy="42.5" r="1.5" fill="#1E1B18" opacity="0.75" />
          <path d="M 50 42 L 49 48.5 L 51.5 49" fill="none" stroke={skin.shadow} strokeWidth="1.4" strokeLinecap="round" />
          <path d="M 45.5 53.5 Q 50 55 54.5 53.5" fill="none" stroke={skin.shadow} strokeWidth="1.6" strokeLinecap="round" />

          {/* Barba */}
          {hasBeard && (
            <path
              d="M 35 49 C 36 58, 43 63, 50 63 C 57 63, 64 58, 65 49 C 63 54, 57 57, 50 57 C 43 57, 37 54, 35 49 Z"
              fill={hairColor}
              opacity="0.76"
            />
          )}

          {/* 8 Estilos de Cabelo */}
          {hairStyle === 0 && (
            <path
              d="M 33 34 C 33 20, 67 20, 67 34 C 63 28, 56 26, 50 26 C 44 26, 37 28, 33 34 Z"
              fill={hairColor}
              opacity="0.92"
            />
          )}
          {hairStyle === 1 && (
            <path
              d="M 33 35 C 32 23, 41 15, 53 16 C 63 17, 68 24, 67 35 C 64 28, 58 25, 48 25 C 40 25, 36 29, 33 35 Z"
              fill={hairColor}
            />
          )}
          {hairStyle === 2 && (
            <path
              d="M 30 37 C 28 24, 36 14, 50 14 C 64 14, 72 24, 70 37 C 66 30, 61 27, 50 27 C 39 27, 34 30, 30 37 Z"
              fill={hairColor}
            />
          )}
          {hairStyle === 3 && (
            <path
              d="M 32 36 C 32 19, 44 17, 55 18 C 65 19, 68 27, 67 36 C 64 29, 57 27, 45 27 C 39 27, 35 31, 32 36 Z"
              fill={hairColor}
            />
          )}
          {hairStyle === 4 && (
            <path
              d="M 32 41 C 30 22, 40 16, 50 16 C 60 16, 70 22, 68 41 C 66 31, 61 25, 50 25 C 39 25, 34 31, 32 41 Z"
              fill={hairColor}
            />
          )}
          {hairStyle === 5 && (
            <path
              d="M 32 34 C 32 19, 42 15, 50 15 C 58 15, 68 19, 68 34 Z"
              fill={hairColor}
            />
          )}
          {hairStyle === 6 && (
            <path
              d="M 31 35 C 31 18, 43 15, 50 15 C 57 15, 69 18, 69 35 C 64 27, 57 25, 50 25 C 43 25, 36 27, 31 35 Z"
              fill={hairColor}
            />
          )}
          {hairStyle === 7 && (
            /* Tranças / cachos modernos (Yamal / Depay / Davies) */
            <>
              <path
                d="M 29 36 C 28 21, 37 13, 50 13 C 63 13, 72 21, 71 36 C 67 28, 60 26, 50 26 C 40 26, 33 28, 29 36 Z"
                fill={hairColor}
              />
              <circle cx="35" cy="24" r="4.5" fill={hairColor} />
              <circle cx="44" cy="20" r="4.5" fill={hairColor} />
              <circle cx="56" cy="20" r="4.5" fill={hairColor} />
              <circle cx="65" cy="24" r="4.5" fill={hairColor} />
            </>
          )}

          {/* Faixa esportiva opcional (Haaland / Depay) */}
          {hasHeadband && (
            <rect x="32.5" y="25.5" width="35" height="4" rx="2" fill={shirtTrim} opacity="0.95" />
          )}
        </g>
      </svg>
    </div>
  );
};

export const ControllerTag: React.FC<{ club: Club; compact?: boolean }> = ({
  club,
  compact = false,
}) => {
  if (club.controller === 'human') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
        {club.isAdmin ? <Crown className="w-3 h-3 text-amber-400" /> : <User className="w-3 h-3" />}
        {club.isAdmin ? 'Admin' : 'Humano'}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-300 border border-white/10">
      <Bot className="w-3 h-3 text-sky-400" />
      {compact ? 'Bot' : PERSONALITY_LABELS[club.botPersonality]}
    </span>
  );
};

function normalizeCountryKey(raw?: string): string {
  const s = (raw ?? 'Brasil')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const map: Record<string, string> = {
    brazil: 'brasil',
    brasil: 'brasil',
    argentina: 'argentina',
    uruguay: 'uruguai',
    uruguai: 'uruguai',
    colombia: 'colombia',
    paraguay: 'paraguai',
    paraguai: 'paraguai',
    ecuador: 'equador',
    equador: 'equador',
    chile: 'chile',
    peru: 'peru',
    venezuela: 'venezuela',
    bolivia: 'bolivia',
    panama: 'panama',
    mexico: 'mexico',
    france: 'franca',
    franca: 'franca',
    norway: 'noruega',
    noruega: 'noruega',
    england: 'inglaterra',
    inglaterra: 'inglaterra',
    spain: 'espanha',
    espanha: 'espanha',
    egypt: 'egito',
    egito: 'egito',
    germany: 'alemanha',
    alemanha: 'alemanha',
    netherlands: 'holanda',
    holanda: 'holanda',
    belgium: 'belgica',
    belgica: 'belgica',
    morocco: 'marrocos',
    marrocos: 'marrocos',
    portugal: 'portugal',
    italy: 'italia',
    italia: 'italia',
    croatia: 'croacia',
    croacia: 'croacia',
    denmark: 'dinamarca',
    dinamarca: 'dinamarca',
    canada: 'canada',
    'dr congo': 'rd congo',
    'rd congo': 'rd congo',
  };
  return map[s] ?? s;
}

export const CountryFlag: React.FC<{
  nationality?: string;
  className?: string;
}> = ({
  nationality = 'Brasil',
  className = 'w-4 h-[11px] rounded-[2px] inline-block shrink-0 align-middle shadow-[0_0_0_0.5px_rgba(255,255,255,0.22)]',
}) => {
  const key = normalizeCountryKey(nationality);

  const renderShapes = () => {
    switch (key) {
      case 'brasil':
        return (
          <>
            <rect width="24" height="16" fill="#009B3A" />
            <polygon points="12,2 21.5,8 12,14 2.5,8" fill="#FEDF00" />
            <circle cx="12" cy="8" r="3.4" fill="#002776" />
            <path d="M 8.9 7.6 Q 12 6.8 15.1 8.4" stroke="#FFFFFF" strokeWidth="0.7" fill="none" />
          </>
        );
      case 'argentina':
        return (
          <>
            <rect width="24" height="16" fill="#74ACDF" />
            <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
            <circle cx="12" cy="8" r="1.7" fill="#F6B40E" />
          </>
        );
      case 'uruguai':
        return (
          <>
            <rect width="24" height="16" fill="#FFFFFF" />
            <rect y="2" width="24" height="2" fill="#0038A8" />
            <rect y="6" width="24" height="2" fill="#0038A8" />
            <rect y="10" width="24" height="2" fill="#0038A8" />
            <rect y="14" width="24" height="2" fill="#0038A8" />
            <rect width="10" height="8" fill="#FFFFFF" />
            <circle cx="5" cy="4" r="2.1" fill="#FCD116" />
          </>
        );
      case 'colombia':
        return (
          <>
            <rect width="24" height="8" fill="#FCD116" />
            <rect y="8" width="24" height="4" fill="#003893" />
            <rect y="12" width="24" height="4" fill="#CE1126" />
          </>
        );
      case 'equador':
        return (
          <>
            <rect width="24" height="8" fill="#FFD100" />
            <rect y="8" width="24" height="4" fill="#0072CE" />
            <rect y="12" width="24" height="4" fill="#EF3340" />
            <circle cx="12" cy="8" r="1.7" fill="#8B5A2B" />
          </>
        );
      case 'paraguai':
        return (
          <>
            <rect width="24" height="5.33" fill="#D52B1E" />
            <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
            <rect y="10.67" width="24" height="5.33" fill="#0038A8" />
            <circle cx="12" cy="8" r="1.4" fill="#EAB308" />
          </>
        );
      case 'chile':
        return (
          <>
            <rect width="24" height="8" fill="#FFFFFF" />
            <rect y="8" width="24" height="8" fill="#D52B1E" />
            <rect width="9" height="8" fill="#0039A6" />
            <polygon points="4.5,2 5.2,3.8 7,3.8 5.5,4.9 6.1,6.6 4.5,5.6 2.9,6.6 3.5,4.9 2,3.8 3.8,3.8" fill="#FFFFFF" />
          </>
        );
      case 'peru':
        return (
          <>
            <rect width="8" height="16" fill="#D91023" />
            <rect x="8" width="8" height="16" fill="#FFFFFF" />
            <rect x="16" width="8" height="16" fill="#D91023" />
          </>
        );
      case 'venezuela':
        return (
          <>
            <rect width="24" height="5.33" fill="#CF142B" />
            <rect width="24" height="10.67" fill="#00247D" />
            <rect width="24" height="5.33" fill="#FFCC00" />
            <circle cx="12" cy="8" r="0.7" fill="#FFFFFF" />
            <circle cx="9.6" cy="8.5" r="0.6" fill="#FFFFFF" />
            <circle cx="14.4" cy="8.5" r="0.6" fill="#FFFFFF" />
          </>
        );
      case 'bolivia':
        return (
          <>
            <rect width="24" height="5.33" fill="#D52B1E" />
            <rect y="5.33" width="24" height="5.34" fill="#F9E300" />
            <rect y="10.67" width="24" height="5.33" fill="#007934" />
          </>
        );
      case 'panama':
        return (
          <>
            <rect width="12" height="8" fill="#FFFFFF" />
            <rect x="12" width="12" height="8" fill="#D21034" />
            <rect y="8" width="12" height="8" fill="#005293" />
            <rect x="12" y="8" width="12" height="8" fill="#FFFFFF" />
            <circle cx="6" cy="4" r="1.4" fill="#005293" />
            <circle cx="18" cy="12" r="1.4" fill="#D21034" />
          </>
        );
      case 'mexico':
        return (
          <>
            <rect width="8" height="16" fill="#006847" />
            <rect x="8" width="8" height="16" fill="#FFFFFF" />
            <rect x="16" width="8" height="16" fill="#CE1126" />
            <circle cx="12" cy="8" r="1.8" fill="#6D4C2F" />
          </>
        );
      case 'franca':
        return (
          <>
            <rect width="8" height="16" fill="#0055A4" />
            <rect x="8" width="8" height="16" fill="#FFFFFF" />
            <rect x="16" width="8" height="16" fill="#EF4135" />
          </>
        );
      case 'italia':
        return (
          <>
            <rect width="8" height="16" fill="#009246" />
            <rect x="8" width="8" height="16" fill="#FFFFFF" />
            <rect x="16" width="8" height="16" fill="#CE2B37" />
          </>
        );
      case 'portugal':
        return (
          <>
            <rect width="9" height="16" fill="#006600" />
            <rect x="9" width="15" height="16" fill="#FF0000" />
            <circle cx="9" cy="8" r="2.6" fill="#FFFF00" />
          </>
        );
      case 'espanha':
        return (
          <>
            <rect width="24" height="16" fill="#AA151B" />
            <rect y="4" width="24" height="8" fill="#F1BF00" />
            <rect x="5.5" y="6" width="2.5" height="3.5" fill="#AA151B" />
          </>
        );
      case 'inglaterra':
        return (
          <>
            <rect width="24" height="16" fill="#FFFFFF" />
            <rect x="10" width="4" height="16" fill="#CE1124" />
            <rect y="6" width="24" height="4" fill="#CE1124" />
          </>
        );
      case 'alemanha':
        return (
          <>
            <rect width="24" height="5.33" fill="#000000" />
            <rect y="5.33" width="24" height="5.34" fill="#DD0000" />
            <rect y="10.67" width="24" height="5.33" fill="#FFCE00" />
          </>
        );
      case 'holanda':
        return (
          <>
            <rect width="24" height="5.33" fill="#AE1C28" />
            <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
            <rect y="10.67" width="24" height="5.33" fill="#21468B" />
          </>
        );
      case 'belgica':
        return (
          <>
            <rect width="8" height="16" fill="#000000" />
            <rect x="8" width="8" height="16" fill="#FDDA24" />
            <rect x="16" width="8" height="16" fill="#EF3340" />
          </>
        );
      case 'noruega':
        return (
          <>
            <rect width="24" height="16" fill="#BA0C2F" />
            <rect x="6.5" width="4.5" height="16" fill="#FFFFFF" />
            <rect y="5.75" width="24" height="4.5" fill="#FFFFFF" />
            <rect x="7.5" width="2.5" height="16" fill="#00205B" />
            <rect y="6.75" width="24" height="2.5" fill="#00205B" />
          </>
        );
      case 'dinamarca':
        return (
          <>
            <rect width="24" height="16" fill="#C60C30" />
            <rect x="7" width="3" height="16" fill="#FFFFFF" />
            <rect y="6.5" width="24" height="3" fill="#FFFFFF" />
          </>
        );
      case 'croacia':
        return (
          <>
            <rect width="24" height="5.33" fill="#FF0000" />
            <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
            <rect y="10.67" width="24" height="5.33" fill="#171796" />
            <rect x="9.5" y="5.3" width="5" height="5" fill="#FF0000" />
          </>
        );
      case 'egito':
        return (
          <>
            <rect width="24" height="5.33" fill="#CE1126" />
            <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
            <rect y="10.67" width="24" height="5.33" fill="#000000" />
            <circle cx="12" cy="8" r="1.4" fill="#C09300" />
          </>
        );
      case 'marrocos':
        return (
          <>
            <rect width="24" height="16" fill="#C1272D" />
            <polygon points="12,4.2 13,7 16,7 13.6,8.7 14.5,11.5 12,9.8 9.5,11.5 10.4,8.7 8,7 11,7" fill="none" stroke="#006233" strokeWidth="1.2" />
          </>
        );
      case 'canada':
        return (
          <>
            <rect width="6" height="16" fill="#FF0000" />
            <rect x="6" width="12" height="16" fill="#FFFFFF" />
            <rect x="18" width="6" height="16" fill="#FF0000" />
            <polygon points="12,4.5 13.4,7.5 15.5,7 14,9.5 14.6,11.5 12,10.5 9.4,11.5 10,9.5 8.5,7 10.6,7.5" fill="#FF0000" />
          </>
        );
      case 'rd congo':
        return (
          <>
            <rect width="24" height="16" fill="#007FFF" />
            <line x1="0" y1="16" x2="24" y2="0" stroke="#F7D618" strokeWidth="4.2" />
            <line x1="0" y1="16" x2="24" y2="0" stroke="#CE1021" strokeWidth="2.4" />
            <circle cx="4.5" cy="4" r="1.5" fill="#F7D618" />
          </>
        );
      default:
        return (
          <>
            <rect width="24" height="16" fill="#0f766e" />
            <circle cx="12" cy="8" r="3.5" fill="#eab308" />
          </>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 24 16"
      role="img"
      aria-label={nationality}
      className={className}
    >
      <title>{nationality}</title>
      {renderShapes()}
    </svg>
  );
};
