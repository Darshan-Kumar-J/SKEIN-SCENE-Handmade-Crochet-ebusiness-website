import React, { useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  Gift,
  ImagePlus,
  MessageCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { CustomOrderStatus, CustomRequest } from '../types.ts';
import { buildWhatsAppUrl, formatDateIN, formatINR } from '../utils/format.ts';

const YARN_PALETTE = [
  { name: 'Warm Ivory', hex: '#F7F1E9' },
  { name: 'Sage Green', hex: '#C7D5C0' },
  { name: 'Dusty Pink', hex: '#E9C4CB' },
  { name: 'Warm Mocha', hex: '#B78C70' },
  { name: 'Deep Cocoa', hex: '#55483F' },
  { name: 'Soft Buttercream', hex: '#F2E2BA' },
  { name: 'Muted Lavender', hex: '#C9BBD8' },
  { name: 'Terracotta Rose', hex: '#C88070' },
];

const CUSTOM_STAGES: CustomOrderStatus[] = [
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
];

export function CustomOrderPage() {
  const { user, settings, categories, setPaymentSession, showToast } = useStore();

  const [customerName, setCustomerName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [category, setCategory] = useState(categories[0]?.name || 'Flower Bouquets');
  const [productType, setProductType] = useState('Pastel Tulip & Rose Bouquet');
  const [preferredColors, setPreferredColors] = useState<string[]>(['Warm Ivory', 'Dusty Pink']);
  const [preferredSize, setPreferredSize] = useState('Medium (Standard Boutique)');
  const [quantity, setQuantity] = useState(1);
  const [budgetRange, setBudgetRange] = useState('₹1,500 – ₹3,000');
  const [requiredDate, setRequiredDate] = useState('');
  const [giftWrapping, setGiftWrapping] = useState(true);
  const [personalizedMessage, setPersonalizedMessage] = useState('');
  const [designInstructions, setDesignInstructions] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [submittedBooking, setSubmittedBooking] = useState<CustomRequest | null>(null);

  // Tracker state
  const [trackCode, setTrackCode] = useState('');
  const [tracked, setTracked] = useState<CustomRequest | null>(null);
  const [trackError, setTrackError] = useState('');
  const [changeFeedback, setChangeFeedback] = useState('');

  const toggleColor = (name: string) => {
    setPreferredColors((prev) =>
      prev.includes(name) ? (prev.length > 1 ? prev.filter((c) => c !== name) : prev) : [...prev.slice(0, 4), name]
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('Please select an image smaller than 3 MB.');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/custom-requests/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: reader.result, fileName: file.name }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Upload failed.');
          return;
        }
        setReferenceImageUrl(data.url);
        showToast('Reference image attached');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/custom-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          category,
          productType,
          preferredColors,
          preferredSize,
          quantity,
          budgetRange,
          requiredDate,
          giftWrapping,
          personalizedMessage,
          designInstructions,
          referenceImageUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit custom request.');
        return;
      }
      setSubmittedBooking(data.customRequest);
      setTracked(data.customRequest);
      setTrackCode(data.customRequest.bookingCode);
      showToast(`Custom booking ${data.customRequest.bookingCode} received!`);
    } finally {
      setSubmitting(false);
    }
  };

  const lookupBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setTrackError('');
    if (!trackCode.trim()) return;
    const res = await fetch(`/api/custom-requests/track/${encodeURIComponent(trackCode.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      setTrackError(data.error || 'Booking ID not found.');
      setTracked(null);
      return;
    }
    setTracked(data.customRequest);
  };

  const respondQuotation = async (action: 'accept' | 'request_changes') => {
    if (!tracked) return;
    const res = await fetch(`/api/custom-requests/${tracked.bookingCode}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, feedback: changeFeedback }),
    });
    const data = await res.json();
    if (res.ok) {
      setTracked(data.customRequest);
      setChangeFeedback('');
      showToast(action === 'accept' ? 'Quotation accepted! Proceed to pay advance.' : 'Revision notes sent to studio.');
    }
  };

  const payAdvance = async () => {
    if (!tracked) return;
    const res = await fetch(`/api/custom-requests/${tracked.bookingCode}/create-advance-order`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Advance order unavailable.');
      return;
    }
    setPaymentSession({
      title: `Custom Advance · ${tracked.bookingCode}`,
      subtitle: `${tracked.productType} (${tracked.quantity} pc)`,
      amount: data.customRequest.advanceAmount,
      razorpayOrderId: data.razorpay.orderId,
      keyId: data.razorpay.keyId,
      prefillName: tracked.customerName,
      prefillEmail: tracked.email,
      prefillPhone: tracked.phone,
      onSuccess: (verified) => {
        if (verified.customRequest) {
          setTracked(verified.customRequest as CustomRequest);
        }
      },
    });
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-16">
      {/* Header */}
      <div className="max-w-3xl space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Bespoke Crochet Studio</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#55483F] leading-tight">
          Dream It. Design It. We&apos;ll Crochet It.
        </h1>
        <p className="text-sm sm:text-base text-[#78695F] leading-relaxed">
          Customize yarn palettes, bouquet stems, baby wear sizing, or personal keepsakes. Receive a unique booking ID,
          review our studio quotation, pay an advance online, and follow every stage until delivery.
        </p>
      </div>

      {submittedBooking ? (
        <section className="bg-white rounded-3xl border border-[#55483F]/10 p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-[#53724C] shrink-0 mt-1" />
            <div>
              <p className="text-xs uppercase tracking-wider text-[#78695F]">Request Received</p>
              <h2 className="font-serif text-3xl text-[#55483F]">
                Booking ID: <span className="font-mono text-2xl">{submittedBooking.bookingCode}</span>
              </h2>
              <p className="text-sm text-[#78695F] mt-1">
                Our Bengaluru studio team has been notified and will review your design specifications to prepare a
                quotation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                `Hello Skein Scene! I submitted custom crochet request ${submittedBooking.bookingCode} for "${submittedBooking.productType}" in colours: ${submittedBooking.preferredColors.join(', ')}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C7D5C0] text-[#55483F] text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share Requirements on WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => setSubmittedBooking(null)}
              className="px-5 py-2.5 rounded-xl border border-[#55483F]/20 text-sm font-medium text-[#55483F]"
            >
              Submit Another Custom Request
            </button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* 14-Field Custom Order Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-white rounded-3xl border border-[#55483F]/10 p-6 sm:p-8 space-y-6"
          >
            <h2 className="font-serif text-2xl font-medium text-[#55483F]">Custom Order Specifications</h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">1. Your Name *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">2. Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">3. WhatsApp / Mobile *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">4. Product Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">5. Product Type / Idea *</label>
                <input
                  type="text"
                  required
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  placeholder="e.g. 9-stem tulip bouquet, bunny rattle..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                />
              </div>
            </div>

            {/* 6. Preferred Colors */}
            <div>
              <label className="block text-xs font-medium text-[#78695F] mb-2">
                6. Preferred Yarn Colours (select up to 5)
              </label>
              <div className="flex flex-wrap gap-2">
                {YARN_PALETTE.map((swatch) => {
                  const selected = preferredColors.includes(swatch.name);
                  return (
                    <button
                      key={swatch.name}
                      type="button"
                      onClick={() => toggleColor(swatch.name)}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                        selected
                          ? 'border-[#55483F] bg-[#F7F1E9] text-[#55483F]'
                          : 'border-[#55483F]/15 bg-white text-[#78695F]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-[#55483F]/20"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span>{swatch.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">7. Preferred Size</label>
                <select
                  value={preferredSize}
                  onChange={(e) => setPreferredSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                >
                  <option>Petite / Mini</option>
                  <option>Medium (Standard Boutique)</option>
                  <option>Large / Grand Bouquet</option>
                  <option>Custom Measurements</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">8. Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">9. Budget Range (INR)</label>
                <select
                  value={budgetRange}
                  onChange={(e) => setBudgetRange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                >
                  <option>Under ₹1,000</option>
                  <option>₹1,000 – ₹1,500</option>
                  <option>₹1,500 – ₹3,000</option>
                  <option>₹3,000 – ₹6,000</option>
                  <option>₹6,000+ (Bulk / Bridal)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-[#78695F] mb-1">10. Required Delivery Date</label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
                />
              </div>
              <label className="flex items-center gap-2.5 text-sm text-[#55483F] pt-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={giftWrapping}
                  onChange={(e) => setGiftWrapping(e.target.checked)}
                  className="accent-[#55483F] w-4 h-4"
                />
                <span>11. Include boutique gift wrapping & ribbon</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#78695F] mb-1">
                12. Personalized Name, Initial, or Gift Card Message
              </label>
              <input
                type="text"
                value={personalizedMessage}
                onChange={(e) => setPersonalizedMessage(e.target.value)}
                placeholder="e.g. 'Happy Anniversary Meera' or embroidered initial 'A'"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#78695F] mb-1">
                13. Detailed Design Instructions *
              </label>
              <textarea
                required
                rows={4}
                value={designInstructions}
                onChange={(e) => setDesignInstructions(e.target.value)}
                placeholder="Describe flower counts, character expression, wrapping paper tone, or sizing notes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#78695F] mb-2">
                14. Reference Image Upload (optional, PNG/JPG/WebP up to 3 MB)
              </label>
              <label className="flex items-center justify-center gap-2.5 px-4 py-4 rounded-xl border border-dashed border-[#55483F]/30 bg-[#FBF8F3] text-sm text-[#55483F] cursor-pointer hover:bg-[#F7F1E9]">
                <ImagePlus className="w-4 h-4 text-[#B78C70]" />
                <span>
                  {uploading
                    ? 'Uploading inspiration photo...'
                    : referenceImageUrl
                    ? 'Reference photo attached (click to replace)'
                    : 'Upload sketch or inspiration image'}
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {errorMsg && <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl">{errorMsg}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60"
            >
              {submitting ? 'Submitting Request...' : 'Submit Custom Crochet Request'}
            </button>
          </form>

          {/* Live Selection Preview */}
          <aside className="lg:col-span-5 bg-[#FBF8F3] rounded-3xl border border-[#55483F]/10 p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-2xl font-medium text-[#55483F]">Live Custom Preview</h3>
              <Sparkles className="w-5 h-5 text-[#B78C70]" />
            </div>

            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-5 space-y-4">
              {referenceImageUrl && (
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[#F7F1E9]">
                  <img src={referenceImageUrl} alt="Uploaded custom reference" className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <p className="text-xs text-[#78695F]">{category}</p>
                <h4 className="font-serif text-2xl text-[#55483F] mt-0.5">{productType || 'Your Custom Creation'}</h4>
              </div>

              <div>
                <p className="text-xs text-[#78695F] mb-2">Chosen Yarn Palette</p>
                <div className="flex flex-wrap gap-2">
                  {preferredColors.map((c) => {
                    const sw = YARN_PALETTE.find((y) => y.name === c);
                    return (
                      <div key={c} className="inline-flex items-center gap-1.5 text-xs text-[#55483F]">
                        <span
                          className="w-4 h-4 rounded-full border border-[#55483F]/20"
                          style={{ backgroundColor: sw?.hex || '#F7F1E9' }}
                        />
                        <span>{c}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#55483F]/10 text-xs">
                <div>
                  <span className="text-[#78695F] block">Size</span>
                  <span className="font-medium text-[#55483F]">{preferredSize}</span>
                </div>
                <div>
                  <span className="text-[#78695F] block">Quantity & Budget</span>
                  <span className="font-medium text-[#55483F] tabular-nums">
                    {quantity} pc · {budgetRange}
                  </span>
                </div>
                <div>
                  <span className="text-[#78695F] block">Target Date</span>
                  <span className="font-medium text-[#55483F]">{requiredDate || 'Flexible'}</span>
                </div>
                <div>
                  <span className="text-[#78695F] block">Packaging</span>
                  <span className="font-medium text-[#55483F]">
                    {giftWrapping ? 'Boutique Gift Box' : 'Standard Wrap'}
                  </span>
                </div>
              </div>

              {personalizedMessage && (
                <div className="bg-[#F7F1E9] rounded-xl p-3.5 border border-[#55483F]/10 flex items-start gap-2.5">
                  <Gift className="w-4 h-4 text-[#B78C70] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[#78695F]">Personalization Card</p>
                    <p className="font-serif italic text-base text-[#55483F]">“{personalizedMessage}”</p>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-[#78695F] space-y-1.5 leading-relaxed">
              <p className="font-semibold text-[#55483F]">How Booking Works</p>
              <p>1. Submit your custom brief to receive a unique booking ID.</p>
              <p>2. Our studio reviews yarn availability and sends your itemized quotation.</p>
              <p>3. Accept the quote, pay the booking advance securely, and track every crafting stage live.</p>
            </div>
          </aside>
        </div>
      )}

      {/* Custom Order Progress & Quotation Management */}
      <section className="pt-12 border-t border-[#55483F]/10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#78695F] mb-1">Live Production Tracker</p>
            <h2 className="font-serif text-3xl font-medium text-[#55483F]">Track Your Custom Creation</h2>
          </div>

          <form onSubmit={lookupBooking} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-[#78695F] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={trackCode}
                onChange={(e) => setTrackCode(e.target.value)}
                placeholder="Enter Booking ID (e.g. SS-CUST-...)"
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-white border border-[#55483F]/20 text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830]"
            >
              Track
            </button>
          </form>
        </div>

        {trackError && <p className="text-sm text-red-700">{trackError}</p>}

        {tracked && (
          <div className="bg-white rounded-3xl border border-[#55483F]/10 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#55483F]/10">
              <div>
                <p className="text-xs font-mono text-[#78695F]">{tracked.bookingCode}</p>
                <h3 className="font-serif text-2xl font-medium text-[#55483F]">
                  {tracked.productType} · {tracked.quantity} pc
                </h3>
                <p className="text-xs text-[#78695F] mt-1">
                  Requested on {formatDateIN(tracked.createdAt)} · Current Stage:{' '}
                  <strong className="text-[#55483F]">{tracked.status}</strong>
                </p>
              </div>
              {tracked.quotedTotal && (
                <div className="bg-[#FBF8F3] rounded-xl p-4 border border-[#55483F]/10 text-right tabular-nums">
                  <p className="text-xs text-[#78695F]">Studio Quotation</p>
                  <p className="text-xl font-semibold text-[#55483F]">{formatINR(tracked.quotedTotal)}</p>
                  {tracked.advanceAmount !== undefined && (
                    <p className="text-xs text-[#78695F]">
                      Advance: {formatINR(tracked.advanceAmount)} ({tracked.advancePaid ? 'Paid' : 'Pending'})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Stage Progress */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CUSTOM_STAGES.map((stage) => {
                const currentIdx = CUSTOM_STAGES.indexOf(tracked.status);
                const stageIdx = CUSTOM_STAGES.indexOf(stage);
                const reached = tracked.status !== 'Cancelled' && stageIdx <= currentIdx;
                return (
                  <div
                    key={stage}
                    className={`p-2.5 rounded-xl border text-xs ${
                      reached
                        ? 'border-[#55483F] bg-[#F7F1E9] text-[#55483F] font-medium'
                        : 'border-[#55483F]/10 bg-[#FBF8F3] text-[#78695F]'
                    }`}
                  >
                    {stage}
                  </div>
                );
              })}
            </div>

            {/* Customer Quote Actions */}
            {tracked.status === 'Quotation Sent' && (
              <div className="bg-[#F7F1E9] rounded-2xl p-5 space-y-4 border border-[#55483F]/15">
                <p className="text-sm text-[#55483F]">
                  Studio Notes: {tracked.adminNotes || 'Ready to begin crafting upon advance confirmation.'}
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => respondQuotation('accept')}
                    className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-sm font-medium"
                  >
                    Accept Quotation
                  </button>
                  <input
                    type="text"
                    value={changeFeedback}
                    onChange={(e) => setChangeFeedback(e.target.value)}
                    placeholder="Need a tweak? Describe requested changes..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#55483F]/15 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => respondQuotation('request_changes')}
                    className="px-4 py-2.5 rounded-xl border border-[#55483F]/25 bg-white text-sm font-medium text-[#55483F]"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            )}

            {tracked.status === 'Awaiting Payment' && !tracked.advancePaid && (tracked.advanceAmount || 0) > 0 && (
              <div className="bg-[#C7D5C0]/35 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-serif text-xl text-[#55483F]">Advance Payment Ready</h4>
                  <p className="text-xs text-[#55483F]/80">
                    Pay {formatINR(tracked.advanceAmount || 0)} advance via Razorpay (UPI / Card / Netbanking) to start
                    crafting.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={payAdvance}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-sm font-medium"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Advance {formatINR(tracked.advanceAmount || 0)}</span>
                </button>
              </div>
            )}

            {/* Timeline Logs */}
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wider text-[#78695F]">Studio Activity Log</p>
              <div className="space-y-2">
                {tracked.timeline.map((entry, idx) => (
                  <div key={idx} className="text-xs flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-[#55483F]/8">
                    <span>
                      <strong className="text-[#55483F]">{entry.status}:</strong> {entry.note}
                    </span>
                    <span className="text-[#78695F] shrink-0">{formatDateIN(entry.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
