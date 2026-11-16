-- Run this script once in your Supabase Dashboard -> SQL Editor
-- Project: gjkpbkwuxjidywmtijmf
-- Enables full Admin Dashboard retrieval, editing, rescheduling, and cancellation
-- across orders, custom_requests, and appointments without exposing public SELECT access.

alter table public.orders
  add column if not exists notes text;

-- 1. Fetch all orders for the Studio Admin Dashboard
create or replace function public.admin_fetch_orders(p_admin_key text)
returns setof public.orders
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is distinct from 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7' then
    raise exception 'Unauthorized admin access';
  end if;
  return query
    select * from public.orders
    order by created_at desc;
end;
$$;

grant execute on function public.admin_fetch_orders(text) to anon, authenticated;

-- 2. Fetch all custom crochet bookings for the Studio Admin Dashboard
create or replace function public.admin_fetch_custom_requests(p_admin_key text)
returns setof public.custom_requests
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is distinct from 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7' then
    raise exception 'Unauthorized admin access';
  end if;
  return query
    select * from public.custom_requests
    order by created_at desc;
end;
$$;

grant execute on function public.admin_fetch_custom_requests(text) to anon, authenticated;

-- 3. Fetch all studio appointments/consultations for the Studio Admin Dashboard
create or replace function public.admin_fetch_appointments(p_admin_key text)
returns setof public.appointments
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is distinct from 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7' then
    raise exception 'Unauthorized admin access';
  end if;
  return query
    select * from public.appointments
    order by created_at desc;
end;
$$;

grant execute on function public.admin_fetch_appointments(text) to anon, authenticated;

-- 4. Update or cancel an order from the Studio Admin Dashboard
create or replace function public.admin_update_order(
  p_admin_key text,
  p_id text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_fulfillment_method text,
  p_shipping_address jsonb,
  p_gift_wrap boolean,
  p_gift_message text,
  p_status text,
  p_payment_status text,
  p_courier_name text,
  p_tracking_number text,
  p_notes text,
  p_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is distinct from 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7' then
    raise exception 'Unauthorized admin access';
  end if;

  update public.orders
  set
    customer_name = p_customer_name,
    customer_email = p_customer_email,
    customer_phone = p_customer_phone,
    fulfillment_method = p_fulfillment_method,
    shipping_address = p_shipping_address,
    gift_wrap = p_gift_wrap,
    gift_message = p_gift_message,
    status = p_status,
    payment_status = p_payment_status,
    courier_name = p_courier_name,
    tracking_number = p_tracking_number,
    notes = p_notes,
    updated_at = p_updated_at
  where id = p_id;
end;
$$;

grant execute on function public.admin_update_order(
  text, text, text, text, text, text, jsonb, boolean, text, text, text, text, text, text, timestamptz
) to anon, authenticated;

-- 5. Update or cancel a custom crochet booking from the Studio Admin Dashboard
create or replace function public.admin_update_custom_request(
  p_admin_key text,
  p_id text,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_product_type text,
  p_preferred_colors jsonb,
  p_preferred_size text,
  p_quantity integer,
  p_required_date text,
  p_design_instructions text,
  p_status text,
  p_quoted_total numeric,
  p_advance_amount numeric,
  p_advance_paid boolean,
  p_admin_notes text,
  p_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is distinct from 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7' then
    raise exception 'Unauthorized admin access';
  end if;

  update public.custom_requests
  set
    customer_name = p_customer_name,
    email = p_email,
    phone = p_phone,
    product_type = p_product_type,
    preferred_colors = p_preferred_colors,
    preferred_size = p_preferred_size,
    quantity = p_quantity,
    required_date = p_required_date,
    design_instructions = p_design_instructions,
    status = p_status,
    quoted_total = p_quoted_total,
    advance_amount = p_advance_amount,
    advance_paid = p_advance_paid,
    admin_notes = p_admin_notes,
    updated_at = p_updated_at
  where id = p_id;
end;
$$;

grant execute on function public.admin_update_custom_request(
  text, text, text, text, text, text, jsonb, text, integer, text, text, text, numeric, numeric, boolean, text, timestamptz
) to anon, authenticated;

-- 6. Update, reschedule, or cancel a studio consultation from the Admin Dashboard
create or replace function public.admin_update_appointment(
  p_admin_key text,
  p_id text,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_appointment_type text,
  p_date text,
  p_time_slot text,
  p_notes text,
  p_status text,
  p_admin_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_admin_key is distinct from 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7' then
    raise exception 'Unauthorized admin access';
  end if;

  update public.appointments
  set
    customer_name = p_customer_name,
    email = p_email,
    phone = p_phone,
    appointment_type = p_appointment_type,
    date = p_date,
    time_slot = p_time_slot,
    notes = p_notes,
    status = p_status,
    admin_note = p_admin_note
  where id = p_id;
end;
$$;

grant execute on function public.admin_update_appointment(
  text, text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;
