-- Migration: Emoji Quiz - tabella puzzle bank.
--
-- Crea `emoji_puzzles` con tutti i puzzle del minigame Emoji Quiz.
-- Il client legge da qui all'avvio della partita (l'host condivide il deck
-- via gameState ai client, quindi non serve RLS strict — public SELECT ok).
--
-- Apply: copia-incolla questo file nello SQL Editor di Supabase, oppure
-- usa `supabase db push` se hai il CLI configurato.

create table if not exists public.emoji_puzzles (
  id          text primary key,
  emoji       text not null,
  title       text not null,
  category    text not null check (category in ('Film', 'Canzone')),
  difficulty  int  not null check (difficulty between 1 and 3),
  hint        text,
  answers     jsonb not null, -- array di varianti accettate (lowercase)
  created_at  timestamptz default now()
);

-- Allow public read (anonymous client legge i puzzle).
-- RLS abilitata ma policy permissiva su SELECT.
alter table public.emoji_puzzles enable row level security;

drop policy if exists "emoji_puzzles_public_read" on public.emoji_puzzles;
create policy "emoji_puzzles_public_read"
  on public.emoji_puzzles
  for select
  to anon, authenticated
  using (true);

-- ─── Seed ─────────────────────────────────────────────────────────────────

insert into public.emoji_puzzles (id, emoji, title, category, difficulty, hint, answers)
values
  ('p1',  '🦁👑',     'Il Re Leone',             'Film',    1, 'Cartone Disney ambientato nella savana',     '["il re leone","re leone","lion king"]'::jsonb),
  ('p2',  '🚢🧊💔',   'Titanic',                 'Film',    1, 'Una nave, un iceberg, 1997',                 '["titanic"]'::jsonb),
  ('p3',  '👻🔫',     'Ghostbusters',            'Film',    2, 'Chi chiamerai?',                             '["ghostbusters","acchiappafantasmi"]'::jsonb),
  ('p4',  '🐠🔍',     'Alla ricerca di Nemo',    'Film',    1, 'Un pesce pagliaccio si perde nell''oceano',  '["alla ricerca di nemo","nemo","finding nemo"]'::jsonb),
  ('p5',  '🧙‍♂️💍🌋', 'Il Signore degli Anelli', 'Film',    2, 'Un anello da gettare nel Monte Fato',        '["il signore degli anelli","signore degli anelli","lord of the rings"]'::jsonb),
  ('p6',  '🦖🏝️',     'Jurassic Park',           'Film',    2, 'Un parco con dinosauri clonati',             '["jurassic park"]'::jsonb),
  ('p7',  '🤖🌱❤️',   'WALL·E',                  'Film',    2, 'Un robottino spazzino innamorato',           '["wall-e","walle","wall e"]'::jsonb),
  ('p8',  '👽📞🏠',   'E.T.',                    'Film',    2, '«Telefono... casa»',                         '["e.t.","et","extra terrestre","et l''extraterrestre"]'::jsonb),
  ('p9',  '🃏🤡',     'Joker',                   'Film',    2, 'L''origine di un villain di Gotham',         '["joker"]'::jsonb),
  ('p10', '❄️👸⛄',   'Frozen',                  'Film',    1, 'Due sorelle e un pupazzo di neve',           '["frozen","il regno di ghiaccio","regno di ghiaccio"]'::jsonb),
  ('p11', '🐭👨‍🍳🍝', 'Ratatouille',             'Film',    2, 'Un topo che cucina a Parigi',                '["ratatouille"]'::jsonb),
  ('p12', '🏴‍☠️💀⚓', 'Pirati dei Caraibi',      'Film',    2, 'Il capitano è Jack Sparrow',                 '["pirati dei caraibi","pirates of the caribbean"]'::jsonb),
  ('p13', '👶🦈',     'Baby Shark',              'Canzone', 1, 'Tormentone per bambini, doo doo doo',         '["baby shark"]'::jsonb),
  ('p14', '👁️🐅',     'Eye of the Tiger',        'Canzone', 2, 'Il tema musicale di Rocky',                  '["eye of the tiger","occhio della tigre"]'::jsonb),
  ('p15', '💃🪩👑',   'Dancing Queen',           'Canzone', 3, 'Una hit intramontabile degli ABBA',          '["dancing queen"]'::jsonb),
  ('p16', '🌧️💜',     'Purple Rain',             'Canzone', 3, 'Brano iconico di Prince',                    '["purple rain"]'::jsonb),
  ('p17', '🚀👨‍🚀',   'Rocket Man',              'Canzone', 3, 'Un classico spaziale di Elton John',         '["rocket man","rocketman"]'::jsonb)
on conflict (id) do update set
  emoji      = excluded.emoji,
  title      = excluded.title,
  category   = excluded.category,
  difficulty = excluded.difficulty,
  hint       = excluded.hint,
  answers    = excluded.answers;
