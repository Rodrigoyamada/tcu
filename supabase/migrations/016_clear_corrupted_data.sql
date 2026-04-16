-- Migration: limpar todos os registros importados com encoding corrompido
-- para permitir re-importação limpa com encoding correto (UTF-8)

-- 1. Limpar todos os registros de jurisprudência
TRUNCATE TABLE public.jurisprudencia RESTART IDENTITY CASCADE;

-- 2. Limpar histórico de importações
TRUNCATE TABLE public.importacoes RESTART IDENTITY CASCADE;

-- 3. Confirmar
DO $$
BEGIN
    RAISE NOTICE 'Tabelas limpas. Pronto para re-importação com encoding correto.';
END $$;
