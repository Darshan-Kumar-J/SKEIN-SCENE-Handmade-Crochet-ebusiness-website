import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Appointment,
  CustomOrderStatus,
  CustomRequest,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  SavedAddress,
} from '../src/types.ts';

const PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'gjkpbkwuxjidywmtijmf';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${PROJECT_ID}.supabase.co`;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_b4KQ_vv_KpuiMhnafmy14A_rMWH5EnX';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ADMIN_RPC_KEY = process.env.SUPABASE_ADMIN_RPC_KEY || 'skn_adm_9c4e7a2b1d8f5036e9a4c2b7';

let publicClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return publicClient;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (!SUPABASE_SECRET_KEY) return null;
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

interface SupabaseAppointmentRow {
  id: string;
  booking_code: string;
  user_id?: string | null;
  customer_name: string;
  email: string;
  phone: string;
  appointment_type: Appointment['appointmentType'];
  date: string;
  time_slot: string;
  notes?: string | null;
  status: Appointment['status'];
  admin_note?: string | null;
  created_at: string;
}

interface SupabaseOrderRow {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfillment_method: Order['fulfillmentMethod'];
  shipping_address?: SavedAddress | null;
  items?: OrderItem[] | null;
  subtotal: number;
  discount_amount: number;
  coupon_code?: string | null;
  shipping_fee: number;
  tax_amount: number;
  total_amount: number;
  gift_wrap: boolean;
  gift_message?: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: string | null;
  razorpay_order_id: string;
  razorpay_payment_id?: string | null;
  courier_name?: string | null;
  tracking_number?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

interface SupabaseCustomRequestRow {
  id: string;
  booking_code: string;
  user_id?: string | null;
  customer_name: string;
  email: string;
  phone: string;
  category: string;
  product_type: string;
  preferred_colors?: string[] | null;
  preferred_size?: string | null;
  quantity: number;
  budget_range?: string | null;
  required_date?: string | null;
  gift_wrapping: boolean;
  personalized_message?: string | null;
  design_instructions: string;
  reference_image_url?: string | null;
  status: CustomOrderStatus;
  quoted_total?: number | null;
  advance_amount?: number | null;
  advance_paid: boolean;
  advance_razorpay_payment_id?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

function toAppointment(row: SupabaseAppointmentRow): Appointment {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    userId: row.user_id || undefined,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    appointmentType: row.appointment_type,
    date: row.date,
    timeSlot: row.time_slot,
    notes: row.notes || '',
    status: row.status,
    adminNote: row.admin_note || undefined,
    createdAt: row.created_at,
  };
}

function toOrder(row: SupabaseOrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id || undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    fulfillmentMethod: row.fulfillment_method === 'pickup' ? 'pickup' : 'standard',
    shippingAddress: row.shipping_address || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    couponCode: row.coupon_code || undefined,
    shippingFee: Number(row.shipping_fee) || 0,
    taxAmount: Number(row.tax_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    giftWrap: Boolean(row.gift_wrap),
    giftMessage: row.gift_message || undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || undefined,
    razorpayOrderId: row.razorpay_order_id,
    razorpayPaymentId: row.razorpay_payment_id || undefined,
    courierName: row.courier_name || undefined,
    trackingNumber: row.tracking_number || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

function toCustomRequest(row: SupabaseCustomRequestRow): CustomRequest {
  return {
    id: row.id,
    bookingCode: row.booking_code,
    userId: row.user_id || undefined,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    category: row.category,
    productType: row.product_type,
    preferredColors: Array.isArray(row.preferred_colors) ? row.preferred_colors : [],
    preferredSize: row.preferred_size || 'Medium',
    quantity: Number(row.quantity) || 1,
    budgetRange: row.budget_range || '₹1,000 – ₹2,500',
    requiredDate: row.required_date || '',
    giftWrapping: Boolean(row.gift_wrapping),
    personalizedMessage: row.personalized_message || '',
    designInstructions: row.design_instructions || '',
    referenceImageUrl: row.reference_image_url || undefined,
    status: row.status,
    quotedTotal: row.quoted_total !== null && row.quoted_total !== undefined ? Number(row.quoted_total) : undefined,
    advanceAmount:
      row.advance_amount !== null && row.advance_amount !== undefined ? Number(row.advance_amount) : undefined,
    advancePaid: Boolean(row.advance_paid),
    advanceRazorpayPaymentId: row.advance_razorpay_payment_id || undefined,
    adminNotes: row.admin_notes || undefined,
    timeline: [
      {
        status: row.status,
        note: `Current status synced from database (${row.status}).`,
        timestamp: row.updated_at || row.created_at,
      },
    ],
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

export async function saveAppointmentToSupabase(
  appointment: Appointment
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const client = getSupabaseAdminClient() || getSupabaseClient();
    const { error } = await client.from('appointments').insert({
      id: appointment.id,
      booking_code: appointment.bookingCode,
      user_id: appointment.userId || null,
      customer_name: appointment.customerName,
      email: appointment.email,
      phone: appointment.phone,
      appointment_type: appointment.appointmentType,
      date: appointment.date,
      time_slot: appointment.timeSlot,
      notes: appointment.notes || '',
      status: appointment.status,
      admin_note: appointment.adminNote || '',
      created_at: appointment.createdAt,
    });

    if (error) {
      console.error('Supabase appointment insert failed:', error.code, error.message);
      return { ok: false, reason: error.code || error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('Supabase connection error:', err);
    return { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getBookedSlotCountsFromSupabase(
  date: string
): Promise<Record<string, number> | null> {
  try {
    const client = getSupabaseAdminClient() || getSupabaseClient();
    const { data: rpcData, error: rpcError } = await client.rpc('get_booked_slots', {
      target_date: date,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      const counts: Record<string, number> = {};
      for (const row of rpcData as { time_slot: string; booked_count: number }[]) {
        counts[row.time_slot] = Number(row.booked_count) || 0;
      }
      return counts;
    }

    const { data, error } = await client
      .from('appointments')
      .select('time_slot, status')
      .eq('date', date);

    if (error || !Array.isArray(data)) return null;

    const counts: Record<string, number> = {};
    for (const row of data as { time_slot: string; status: string }[]) {
      if (row.status !== 'Rejected' && row.status !== 'Cancelled') {
        counts[row.time_slot] = (counts[row.time_slot] || 0) + 1;
      }
    }
    return counts;
  } catch {
    return null;
  }
}

export interface SupabaseFetchResult<T> {
  ok: boolean;
  items: T[];
  mode: 'service_role' | 'rpc' | 'unavailable';
  reason?: string;
}

export async function listAppointmentsFromSupabaseDetailed(): Promise<SupabaseFetchResult<Appointment>> {
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return {
          ok: true,
          items: (data as SupabaseAppointmentRow[]).map(toAppointment),
          mode: 'service_role',
        };
      }
    }

    const client = getSupabaseClient();
    const { data: rpcData, error: rpcError } = await client.rpc('admin_fetch_appointments', {
      p_admin_key: ADMIN_RPC_KEY,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      return {
        ok: true,
        items: (rpcData as SupabaseAppointmentRow[]).map(toAppointment),
        mode: 'rpc',
      };
    }

    return {
      ok: false,
      items: [],
      mode: 'unavailable',
      reason: rpcError?.message || 'Admin read RPC not configured',
    };
  } catch (err) {
    return {
      ok: false,
      items: [],
      mode: 'unavailable',
      reason: err instanceof Error ? err.message : 'Connection error',
    };
  }
}

export async function listAppointmentsFromSupabase(): Promise<Appointment[] | null> {
  const res = await listAppointmentsFromSupabaseDetailed();
  return res.ok ? res.items : null;
}

export async function listOrdersFromSupabaseDetailed(): Promise<SupabaseFetchResult<Order>> {
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return {
          ok: true,
          items: (data as SupabaseOrderRow[]).map(toOrder),
          mode: 'service_role',
        };
      }
    }

    const client = getSupabaseClient();
    const { data: rpcData, error: rpcError } = await client.rpc('admin_fetch_orders', {
      p_admin_key: ADMIN_RPC_KEY,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      return {
        ok: true,
        items: (rpcData as SupabaseOrderRow[]).map(toOrder),
        mode: 'rpc',
      };
    }

    return {
      ok: false,
      items: [],
      mode: 'unavailable',
      reason: rpcError?.message || 'Admin orders read RPC not configured',
    };
  } catch (err) {
    return {
      ok: false,
      items: [],
      mode: 'unavailable',
      reason: err instanceof Error ? err.message : 'Connection error',
    };
  }
}

export async function listCustomRequestsFromSupabaseDetailed(): Promise<SupabaseFetchResult<CustomRequest>> {
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { data, error } = await admin
        .from('custom_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        return {
          ok: true,
          items: (data as SupabaseCustomRequestRow[]).map(toCustomRequest),
          mode: 'service_role',
        };
      }
    }

    const client = getSupabaseClient();
    const { data: rpcData, error: rpcError } = await client.rpc('admin_fetch_custom_requests', {
      p_admin_key: ADMIN_RPC_KEY,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      return {
        ok: true,
        items: (rpcData as SupabaseCustomRequestRow[]).map(toCustomRequest),
        mode: 'rpc',
      };
    }

    return {
      ok: false,
      items: [],
      mode: 'unavailable',
      reason: rpcError?.message || 'Admin custom requests read RPC not configured',
    };
  } catch (err) {
    return {
      ok: false,
      items: [],
      mode: 'unavailable',
      reason: err instanceof Error ? err.message : 'Connection error',
    };
  }
}

export async function updateAppointmentInSupabase(
  id: string,
  patch: Partial<Appointment>,
  fullAppointment?: Appointment
): Promise<boolean> {
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const updateBody: Record<string, unknown> = {};
      if (patch.customerName !== undefined) updateBody.customer_name = patch.customerName;
      if (patch.email !== undefined) updateBody.email = patch.email;
      if (patch.phone !== undefined) updateBody.phone = patch.phone;
      if (patch.appointmentType !== undefined) updateBody.appointment_type = patch.appointmentType;
      if (patch.status !== undefined) updateBody.status = patch.status;
      if (patch.date !== undefined) updateBody.date = patch.date;
      if (patch.timeSlot !== undefined) updateBody.time_slot = patch.timeSlot;
      if (patch.notes !== undefined) updateBody.notes = patch.notes;
      if (patch.adminNote !== undefined) updateBody.admin_note = patch.adminNote;

      const { error } = await admin.from('appointments').update(updateBody).eq('id', id);
      if (!error) return true;
    }

    if (fullAppointment) {
      const client = getSupabaseClient();
      const { error: rpcError } = await client.rpc('admin_update_appointment', {
        p_admin_key: ADMIN_RPC_KEY,
        p_id: fullAppointment.id,
        p_customer_name: fullAppointment.customerName,
        p_email: fullAppointment.email,
        p_phone: fullAppointment.phone,
        p_appointment_type: fullAppointment.appointmentType,
        p_date: fullAppointment.date,
        p_time_slot: fullAppointment.timeSlot,
        p_notes: fullAppointment.notes || '',
        p_status: fullAppointment.status,
        p_admin_note: fullAppointment.adminNote || '',
      });
      if (!rpcError) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function syncOrderToSupabase(order: Order): Promise<{ ok: boolean; reason?: string }> {
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { error: adminRpcErr } = await admin.rpc('admin_update_order', {
        p_admin_key: ADMIN_RPC_KEY,
        p_id: order.id,
        p_customer_name: order.customerName,
        p_customer_email: order.customerEmail,
        p_customer_phone: order.customerPhone,
        p_fulfillment_method: order.fulfillmentMethod,
        p_shipping_address: order.shippingAddress || null,
        p_gift_wrap: order.giftWrap,
        p_gift_message: order.giftMessage || null,
        p_status: order.status,
        p_payment_status: order.paymentStatus,
        p_courier_name: order.courierName || null,
        p_tracking_number: order.trackingNumber || null,
        p_notes: order.notes || null,
        p_updated_at: order.updatedAt,
      });
      if (!adminRpcErr) return { ok: true };
    }

    const client = admin || getSupabaseClient();

    // Try full admin update RPC when editing an existing order
    const { error: adminRpcError } = await client.rpc('admin_update_order', {
      p_admin_key: ADMIN_RPC_KEY,
      p_id: order.id,
      p_customer_name: order.customerName,
      p_customer_email: order.customerEmail,
      p_customer_phone: order.customerPhone,
      p_fulfillment_method: order.fulfillmentMethod,
      p_shipping_address: order.shippingAddress || null,
      p_gift_wrap: order.giftWrap,
      p_gift_message: order.giftMessage || null,
      p_status: order.status,
      p_payment_status: order.paymentStatus,
      p_courier_name: order.courierName || null,
      p_tracking_number: order.trackingNumber || null,
      p_notes: order.notes || null,
      p_updated_at: order.updatedAt,
    });
    if (!adminRpcError) {
      // Also ensure row exists if this was a brand-new order insert
      const { error: upsertErr } = await client.rpc('sync_order_confirmation', {
        p_id: order.id,
        p_order_number: order.orderNumber,
        p_user_id: order.userId || null,
        p_customer_name: order.customerName,
        p_customer_email: order.customerEmail,
        p_customer_phone: order.customerPhone,
        p_fulfillment_method: order.fulfillmentMethod,
        p_shipping_address: order.shippingAddress || null,
        p_items: order.items,
        p_subtotal: order.subtotal,
        p_discount_amount: order.discountAmount,
        p_coupon_code: order.couponCode || null,
        p_shipping_fee: order.shippingFee,
        p_tax_amount: order.taxAmount,
        p_total_amount: order.totalAmount,
        p_gift_wrap: order.giftWrap,
        p_gift_message: order.giftMessage || null,
        p_status: order.status,
        p_payment_status: order.paymentStatus,
        p_payment_method: order.paymentMethod || null,
        p_razorpay_order_id: order.razorpayOrderId,
        p_razorpay_payment_id: order.razorpayPaymentId || null,
        p_courier_name: order.courierName || null,
        p_tracking_number: order.trackingNumber || null,
        p_created_at: order.createdAt,
        p_updated_at: order.updatedAt,
      });
      if (!upsertErr) return { ok: true };
    }

    // Try privacy-safe SECURITY DEFINER upsert RPC first so both initial checkout and payment confirmation sync cleanly
    const { error: rpcError } = await client.rpc('sync_order_confirmation', {
      p_id: order.id,
      p_order_number: order.orderNumber,
      p_user_id: order.userId || null,
      p_customer_name: order.customerName,
      p_customer_email: order.customerEmail,
      p_customer_phone: order.customerPhone,
      p_fulfillment_method: order.fulfillmentMethod,
      p_shipping_address: order.shippingAddress || null,
      p_items: order.items,
      p_subtotal: order.subtotal,
      p_discount_amount: order.discountAmount,
      p_coupon_code: order.couponCode || null,
      p_shipping_fee: order.shippingFee,
      p_tax_amount: order.taxAmount,
      p_total_amount: order.totalAmount,
      p_gift_wrap: order.giftWrap,
      p_gift_message: order.giftMessage || null,
      p_status: order.status,
      p_payment_status: order.paymentStatus,
      p_payment_method: order.paymentMethod || null,
      p_razorpay_order_id: order.razorpayOrderId,
      p_razorpay_payment_id: order.razorpayPaymentId || null,
      p_courier_name: order.courierName || null,
      p_tracking_number: order.trackingNumber || null,
      p_created_at: order.createdAt,
      p_updated_at: order.updatedAt,
    });

    if (!rpcError) return { ok: true };

    // Fallback direct insert if RPC wasn't created yet
    const { error: insertError } = await client.from('orders').insert({
      id: order.id,
      order_number: order.orderNumber,
      user_id: order.userId || null,
      customer_name: order.customerName,
      customer_email: order.customerEmail,
      customer_phone: order.customerPhone,
      fulfillment_method: order.fulfillmentMethod,
      shipping_address: order.shippingAddress || null,
      items: order.items,
      subtotal: order.subtotal,
      discount_amount: order.discountAmount,
      coupon_code: order.couponCode || null,
      shipping_fee: order.shippingFee,
      tax_amount: order.taxAmount,
      total_amount: order.totalAmount,
      gift_wrap: order.giftWrap,
      gift_message: order.giftMessage || null,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod || null,
      razorpay_order_id: order.razorpayOrderId,
      razorpay_payment_id: order.razorpayPaymentId || null,
      courier_name: order.courierName || null,
      tracking_number: order.trackingNumber || null,
      created_at: order.createdAt,
      updated_at: order.updatedAt,
    });

    if (insertError) {
      console.error('Supabase order sync failed:', insertError.code || rpcError.code, insertError.message);
      return { ok: false, reason: insertError.code || insertError.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('Supabase order connection error:', err);
    return { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function syncCustomRequestToSupabase(
  custom: CustomRequest
): Promise<{ ok: boolean; reason?: string }> {
  try {
    const client = getSupabaseAdminClient() || getSupabaseClient();

    const { error: adminRpcErr } = await client.rpc('admin_update_custom_request', {
      p_admin_key: ADMIN_RPC_KEY,
      p_id: custom.id,
      p_customer_name: custom.customerName,
      p_email: custom.email,
      p_phone: custom.phone,
      p_product_type: custom.productType,
      p_preferred_colors: custom.preferredColors,
      p_preferred_size: custom.preferredSize,
      p_quantity: custom.quantity,
      p_required_date: custom.requiredDate || null,
      p_design_instructions: custom.designInstructions,
      p_status: custom.status,
      p_quoted_total: custom.quotedTotal ?? null,
      p_advance_amount: custom.advanceAmount ?? null,
      p_advance_paid: custom.advancePaid,
      p_admin_notes: custom.adminNotes || null,
      p_updated_at: custom.updatedAt,
    });

    const { error: rpcError } = await client.rpc('sync_custom_request', {
      p_id: custom.id,
      p_booking_code: custom.bookingCode,
      p_user_id: custom.userId || null,
      p_customer_name: custom.customerName,
      p_email: custom.email,
      p_phone: custom.phone,
      p_category: custom.category,
      p_product_type: custom.productType,
      p_preferred_colors: custom.preferredColors,
      p_preferred_size: custom.preferredSize,
      p_quantity: custom.quantity,
      p_budget_range: custom.budgetRange,
      p_required_date: custom.requiredDate || null,
      p_gift_wrapping: custom.giftWrapping,
      p_personalized_message: custom.personalizedMessage || null,
      p_design_instructions: custom.designInstructions,
      p_reference_image_url: custom.referenceImageUrl || null,
      p_status: custom.status,
      p_quoted_total: custom.quotedTotal ?? null,
      p_advance_amount: custom.advanceAmount ?? null,
      p_advance_paid: custom.advancePaid,
      p_advance_razorpay_payment_id: custom.advanceRazorpayPaymentId || null,
      p_admin_notes: custom.adminNotes || null,
      p_created_at: custom.createdAt,
      p_updated_at: custom.updatedAt,
    });

    if (!rpcError || !adminRpcErr) return { ok: true };

    const { error: insertError } = await client.from('custom_requests').insert({
      id: custom.id,
      booking_code: custom.bookingCode,
      user_id: custom.userId || null,
      customer_name: custom.customerName,
      email: custom.email,
      phone: custom.phone,
      category: custom.category,
      product_type: custom.productType,
      preferred_colors: custom.preferredColors,
      preferred_size: custom.preferredSize,
      quantity: custom.quantity,
      budget_range: custom.budgetRange,
      required_date: custom.requiredDate || null,
      gift_wrapping: custom.giftWrapping,
      personalized_message: custom.personalizedMessage || null,
      design_instructions: custom.designInstructions,
      reference_image_url: custom.referenceImageUrl || null,
      status: custom.status,
      quoted_total: custom.quotedTotal ?? null,
      advance_amount: custom.advanceAmount ?? null,
      advance_paid: custom.advancePaid,
      advance_razorpay_payment_id: custom.advanceRazorpayPaymentId || null,
      admin_notes: custom.adminNotes || null,
      created_at: custom.createdAt,
      updated_at: custom.updatedAt,
    });

    if (insertError) {
      console.error('Supabase custom request sync failed:', insertError.code, insertError.message);
      return { ok: false, reason: insertError.code || insertError.message };
    }
    return { ok: true };
  } catch (err) {
    console.error('Supabase custom request error:', err);
    return { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' };
  }
}
