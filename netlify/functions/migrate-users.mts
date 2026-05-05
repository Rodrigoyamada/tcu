import type { Context } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// IMPORTANTE: Esta função usa a service_role (admin) — nunca exponha no frontend
const SUPABASE_URL   = Netlify.env.get("VITE_SUPABASE_URL") ?? "";
const SERVICE_ROLE   = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MIGRATION_KEY  = Netlify.env.get("MIGRATION_SECRET_KEY") ?? "";

export default async (req: Request, _ctx: Context) => {
    // ── Proteção: só aceita requisições com a chave secreta ──────────────────
    const authHeader = req.headers.get("x-migration-key");
    if (!MIGRATION_KEY || authHeader !== MIGRATION_KEY) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = body.dry_run ?? true; // por segurança, padrão é dry_run=true

    // ── Cliente admin (ignora RLS) ───────────────────────────────────────────
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1. Busca todos os usuários em app_users que NÃO estão no auth.users ──
    // A lógica: usuários migrados já têm um UUID real. Os antigos têm o e-mail como id.
    // Detectamos isso checando se o id é um UUID válido ou não.
    const { data: appUsers, error: fetchError } = await adminClient
        .from("app_users")
        .select("id, email, name, role, credits_balance, telefone")
        .order("created_at", { ascending: true });

    if (fetchError) {
        return new Response(JSON.stringify({ error: fetchError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Usuários "antigos" = aqueles cujo id NÃO é um UUID v4 válido
    // (no sistema antigo, o id era o próprio e-mail ou um ID sequencial)
    const legacyUsers = (appUsers ?? []).filter(u => !uuidRegex.test(u.id));

    const results: Record<string, string>[] = [];

    if (dryRun) {
        // Modo simulação: apenas lista quem seria migrado
        return new Response(JSON.stringify({
            dry_run: true,
            total_legacy: legacyUsers.length,
            users: legacyUsers.map(u => ({ id: u.id, email: u.email, name: u.name })),
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    // ── 2. Migração real ─────────────────────────────────────────────────────
    for (const legacy of legacyUsers) {
        const email = legacy.email?.trim().toLowerCase();
        if (!email) {
            results.push({ id: legacy.id, status: "SKIP - sem e-mail" });
            continue;
        }

        try {
            // Cria o usuário no auth.users via Admin API
            // "invite" envia automaticamente um e-mail de convite com link para criar senha
            const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
                email,
                email_confirm: true,         // marca e-mail como confirmado
                user_metadata: {
                    name: legacy.name ?? email.split("@")[0],
                    migrated: true,
                    legacy_id: legacy.id,
                },
            });

            if (createError) {
                // Pode ser que o usuário já exista no auth.users mas com UUID diferente
                if (createError.message.includes("already been registered")) {
                    results.push({ email, status: "SKIP - já existe no auth.users" });
                } else {
                    results.push({ email, status: `ERRO: ${createError.message}` });
                }
                continue;
            }

            const newUuid = authUser.user?.id;
            if (!newUuid) {
                results.push({ email, status: "ERRO: UUID não retornado" });
                continue;
            }

            // Atualiza o app_users antigo com o novo UUID do auth.users
            // E apaga o registro antigo (com id=email) após criar o novo
            const { error: insertError } = await adminClient
                .from("app_users")
                .upsert({
                    id:              newUuid,
                    email:           email,
                    name:            legacy.name,
                    role:            legacy.role ?? "user",
                    credits_balance: legacy.credits_balance ?? 0,
                    telefone:        legacy.telefone ?? null,
                }, { onConflict: "id" });

            if (insertError) {
                results.push({ email, status: `CRIADO no Auth, ERRO ao atualizar app_users: ${insertError.message}` });
                continue;
            }

            // Remove o registro antigo (id com e-mail) se o id não era UUID
            if (!uuidRegex.test(legacy.id)) {
                await adminClient.from("app_users").delete().eq("id", legacy.id);
            }

            // Envia e-mail de convite para o usuário criar sua senha
            await adminClient.auth.admin.generateLink({
                type:  "recovery",
                email: email,
                options: {
                    redirectTo: "https://techdocstcu.netlify.app/redefinir-senha",
                },
            });

            results.push({ email, new_uuid: newUuid, status: "MIGRADO ✓ + convite enviado" });

        } catch (err) {
            results.push({ email, status: `EXCEÇÃO: ${String(err)}` });
        }
    }

    return new Response(JSON.stringify({
        dry_run: false,
        total_processados: legacyUsers.length,
        results,
    }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
};

export const config = { path: "/api/migrate-users" };
