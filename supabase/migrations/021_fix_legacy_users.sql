-- ============================================================
-- DIAGNÓSTICO: Identifica usuários antigos sem auth.users
-- Execute no SQL Editor do Supabase ANTES de rodar a migração
-- ============================================================

-- 1. Quantos usuários existem no app_users (tabela legada)?
SELECT
    COUNT(*)                                            AS total_app_users,
    COUNT(CASE WHEN id ~ '^[0-9a-f-]{36}$' THEN 1 END) AS com_uuid_valido,
    COUNT(CASE WHEN id !~ '^[0-9a-f-]{36}$' THEN 1 END) AS legados_sem_uuid
FROM public.app_users;

-- --------------------------------------------------------
-- 2. Lista os usuários legados (id não é UUID)
-- --------------------------------------------------------
SELECT id, email, name, role, credits_balance, created_at
FROM public.app_users
WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY created_at DESC;

-- --------------------------------------------------------
-- 3. Usuários que JÁ estão no auth.users mas com discrepância no app_users
-- (têm UUID mas estão duplicados ou com dados divergentes)
-- --------------------------------------------------------
SELECT au.id, au.email, au.name, au.role,
       a.email AS auth_email,
       a.created_at AS auth_created_at
FROM public.app_users au
LEFT JOIN auth.users a ON au.id = a.id
WHERE au.id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND a.id IS NULL;  -- UUID no app_users mas SEM correspondente no auth.users

-- --------------------------------------------------------
-- 4. Após a migração: verifica consistência
--    (todos os app_users devem ter entrada em auth.users)
-- --------------------------------------------------------
-- SELECT
--     au.email,
--     CASE WHEN a.id IS NOT NULL THEN '✓ Sincronizado' ELSE '✗ Faltando no Auth' END AS status
-- FROM public.app_users au
-- LEFT JOIN auth.users a ON au.id = a.id
-- ORDER BY status, au.email;
