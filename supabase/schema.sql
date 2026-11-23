-- Schema para novo projeto Supabase dedicado ao Brasileirão PRO
-- Cole este SQL no SQL Editor do seu novo projeto Supabase (separado do TGLP).

create table if not exists public.leagues (
  id text primary key,
  invite_code text not null unique,
  state_json jsonb not null,
  updated_at timestamptz not null default now()
);

-- Trava atômica para a corrida de escolha de clubes:
-- quem inserir primeiro (league_id, club_id) fica com o clube!
create table if not exists public.club_claims (
  league_id text not null references public.leagues(id) on delete cascade,
  club_id text not null,
  participant_id text not null,
  participant_name text not null,
  claimed_at timestamptz not null default now(),
  primary key (league_id, club_id)
);

alter table public.leagues enable row level security;
alter table public.club_claims enable row level security;

-- Políticas abertas para entrada rápida com Nome + PIN (ou restrinja por JWT se preferir)
drop policy if exists "leagues_public_all" on public.leagues;
create policy "leagues_public_all" on public.leagues
  for all using (true) with check (true);

drop policy if exists "club_claims_public_all" on public.club_claims;
create policy "club_claims_public_all" on public.club_claims
  for all using (true) with check (true);

-- Fila atômica de ações remotas (táticas, substituições, lances, salários) entre aparelhos
create table if not exists public.league_actions (
  id bigserial primary key,
  league_id text not null references public.leagues(id) on delete cascade,
  actor_participant_id text not null,
  action_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.league_actions enable row level security;

drop policy if exists "league_actions_public_all" on public.league_actions;
create policy "league_actions_public_all" on public.league_actions
  for all using (true) with check (true);

-- Habilita Realtime para sincronizar escolhas de clubes, ações entre aparelhos e jogos ao vivo
alter publication supabase_realtime add table public.leagues;
alter publication supabase_realtime add table public.club_claims;
alter publication supabase_realtime add table public.league_actions;
