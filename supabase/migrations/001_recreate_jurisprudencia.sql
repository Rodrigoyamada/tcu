-- ============================================================
-- Migração 001: Reestruturação do banco de dados TCU
-- Baseado nas categorias do portal de Dados Abertos do TCU
-- https://sites.tcu.gov.br/dados-abertos/jurisprudencia/
-- ============================================================

-- ── 1. Enum de categorias ─────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE categoria_tcu AS ENUM (
    'acordao',
    'sumula',
    'jurisprudencia_selecionada',
    'consulta',
    'publicacao_boletim_jurisprudencia',
    'publicacao_boletim_pessoal',
    'publicacao_informativo_licitacoes'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. Tabela principal de jurisprudência ─────────────────────
-- DROP TABLE IF EXISTS jurisprudencia;  -- descomente SE quiser recriar do zero

CREATE TABLE IF NOT EXISTS jurisprudencia (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        categoria_tcu NOT NULL DEFAULT 'acordao',

  -- Identificação
  numero      text,
  ano         smallint GENERATED ALWAYS AS (
                CASE
                  WHEN data_pub IS NOT NULL
                  THEN EXTRACT(YEAR FROM data_pub)::smallint
                  ELSE NULL
                END
              ) STORED,

  -- Autoria / instância
  relator     text,
  orgao       text,     -- Plenário, 1ª Câmara, 2ª Câmara…

  -- Conteúdo
  data_pub    date,
  ementa      text,     -- Resumo / assunto (busca semântica)
  conteudo    text,     -- Texto completo (para RAG/vetorização)
  url         text,     -- Link original no TCU

  -- Controle
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Índices de performance ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_juris_tipo     ON jurisprudencia (tipo);
CREATE INDEX IF NOT EXISTS idx_juris_ano      ON jurisprudencia (ano);
CREATE INDEX IF NOT EXISTS idx_juris_orgao    ON jurisprudencia (orgao);
CREATE INDEX IF NOT EXISTS idx_juris_data_pub ON jurisprudencia (data_pub);

-- Índice de texto livre para busca rápida em ementa
CREATE INDEX IF NOT EXISTS idx_juris_ementa_fts
  ON jurisprudencia
  USING gin(to_tsvector('portuguese', coalesce(ementa, '')));

-- ── 4. Trigger de updated_at ──────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_juris_updated_at ON jurisprudencia;
CREATE TRIGGER trg_juris_updated_at
  BEFORE UPDATE ON jurisprudencia
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. Tabela de metadados de arquivos CSV (Storage) ──────────
CREATE TABLE IF NOT EXISTS arquivos_tcu (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_arquivo         text NOT NULL,
  categoria            categoria_tcu NOT NULL,
  ano                  smallint,
  url_storage          text NOT NULL,   -- path no Supabase Storage
  tamanho_bytes        bigint,
  status_processamento text NOT NULL DEFAULT 'pendente'
                         CHECK (status_processamento IN ('pendente', 'processando', 'concluido', 'erro')),
  registros_importados int DEFAULT 0,
  erro_detalhe         text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arquivos_categoria ON arquivos_tcu (categoria);
CREATE INDEX IF NOT EXISTS idx_arquivos_status     ON arquivos_tcu (status_processamento);

DROP TRIGGER IF EXISTS trg_arquivos_updated_at ON arquivos_tcu;
CREATE TRIGGER trg_arquivos_updated_at
  BEFORE UPDATE ON arquivos_tcu
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. Tabela de perfis de importação (mantida) ──────────────
CREATE TABLE IF NOT EXISTS import_profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  columns    text[] NOT NULL DEFAULT '{}',
  mapping    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── 7. RLS – Row Level Security ──────────────────────────────
ALTER TABLE jurisprudencia  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos_tcu    ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_profiles ENABLE ROW LEVEL SECURITY;

-- Leitura pública dos dados (jurisprudência é informação pública)
DROP POLICY IF EXISTS "public_read_jurisprudencia" ON jurisprudencia;
CREATE POLICY "public_read_jurisprudencia"
  ON jurisprudencia FOR SELECT USING (true);

-- Escrita restrita a usuários autenticados
DROP POLICY IF EXISTS "auth_write_jurisprudencia" ON jurisprudencia;
CREATE POLICY "auth_write_jurisprudencia"
  ON jurisprudencia FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "auth_delete_jurisprudencia" ON jurisprudencia;
CREATE POLICY "auth_delete_jurisprudencia"
  ON jurisprudencia FOR DELETE USING (auth.role() = 'authenticated');

-- arquivos_tcu: somente usuários autenticados
DROP POLICY IF EXISTS "auth_all_arquivos" ON arquivos_tcu;
CREATE POLICY "auth_all_arquivos"
  ON arquivos_tcu FOR ALL USING (auth.role() = 'authenticated');

-- import_profiles: somente usuários autenticados
DROP POLICY IF EXISTS "auth_all_profiles" ON import_profiles;
CREATE POLICY "auth_all_profiles"
  ON import_profiles FOR ALL USING (auth.role() = 'authenticated');
