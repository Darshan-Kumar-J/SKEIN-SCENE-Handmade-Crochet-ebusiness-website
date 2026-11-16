import React, { useEffect, useState } from 'react';
import { FileText, LogOut, Plus, Trash2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type {
  Appointment,
  CustomRequest,
  Order,
  PaymentRecord,
  SavedAddress,
  SupportRequest,
} from '../types.ts';
import { formatDateIN, formatINR } from '../utils/format.ts';

type AccountTab = 'orders' | 'custom' | 'appointments' | 'wishlist' | 'addresses' | 'payments' | 'support';

export function AccountPage() {
  const { user, setUser, products, wishlist, setAuthOpen, logout, navigate, showToast, setPaymentSession } = useStore();
  const initialTab = (new URLSearchParams(window.location.search).get('tab') as AccountTab) || 'orders';

  const [tab, setTab] = useState<AccountTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);

  // Profile & Address editing
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [newLabel, setNewLabel] = useState('Home');
  const [newLine1, setNewLine1] = useState('');
  const [newCity, setNewCity] = useState('Bengaluru');
  const [newState, setNewState] = useState('Karnataka');
  const [newPin, setNewPin] = useState('');

  // Support / Cancellation form
  const [supType, setSupType] = useState<'Support' | 'Cancellation'>('Support');
  const [supRef, setSupRef] = useState('');
  const [supSubject, setSupSubject] = useState('');
  const [supMessage, setSupMessage] = useState('');

  const loadDashboard = async () => {
    const res = await fetch('/api/account/dashboard');
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.orders || []);
    setCustomRequests(data.customRequests || []);
    setAppointments(data.appointments || []);
    setPayments(data.payments || []);
    setSupportRequests(data.supportRequests || []);
  };

  useEffect(() => {
    if (user) {
      setProfileName(user.name);
      setProfilePhone(user.phone);
      loadDashboard();
    }
  }, [user]);

  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  if (!user) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        <div className="bg-white rounded-3xl border border-[#55483F]/10 p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">Customer Account</h1>
            <p className="text-sm text-[#78695F] max-w-lg">
              Sign in or create an account to view order history, download invoices, manage saved addresses, and track
              custom bookings. Guest checkout is also always available.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAuthOpen(true)}
            className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium whitespace-nowrap"
          >
            Sign In / Register
          </button>
        </div>

        {wishlistProducts.length > 0 && (
          <section className="space-y-6">
            <h2 className="font-serif text-3xl text-[#55483F]">Your Saved Wishlist ({wishlistProducts.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  const saveProfile = async (addresses?: SavedAddress[]) => {
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: profileName,
        phone: profilePhone,
        addresses: addresses ?? user.addresses,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      showToast('Account profile updated');
    }
  };

  const addAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLine1.trim() || !newPin.trim()) return;
    const next: SavedAddress[] = [
      ...(user.addresses || []),
      {
        id: `addr_${Date.now()}`,
        label: newLabel,
        recipientName: profileName,
        phone: profilePhone,
        line1: newLine1,
        city: newCity,
        state: newState,
        pincode: newPin,
      },
    ];
    await saveProfile(next);
    setNewLine1('');
    setNewPin('');
  };

  const removeAddress = async (id: string) => {
    await saveProfile((user.addresses || []).filter((a) => a.id !== id));
  };

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/account/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: supType,
        referenceCode: supRef,
        subject: supSubject,
        message: supMessage,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setSupportRequests((prev) => [data.supportRequest, ...prev]);
      setSupSubject('');
      setSupMessage('');
      setSupRef('');
      showToast(`${supType} request submitted to our studio`);
    }
  };

  const payCustomAdvance = async (custom: CustomRequest) => {
    const res = await fetch(`/api/custom-requests/${custom.bookingCode}/create-advance-order`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not initiate advance payment.');
      return;
    }
    setPaymentSession({
      title: `Custom Advance · ${custom.bookingCode}`,
      subtitle: custom.productType,
      amount: data.customRequest.advanceAmount,
      razorpayOrderId: data.razorpay.orderId,
      keyId: data.razorpay.keyId,
      prefillName: custom.customerName,
      prefillEmail: custom.email,
      prefillPhone: custom.phone,
      onSuccess: () => loadDashboard(),
    });
  };

  const tabs: { id: AccountTab; label: string }[] = [
    { id: 'orders', label: `Orders (${orders.length})` },
    { id: 'custom', label: `Custom Bookings (${customRequests.length})` },
    { id: 'appointments', label: `Consultations (${appointments.length})` },
    { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})` },
    { id: 'addresses', label: 'Profile & Addresses' },
    { id: 'payments', label: `Payments (${payments.length})` },
    { id: 'support', label: 'Support & Cancellations' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#55483F]/10">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#78695F]">Customer Dashboard</p>
          <h1 className="font-serif text-4xl font-medium text-[#55483F]">Hello, {user.name}</h1>
          <p className="text-xs text-[#78695F] mt-1">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 rounded-xl bg-[#C7D5C0] text-[#55483F] text-xs font-semibold"
            >
              Open Admin Dashboard
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#55483F]/20 bg-white text-xs font-medium text-[#55483F]"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-[#55483F] text-white'
                : 'bg-white border border-[#55483F]/10 text-[#55483F]/80 hover:text-[#55483F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center space-y-3">
              <p className="text-sm text-[#78695F]">You have not placed any orders yet.</p>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium"
              >
                Explore Handmade Shop
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-[#55483F]/10">
                  <div>
                    <p className="font-mono text-xs text-[#78695F]">{order.orderNumber}</p>
                    <h3 className="font-serif text-xl text-[#55483F]">
                      {order.status} · {formatINR(order.totalAmount)}
                    </h3>
                    <p className="text-xs text-[#78695F]">
                      {formatDateIN(order.createdAt)} · Payment: {order.paymentStatus.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/api/orders/${order.orderNumber}/invoice`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => navigate(`/track?code=${order.orderNumber}`)}
                      className="px-3.5 py-2 rounded-lg border border-[#55483F]/20 text-xs font-medium text-[#55483F]"
                    >
                      Track
                    </button>
                  </div>
                </div>
                <div className="text-xs text-[#55483F] space-y-1">
                  {order.items.map((item, idx) => (
                    <p key={idx}>
                      {item.productName} ({item.selectedColor}) × {item.quantity} — {formatINR(item.finalUnitPrice * item.quantity)}
                    </p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'custom' && (
        <div className="space-y-4">
          {customRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center space-y-3">
              <p className="text-sm text-[#78695F]">No custom crochet bookings yet.</p>
              <button
                type="button"
                onClick={() => navigate('/custom-orders')}
                className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium"
              >
                Create Custom Request
              </button>
            </div>
          ) : (
            customRequests.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-[#78695F]">{c.bookingCode}</p>
                    <h3 className="font-serif text-xl text-[#55483F]">
                      {c.productType} · {c.status}
                    </h3>
                    <p className="text-xs text-[#78695F]">
                      Colours: {c.preferredColors.join(', ')} · Qty {c.quantity}
                    </p>
                  </div>
                  {c.status === 'Awaiting Payment' && !c.advancePaid && (c.advanceAmount || 0) > 0 && (
                    <button
                      type="button"
                      onClick={() => payCustomAdvance(c)}
                      className="px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
                    >
                      Pay Advance {formatINR(c.advanceAmount || 0)}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'appointments' && (
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center space-y-3">
              <p className="text-sm text-[#78695F]">No consultations booked yet.</p>
              <button
                type="button"
                onClick={() => navigate('/consultations')}
                className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium"
              >
                Book Consultation
              </button>
            </div>
          ) : (
            appointments.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-5 flex justify-between items-center">
                <div>
                  <p className="font-mono text-xs text-[#78695F]">{a.bookingCode}</p>
                  <p className="font-serif text-xl text-[#55483F]">{a.appointmentType}</p>
                  <p className="text-xs text-[#78695F]">
                    {a.date} at {a.timeSlot}
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#55483F]">{a.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'wishlist' && (
        <div>
          {wishlistProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 text-center text-sm text-[#78695F]">
              Your wishlist is empty. Click the heart icon on any creation to save it here.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {wishlistProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Profile Details</h2>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Full Name"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
            <input
              type="tel"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="WhatsApp / Mobile"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
            <button
              type="button"
              onClick={() => saveProfile()}
              className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium"
            >
              Save Profile
            </button>
          </div>

          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-5">
            <h2 className="font-serif text-2xl text-[#55483F]">Saved Delivery Addresses</h2>
            <div className="space-y-3">
              {(user.addresses || []).map((addr) => (
                <div key={addr.id} className="p-4 rounded-xl bg-[#FBF8F3] border border-[#55483F]/10 flex justify-between items-start">
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-[#55483F]">{addr.label}</p>
                    <p>{addr.line1}</p>
                    <p>
                      {addr.city}, {addr.state} – {addr.pincode}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAddress(addr.id)}
                    className="p-1.5 text-[#78695F] hover:text-red-700"
                    aria-label="Remove address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={addAddress} className="space-y-3 pt-3 border-t border-[#55483F]/10">
              <p className="text-xs font-medium text-[#78695F]">Add New Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (Home, Office)"
                  className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
                <input
                  type="text"
                  required
                  value={newLine1}
                  onChange={(e) => setNewLine1(e.target.value)}
                  placeholder="Street / Apartment *"
                  className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="City"
                  className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
                <input
                  type="text"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  placeholder="State"
                  className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
                <input
                  type="text"
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="PIN Code *"
                  className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Address</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-white rounded-2xl border border-[#55483F]/10 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FBF8F3] text-[#78695F] border-b border-[#55483F]/10">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Reference</th>
                <th className="p-4">Payment ID</th>
                <th className="p-4">Method</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#55483F]/8">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#78695F]">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4">{formatDateIN(p.createdAt)}</td>
                    <td className="p-4 font-mono">{p.referenceCode}</td>
                    <td className="p-4 font-mono">{p.razorpayPaymentId || p.razorpayOrderId}</td>
                    <td className="p-4">{p.method}</td>
                    <td className="p-4 text-right font-semibold tabular-nums">{formatINR(p.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={submitSupport} className="lg:col-span-5 bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
            <h2 className="font-serif text-2xl text-[#55483F]">Cancellation or Support Request</h2>
            <div className="grid grid-cols-2 gap-2">
              {(['Support', 'Cancellation'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSupType(t)}
                  className={`py-2 rounded-lg text-xs font-medium border ${
                    supType === t ? 'bg-[#55483F] text-white border-[#55483F]' : 'bg-[#FBF8F3] border-[#55483F]/15'
                  }`}
                >
                  {t} Request
                </button>
              ))}
            </div>
            <input
              type="text"
              value={supRef}
              onChange={(e) => setSupRef(e.target.value)}
              placeholder="Order / Booking ID (optional)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
            />
            <input
              type="text"
              required
              value={supSubject}
              onChange={(e) => setSupSubject(e.target.value)}
              placeholder="Subject *"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
            />
            <textarea
              required
              rows={4}
              value={supMessage}
              onChange={(e) => setSupMessage(e.target.value)}
              placeholder="Explain your cancellation or support request..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium">
              Submit Request
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="font-serif text-2xl text-[#55483F]">Your Requests</h2>
            {supportRequests.length === 0 ? (
              <p className="text-sm text-[#78695F] bg-white rounded-2xl p-6 border border-[#55483F]/10">
                No support or cancellation requests filed.
              </p>
            ) : (
              supportRequests.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-5 space-y-1">
                  <div className="flex justify-between text-xs text-[#78695F]">
                    <span>
                      {s.type} {s.referenceCode ? `· ${s.referenceCode}` : ''}
                    </span>
                    <span className="font-semibold text-[#55483F]">{s.status}</span>
                  </div>
                  <p className="font-medium text-sm text-[#55483F]">{s.subject}</p>
                  <p className="text-xs text-[#78695F]">{s.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </main>
  );
}
