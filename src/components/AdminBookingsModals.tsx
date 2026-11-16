import React, { useState } from 'react';
import { Ban, Check, FileText, MapPin, Package, X } from 'lucide-react';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentType,
  Order,
  OrderStatus,
  PaymentStatus,
} from '../types.ts';
import { formatDateIN, formatINR } from '../utils/format.ts';

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

const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export function OrderEditModal({
  order,
  onClose,
  onSave,
  onCancelOrder,
}: {
  order: Order;
  onClose: () => void;
  onSave: (id: string, patch: Partial<Order>) => Promise<void>;
  onCancelOrder: (
    id: string,
    payload: { reason: string; restoreStock: boolean; markRefunded: boolean }
  ) => Promise<void>;
}) {
  const [customerName, setCustomerName] = useState(order.customerName);
  const [customerEmail, setCustomerEmail] = useState(order.customerEmail);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone);
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'standard' | 'pickup'>(order.fulfillmentMethod);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [courierName, setCourierName] = useState(order.courierName || '');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || '');
  const [giftWrap, setGiftWrap] = useState(order.giftWrap);
  const [giftMessage, setGiftMessage] = useState(order.giftMessage || '');
  const [notes, setNotes] = useState(order.notes || '');

  const [line1, setLine1] = useState(order.shippingAddress?.line1 || '');
  const [line2, setLine2] = useState(order.shippingAddress?.line2 || '');
  const [city, setCity] = useState(order.shippingAddress?.city || '');
  const [stateName, setStateName] = useState(order.shippingAddress?.state || '');
  const [pincode, setPincode] = useState(order.shippingAddress?.pincode || '');

  const [saving, setSaving] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [restoreStock, setRestoreStock] = useState(true);
  const [markRefunded, setMarkRefunded] = useState(order.paymentStatus === 'paid');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(order.id, {
        customerName,
        customerEmail,
        customerPhone,
        fulfillmentMethod,
        shippingAddress:
          fulfillmentMethod === 'standard'
            ? {
                id: order.shippingAddress?.id || 'addr_edit',
                label: order.shippingAddress?.label || 'Delivery',
                recipientName: customerName,
                phone: customerPhone,
                line1,
                line2,
                city,
                state: stateName,
                pincode,
              }
            : undefined,
        giftWrap,
        giftMessage,
        status,
        paymentStatus,
        courierName,
        trackingNumber,
        notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubmit = async () => {
    setSaving(true);
    try {
      await onCancelOrder(order.id, { reason: cancelReason, restoreStock, markRefunded });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#55483F]/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#F7F1E9] rounded-3xl shadow-2xl border border-[#55483F]/15 overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-white border-b border-[#55483F]/10 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-[#78695F]">
              {order.orderNumber} · {formatDateIN(order.createdAt)}
            </p>
            <h2 className="font-serif text-2xl font-medium text-[#55483F]">
              Manage Order — {order.customerName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/orders/${order.orderNumber}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium text-[#55483F]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoice</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg"
              aria-label="Close order editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Ordered Items Summary */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78695F] flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                <span>Ordered Items ({order.items.length})</span>
              </h3>
              <span className="font-mono text-xs text-[#78695F]">
                Gateway: {order.razorpayPaymentId || order.razorpayOrderId}
              </span>
            </div>
            <div className="divide-y divide-[#55483F]/10">
              {order.items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.productImage && (
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="w-11 h-11 rounded-lg object-cover border border-[#55483F]/10 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-[#55483F] truncate">{item.productName}</p>
                      <p className="text-[#78695F]">
                        Colour: {item.selectedColor} · Qty: {item.quantity} × {formatINR(item.finalUnitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-[#55483F] tabular-nums shrink-0">
                    {formatINR(item.finalUnitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-[#55483F]/10 flex flex-wrap justify-between gap-2 text-xs text-[#78695F]">
              <span>
                Subtotal: {formatINR(order.subtotal)} · Discount: -{formatINR(order.discountAmount)} · Shipping:{' '}
                {order.shippingFee === 0 ? 'Free' : formatINR(order.shippingFee)}
              </span>
              <span className="font-semibold text-sm text-[#55483F] tabular-nums">
                Total: {formatINR(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Status & Tracking */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#78695F] mb-1">Order Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium"
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#78695F] mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-medium uppercase"
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps} value={ps}>
                    {ps.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#78695F] mb-1">Courier Partner</label>
              <input
                type="text"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. Delhivery, DTDC, India Post"
                className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-[#78695F] mb-1">AWB / Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Tracking ID"
                className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-mono"
              />
            </div>
          </div>

          {/* Customer & Delivery Details */}
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#78695F] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>Customer & Delivery Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#78695F] mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#78695F] mb-1">Customer Email</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#78695F] mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#78695F] mb-1">Fulfillment Method</label>
                <select
                  value={fulfillmentMethod}
                  onChange={(e) => setFulfillmentMethod(e.target.value as 'standard' | 'pickup')}
                  className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                >
                  <option value="standard">Standard Delivery</option>
                  <option value="pickup">Laggere Studio Pickup</option>
                </select>
              </div>
            </div>

            {fulfillmentMethod === 'standard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#55483F]/10">
                <input
                  type="text"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Address Line 1"
                  className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
                <input
                  type="text"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Landmark / Apartment"
                  className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="State"
                    className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
                  />
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="PIN"
                    className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#55483F]/10">
              <label className="flex items-center gap-2 text-xs text-[#55483F]">
                <input
                  type="checkbox"
                  checked={giftWrap}
                  onChange={(e) => setGiftWrap(e.target.checked)}
                  className="accent-[#55483F]"
                />
                <span>Include Boutique Gift Packaging</span>
              </label>
              <input
                type="text"
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="Handwritten gift note..."
                className="px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal studio notes / cancellation reason..."
                className="sm:col-span-2 px-3 py-2 rounded-lg bg-[#FBF8F3] border border-[#55483F]/15 text-xs"
              />
            </div>
          </div>

          {/* Cancel Section */}
          {order.status !== 'Cancelled' && order.status !== 'Refunded' && (
            <div className="bg-white rounded-2xl border border-red-200 p-4 space-y-3">
              {!confirmCancelOpen ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-red-800">Need to cancel this order?</p>
                    <p className="text-[11px] text-[#78695F]">
                      Cancelling updates the status in your database and can optionally restore product inventory.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-red-800">Confirm Order Cancellation</p>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation (e.g. Customer requested change)"
                    className="w-full px-3 py-2 rounded-lg bg-[#FBF8F3] border border-red-200 text-xs"
                  />
                  <div className="flex flex-wrap gap-4 text-xs text-[#55483F]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={restoreStock}
                        onChange={(e) => setRestoreStock(e.target.checked)}
                        className="accent-[#55483F]"
                      />
                      <span>Restore product stock</span>
                    </label>
                    {order.paymentStatus === 'paid' && (
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={markRefunded}
                          onChange={(e) => setMarkRefunded(e.target.checked)}
                          className="accent-[#55483F]"
                        />
                        <span>Mark payment as Refunded</span>
                      </label>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleCancelSubmit}
                      className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-medium hover:bg-red-800 disabled:opacity-60"
                    >
                      {saving ? 'Cancelling...' : 'Confirm Cancel & Sync'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelOpen(false)}
                      className="px-3 py-2 rounded-lg border border-[#55483F]/15 text-xs text-[#55483F]"
                    >
                      Keep Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-[#55483F]/20 bg-white text-xs font-medium text-[#55483F]"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-xs font-medium hover:bg-[#433830] disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes to Database'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Custom Gift Consultation',
  'Bouquet Design Consultation',
  'Bulk Order Discussion',
  'Product Inquiry',
];

const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'Pending',
  'Approved',
  'Completed',
  'Rescheduled',
  'Rejected',
  'Cancelled',
];

export function AppointmentEditModal({
  appointment,
  availableSlots,
  onClose,
  onSave,
}: {
  appointment: Appointment;
  availableSlots: string[];
  onClose: () => void;
  onSave: (id: string, patch: Partial<Appointment>) => Promise<void>;
}) {
  const [customerName, setCustomerName] = useState(appointment.customerName);
  const [email, setEmail] = useState(appointment.email);
  const [phone, setPhone] = useState(appointment.phone);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>(appointment.appointmentType);
  const [date, setDate] = useState(appointment.date);
  const [timeSlot, setTimeSlot] = useState(appointment.timeSlot);
  const [status, setStatus] = useState<AppointmentStatus>(appointment.status);
  const [notes, setNotes] = useState(appointment.notes || '');
  const [adminNote, setAdminNote] = useState(appointment.adminNote || '');
  const [saving, setSaving] = useState(false);

  const slotOptions = Array.from(new Set([...availableSlots, appointment.timeSlot].filter(Boolean)));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(appointment.id, {
        customerName,
        email,
        phone,
        appointmentType,
        date,
        timeSlot,
        status,
        notes,
        adminNote,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#55483F]/50 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#F7F1E9] rounded-3xl shadow-2xl border border-[#55483F]/15 overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-[#55483F]/10 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-[#78695F]">{appointment.bookingCode}</p>
            <h2 className="font-serif text-2xl font-medium text-[#55483F]">Edit Consultation Booking</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg"
            aria-label="Close appointment editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#78695F] mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#78695F] mb-1">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-[#78695F] mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#78695F] mb-1">Consultation Type</label>
              <select
                value={appointmentType}
                onChange={(e) => setAppointmentType(e.target.value as AppointmentType)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              >
                {APPOINTMENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#78695F] mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs font-medium"
              >
                {APPOINTMENT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#78695F] mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#78695F] mb-1">Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              >
                {slotOptions.map((slot) => (
                  <option key={slot}>{slot}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-[#78695F] mb-1">Customer Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-[#78695F] mb-1">Studio Admin Note</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reschedule details, yarn prep, or cancellation reason"
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#55483F]/15 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {appointment.status !== 'Cancelled' ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onSave(appointment.id, { status: 'Cancelled', adminNote: adminNote || 'Cancelled by studio' });
                    onClose();
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3.5 py-2 rounded-lg border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50"
              >
                Cancel Consultation
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#55483F]/20 bg-white text-xs text-[#55483F]"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#55483F] text-white text-xs font-medium hover:bg-[#433830]"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
