import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Bell,
  CalendarClock,
  Database,
  Download,
  Edit3,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { AppointmentEditModal, OrderEditModal } from '../components/AdminBookingsModals.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type {
  AdminNotification,
  Appointment,
  Coupon,
  CustomOrderStatus,
  CustomRequest,
  Order,
  OrderStatus,
  Product,
  ProductReview,
  StoreSettings,
  SupportRequest,
  Testimonial,
  UserProfile,
} from '../types.ts';
import { formatDateIN, formatINR } from '../utils/format.ts';

type AdminTab = 'overview' | 'orders' | 'custom' | 'appointments' | 'products' | 'storefront';

interface SupabaseSyncStatus {
  ordersConnected: boolean;
  customConnected: boolean;
  appointmentsConnected: boolean;
  mode: string;
  remoteCounts: {
    orders: number;
    customRequests: number;
    appointments: number;
  };
  reason?: string;
}

interface AdminData {
  metrics: {
    totalSales: number;
    totalOrders: number;
    pendingOrders: number;
    customRequestsCount: number;
    confirmedBookingsCount: number;
    lowStockCount: number;
    subscribersCount: number;
  };
  lowStockProducts: Product[];
  products: Product[];
  orders: Order[];
  customRequests: CustomRequest[];
  appointments: Appointment[];
  coupons: Coupon[];
  testimonials: Testimonial[];
  reviews: ProductReview[];
  subscribers: { id: string; email: string; subscribedAt: string }[];
  supportRequests: SupportRequest[];
  notifications: AdminNotification[];
  customers: UserProfile[];
  settings: StoreSettings;
  supabaseStatus?: SupabaseSyncStatus;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending Payment',
  'Confirmed',
  'Crafting',
  'Quality Check',
  'Ready for Pickup',
  'Shipped',
  'Delivered',
  'Cancelled',
  'Refunded',
];

const CUSTOM_STATUSES: CustomOrderStatus[] = [
  'Request Received',
  'Under Review',
  'Quotation Sent',
  'Awaiting Payment',
  'Confirmed',
  'In Production',
  'Quality Check',
  'Ready for Dispatch',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const APPOINTMENT_STATUSES = ['Pending', 'Approved', 'Completed', 'Rescheduled', 'Rejected', 'Cancelled'] as const;

function statusTone(status: string): string {
  if (status === 'Cancelled' || status === 'Rejected' || status === 'Refunded') {
    return 'bg-red-50 text-red-800 border-red-200';
  }
  if (status === 'Delivered' || status === 'Completed' || status === 'Approved' || status === 'Confirmed') {
    return 'bg-[#C7D5C0]/45 text-[#384A33] border-[#C7D5C0]';
  }
  if (status === 'Pending Payment' || status === 'Pending' || status === 'Request Received') {
    return 'bg-[#E9C4CB]/45 text-[#55483F] border-[#E9C4CB]';
  }
  return 'bg-[#FBF8F3] text-[#55483F] border-[#55483F]/15';
}

export function AdminPage() {
  const { user, setAuthOpen, refreshStorefront, showToast } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingDb, setSyncingDb] = useState(false);

  // Filters & active editors
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [customSearch, setCustomSearch] = useState('');
  const [customStatusFilter, setCustomStatusFilter] = useState<string>('ALL');

  const [aptSearch, setAptSearch] = useState('');
  const [aptStatusFilter, setAptStatusFilter] = useState<string>('ALL');
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Add Product state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Flower Bouquets');
  const [newProdPrice, setNewProdPrice] = useState(1299);
  const [newProdDiscount, setNewProdDiscount] = useState(0);
  const [newProdStock, setNewProdStock] = useState(5);
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImg, setNewProdImg] = useState('/src/assets/images/crochet_tulips_roses_1794827807798.jpg');

  // Testimonial state
  const [testName, setTestName] = useState('');
  const [testCity, setTestCity] = useState('Bengaluru');
  const [testProduct, setTestProduct] = useState('');
  const [testQuote, setTestQuote] = useState('');

  // Coupon state
  const [cpnCode, setCpnCode] = useState('');
  const [cpnType, setCpnType] = useState<'percent' | 'flat'>('percent');
  const [cpnVal, setCpnVal] = useState(10);
  const [cpnMin, setCpnMin] = useState(999);

  // Settings local draft
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings | null>(null);
  const [blockedDateInput, setBlockedDateInput] = useState('');

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (!res.ok) return;
      const json = (await res.json()) as AdminData;
      setData(json);
      setSettingsDraft(json.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdmin();
    } else {
      setLoading(false);
    }
  }, [user, loadAdmin]);

  const filteredOrders = useMemo(() => {
    if (!data) return [];
    const q = orderSearch.trim().toLowerCase();
    return data.orders.filter((o) => {
      if (orderStatusFilter !== 'ALL' && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q)
      );
    });
  }, [data, orderSearch, orderStatusFilter]);

  const filteredCustomRequests = useMemo(() => {
    if (!data) return [];
    const q = customSearch.trim().toLowerCase();
    return data.customRequests.filter((c) => {
      if (customStatusFilter !== 'ALL' && c.status !== customStatusFilter) return false;
      if (!q) return true;
      return (
        c.bookingCode.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.productType.toLowerCase().includes(q)
      );
    });
  }, [data, customSearch, customStatusFilter]);

  const filteredAppointments = useMemo(() => {
    if (!data) return [];
    const q = aptSearch.trim().toLowerCase();
    return data.appointments.filter((a) => {
      if (aptStatusFilter !== 'ALL' && a.status !== aptStatusFilter) return false;
      if (!q) return true;
      return (
        a.bookingCode.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.phone.toLowerCase().includes(q) ||
        a.date.toLowerCase().includes(q)
      );
    });
  }, [data, aptSearch, aptStatusFilter]);

  if (!user || user.role !== 'admin') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-4xl font-medium text-[#55483F]">Administrator Access Required</h1>
        <p className="text-sm text-[#78695F]">
          Please sign in with an authorized Skein Scene studio administrator account to retrieve booking data from your
          database and manage, edit, or cancel orders and consultations.
        </p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830]"
        >
          Sign In as Administrator
        </button>
      </main>
    );
  }

  if (loading || !data || !settingsDraft) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-sm text-[#78695F]">
        Retrieving Skein Scene bookings and studio data...
      </main>
    );
  }

  const syncDatabase = async () => {
    setSyncingDb(true);
    try {
      const res = await fetch('/api/admin/sync-supabase', { method: 'POST' });
      const syncJson = await res.json();
      await loadAdmin();
      if (res.ok && syncJson.supabaseStatus) {
        const counts = syncJson.supabaseStatus.remoteCounts;
        showToast(
          `Synced database: ${counts.orders} orders, ${counts.customRequests} custom, ${counts.appointments} consults`
        );
      } else {
        showToast('Refreshed local studio records');
      }
    } finally {
      setSyncingDb(false);
    }
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newProdName,
        category: newProdCat,
        price: newProdPrice,
        discountPercent: newProdDiscount,
        stock: newProdStock,
        description: newProdDesc,
        images: [newProdImg],
        featured: true,
        bestSeller: false,
      }),
    });
    if (res.ok) {
      setNewProdName('');
      setNewProdDesc('');
      showToast('Product added to catalogue');
      await Promise.all([loadAdmin(), refreshStorefront()]);
    }
  };

  const quickUpdateProduct = async (id: string, patch: Partial<Product>) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      showToast('Product updated');
      await Promise.all([loadAdmin(), refreshStorefront()]);
    }
  };

  const deleteProduct = async (id: string) => {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Product deleted');
      await Promise.all([loadAdmin(), refreshStorefront()]);
    }
  };

  const updateOrder = async (id: string, patch: Partial<Order>) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const json = await res.json();
      showToast(json.supabaseSynced ? 'Order saved & synced to Supabase' : 'Order updated');
      await loadAdmin();
    } else {
      showToast('Could not update order');
    }
  };

  const cancelOrder = async (
    id: string,
    payload: { reason: string; restoreStock: boolean; markRefunded: boolean }
  ) => {
    const res = await fetch(`/api/admin/orders/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const json = await res.json();
      showToast(json.supabaseSynced ? 'Order cancelled & synced to Supabase' : 'Order cancelled');
      await Promise.all([loadAdmin(), refreshStorefront()]);
    } else {
      showToast('Could not cancel order');
    }
  };

  const updateCustom = async (
    id: string,
    patch: Partial<CustomRequest> & { timelineNote?: string }
  ) => {
    const res = await fetch(`/api/admin/custom-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const json = await res.json();
      showToast(json.supabaseSynced ? 'Custom booking saved & synced to Supabase' : 'Custom booking updated');
      await loadAdmin();
    } else {
      showToast('Could not update custom booking');
    }
  };

  const updateAppointment = async (id: string, patch: Partial<Appointment>) => {
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const json = await res.json();
      showToast(json.supabaseSynced ? 'Consultation updated & synced to Supabase' : 'Consultation updated');
      await loadAdmin();
    } else {
      showToast('Could not update consultation');
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsDraft),
    });
    if (res.ok) {
      showToast('Store settings saved');
      await Promise.all([loadAdmin(), refreshStorefront()]);
    }
  };

  const addCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: cpnCode,
        type: cpnType,
        value: cpnVal,
        minOrderAmount: cpnMin,
      }),
    });
    if (res.ok) {
      setCpnCode('');
      showToast('Coupon created');
      loadAdmin();
    }
  };

  const addTestimonial = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/testimonials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: testName,
        city: testCity,
        productPurchased: testProduct,
        quote: testQuote,
        rating: 5,
        approved: true,
      }),
    });
    if (res.ok) {
      setTestName('');
      setTestProduct('');
      setTestQuote('');
      showToast('Verified testimonial published');
      await Promise.all([loadAdmin(), refreshStorefront()]);
    }
  };

  const sb = data.supabaseStatus;
  const supabaseReadReady = sb ? sb.ordersConnected && sb.customConnected && sb.appointmentsConnected : false;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#55483F]/10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Skein Scene Studio Operations</p>
          <h1 className="font-serif text-4xl font-medium text-[#55483F]">Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={syncDatabase}
            disabled={syncingDb}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#55483F] text-white text-xs font-medium hover:bg-[#433830] disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingDb ? 'animate-spin' : ''}`} />
            <span>{syncingDb ? 'Syncing Database...' : 'Refresh from Supabase'}</span>
          </button>
          <a
            href="/api/admin/export/orders"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#55483F]/20 bg-white text-xs font-medium text-[#55483F]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Orders CSV</span>
          </a>
          <a
            href="/api/admin/export/customers"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#55483F]/20 bg-white text-xs font-medium text-[#55483F]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Customers CSV</span>
          </a>
        </div>
      </div>

      {/* Supabase Admin Sync Banner (Admin Dashboard only) */}
      {sb && !supabaseReadReady && (
        <div className="bg-white rounded-2xl border border-[#B78C70]/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-[#B78C70] shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-[#55483F]">
                Connect Admin Database Read & Edit Sync in Supabase
              </p>
              <p className="text-[#78695F] leading-relaxed">
                New bookings save to Supabase automatically. To retrieve existing rows from your Supabase{' '}
                <code className="font-mono text-[#55483F]">orders</code>,{' '}
                <code className="font-mono text-[#55483F]">custom_requests</code>, and{' '}
                <code className="font-mono text-[#55483F]">appointments</code> tables directly into this panel and
                enable one-click edits/cancellations, run <code className="font-mono text-[#55483F]">supabase/admin_dashboard_rpc.sql</code>{' '}
                once in your Supabase SQL Editor, then click <strong>Refresh from Supabase</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={syncDatabase}
            className="px-4 py-2 rounded-xl border border-[#55483F]/20 bg-[#FBF8F3] text-xs font-medium text-[#55483F] whitespace-nowrap shrink-0"
          >
            Re-check Connection
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'orders', label: `Orders (${data.orders.length})` },
            { id: 'custom', label: `Custom Bookings (${data.customRequests.length})` },
            { id: 'appointments', label: `Consultations (${data.appointments.length})` },
            { id: 'products', label: `Products (${data.products.length})` },
            { id: 'storefront', label: 'Storefront, Offers & Reviews' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-[#55483F] text-white'
                : 'bg-white border border-[#55483F]/10 text-[#55483F]/80 hover:text-[#55483F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Verified Revenue', value: formatINR(data.metrics.totalSales) },
              { label: 'Total Orders', value: String(data.metrics.totalOrders) },
              { label: 'Pending Fulfillment', value: String(data.metrics.pendingOrders) },
              { label: 'Custom Bookings', value: String(data.metrics.customRequestsCount) },
              { label: 'Approved Consults', value: String(data.metrics.confirmedBookingsCount) },
              { label: 'Low Stock Items', value: String(data.metrics.lowStockCount) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-[#55483F]/10 p-5">
                <p className="text-xs text-[#78695F]">{kpi.label}</p>
                <p className="font-serif text-3xl font-medium text-[#55483F] mt-1 tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* All Recent Bookings Quick Console */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl text-[#55483F]">All Recent Bookings & Orders</h2>
                <p className="text-xs text-[#78695F]">
                  {supabaseReadReady
                    ? `Live from Supabase (${sb?.remoteCounts.orders || 0} orders · ${sb?.remoteCounts.customRequests || 0} custom · ${sb?.remoteCounts.appointments || 0} consults)`
                    : 'Studio bookings summary — open any tab to view, edit, or cancel'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab('orders')}
                  className="px-3 py-1.5 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
                >
                  Manage Orders
                </button>
                <button
                  type="button"
                  onClick={() => setTab('custom')}
                  className="px-3 py-1.5 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
                >
                  Manage Custom
                </button>
                <button
                  type="button"
                  onClick={() => setTab('appointments')}
                  className="px-3 py-1.5 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
                >
                  Manage Consultations
                </button>
              </div>
            </div>

            {data.orders.length === 0 && data.customRequests.length === 0 && data.appointments.length === 0 ? (
              <p className="text-sm text-[#78695F] py-4">
                No orders, custom crochet requests, or consultation bookings found yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FBF8F3] text-[#78695F] border-b border-[#55483F]/10">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Manage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#55483F]/8">
                    {data.orders.slice(0, 6).map((o) => (
                      <tr key={`ov-ord-${o.id}`}>
                        <td className="p-3 font-medium text-[#55483F]">Shop Order</td>
                        <td className="p-3 font-mono">{o.orderNumber}</td>
                        <td className="p-3">
                          <div className="font-medium text-[#55483F]">{o.customerName}</div>
                          <div className="text-[#78695F]">{o.customerPhone}</div>
                        </td>
                        <td className="p-3 tabular-nums">
                          {formatINR(o.totalAmount)} · {o.items.length} item(s) · {o.paymentStatus.toUpperCase()}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-medium ${statusTone(o.status)}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingOrder(o)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#55483F]/20 bg-white text-[#55483F] font-medium hover:bg-[#FBF8F3]"
                          >
                            View / Edit
                          </button>
                          {o.status !== 'Cancelled' && o.status !== 'Refunded' && (
                            <button
                              type="button"
                              onClick={() => setEditingOrder(o)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 font-medium hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {data.customRequests.slice(0, 4).map((c) => (
                      <tr key={`ov-cust-${c.id}`}>
                        <td className="p-3 font-medium text-[#8E5B3E]">Custom Booking</td>
                        <td className="p-3 font-mono">{c.bookingCode}</td>
                        <td className="p-3">
                          <div className="font-medium text-[#55483F]">{c.customerName}</div>
                          <div className="text-[#78695F]">{c.phone}</div>
                        </td>
                        <td className="p-3">
                          {c.productType} ({c.quantity} pc)
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-medium ${statusTone(c.status)}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setTab('custom')}
                            className="px-2.5 py-1.5 rounded-lg border border-[#55483F]/20 bg-white text-[#55483F] font-medium hover:bg-[#FBF8F3]"
                          >
                            View / Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.appointments.slice(0, 4).map((a) => (
                      <tr key={`ov-apt-${a.id}`}>
                        <td className="p-3 font-medium text-[#53724C]">Consultation</td>
                        <td className="p-3 font-mono">{a.bookingCode}</td>
                        <td className="p-3">
                          <div className="font-medium text-[#55483F]">{a.customerName}</div>
                          <div className="text-[#78695F]">{a.phone}</div>
                        </td>
                        <td className="p-3">
                          {a.date} at {a.timeSlot}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2.5 py-1 rounded-lg border text-[11px] font-medium ${statusTone(a.status)}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setEditingAppointment(a)}
                            className="px-2.5 py-1.5 rounded-lg border border-[#55483F]/20 bg-white text-[#55483F] font-medium hover:bg-[#FBF8F3]"
                          >
                            Edit / Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notifications */}
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-2xl text-[#55483F] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#B78C70]" />
                  <span>Studio Activity Feed</span>
                </h2>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/admin/notifications/read-all', { method: 'POST' });
                    loadAdmin();
                  }}
                  className="text-xs text-[#78695F] hover:text-[#55483F]"
                >
                  Mark all read
                </button>
              </div>
              {data.notifications.length === 0 ? (
                <p className="text-sm text-[#78695F]">No studio notifications yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {data.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border text-xs ${
                        n.read ? 'bg-[#FBF8F3] border-[#55483F]/8' : 'bg-[#E9C4CB]/20 border-[#B78C70]/30'
                      }`}
                    >
                      <p className="font-semibold text-[#55483F]">{n.title}</p>
                      <p className="text-[#78695F] mt-0.5">{n.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low-Stock Alerts & Recent Customers */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-3">
                <h2 className="font-serif text-2xl text-[#55483F] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#B78C70]" />
                  <span>Low Stock Alerts (≤ 5)</span>
                </h2>
                {data.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-[#78695F]">All products are well stocked.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {data.lowStockProducts.map((p) => (
                      <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-[#55483F]/8">
                        <span className="font-medium text-[#55483F]">{p.name}</span>
                        <span className="tabular-nums text-[#8E5B3E] font-semibold">{p.stock} left</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-3">
                <h2 className="font-serif text-2xl text-[#55483F]">Registered Customers ({data.customers.length})</h2>
                <div className="space-y-2 text-xs">
                  {data.customers.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex justify-between py-1.5 border-b border-[#55483F]/8">
                      <span className="font-medium text-[#55483F]">{c.name}</span>
                      <span className="text-[#78695F]">{c.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78695F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search by Order #, customer name, email, phone, or tracking ID..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </div>
            <select
              value={orderStatusFilter}
              onChange={(e) => setOrderStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
            >
              <option value="ALL">All Statuses ({data.orders.length})</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center text-sm text-[#78695F]">
              No matching orders found.
            </div>
          ) : (
            filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[#78695F]">
                        {order.orderNumber} · {formatDateIN(order.createdAt)}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-medium ${statusTone(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl text-[#55483F]">
                      {order.customerName} — {formatINR(order.totalAmount)}
                    </h3>
                    <p className="text-xs text-[#78695F]">
                      {order.customerEmail} · {order.customerPhone} · Payment:{' '}
                      <strong>{order.paymentStatus.toUpperCase()}</strong> ·{' '}
                      {order.fulfillmentMethod === 'pickup' ? 'Laggere Studio Pickup' : 'Standard Delivery'}
                    </p>
                    {order.items.length > 0 && (
                      <p className="text-xs text-[#55483F]/85 pt-1">
                        Items:{' '}
                        {order.items
                          .map((i) => `${i.quantity}× ${i.productName} (${i.selectedColor})`)
                          .join(' · ')}
                      </p>
                    )}
                    {order.shippingAddress && order.fulfillmentMethod === 'standard' && (
                      <p className="text-xs text-[#78695F]">
                        Ship to: {order.shippingAddress.line1}, {order.shippingAddress.city},{' '}
                        {order.shippingAddress.state} {order.shippingAddress.pincode}
                      </p>
                    )}
                    {order.notes && (
                      <p className="text-xs text-[#8E5B3E] italic pt-1">Note: {order.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrder(order.id, { status: e.target.value as OrderStatus })}
                      className="px-3 py-2 rounded-lg border border-[#55483F]/20 bg-[#FBF8F3] text-xs font-medium"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditingOrder(order)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#55483F]/20 bg-white text-[#55483F] text-xs font-medium hover:bg-[#FBF8F3]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>View & Edit</span>
                    </button>
                    <a
                      href={`/api/orders/${order.orderNumber}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </a>
                    {order.status !== 'Cancelled' && order.status !== 'Refunded' && (
                      <button
                        type="button"
                        onClick={() => setEditingOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#55483F]/10">
                  <input
                    type="text"
                    defaultValue={order.courierName || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (order.courierName || '')) {
                        updateOrder(order.id, { courierName: e.target.value });
                      }
                    }}
                    placeholder="Courier Partner (e.g. Delhivery, India Post)"
                    className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                  />
                  <input
                    type="text"
                    defaultValue={order.trackingNumber || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (order.trackingNumber || '')) {
                        updateOrder(order.id, { trackingNumber: e.target.value });
                      }
                    }}
                    placeholder="AWB / Tracking Number"
                    className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-mono"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78695F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                placeholder="Search by booking code, customer name, email, phone, or item..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </div>
            <select
              value={customStatusFilter}
              onChange={(e) => setCustomStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
            >
              <option value="ALL">All Stages ({data.customRequests.length})</option>
              {CUSTOM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {filteredCustomRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center text-sm text-[#78695F]">
              No matching custom crochet requests found.
            </div>
          ) : (
            filteredCustomRequests.map((c) => (
              <CustomAdminRow key={c.id} custom={c} onSave={(patch) => updateCustom(c.id, patch)} />
            ))
          )}
        </div>
      )}

      {tab === 'appointments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#78695F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={aptSearch}
                onChange={(e) => setAptSearch(e.target.value)}
                placeholder="Search by booking code, customer, phone, or date (YYYY-MM-DD)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </div>
            <select
              value={aptStatusFilter}
              onChange={(e) => setAptStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
            >
              <option value="ALL">All Statuses ({data.appointments.length})</option>
              {APPOINTMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredAppointments.length === 0 ? (
              <p className="text-sm text-[#78695F] bg-white rounded-2xl p-6 border border-[#55483F]/10">
                No matching consultation bookings found.
              </p>
            ) : (
              filteredAppointments.map((apt) => (
                <div
                  key={apt.id}
                  className="bg-white rounded-2xl border border-[#55483F]/10 p-5 flex flex-wrap justify-between items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-[#78695F]">
                        {apt.bookingCode} · {apt.date} · {apt.timeSlot}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-medium ${statusTone(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>
                    <p className="font-serif text-xl text-[#55483F]">
                      {apt.customerName} — {apt.appointmentType}
                    </p>
                    <p className="text-xs text-[#78695F]">
                      {apt.email} · {apt.phone} {apt.notes ? `· "${apt.notes}"` : ''}
                    </p>
                    {apt.adminNote && <p className="text-xs text-[#8E5B3E] italic">Studio Note: {apt.adminNote}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={apt.status}
                      onChange={(e) => updateAppointment(apt.id, { status: e.target.value as Appointment['status'] })}
                      className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/20 text-xs font-medium"
                    >
                      {APPOINTMENT_STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditingAppointment(apt)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#55483F]/20 bg-white text-xs font-medium text-[#55483F] hover:bg-[#FBF8F3]"
                    >
                      <CalendarClock className="w-3.5 h-3.5" />
                      <span>Edit / Reschedule</span>
                    </button>
                    {apt.status !== 'Cancelled' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateAppointment(apt.id, { status: 'Cancelled', adminNote: apt.adminNote || 'Cancelled by studio' })
                        }
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Schedule & Blocked Dates */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Consultation Schedule & Blocked Dates</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#78695F] mb-1">Duration (mins)</label>
                <input
                  type="number"
                  value={settingsDraft.appointmentDurationMins}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, appointmentDurationMins: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#78695F] mb-1">Max Bookings / Slot</label>
                <input
                  type="number"
                  min={1}
                  value={settingsDraft.maxBookingsPerSlot}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, maxBookingsPerSlot: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#78695F] mb-1">Block Unavailable Date</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={blockedDateInput}
                    onChange={(e) => setBlockedDateInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!blockedDateInput || settingsDraft.blockedDates.includes(blockedDateInput)) return;
                      setSettingsDraft({
                        ...settingsDraft,
                        blockedDates: [...settingsDraft.blockedDates, blockedDateInput],
                      });
                      setBlockedDateInput('');
                    }}
                    className="px-3 py-2 rounded-lg bg-[#55483F] text-white text-xs"
                  >
                    Block
                  </button>
                </div>
              </div>
            </div>
            {settingsDraft.blockedDates.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {settingsDraft.blockedDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setSettingsDraft({
                        ...settingsDraft,
                        blockedDates: settingsDraft.blockedDates.filter((x) => x !== d),
                      })
                    }
                    className="px-3 py-1 rounded-lg bg-[#FBF8F3] border border-[#55483F]/20 text-[#55483F]"
                  >
                    {d} ×
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={saveSettings}
              className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium"
            >
              Save Consultation Schedule
            </button>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-8">
          <form onSubmit={addProduct} className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Add New Handmade Product</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="Product Name *"
                className="px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <select
                value={newProdCat}
                onChange={(e) => setNewProdCat(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              >
                {[
                  'Flower Bouquets',
                  'Crochet Flowers',
                  'Crochet Keychains',
                  'Animal Charms',
                  'Crochet Bags',
                  'Baby Clothing',
                  'Crochet Accessories',
                  'Bookmarks',
                  'Rakhis and Festive Gifts',
                  'Custom Gifts',
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                required
                min={1}
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(Number(e.target.value))}
                placeholder="Price (INR)"
                className="px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  max={80}
                  value={newProdDiscount}
                  onChange={(e) => setNewProdDiscount(Number(e.target.value))}
                  placeholder="Discount %"
                  className="px-3 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
                />
                <input
                  type="number"
                  min={0}
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(Number(e.target.value))}
                  placeholder="Stock"
                  className="px-3 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newProdImg}
                onChange={(e) => setNewProdImg(e.target.value)}
                placeholder="Image Path"
                className="px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <input
                type="text"
                value={newProdDesc}
                onChange={(e) => setNewProdDesc(e.target.value)}
                placeholder="Short description..."
                className="px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-[#55483F]/10 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FBF8F3] text-[#78695F] border-b border-[#55483F]/10">
                <tr>
                  <th className="p-4">Product</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price (₹)</th>
                  <th className="p-4">Discount %</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Best Seller</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#55483F]/8">
                {data.products.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-medium text-[#55483F]">{p.name}</td>
                    <td className="p-4 text-[#78695F]">{p.category}</td>
                    <td className="p-4">
                      <input
                        type="number"
                        defaultValue={p.price}
                        onBlur={(e) => quickUpdateProduct(p.id, { price: Number(e.target.value) })}
                        className="w-24 px-2 py-1 rounded border border-[#55483F]/15 tabular-nums"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        defaultValue={p.discountPercent}
                        onBlur={(e) => quickUpdateProduct(p.id, { discountPercent: Number(e.target.value) })}
                        className="w-16 px-2 py-1 rounded border border-[#55483F]/15 tabular-nums"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="number"
                        defaultValue={p.stock}
                        onBlur={(e) => quickUpdateProduct(p.id, { stock: Number(e.target.value) })}
                        className="w-16 px-2 py-1 rounded border border-[#55483F]/15 tabular-nums"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={p.bestSeller}
                        onChange={(e) => quickUpdateProduct(p.id, { bestSeller: e.target.checked })}
                        className="accent-[#55483F]"
                      />
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => deleteProduct(p.id)}
                        className="p-1.5 text-[#78695F] hover:text-red-700"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'storefront' && (
        <div className="space-y-8">
          <form onSubmit={saveSettings} className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Storefront Banners, Shipping & Hours</h2>
            <div>
              <label className="block text-xs text-[#78695F] mb-1">Announcement Bar Text</label>
              <input
                type="text"
                value={settingsDraft.announcementText}
                onChange={(e) => setSettingsDraft({ ...settingsDraft, announcementText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-[#78695F] mb-1">Free Shipping Threshold (₹)</label>
                <input
                  type="number"
                  value={settingsDraft.freeShippingThreshold}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, freeShippingThreshold: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#78695F] mb-1">Standard Shipping Fee (₹)</label>
                <input
                  type="number"
                  value={settingsDraft.standardShippingFee}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, standardShippingFee: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#78695F] mb-1">Weekday Hours</label>
                <input
                  type="text"
                  value={settingsDraft.weekdayHours}
                  onChange={(e) => setSettingsDraft({ ...settingsDraft, weekdayHours: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                />
              </div>
            </div>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium">
              Save Storefront Settings
            </button>
          </form>

          {/* Promotional Coupons */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Promotional Coupons</h2>
            <form onSubmit={addCoupon} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <input
                type="text"
                required
                value={cpnCode}
                onChange={(e) => setCpnCode(e.target.value)}
                placeholder="Code (e.g. FESTIVE15)"
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <select
                value={cpnType}
                onChange={(e) => setCpnType(e.target.value as 'percent' | 'flat')}
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              >
                <option value="percent">% Off</option>
                <option value="flat">Flat ₹ Off</option>
              </select>
              <input
                type="number"
                value={cpnVal}
                onChange={(e) => setCpnVal(Number(e.target.value))}
                placeholder="Value"
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
              />
              <input
                type="number"
                value={cpnMin}
                onChange={(e) => setCpnMin(Number(e.target.value))}
                placeholder="Min Order ₹"
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium">
                Create Coupon
              </button>
            </form>
            <div className="space-y-2 text-xs">
              {data.coupons.map((c) => (
                <div key={c.id} className="flex justify-between items-center py-2 border-b border-[#55483F]/8">
                  <span>
                    <strong className="font-mono">{c.code}</strong> ·{' '}
                    {c.type === 'percent' ? `${c.value}%` : formatINR(c.value)} off above{' '}
                    {formatINR(c.minOrderAmount)}
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      await fetch(`/api/admin/coupons/${c.id}`, { method: 'DELETE' });
                      loadAdmin();
                    }}
                    className="text-[#78695F] hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Testimonials */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Verified Testimonials & Reviews</h2>
            <form onSubmit={addTestimonial} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                required
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="Customer Name *"
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <input
                type="text"
                value={testCity}
                onChange={(e) => setTestCity(e.target.value)}
                placeholder="City"
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <input
                type="text"
                value={testProduct}
                onChange={(e) => setTestProduct(e.target.value)}
                placeholder="Item Purchased"
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium">
                Publish Verified Story
              </button>
              <input
                type="text"
                required
                value={testQuote}
                onChange={(e) => setTestQuote(e.target.value)}
                placeholder="Verified customer quote *"
                className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </form>

            {data.testimonials.map((t) => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-[#55483F]/8 text-xs">
                <div>
                  <strong>{t.customerName}</strong> ({t.city}) — “{t.quote}”
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/admin/testimonials/${t.id}`, { method: 'DELETE' });
                    await Promise.all([loadAdmin(), refreshStorefront()]);
                  }}
                  className="text-[#78695F] hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}

            {data.reviews.length > 0 && (
              <div className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-[#55483F]">Product Reviews Moderation</p>
                {data.reviews.map((r) => (
                  <div key={r.id} className="flex justify-between items-center text-xs py-2 border-b border-[#55483F]/8">
                    <span>
                      <strong>{r.customerName}</strong> ({r.rating}★): {r.comment}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch(`/api/admin/reviews/${r.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ approved: !r.approved }),
                        });
                        await Promise.all([loadAdmin(), refreshStorefront()]);
                      }}
                      className="px-3 py-1 rounded-lg bg-[#FBF8F3] border border-[#55483F]/20"
                    >
                      {r.approved ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Newsletter & Support */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-3">
              <h3 className="font-serif text-2xl text-[#55483F]">
                Newsletter Subscribers ({data.subscribers.length})
              </h3>
              {data.subscribers.length === 0 ? (
                <p className="text-xs text-[#78695F]">No subscribers yet.</p>
              ) : (
                <div className="space-y-1.5 text-xs">
                  {data.subscribers.map((s) => (
                    <div key={s.id} className="flex justify-between py-1 border-b border-[#55483F]/8">
                      <span>{s.email}</span>
                      <span className="text-[#78695F]">{formatDateIN(s.subscribedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-3">
              <h3 className="font-serif text-2xl text-[#55483F]">
                Support & Contact Inbox ({data.supportRequests.length})
              </h3>
              {data.supportRequests.length === 0 ? (
                <p className="text-xs text-[#78695F]">No support messages yet.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {data.supportRequests.map((s) => (
                    <div key={s.id} className="p-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/10 space-y-1">
                      <div className="flex justify-between">
                        <strong>
                          {s.customerName} · {s.type}
                        </strong>
                        <select
                          value={s.status}
                          onChange={async (e) => {
                            await fetch(`/api/admin/support/${s.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ status: e.target.value }),
                            });
                            loadAdmin();
                          }}
                          className="bg-white border border-[#55483F]/15 rounded px-2 py-0.5"
                        >
                          <option>Open</option>
                          <option>In Progress</option>
                          <option>Resolved</option>
                        </select>
                      </div>
                      <p className="text-[#55483F]">{s.subject}</p>
                      <p className="text-[#78695F]">{s.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editingOrder && (
        <OrderEditModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSave={updateOrder}
          onCancelOrder={cancelOrder}
        />
      )}

      {editingAppointment && (
        <AppointmentEditModal
          appointment={editingAppointment}
          availableSlots={data.settings.appointmentSlots}
          onClose={() => setEditingAppointment(null)}
          onSave={updateAppointment}
        />
      )}
    </main>
  );
}

function CustomAdminRow({
  custom,
  onSave,
}: {
  custom: CustomRequest;
  onSave: (patch: Partial<CustomRequest> & { timelineNote?: string }) => Promise<void>;
}) {
  const [status, setStatus] = useState<CustomOrderStatus>(custom.status);
  const [productType, setProductType] = useState<string>(custom.productType);
  const [preferredSize, setPreferredSize] = useState<string>(custom.preferredSize);
  const [quantity, setQuantity] = useState<number>(custom.quantity);
  const [requiredDate, setRequiredDate] = useState<string>(custom.requiredDate || '');
  const [designInstructions, setDesignInstructions] = useState<string>(custom.designInstructions);
  const [quotedTotal, setQuotedTotal] = useState<number>(custom.quotedTotal || 2000);
  const [advanceAmount, setAdvanceAmount] = useState<number>(custom.advanceAmount || 1000);
  const [advancePaid, setAdvancePaid] = useState<boolean>(custom.advancePaid);
  const [adminNotes, setAdminNotes] = useState<string>(custom.adminNotes || '');
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        productType,
        preferredSize,
        quantity,
        requiredDate,
        designInstructions,
        status,
        quotedTotal,
        advanceAmount,
        advancePaid,
        adminNotes,
      });
      setEditingSpecs(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      setStatus('Cancelled');
      await onSave({
        status: 'Cancelled',
        adminNotes: adminNotes || 'Cancelled by studio administrator',
        timelineNote: adminNotes || 'Custom booking cancelled by studio administrator.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-[#78695F]">
              {custom.bookingCode} · {formatDateIN(custom.createdAt)}
            </span>
            <span className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-medium ${statusTone(custom.status)}`}>
              {custom.status}
            </span>
          </div>
          <h3 className="font-serif text-2xl text-[#55483F]">
            {custom.productType} ({custom.quantity} pc)
          </h3>
          <p className="text-xs text-[#78695F]">
            {custom.customerName} · {custom.email} · {custom.phone} · Budget: {custom.budgetRange}
            {custom.requiredDate ? ` · Needed by ${custom.requiredDate}` : ''}
          </p>
          <p className="text-xs text-[#55483F] pt-1">
            Colours: {custom.preferredColors.join(', ')} · Size: {custom.preferredSize}
          </p>
          <p className="text-xs text-[#55483F]/85 italic">“{custom.designInstructions}”</p>
        </div>

        <div className="flex items-start gap-3">
          {custom.referenceImageUrl && (
            <a href={custom.referenceImageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <img
                src={custom.referenceImageUrl}
                alt="Customer reference"
                className="w-24 h-24 rounded-xl object-cover border border-[#55483F]/15"
              />
            </a>
          )}
          <button
            type="button"
            onClick={() => setEditingSpecs((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#55483F]/20 bg-[#FBF8F3] text-xs font-medium text-[#55483F]"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{editingSpecs ? 'Hide Specs' : 'Edit Specs'}</span>
          </button>
        </div>
      </div>

      {editingSpecs && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#FBF8F3] border border-[#55483F]/10">
          <div className="sm:col-span-2">
            <label className="block text-[11px] text-[#78695F] mb-1">Product Type</label>
            <input
              type="text"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#78695F] mb-1">Size</label>
            <input
              type="text"
              value={preferredSize}
              onChange={(e) => setPreferredSize(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#78695F] mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs tabular-nums"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#78695F] mb-1">Required By</label>
            <input
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[11px] text-[#78695F] mb-1">Design Instructions</label>
            <input
              type="text"
              value={designInstructions}
              onChange={(e) => setDesignInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t border-[#55483F]/10">
        <div>
          <label className="block text-[11px] text-[#78695F] mb-1">Stage</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomOrderStatus)}
            className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
          >
            {CUSTOM_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#78695F] mb-1">Quoted Total (₹)</label>
          <input
            type="number"
            value={quotedTotal}
            onChange={(e) => setQuotedTotal(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] text-[#78695F] mb-1">Advance Amount (₹)</label>
          <input
            type="number"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs tabular-nums"
          />
        </div>
        <div>
          <label className="block text-[11px] text-[#78695F] mb-1">Studio Notes</label>
          <input
            type="text"
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Delivery ETA / yarn notes"
            className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-[#78695F]">
          <input
            type="checkbox"
            checked={advancePaid}
            onChange={(e) => setAdvancePaid(e.target.checked)}
            className="accent-[#55483F]"
          />
          <span>
            Advance Paid: <strong className="text-[#55483F]">{advancePaid ? 'Yes' : 'No'}</strong>
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {custom.status !== 'Cancelled' && (
            <button
              type="button"
              disabled={saving}
              onClick={handleCancel}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50 disabled:opacity-60"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancel Booking</span>
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium hover:bg-[#433830] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Sync Quotation'}
          </button>
        </div>
      </div>
    </div>
  );
}
