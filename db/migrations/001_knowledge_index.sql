-- Documentation knowledge index (docs/TECH.md 14).
--
-- {{EMBEDDING_DIMENSIONS}} is substituted by `npm run db:migrate`, which resolves
-- the real width from the configured embedding model rather than assuming one.
-- pgvector fixes a column's dimension at creation time, so a guessed number here
-- would have to be found and fixed after the first insert fails.
--
-- Safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS doc_chunks (
  id            bigserial PRIMARY KEY,
  source_path   text        NOT NULL,
  source_url    text        NOT NULL,
  title         text        NOT NULL,
  heading       text,
  service       text,
  platform      text,
  chunk_index   integer     NOT NULL,
  content       text        NOT NULL,
  content_hash  text        NOT NULL,
  embedding     vector({{EMBEDDING_DIMENSIONS}}) NOT NULL,
  indexed_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (source_path, chunk_index)
);

-- Incremental sync looks chunks up by file, then compares hashes.
CREATE INDEX IF NOT EXISTS doc_chunks_source_path_idx ON doc_chunks (source_path);

-- No index on `content`. The lexical arm matches with LIKE '%token%', and a
-- leading wildcard cannot use a btree, so such an index would never be read --
-- while a btree over full chunk text also fails outright on rows past the 2704
-- byte limit. At a few thousand chunks a sequential scan is well within budget.
-- A GIN pg_trgm index is the option if measurement ever justifies one.

-- No ANN index (HNSW/IVFFlat) yet. The corpus is small enough for exact search,
-- and docs/TECH.md 4.9 defers it until measured latency justifies it.
