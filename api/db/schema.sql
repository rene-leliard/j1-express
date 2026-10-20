-- ─────────────────────────────────────────────────────────────────────────────
-- GG League · schéma de la base (le même qu'au J0, écrit en SQL cette fois).
-- Rejoué par « make db-reset » : les tables sont supprimées puis recréées.
-- Les colonnes sont en snake_case (convention SQL) ; l'API renvoie du camelCase.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE game (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(100) NOT NULL UNIQUE,
  genre     VARCHAR(20)  NOT NULL CHECK (genre IN ('moba', 'fps', 'fighting', 'sports', 'racing', 'strategy')),
  team_size INTEGER      NOT NULL CHECK (team_size BETWEEN 1 AND 10)
);

CREATE TABLE team (
  id      SERIAL PRIMARY KEY,
  name    VARCHAR(50) NOT NULL UNIQUE,
  tag     VARCHAR(5)  NOT NULL UNIQUE,
  country CHAR(2)     NOT NULL
);

CREATE TABLE player (
  id         SERIAL PRIMARY KEY,
  nickname   VARCHAR(30) NOT NULL UNIQUE,
  country    CHAR(2)     NOT NULL,
  role       VARCHAR(30),
  rating     INTEGER     NOT NULL DEFAULT 1000 CHECK (rating BETWEEN 0 AND 3000),
  birth_date DATE,
  -- une équipe supprimée rend ses joueurs « agents libres »
  team_id    INTEGER REFERENCES team (id) ON DELETE SET NULL
);

CREATE TABLE match (
  id        SERIAL PRIMARY KEY,
  team_a_id INTEGER NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  team_b_id INTEGER NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  score_a   INTEGER,
  score_b   INTEGER,
  winner_id INTEGER REFERENCES team (id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ,
  CHECK (team_a_id <> team_b_id)
);
