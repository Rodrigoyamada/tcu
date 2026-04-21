-- 1. Adiciona coluna de créditos aos usuários (75 créditos grátis p/ ~5 pareceres)
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 75;

-- 2. Tabela de histórico (Ledger)
CREATE TABLE IF NOT EXISTS public.token_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positivo = Adição, Negativo = Consumo
    raw_tokens INTEGER,      -- Opcional, guarda os tokens exatos se foi uma cobrança gerada por IA
    description TEXT NOT NULL,
    parecer_id UUID,         -- Pode ficar nulo, e mesmo se deletar o parecer, não deve quebrar
    admin_id UUID,           -- Quem deu os créditos, se manual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativa Segurança (RLS) na nova tabela
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;

-- Usuários podem LER apenas os seus próprios ledgers
CREATE POLICY "Usuários podem ver seu próprio histórico de créditos"
    ON public.token_ledger FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Somente triggers e funções com role de Admin ou Bypass RLS podem dar INSERTS puros.
-- Usuário comum não pode dar INSERT na tabela ledger.

-- 3. Função Automática que o N8n (Backend) chamará para descontar tokens
CREATE OR REPLACE FUNCTION public.consume_tokens(
    p_user_id UUID,
    p_raw_tokens INTEGER,
    p_parecer_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Permite que a função burle RLS para gravar o ledger
AS $$
DECLARE
    v_credits_to_deduct INTEGER;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_parecer_uuid UUID;
BEGIN
    -- 1. Calcula o arredondamento: 11570 -> 11.57 -> 12.
    -- Usa CEIL. Divisão por 1000.0 garante o float no postgres.
    v_credits_to_deduct := CEIL(p_raw_tokens / 1000.0)::INTEGER;

    -- Converte text para uuid silenciosamente se possível
    BEGIN
        v_parecer_uuid := p_parecer_id::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_parecer_uuid := NULL;
    END;

    -- 2. Busca o saldo atual travando a linha (Evita race conditions se clicar 2x rápido)
    SELECT credits_balance INTO v_current_balance
    FROM public.app_users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado';
    END IF;

    -- 3. Calcula o novo salto
    v_new_balance := v_current_balance - v_credits_to_deduct;

    -- Aqui poderíamos barrar se v_new_balance < 0, mas como estamos cobrando DEPOIS da API rodar,
    -- o saldo do cara pode ficar negativo (ex: -2), o que fará ele assinar de qualquer forma antes de usar de novo.
    -- Isso garante que uma geração iniciada com saldo 1 não trave na hora de cobrar.

    -- 4. Atualiza o usuário
    UPDATE public.app_users
    SET credits_balance = v_new_balance
    WHERE id = p_user_id;

    -- 5. Grava no Livro (Ledger)
    INSERT INTO public.token_ledger (user_id, amount, raw_tokens, description, parecer_id)
    VALUES (p_user_id, -v_credits_to_deduct, p_raw_tokens, 'Consumo - Geração de Parecer AI', v_parecer_uuid);

    RETURN jsonb_build_object(
        'status', 'success',
        'credits_deducted', v_credits_to_deduct,
        'new_balance', v_new_balance
    );
END;
$$;


-- 4. Função para Administradores inserirem créditos manualmente
CREATE OR REPLACE FUNCTION public.admin_add_credits(
    p_target_user_id UUID,
    p_credits_amount INTEGER,
    p_admin_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_new_balance INTEGER;
BEGIN
    -- Verifica se quem tá chamando é de fato um Admin (ou Service Role no Supabase Client)
    -- Checa via app_users
    SELECT (role = 'admin') INTO v_is_admin
    FROM public.app_users
    WHERE id = p_admin_user_id;

    IF v_is_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Acesso negado: Somente administradores podem injetar créditos.';
    END IF;

    -- Atualiza e retorna saldo
    UPDATE public.app_users
    SET credits_balance = credits_balance + p_credits_amount
    WHERE id = p_target_user_id
    RETURNING credits_balance INTO v_new_balance;

    -- Registra na auditoria
    INSERT INTO public.token_ledger (user_id, amount, description, admin_id)
    VALUES (p_target_user_id, p_credits_amount, 'Adição de créditos efetuada por administrador', p_admin_user_id);

    RETURN jsonb_build_object(
        'status', 'success',
        'added', p_credits_amount,
        'new_balance', v_new_balance
    );
END;
$$;
