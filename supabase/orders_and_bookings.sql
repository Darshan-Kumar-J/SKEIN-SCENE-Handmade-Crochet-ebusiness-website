-- Run this script in your Supabase Dashboard -> SQL Editor
-- Project: gjkpbkwuxjidywmtijmf
-- Creates orders & custom_requests tables (and ensures appointments exists)

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

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  user_id text,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  fulfillment_method text not null default 'standard',
  shipping_address jsonb,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount_amount numeric not null default 0,
  coupon_code text,
  shipping_fee numeric not null default 0,
  tax_amount numeric not null default 0,
  total_amount numeric not null default 0,
  gift_wrap boolean not null default false,
  gift_message text,
  status text not null default 'Pending Payment',
  payment_status text not null default 'pending',
  payment_method text,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  courier_name text,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_order_number on public.orders (order_number);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

alter table public.orders enable row level security;

drop policy if exists "Allow public order inserts" on public.orders;
create policy "Allow public order inserts"
  on public.orders
  for insert
  to anon, authenticated
  with check (
    length(trim(order_number)) > 0
    and length(trim(customer_name)) > 0
    and length(trim(customer_email)) > 0
  );

create or replace function public.sync_order_confirmation(
  p_id text,
  p_order_number text,
  p_user_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_fulfillment_method text,
  p_shipping_address jsonb,
  p_items jsonb,
  p_subtotal numeric,
  p_discount_amount numeric,
  p_coupon_code text,
  p_shipping_fee numeric,
  p_tax_amount numeric,
  p_total_amount numeric,
  p_gift_wrap boolean,
  p_gift_message text,
  p_status text,
  p_payment_status text,
  p_payment_method text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_courier_name text,
  p_tracking_number text,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.orders (
    id, order_number, user_id, customer_name, customer_email, customer_phone,
    fulfillment_method, shipping_address, items, subtotal, discount_amount,
    coupon_code, shipping_fee, tax_amount, total_amount, gift_wrap, gift_message,
    status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id,
    courier_name, tracking_number, created_at, updated_at
  )
  values (
    p_id, p_order_number, p_user_id, p_customer_name, p_customer_email, p_customer_phone,
    p_fulfillment_method, p_shipping_address, p_items, p_subtotal, p_discount_amount,
    p_coupon_code, p_shipping_fee, p_tax_amount, p_total_amount, p_gift_wrap, p_gift_message,
    p_status, p_payment_status, p_payment_method, p_razorpay_order_id, p_razorpay_payment_id,
    p_courier_name, p_tracking_number, p_created_at, p_updated_at
  )
  on conflict (id) do update set
    status = excluded.status,
    payment_status = excluded.payment_status,
    payment_method = excluded.payment_method,
    razorpay_payment_id = excluded.razorpay_payment_id,
    courier_name = excluded.courier_name,
    tracking_number = excluded.tracking_number,
    updated_at = excluded.updated_at;
$$;

grant execute on function public.sync_order_confirmation(
  text, text, text, text, text, text, text, jsonb, jsonb,
  numeric, numeric, text, numeric, numeric, numeric, boolean,
  text, text, text, text, text, text, text, text, timestamptz, timestamptz
) to anon, authenticated;

create table if not exists public.custom_requests (
  id text primary key,
  booking_code text not null unique,
  user_id text,
  customer_name text not null,
  email text not null,
  phone text not null,
  category text not null,
  product_type text not null,
  preferred_colors jsonb not null default '[]'::jsonb,
  preferred_size text,
  quantity integer not null default 1,
  budget_range text,
  required_date text,
  gift_wrapping boolean not null default false,
  personalized_message text,
  design_instructions text not null,
  reference_image_url text,
  status text not null default 'Request Received',
  quoted_total numeric,
  advance_amount numeric,
  advance_paid boolean not null default false,
  advance_razorpay_payment_id text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_requests enable row level security;

drop policy if exists "Allow public custom request inserts" on public.custom_requests;
create policy "Allow public custom request inserts"
  on public.custom_requests
  for insert
  to anon, authenticated
  with check (
    length(trim(booking_code)) > 0
    and length(trim(customer_name)) > 0
    and length(trim(email)) > 0
  );

create or replace function public.sync_custom_request(
  p_id text,
  p_booking_code text,
  p_user_id text,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_category text,
  p_product_type text,
  p_preferred_colors jsonb,
  p_preferred_size text,
  p_quantity integer,
  p_budget_range text,
  p_required_date text,
  p_gift_wrapping boolean,
  p_personalized_message text,
  p_design_instructions text,
  p_reference_image_url text,
  p_status text,
  p_quoted_total numeric,
  p_advance_amount numeric,
  p_advance_paid boolean,
  p_advance_razorpay_payment_id text,
  p_admin_notes text,
  p_created_at timestamptz,
  p_updated_at timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.custom_requests (
    id, booking_code, user_id, customer_name, email, phone, category,
    product_type, preferred_colors, preferred_size, quantity, budget_range,
    required_date, gift_wrapping, personalized_message, design_instructions,
    reference_image_url, status, quoted_total, advance_amount, advance_paid,
    advance_razorpay_payment_id, admin_notes, created_at, updated_at
  )
  values (
    p_id, p_booking_code, p_user_id, p_customer_name, p_email, p_phone, p_category,
    p_product_type, p_preferred_colors, p_preferred_size, p_quantity, p_budget_range,
    p_required_date, p_gift_wrapping, p_personalized_message, p_design_instructions,
    p_reference_image_url, p_status, p_quoted_total, p_advance_amount, p_advance_paid,
    p_advance_razorpay_payment_id, p_admin_notes, p_created_at, p_updated_at
  )
  on conflict (id) do update set
    status = excluded.status,
    quoted_total = excluded.quoted_total,
    advance_amount = excluded.advance_amount,
    advance_paid = excluded.advance_paid,
    advance_razorpay_payment_id = excluded.advance_razorpay_payment_id,
    admin_notes = excluded.admin_notes,
    updated_at = excluded.updated_at;
$$;

grant execute on function public.sync_custom_request(
  text, text, text, text, text, text, text, text, jsonb, text,
  integer, text, text, boolean, text, text, text, text, numeric,
  numeric, boolean, text, text, timestamptz, timestamptz
) to anon, authenticated;
