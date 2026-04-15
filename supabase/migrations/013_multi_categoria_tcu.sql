-- ============================================================
-- Migração 013: Suporte Multi-Categoria TCU
-- Expande a tabela jurisprudencia para armazenar os campos
-- específicos de todas as 7 categorias dos Dados Abertos do TCU:
--   Acórdãos, Jurisprudência Selecionada, Respostas a Consultas,
--   Súmulas, Boletim de Jurisprudência, Boletim de Pessoal,
--   Informativo de Licitações e Contratos.
-- ============================================================

ALTER TABLE jurisprudencia
  -- ── Campos comuns a múltiplas categorias ────────────────────
  ADD COLUMN IF NOT EXISTS titulo           text,           -- TITULO (acórdão, boletins, informativo)
  ADD COLUMN IF NOT EXISTS excerto          text,           -- SUMARIO (acórdão), EXCERTO (juris/consulta/súmula), TEXTOINFO (informativo)
  ADD COLUMN IF NOT EXISTS area             text,           -- AREA (juris_selecionada, consulta, súmula)
  ADD COLUMN IF NOT EXISTS tema             text,           -- TEMA (juris_selecionada, consulta, súmula)
  ADD COLUMN IF NOT EXISTS tipo_processo    text,           -- TIPOPROCESSO (acórdão, juris, consulta, súmula)
  ADD COLUMN IF NOT EXISTS situacao         text,           -- SITUACAO (acórdão), VIGENTE (súmula)
  ADD COLUMN IF NOT EXISTS indexacao        text,           -- INDEXACAO (juris_selecionada, consulta, súmula)
  ADD COLUMN IF NOT EXISTS referencia_legal text,           -- REFERENCIALEGAL (juris/consulta/súmula), REFERENCIA (boletins)

  -- ── Exclusivos de Acórdãos ───────────────────────────────────
  ADD COLUMN IF NOT EXISTS num_ata          text,           -- NUMATA
  ADD COLUMN IF NOT EXISTS interessados     text,           -- INTERESSADOS
  ADD COLUMN IF NOT EXISTS entidade         text,           -- ENTIDADE
  ADD COLUMN IF NOT EXISTS unidade_tecnica  text,           -- UNIDADETECNICA
  ADD COLUMN IF NOT EXISTS decisao          text,           -- DECISAO
  ADD COLUMN IF NOT EXISTS quorum           text,           -- QUORUM
  ADD COLUMN IF NOT EXISTS relatorio        text,           -- RELATORIO (texto longo)
  ADD COLUMN IF NOT EXISTS voto             text,           -- VOTO (texto longo)

  -- ── Campo flexível para metadados extras ─────────────────────
  ADD COLUMN IF NOT EXISTS metadata         jsonb DEFAULT '{}';

-- ── Índices para filtros e buscas ──────────────────────────────

-- GIN no JSONB (suporte a operadores @> e ?)
CREATE INDEX IF NOT EXISTS idx_juris_metadata
  ON jurisprudencia USING GIN (metadata);

-- Índices B-tree para filtros comuns na UI
CREATE INDEX IF NOT EXISTS idx_juris_area
  ON jurisprudencia (area)
  WHERE area IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_juris_tema
  ON jurisprudencia (tema)
  WHERE tema IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_juris_tipo_processo
  ON jurisprudencia (tipo_processo)
  WHERE tipo_processo IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_juris_situacao
  ON jurisprudencia (situacao)
  WHERE situacao IS NOT NULL;

-- ── Reconstruir índice FTS para cobrir os novos campos ─────────
-- Remove o índice antigo (se existir) e cria um novo ponderado.
-- Pesos: A = título/ementa (mais relevante), B = excerto/indexação,
--        C = conteúdo completo, D = número
DROP INDEX IF EXISTS idx_jurisprudencia_fts_full;
DROP INDEX IF EXISTS idx_juris_ementa_fts;

CREATE INDEX idx_jurisprudencia_fts_full
  ON jurisprudencia
  USING GIN ((
    setweight(to_tsvector('portuguese', coalesce(titulo,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(ementa,    '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(excerto,   '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(indexacao, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(conteudo,  '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(numero,    '')), 'D')
  ));
