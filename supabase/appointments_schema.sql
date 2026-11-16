-- Run this script once in your Supabase Dashboard -> SQL Editor
-- Project: gjkpbkwuxjidywmtijmf

create table if not exists public.appointments (
  id text primary key,
  booking_code text not null unique,
  user_id text,
  customer_name text not null,
  email text not null,
  phone text not null,
  appointment_type text not null,
  date text not null,
  time_slot text not null,
  notes text default '',
  status text not null default 'Pending',
  admin_note text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_date_slot
  on public.appointments (date, time_slot);

create index if not exists idx_appointments_booking_code
  on public.appointments (booking_code);

alter table public.appointments enable row level security;

-- Allow website visitors to submit appointment bookings
drop policy if exists "Allow public appointment inserts" on public.appointments;
create policy "Allow public appointment inserts"
  on public.appointments
  for insert
  to anon, authenticated
  with check (
    length(trim(customer_name)) > 0
    and length(trim(email)) > 0
    and length(trim(phone)) > 0
    and length(trim(date)) > 0
    and length(trim(time_slot)) > 0
  );

-- Safe RPC for checking slot availability without exposing customer PII
create or replace function public.get_booked_slots(target_date text)
returns table (time_slot text, booked_count bigint)
language sql
security definer
set search_path = public
as $$
  select a.time_slot, count(*)::bigint as booked_count
  from public.appointments a
  where a.date = target_date
    and a.status not in ('Rejected', 'Cancelled')
  group by a.time_slot;
$$;

grant execute on function public.get_booked_slots(text) to anon, authenticated;
