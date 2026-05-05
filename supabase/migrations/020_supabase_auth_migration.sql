-- ============================================================
-- MIGRAÇÃO: Supabase Auth Integration
-- Cria trigger para sincronizar auth.users → app_users
-- ============================================================

-- 1. Garante que a coluna id de app_users pode receber o UUID do auth.users
-- (Se a tabela já tiver dados, o ON CONFLICT DO NOTHING protege)

-- 2. Trigger: cria app_users automaticamente ao cadastrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.app_users (id, email, name, role, credits_balance)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        'user',
        75  -- créditos grátis de boas-vindas
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN new;
END;
$$;

-- Remove trigger antigo se existir e recria
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 3. Permissões RLS: app_users pode ser lida pelo próprio usuário
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário pode ler o próprio perfil" ON public.app_users;
CREATE POLICY "Usuário pode ler o próprio perfil"
ON public.app_users FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário pode atualizar o próprio perfil" ON public.app_users;
CREATE POLICY "Usuário pode atualizar o próprio perfil"
ON public.app_users FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 4. Admin pode ler/editar todos os usuários (necessário para o painel admin)
DROP POLICY IF EXISTS "Admin pode ler todos os usuários" ON public.app_users;
CREATE POLICY "Admin pode ler todos os usuários"
ON public.app_users FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.app_users au
        WHERE au.id = auth.uid() AND au.role = 'admin'
    )
);

NOTIFY pgrst, 'reload schema';
