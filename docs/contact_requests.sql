create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (
    request_type in ('delete_request', 'bug_report', 'general')
  ),
  contact text,
  spotify_display_name text,
  message text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

drop policy if exists "contact_requests_no_public_read" on public.contact_requests;
drop policy if exists "contact_requests_no_public_insert" on public.contact_requests;

create policy "contact_requests_no_public_read"
on public.contact_requests
for select
using (false);

create policy "contact_requests_no_public_insert"
on public.contact_requests
for insert
with check (false);
