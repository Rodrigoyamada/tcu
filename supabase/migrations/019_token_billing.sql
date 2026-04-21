-- 1. Adiciona coluna de créditos aos usuários (75 créditos grátis p/ ~5 pareceres)
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 75;

-- 2. Tabela de histórico (Ledger)
CREATE TABLE IF NOT EXISTS public.token_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    raw_tokens INTEGER,
    description TEXT NOT NULL,
    parecer_id UUID,
    admin_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.token_ledger ENABLE ROW LEVEL SECURITY;

-- Evita erro de policy duplicada
DROP POLICY IF EXISTS "Usuários podem ver seu próprio histórico" ON public.token_ledger;
CREATE POLICY "Usuários podem ver seu próprio histórico" ON public.token_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Função Automática de Consumo
CREATE OR REPLACE FUNCTION public.consume_tokens(
    p_user_id UUID,
    p_raw_tokens INTEGER,
    p_parecer_id TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_credits_to_deduct INTEGER;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_parecer_uuid UUID;
BEGIN
    v_credits_to_deduct := CEIL(p_raw_tokens / 1000.0)::INTEGER;
    
    BEGIN 
        v_parecer_uuid := p_parecer_id::UUID; 
    EXCEPTION WHEN OTHERS THEN 
        v_parecer_uuid := NULL; 
    END;

    -- Usando atribuição direta para evitar que o parser confunda com "SELECT INTO Tabela"
    v_current_balance := (SELECT credits_balance FROM public.app_users WHERE id = p_user_id FOR UPDATE LIMIT 1);
    
    IF v_current_balance IS NULL THEN 
        RAISE EXCEPTION 'Usuário não encontrado'; 
    END IF;
    
    v_new_balance := v_current_balance - v_credits_to_deduct;
    
    UPDATE public.app_users 
    SET credits_balance = v_new_balance 
    WHERE id = p_user_id;

    INSERT INTO public.token_ledger (user_id, amount, raw_tokens, description, parecer_id)
    VALUES (p_user_id, -v_credits_to_deduct, p_raw_tokens, 'Consumo de IA - Parecer', v_parecer_uuid);
    
    RETURN jsonb_build_object('status', 'success', 'credits_deducted', v_credits_to_deduct, 'new_balance', v_new_balance);
END; 
$$;

-- 4. Função para você inserir créditos via painel
CREATE OR REPLACE FUNCTION public.admin_add_credits(
    p_target_user_id UUID,
    p_credits_amount INTEGER,
    p_admin_user_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE 
    v_is_admin BOOLEAN; 
    v_new_balance INTEGER;
BEGIN
    v_is_admin := (SELECT (role = 'admin') FROM public.app_users WHERE id = p_admin_user_id LIMIT 1);
    
    IF v_is_admin IS NOT TRUE THEN 
        RAISE EXCEPTION 'Somente administradores injetam créditos.'; 
    END IF;
    
    UPDATE public.app_users 
    SET credits_balance = credits_balance + p_credits_amount 
    WHERE id = p_target_user_id;

    v_new_balance := (SELECT credits_balance FROM public.app_users WHERE id = p_target_user_id LIMIT 1);
    
    INSERT INTO public.token_ledger (user_id, amount, description, admin_id) 
    VALUES (p_target_user_id, p_credits_amount, 'Adição manual', p_admin_user_id);
    
    RETURN jsonb_build_object('status', 'success', 'new_balance', v_new_balance);
END; 
$$;
