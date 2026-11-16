import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Download,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
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

type AdminTab = 'overview' | 'products' | 'orders' | 'custom' | 'appointments' | 'storefront';

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

export function AdminPage() {
  const { user, setAuthOpen, refreshStorefront, showToast } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!user || user.role !== 'admin') {
    return (
      <main className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-4xl font-medium text-[#55483F]">Administrator Access Required</h1>
        <p className="text-sm text-[#78695F]">
          Please sign in with an authorized Skein Scene studio administrator account to manage inventory, orders,
          custom bookings, consultations, and store settings.
        </p>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium"
        >
          Sign In as Administrator
        </button>
      </main>
    );
  }

  if (loading || !data || !settingsDraft) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-sm text-[#78695F]">Loading Skein Scene studio data...</main>
    );
  }

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
      showToast('Order updated');
      loadAdmin();
    }
  };

  const updateCustom = async (
    id: string,
    patch: { status?: CustomOrderStatus; quotedTotal?: number; advanceAmount?: number; adminNotes?: string }
  ) => {
    const res = await fetch(`/api/admin/custom-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      showToast('Custom booking updated');
      loadAdmin();
    }
  };

  const updateAppointment = async (id: string, patch: Partial<Appointment>) => {
    const res = await fetch(`/api/admin/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      showToast('Consultation updated');
      loadAdmin();
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

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#55483F]/10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Skein Scene Studio Operations</p>
          <h1 className="font-serif text-4xl font-medium text-[#55483F]">Admin Dashboard</h1>
        </div>
        <div className="flex flex-wrap gap-2">
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

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'products', label: `Products (${data.products.length})` },
            { id: 'orders', label: `Orders (${data.orders.length})` },
            { id: 'custom', label: `Custom Bookings (${data.customRequests.length})` },
            { id: 'appointments', label: `Consultations (${data.appointments.length})` },
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
              { label: 'Custom Requests', value: String(data.metrics.customRequestsCount) },
              { label: 'Confirmed Consults', value: String(data.metrics.confirmedBookingsCount) },
              { label: 'Low Stock Items', value: String(data.metrics.lowStockCount) },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-[#55483F]/10 p-5">
                <p className="text-xs text-[#78695F]">{kpi.label}</p>
                <p className="font-serif text-3xl font-medium text-[#55483F] mt-1 tabular-nums">{kpi.value}</p>
              </div>
            ))}
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

      {tab === 'orders' && (
        <div className="space-y-4">
          {data.orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center text-sm text-[#78695F]">
              No customer orders have been placed yet.
            </div>
          ) : (
            data.orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-[#78695F]">
                      {order.orderNumber} · {formatDateIN(order.createdAt)}
                    </p>
                    <h3 className="font-serif text-2xl text-[#55483F]">
                      {order.customerName} — {formatINR(order.totalAmount)}
                    </h3>
                    <p className="text-xs text-[#78695F]">
                      {order.customerEmail} · {order.customerPhone} · Payment: {order.paymentStatus.toUpperCase()}
                    </p>
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
                    <a
                      href={`/api/orders/${order.orderNumber}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#55483F]/10">
                  <input
                    type="text"
                    defaultValue={order.courierName || ''}
                    onBlur={(e) => updateOrder(order.id, { courierName: e.target.value })}
                    placeholder="Courier Partner (e.g. Delhivery, India Post)"
                    className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                  />
                  <input
                    type="text"
                    defaultValue={order.trackingNumber || ''}
                    onBlur={(e) => updateOrder(order.id, { trackingNumber: e.target.value })}
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
        <div className="space-y-4">
          {data.customRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center text-sm text-[#78695F]">
              No custom crochet requests received yet.
            </div>
          ) : (
            data.customRequests.map((c) => (
              <CustomAdminRow key={c.id} custom={c} onSave={(patch) => updateCustom(c.id, patch)} />
            ))
          )}
        </div>
      )}

      {tab === 'appointments' && (
        <div className="space-y-8">
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

          <div className="space-y-3">
            {data.appointments.length === 0 ? (
              <p className="text-sm text-[#78695F] bg-white rounded-2xl p-6 border border-[#55483F]/10">
                No consultations scheduled yet.
              </p>
            ) : (
              data.appointments.map((apt) => (
                <div key={apt.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-5 flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <p className="font-mono text-xs text-[#78695F]">
                      {apt.bookingCode} · {apt.date} · {apt.timeSlot}
                    </p>
                    <p className="font-serif text-xl text-[#55483F]">
                      {apt.customerName} — {apt.appointmentType}
                    </p>
                    <p className="text-xs text-[#78695F]">
                      {apt.email} · {apt.phone} {apt.notes ? `· "${apt.notes}"` : ''}
                    </p>
                  </div>
                  <select
                    value={apt.status}
                    onChange={(e) => updateAppointment(apt.id, { status: e.target.value as Appointment['status'] })}
                    className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/20 text-xs font-medium"
                  >
                    {['Pending', 'Approved', 'Completed', 'Rescheduled', 'Rejected', 'Cancelled'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'storefront' && (
        <div className="space-y-8">
          {/* Banners & Shipping Settings */}
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
                    <strong className="font-mono">{c.code}</strong> · {c.type === 'percent' ? `${c.value}%` : formatINR(c.value)} off above {formatINR(c.minOrderAmount)}
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
    </main>
  );
}

function CustomAdminRow({
  custom,
  onSave,
}: {
  custom: CustomRequest;
  onSave: (patch: {
    status?: CustomOrderStatus;
    quotedTotal?: number;
    advanceAmount?: number;
    adminNotes?: string;
  }) => void;
}) {
  const [status, setStatus] = useState<CustomOrderStatus>(custom.status);
  const [quotedTotal, setQuotedTotal] = useState<number>(custom.quotedTotal || 2000);
  const [advanceAmount, setAdvanceAmount] = useState<number>(custom.advanceAmount || 1000);
  const [adminNotes, setAdminNotes] = useState<string>(custom.adminNotes || '');

  return (
    <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="font-mono text-xs text-[#78695F]">
            {custom.bookingCode} · {formatDateIN(custom.createdAt)}
          </p>
          <h3 className="font-serif text-2xl text-[#55483F]">
            {custom.productType} ({custom.quantity} pc)
          </h3>
          <p className="text-xs text-[#78695F]">
            {custom.customerName} · {custom.email} · {custom.phone} · Budget: {custom.budgetRange}
          </p>
          <p className="text-xs text-[#55483F] pt-1">
            Colours: {custom.preferredColors.join(', ')} · Size: {custom.preferredSize}
          </p>
          <p className="text-xs text-[#55483F]/85 italic">“{custom.designInstructions}”</p>
        </div>

        {custom.referenceImageUrl && (
          <a href={custom.referenceImageUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src={custom.referenceImageUrl}
              alt="Customer reference"
              className="w-24 h-24 rounded-xl object-cover border border-[#55483F]/15"
            />
          </a>
        )}
      </div>

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

      <div className="flex items-center justify-between">
        <span className="text-xs text-[#78695F]">
          Advance Paid: <strong>{custom.advancePaid ? 'Yes' : 'No'}</strong>
        </span>
        <button
          type="button"
          onClick={() => onSave({ status, quotedTotal, advanceAmount, adminNotes })}
          className="px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
        >
          Update & Send Quotation
        </button>
      </div>
    </div>
  );
}
