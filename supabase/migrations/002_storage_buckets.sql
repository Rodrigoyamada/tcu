-- ============================================================
-- Migração 002: Bucket de Storage para arquivos CSV do TCU
-- Estrutura de pastas conforme Dados Abertos do TCU
-- ============================================================

-- Criar bucket principal (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'jurisprudencia-tcu',
  'jurisprudencia-tcu',
  false,                        -- acesso privado (via signed URL)
  2147483648,                   -- 2 GB por arquivo
  ARRAY['text/csv', 'text/plain', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Políticas de Storage ──────────────────────────────────────

-- Leitura: qualquer usuário autenticado pode baixar
DROP POLICY IF EXISTS "auth_read_storage" ON storage.objects;
CREATE POLICY "auth_read_storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'jurisprudencia-tcu'
    AND auth.role() = 'authenticated'
  );

-- Upload: somente usuários autenticados
DROP POLICY IF EXISTS "auth_upload_storage" ON storage.objects;
CREATE POLICY "auth_upload_storage"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'jurisprudencia-tcu'
    AND auth.role() = 'authenticated'
  );

-- Delete: somente usuários autenticados
DROP POLICY IF EXISTS "auth_delete_storage" ON storage.objects;
CREATE POLICY "auth_delete_storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'jurisprudencia-tcu'
    AND auth.role() = 'authenticated'
  );

-- ── Estrutura de pastas (comentário de referência) ────────────
-- As pastas são criadas implicitamente ao fazer upload dos arquivos.
-- Estrutura esperada:
--
--  jurisprudencia-tcu/
--  ├── acordaos/
--  │   ├── acordaos_1996.csv
--  │   ├── acordaos_1997.csv
--  │   │   ...
--  │   └── acordaos_2025.csv
--  ├── sumulas/
--  │   └── sumulas.csv
--  ├── jurisprudencia_selecionada/
--  │   └── jurisprudencia_selecionada.csv
--  ├── consultas/
--  │   └── consultas.csv
--  └── publicacoes/
--      ├── boletim_jurisprudencia/
--      │   └── boletim_jurisprudencia.csv
--      ├── boletim_pessoal/
--      │   └── boletim_pessoal.csv
--      └── informativo_licitacoes/
--          └── informativo_licitacoes.csv
