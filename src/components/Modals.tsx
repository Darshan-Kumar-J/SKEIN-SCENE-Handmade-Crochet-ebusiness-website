import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { Order } from '../types.ts';
import { buildWhatsAppUrl, formatINR, getDiscountedPrice } from '../utils/format.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function CartAndCheckoutDrawer() {
  const {
    cartOpen,
    setCartOpen,
    cart,
    products,
    settings,
    user,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    setPaymentSession,
    refreshStorefront,
    navigate,
    showToast,
  } = useStore();

  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmed'>('bag');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [giftWrap, setGiftWrap] = useState(true);
  const [giftMessage, setGiftMessage] = useState('');
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'standard' | 'pickup'>('standard');

  const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [line1, setLine1] = useState(defaultAddr?.line1 || '');
  const [line2, setLine2] = useState(defaultAddr?.line2 || '');
  const [city, setCity] = useState(defaultAddr?.city || 'Bengaluru');
  const [stateName, setStateName] = useState(defaultAddr?.state || 'Karnataka');
  const [pincode, setPincode] = useState(defaultAddr?.pincode || '');
  const [checkoutError, setCheckoutError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  const detailedItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const unitFinal = getDiscountedPrice(product.price, product.discountPercent);
        return { ...item, product, unitFinal, lineTotal: unitFinal * item.quantity };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [cart, products]);

  const subtotal = detailedItems.reduce((s, i) => s + i.lineTotal, 0);
  const discountAmount = appliedCoupon ? Math.min(subtotal, appliedCoupon.discountAmount) : 0;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const qualifiesFreeShipping =
    fulfillmentMethod === 'pickup' || afterDiscount >= settings.freeShippingThreshold;
  const shippingFee = detailedItems.length === 0 ? 0 : qualifiesFreeShipping ? 0 : settings.standardShippingFee;
  const taxAmount = Math.round((afterDiscount * (settings.taxPercent || 0)) / 100);
  const grandTotal = afterDiscount + shippingFee + taxAmount;
  const remainingForFreeShipping = Math.max(0, settings.freeShippingThreshold - afterDiscount);

  if (!cartOpen) return null;

  const syncUserFields = () => {
    if (user) {
      if (!customerName) setCustomerName(user.name);
      if (!customerEmail) setCustomerEmail(user.email);
      if (!customerPhone) setCustomerPhone(user.phone);
      const addr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      if (addr && !line1) {
        setLine1(addr.line1);
        setLine2(addr.line2 || '');
        setCity(addr.city);
        setStateName(addr.state);
        setPincode(addr.pincode);
      }
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponInput.trim()) return;
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: couponInput.trim(), subtotal }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCouponError(data.error || 'Could not apply coupon.');
      setAppliedCoupon(null);
      return;
    }
    setAppliedCoupon({ code: data.coupon.code, discountAmount: data.discountAmount });
    showToast(`Coupon ${data.coupon.code} applied`);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          fulfillmentMethod,
          shippingAddress:
            fulfillmentMethod === 'standard'
              ? {
                  id: 'checkout',
                  label: 'Delivery',
                  recipientName: customerName,
                  phone: customerPhone,
                  line1,
                  line2,
                  city,
                  state: stateName,
                  pincode,
                }
              : undefined,
          items: detailedItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            selectedColor: i.selectedColor,
          })),
          couponCode: appliedCoupon?.code,
          giftWrap,
          giftMessage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || 'Unable to initiate checkout.');
        return;
      }

      setPaymentSession({
        title: `Skein Scene Order ${data.order.orderNumber}`,
        subtitle: `${detailedItems.length} handmade item(s) · ${fulfillmentMethod === 'pickup' ? 'Laggere Studio Pickup' : 'Standard Delivery'}`,
        amount: data.order.totalAmount,
        razorpayOrderId: data.razorpay.orderId,
        keyId: data.razorpay.keyId,
        prefillName: customerName,
        prefillEmail: customerEmail,
        prefillPhone: customerPhone,
        onSuccess: (verified) => {
          if (verified.order) {
            setConfirmedOrder(verified.order);
            setStep('confirmed');
            clearCart();
            setAppliedCoupon(null);
            refreshStorefront();
          }
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-[#55483F]/45 backdrop-blur-xs" onClick={() => setCartOpen(false)} />
      <aside
        aria-label="Shopping Bag"
        className="relative w-full max-w-lg bg-[#F7F1E9] h-full shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        <div className="px-6 py-4 bg-white border-b border-[#55483F]/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#55483F]" />
            <h2 className="font-serif text-2xl font-medium text-[#55483F]">
              {step === 'bag' ? 'Your Shopping Bag' : step === 'checkout' ? 'Secure Checkout' : 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setCartOpen(false);
              if (step === 'confirmed') setStep('bag');
            }}
            className="p-2 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'confirmed' && confirmedOrder ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-[#53724C] shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#78695F]">Payment Verified</p>
                  <h3 className="font-serif text-2xl font-semibold text-[#55483F]">
                    Order {confirmedOrder.orderNumber} Confirmed
                  </h3>
                  <p className="text-sm text-[#78695F] mt-1">
                    Thank you, {confirmedOrder.customerName}. Our studio in Laggere has received your order.
                  </p>
                </div>
              </div>

              <div className="bg-[#FBF8F3] rounded-xl p-4 text-sm space-y-2 border border-[#55483F]/10">
                <div className="flex justify-between">
                  <span className="text-[#78695F]">Transaction ID</span>
                  <span className="font-mono text-xs text-[#55483F]">{confirmedOrder.razorpayPaymentId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78695F]">Method</span>
                  <span>{confirmedOrder.paymentMethod}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Paid</span>
                  <span className="tabular-nums">{formatINR(confirmedOrder.totalAmount)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`/api/orders/${confirmedOrder.orderNumber}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download Invoice</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setCartOpen(false);
                    setStep('bag');
                    navigate(`/track?code=${confirmedOrder.orderNumber}`);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#55483F]/25 bg-white text-[#55483F] text-sm font-medium hover:bg-[#F7F1E9]"
                >
                  Track Order
                </button>
              </div>

              <a
                href={buildWhatsAppUrl(
                  settings.whatsappNumber,
                  `Hello Skein Scene! I just placed order ${confirmedOrder.orderNumber} (${formatINR(confirmedOrder.totalAmount)}).`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C7D5C0] text-[#55483F] text-sm font-medium hover:bg-[#b8cab0]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Share Order on WhatsApp</span>
              </a>
            </div>
          ) : detailedItems.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <ShoppingBag className="w-10 h-10 mx-auto text-[#B78C70]" />
              <h3 className="font-serif text-2xl text-[#55483F]">Your bag is currently empty</h3>
              <p className="text-sm text-[#78695F] max-w-xs mx-auto">
                Explore handmade crochet bouquets, keychains, bags, and heirloom gifts crafted to order.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="px-6 py-2.5 rounded-lg bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830]"
              >
                Browse Handmade Shop
              </button>
            </div>
          ) : step === 'bag' ? (
            <>
              {/* Free Shipping Threshold Banner */}
              <div className="bg-white rounded-xl p-4 border border-[#55483F]/10">
                <p className="text-xs font-medium text-[#55483F]">
                  {remainingForFreeShipping === 0
                    ? 'Your order qualifies for complimentary standard shipping across India.'
                    : `Add ${formatINR(remainingForFreeShipping)} more for free shipping (above ${formatINR(settings.freeShippingThreshold)}).`}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-[#F7F1E9] overflow-hidden">
                  <div
                    className="h-full bg-[#C7D5C0] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((afterDiscount / Math.max(1, settings.freeShippingThreshold)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Cart Items */}
              <div className="space-y-3">
                {detailedItems.map((item) => (
                  <div
                    key={`${item.productId}-${item.selectedColor}`}
                    className="bg-white rounded-xl p-3.5 border border-[#55483F]/10 flex gap-3.5"
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-[#F7F1E9]">
                      <ResilientImage
                        src={item.product.images[0]}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm text-[#55483F] leading-snug">{item.product.name}</h4>
                          <p className="text-xs text-[#78695F] mt-0.5">Colour: {item.selectedColor}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId, item.selectedColor)}
                          className="p-1 text-[#78695F] hover:text-[#55483F]"
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="inline-flex items-center border border-[#55483F]/15 rounded-lg">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.productId, item.selectedColor, item.quantity - 1)}
                            className="p-1.5 text-[#55483F] hover:bg-[#F7F1E9]"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-medium tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.productId, item.selectedColor, item.quantity + 1)}
                            className="p-1.5 text-[#55483F] hover:bg-[#F7F1E9]"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-[#55483F] tabular-nums">
                          {formatINR(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon & Gift Options */}
              <div className="bg-white rounded-xl p-4 border border-[#55483F]/10 space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Coupon code (e.g. LOVE10)"
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3] focus:outline-none focus:border-[#55483F]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium hover:bg-[#433830]"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-700">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-xs text-[#53724C] font-medium">
                    Applied {appliedCoupon.code}: saving {formatINR(discountAmount)}
                  </p>
                )}

                <label className="flex items-center gap-2.5 text-sm text-[#55483F] pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="accent-[#55483F] w-4 h-4"
                  />
                  <span>Include complimentary boutique gift wrapping & tissue ribbon</span>
                </label>

                {giftWrap && (
                  <input
                    type="text"
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Optional handwritten gift card message..."
                    maxLength={200}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                  />
                )}
              </div>
            </>
          ) : (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4">
              <div className="bg-white rounded-xl p-4 border border-[#55483F]/10 space-y-3">
                <h3 className="font-serif text-lg font-medium text-[#55483F]">Contact Details</h3>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Full Name *"
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="Email Address *"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                  />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="WhatsApp / Mobile *"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-[#55483F]/10 space-y-3">
                <h3 className="font-serif text-lg font-medium text-[#55483F]">Delivery or Studio Pickup</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('standard')}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      fulfillmentMethod === 'standard'
                        ? 'border-[#55483F] bg-[#F7F1E9] text-[#55483F]'
                        : 'border-[#55483F]/15 text-[#78695F]'
                    }`}
                  >
                    Standard Delivery
                    <span className="block text-[11px] font-normal mt-0.5">
                      {afterDiscount >= settings.freeShippingThreshold
                        ? 'Free shipping'
                        : `${formatINR(settings.standardShippingFee)} shipping`}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFulfillmentMethod('pickup')}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      fulfillmentMethod === 'pickup'
                        ? 'border-[#55483F] bg-[#F7F1E9] text-[#55483F]'
                        : 'border-[#55483F]/15 text-[#78695F]'
                    }`}
                  >
                    Laggere Studio Pickup
                    <span className="block text-[11px] font-normal mt-0.5">Free · After confirmation</span>
                  </button>
                </div>

                {fulfillmentMethod === 'standard' ? (
                  <div className="space-y-2.5 pt-2">
                    <input
                      type="text"
                      required
                      value={line1}
                      onChange={(e) => setLine1(e.target.value)}
                      placeholder="House / Flat / Street Address *"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                    />
                    <input
                      type="text"
                      value={line2}
                      onChange={(e) => setLine2(e.target.value)}
                      placeholder="Landmark / Layout (optional)"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City *"
                        className="px-3 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                      />
                      <input
                        type="text"
                        required
                        value={stateName}
                        onChange={(e) => setStateName(e.target.value)}
                        placeholder="State *"
                        className="px-3 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                      />
                      <input
                        type="text"
                        required
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="PIN Code *"
                        className="px-3 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-[#FBF8F3]"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#78695F] bg-[#FBF8F3] p-3 rounded-lg">
                    Pickup address: {settings.address}. We will notify you on WhatsApp & email when your order is ready.
                  </p>
                )}
              </div>

              {checkoutError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{checkoutError}</p>
              )}
            </form>
          )}
        </div>

        {detailedItems.length > 0 && step !== 'confirmed' && (
          <div className="p-6 bg-white border-t border-[#55483F]/10 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#78695F]">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatINR(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#53724C]">
                  <span>Discount ({appliedCoupon?.code})</span>
                  <span className="tabular-nums">-{formatINR(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#78695F]">
                <span>Shipping</span>
                <span className="tabular-nums">{shippingFee === 0 ? 'Free' : formatINR(shippingFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base text-[#55483F] pt-2 border-t border-[#55483F]/10">
                <span>Total</span>
                <span className="tabular-nums">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {step === 'bag' ? (
              <button
                type="button"
                onClick={() => {
                  syncUserFields();
                  setStep('checkout');
                }}
                className="w-full py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] transition-colors"
              >
                Proceed to Checkout · {formatINR(grandTotal)}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('bag')}
                  className="px-4 py-3 rounded-xl border border-[#55483F]/20 text-sm font-medium text-[#55483F]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Preparing Razorpay...' : `Pay Securely ${formatINR(grandTotal)}`}
                </button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export function RazorpayGatewayModal() {
  const { paymentSession, setPaymentSession, showToast } = useStore();
  const [method, setMethod] = useState<'UPI (GPay / PhonePe)' | 'Debit / Credit Card' | 'Net Banking' | 'Wallet'>(
    'UPI (GPay / PhonePe)'
  );
  const [upiId, setUpiId] = useState('customer@okaxis');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!paymentSession) return null;

  const processPayment = async (simulateFailure = false) => {
    setErrorMsg('');
    setProcessing(true);
    try {
      const authRes = await fetch('/api/payments/gateway-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpayOrderId: paymentSession.razorpayOrderId,
          method,
          simulateFailure,
        }),
      });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setErrorMsg(authData.error || 'Payment could not be authorized.');
        return;
      }

      const verifyRes = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: authData.razorpay_order_id,
          razorpay_payment_id: authData.razorpay_payment_id,
          razorpay_signature: authData.razorpay_signature,
          method,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.verified) {
        setErrorMsg(verifyData.error || 'Server payment signature verification failed.');
        return;
      }

      showToast('Payment verified securely');
      const callback = paymentSession.onSuccess;
      setPaymentSession(null);
      callback(verifyData);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#55483F]/60 backdrop-blur-xs" onClick={() => setPaymentSession(null)} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#55483F]/15 overflow-hidden">
        <div className="bg-[#55483F] text-white px-6 py-5 flex items-start justify-between">
          <div>
            <p className="text-xs text-[#E9C4CB] uppercase tracking-wider">Razorpay Secure Checkout · Test Mode</p>
            <h3 className="font-serif text-2xl font-medium mt-1">{paymentSession.title}</h3>
            <p className="text-xs text-white/75 mt-0.5">{paymentSession.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setPaymentSession(null)}
            className="p-1.5 text-white/80 hover:text-white"
            aria-label="Cancel payment"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between bg-[#F7F1E9] rounded-xl px-4 py-3">
            <span className="text-xs text-[#78695F]">Payable Amount</span>
            <span className="text-xl font-semibold text-[#55483F] tabular-nums">
              {formatINR(paymentSession.amount)}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[#78695F] uppercase tracking-wider">Select Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'UPI (GPay / PhonePe)' as const, icon: Smartphone },
                { label: 'Debit / Credit Card' as const, icon: CreditCard },
                { label: 'Net Banking' as const, icon: Landmark },
                { label: 'Wallet' as const, icon: Wallet },
              ].map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setMethod(opt.label)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium text-left transition-colors ${
                      method === opt.label
                        ? 'border-[#55483F] bg-[#FBF8F3] text-[#55483F]'
                        : 'border-[#55483F]/15 text-[#78695F] hover:bg-[#FBF8F3]'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'UPI (GPay / PhonePe)' && (
            <div>
              <label className="block text-xs text-[#78695F] mb-1">UPI ID / VPA</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#55483F]/20 text-sm bg-[#FBF8F3]"
                placeholder="yourname@okaxis"
              />
            </div>
          )}

          {method === 'Debit / Credit Card' && (
            <p className="text-xs text-[#78695F] bg-[#FBF8F3] p-3 rounded-lg border border-[#55483F]/10">
              Card numbers are processed exclusively through the gateway tokenizer and are never stored by Skein Scene.
            </p>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">{errorMsg}</div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              disabled={processing}
              onClick={() => processPayment(false)}
              className="w-full py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{processing ? 'Verifying Signature...' : `Complete Payment · ${formatINR(paymentSession.amount)}`}</span>
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => processPayment(true)}
              className="w-full py-2 rounded-lg text-xs text-[#78695F] hover:text-[#55483F] hover:bg-[#F7F1E9]"
            >
              Simulate Bank Decline (Test Failure Handling)
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#78695F]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#53724C]" />
            <span>HMAC-SHA256 Server Signature Verification · Ref {paymentSession.razorpayOrderId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickViewModal() {
  const { quickViewProduct, setQuickViewProduct, addToCart, navigate, settings } = useStore();
  const [selectedColor, setSelectedColor] = useState('');

  if (!quickViewProduct) return null;
  const activeColor = selectedColor || quickViewProduct.colors[0] || 'Classic';
  const finalPrice = getDiscountedPrice(quickViewProduct.price, quickViewProduct.discountPercent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#55483F]/50 backdrop-blur-xs" onClick={() => setQuickViewProduct(null)} />
      <div className="relative w-full max-w-2xl bg-[#F7F1E9] rounded-2xl shadow-2xl border border-[#55483F]/10 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-[#55483F]"
          aria-label="Close quick view"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="aspect-[4/3] md:aspect-auto md:h-full bg-white">
          <ResilientImage
            src={quickViewProduct.images[0]}
            alt={quickViewProduct.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <p className="text-xs text-[#78695F]">
              {quickViewProduct.category} · {quickViewProduct.prepTimeDays}
            </p>
            <h3 className="font-serif text-2xl font-medium text-[#55483F]">{quickViewProduct.name}</h3>
            <div className="flex items-baseline gap-2.5 tabular-nums">
              <span className="text-xl font-semibold text-[#55483F]">{formatINR(finalPrice)}</span>
              {quickViewProduct.discountPercent > 0 && (
                <span className="text-sm text-[#78695F] line-through">{formatINR(quickViewProduct.price)}</span>
              )}
            </div>
            <p className="text-sm text-[#55483F]/85 leading-relaxed line-clamp-3">{quickViewProduct.description}</p>

            <div>
              <p className="text-xs font-medium text-[#78695F] mb-2">Colour Palette</p>
              <div className="flex flex-wrap gap-2">
                {quickViewProduct.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      activeColor === c
                        ? 'border-[#55483F] bg-[#55483F] text-white'
                        : 'border-[#55483F]/20 bg-white text-[#55483F]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                addToCart(quickViewProduct.id, activeColor, 1);
                setQuickViewProduct(null);
              }}
              className="w-full py-2.5 rounded-lg bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830]"
            >
              Add to Bag
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const slug = quickViewProduct.slug;
                  setQuickViewProduct(null);
                  navigate(`/product/${slug}`);
                }}
                className="py-2 rounded-lg border border-[#55483F]/20 bg-white text-xs font-medium text-[#55483F]"
              >
                Full Details
              </button>
              <a
                href={buildWhatsAppUrl(
                  settings.whatsappNumber,
                  `Hello Skein Scene! I'd like to inquire about "${quickViewProduct.name}".`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 rounded-lg bg-[#C7D5C0] text-xs font-medium text-[#55483F] text-center"
              >
                WhatsApp Inquiry
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SearchModal() {
  const { searchOpen, setSearchOpen, products, navigate } = useStore();
  const [query, setQuery] = useState('');

  if (!searchOpen) return null;

  const matches = query.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      )
    : products.slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
      <div className="fixed inset-0 bg-[#55483F]/45 backdrop-blur-xs" onClick={() => setSearchOpen(false)} />
      <div className="relative w-full max-w-2xl bg-[#F7F1E9] rounded-2xl shadow-2xl border border-[#55483F]/10 overflow-hidden">
        <div className="p-4 bg-white border-b border-[#55483F]/10 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#78695F]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search crochet tulips, keychains, baby sets, rakhis..."
            className="flex-1 text-sm text-[#55483F] bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            className="p-1.5 text-[#78695F] hover:text-[#55483F]"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4 divide-y divide-[#55483F]/10">
          {matches.length === 0 ? (
            <p className="text-sm text-[#78695F] py-8 text-center">
              No creations found for “{query}”. Try creating a custom crochet request!
            </p>
          ) : (
            matches.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSearchOpen(false);
                  navigate(`/product/${p.slug}`);
                }}
                className="w-full py-3 flex items-center gap-4 text-left hover:bg-white/60 px-2 rounded-lg transition-colors"
              >
                <div className="w-14 h-12 rounded-lg overflow-hidden bg-white shrink-0">
                  <ResilientImage src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#55483F] truncate">{p.name}</p>
                  <p className="text-xs text-[#78695F]">{p.category}</p>
                </div>
                <span className="text-sm font-semibold text-[#55483F] tabular-nums">
                  {formatINR(getDiscountedPrice(p.price, p.discountPercent))}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function AuthModal() {
  const { authOpen, setAuthOpen, setUser, navigate, showToast } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!authOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email, password } : { name, email, phone, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      setUser(data.user);
      setAuthOpen(false);
      showToast(`Welcome, ${data.user.name}`);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[#55483F]/50 backdrop-blur-xs" onClick={() => setAuthOpen(false)} />
      <div className="relative w-full max-w-md bg-[#F7F1E9] rounded-2xl shadow-2xl border border-[#55483F]/10 p-6 sm:p-8 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-3xl font-medium text-[#55483F]">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-xs text-[#78695F] mt-1">
              {mode === 'login'
                ? 'Sign in to view your orders, wishlist, and custom bookings.'
                : 'Join Skein Scene to save addresses and track custom creations.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAuthOpen(false)}
            className="p-1.5 text-[#78695F] hover:text-[#55483F]"
            aria-label="Close sign in"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name *"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-white"
              />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="WhatsApp / Mobile Number"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-white"
              />
            </>
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address *"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-white"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password *"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-[#55483F]/20 bg-white"
          />

          {error && <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center text-xs text-[#78695F] pt-2 border-t border-[#55483F]/10">
          {mode === 'login' ? (
            <button type="button" onClick={() => setMode('register')} className="hover:text-[#55483F] underline">
              New to Skein Scene? Create a customer account
            </button>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="hover:text-[#55483F] underline">
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
