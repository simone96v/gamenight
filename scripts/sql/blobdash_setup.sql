-- Migration: Blob Dash - tabella leaderboard + estensione RPC submit_score.
--
-- Crea `blobdash_scores` (one row per device, best score) con stessa shape
-- di blobjump_scores / flappyblob_scores / catchblob_scores / snake_scores.
-- Aggiunge il game 'blobdash' al case statement della RPC submit_score.
--
-- Apply: copia-incolla nello SQL Editor di Supabase, oppure usa il MCP
-- supabase apply_migration.

-- ── 1. Tabella ─────────────────────────────────────────────
create table if not exists public.blobdash_scores (
  device_id    text primary key,
  player_name  text not null,
  score        integer not null check (score >= 0),
  color        text,
  source       text not null default 'solo'
               check (source in ('solo','online')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.blobdash_scores is
  'Classifica globale Blob Dash. Una riga per device. Scrittura solo via submit_score().';

-- ── 2. RLS + policy public read ───────────────────────────
alter table public.blobdash_scores enable row level security;

drop policy if exists "blobdash_scores select public" on public.blobdash_scores;
create policy "blobdash_scores select public"
  on public.blobdash_scores
  for select
  to anon, authenticated
  using (true);

-- ── 3. Estensione RPC submit_score ────────────────────────
-- Stessa definizione esistente con 'blobdash' aggiunto al case. Max score
-- allineato a blobjump (100000m) — endless con scroll progressivo, run lunghe
-- restano comunque rare.
create or replace function public.submit_score(
  p_game text,
  p_device_id text,
  p_player_name text,
  p_score integer,
  p_color text default null::text,
  p_source text default 'solo'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_max_score    integer;
  v_table_name   text;
  v_prev_score   integer;
  v_prev_updated timestamptz;
  v_clean_name   text;
  v_clean_color  text;
  v_clean_source text;
begin
  v_max_score := case p_game
    when 'blobjump'   then 100000
    when 'flappyblob' then 10000
    when 'catchblob'  then 50000
    when 'snake'      then 500
    when 'blobdash'   then 100000
    else null
  end;
  if v_max_score is null then raise exception 'invalid_game' using errcode = 'P0001'; end if;

  if p_score is null or p_score < 0 or p_score > v_max_score then
    raise exception 'invalid_score' using errcode = 'P0001';
  end if;

  if p_device_id is null or length(p_device_id) < 8 or length(p_device_id) > 80 then
    raise exception 'invalid_device' using errcode = 'P0001';
  end if;

  v_clean_name   := left(coalesce(nullif(trim(p_player_name), ''), 'Anonimo'), 24);
  v_clean_color  := case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else null end;
  v_clean_source := case when p_source in ('solo','online') then p_source else 'solo' end;
  v_table_name   := p_game || '_scores';

  execute format('select score, updated_at from public.%I where device_id = $1', v_table_name)
    into v_prev_score, v_prev_updated
    using p_device_id;

  if v_prev_score is not null then
    if p_score <= v_prev_score then
      return jsonb_build_object('promoted', false, 'newBest', v_prev_score, 'previousScore', v_prev_score);
    end if;
    if v_prev_updated > now() - interval '2 seconds' then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
    if p_score > v_prev_score * 3 + 50 then
      raise exception 'implausible_jump' using errcode = 'P0001';
    end if;
  end if;

  execute format($f$
    insert into public.%I (device_id, player_name, score, color, source, updated_at)
    values ($1, $2, $3, $4, $5, now())
    on conflict (device_id) do update
      set player_name = excluded.player_name,
          score       = greatest(public.%I.score, excluded.score),
          color       = coalesce(excluded.color, public.%I.color),
          source      = excluded.source,
          updated_at  = now()
  $f$, v_table_name, v_table_name, v_table_name)
  using p_device_id, v_clean_name, p_score, v_clean_color, v_clean_source;

  return jsonb_build_object('promoted', true, 'newBest', p_score, 'previousScore', coalesce(v_prev_score, -1));
end;
$function$;
