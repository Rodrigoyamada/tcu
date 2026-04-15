create table if not exists public.import_profiles (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    columns jsonb not null,
    mapping jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.import_profiles enable row level security;

-- Create policy for authenticated users to manage their profiles (or all profiles)
create policy "Usuários autenticados podem ver perfis de importação"
    on public.import_profiles for select
    to authenticated
    using (true);

create policy "Usuários autenticados podem criar perfis"
    on public.import_profiles for insert
    to authenticated
    with check (true);

create policy "Usuários autenticados podem deletar perfis"
    on public.import_profiles for delete
    to authenticated
    using (true);

-- Ensure the admin user exists in app_users
insert into public.app_users (id, email, role, name)
select id, email, 'admin', 'Administrador'
from auth.users
where email = 'rodrigo.yamada@gmail.com'
on conflict (email) do nothing;
