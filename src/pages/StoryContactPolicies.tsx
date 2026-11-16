import React, { useEffect, useState } from 'react';
import { Clock, FileText, Instagram, MapPin, MessageCircle, Phone, Search } from 'lucide-react';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Appointment, CustomRequest, Order } from '../types.ts';
import { buildWhatsAppUrl, formatDateIN, formatINR } from '../utils/format.ts';

export function OurStoryPage() {
  const { settings, navigate } = useStore();
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Our Story · Laggere, Bengaluru</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#55483F] leading-tight">
            Little Things, Lovingly Made.
          </h1>
          <p className="text-base text-[#55483F]/85 leading-relaxed">
            Born in Muneshwara Layout, Laggere, Skein Scene began with a simple belief: meaningful gifts should linger
            long after the occasion passes. Every crochet tulip, keepsake teddy, daisy tote, and festive rakhi is
            crafted stitch by stitch in small batches using soft combed cotton yarns.
          </p>
          <p className="text-sm text-[#78695F] leading-relaxed">
            Whether you are choosing an everlasting floral bouquet for someone special in Bengaluru or collaborating
            with us on bespoke wedding hampers shipped across India, we pair unhurried handcraft with thoughtful gift
            presentation.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium"
            >
              Explore Our Catalogue
            </button>
            <button
              type="button"
              onClick={() => navigate('/custom-orders')}
              className="px-6 py-3 rounded-xl border border-[#55483F]/25 bg-white text-[#55483F] text-sm font-medium"
            >
              Start a Custom Order
            </button>
          </div>
        </div>
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-[#55483F]/10">
            <ResilientImage
              src="/src/assets/images/crochet_crafting_yarn_1794827810996.jpg"
              alt="Artisan crochet hook and pastel cotton yarn skeins"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-[#55483F]/10 mt-8">
            <ResilientImage
              src="/src/assets/images/crochet_gift_packaging_1794827810801.jpg"
              alt="Boutique handmade gift packaging with sage ribbon"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#55483F]/10 p-8 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#78695F] mb-2">Studio Address</p>
          <p className="text-sm text-[#55483F] leading-relaxed">{settings.address}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#78695F] mb-2">Opening Hours</p>
          <p className="text-sm text-[#55483F]">{settings.weekdayHours}</p>
          <p className="text-sm text-[#55483F] mt-1">{settings.sundayHours}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[#78695F] mb-2">Direct Studio Line</p>
          <p className="text-sm text-[#55483F]">{settings.whatsappNumber}</p>
          <p className="text-sm text-[#78695F] mt-1">Instagram: {settings.instagramHandle}</p>
        </div>
      </div>
    </main>
  );
}

export function ContactPage() {
  const { settings, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Custom Gift Inquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not send message.');
        return;
      }
      setMessage('');
      showToast(data.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Get in Touch</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#55483F]">Visit or Message Our Studio</h1>
          <p className="text-sm text-[#78695F] leading-relaxed">
            Have questions about yarn colours, bulk festive gifting, or pickup timings in Laggere? Reach us directly on
            WhatsApp or leave a note here.
          </p>

          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#B78C70] shrink-0 mt-1" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-[#B78C70] shrink-0" />
              <span>{settings.whatsappNumber}</span>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#B78C70] shrink-0 mt-1" />
              <div>
                <p>{settings.weekdayHours}</p>
                <p>{settings.sundayHours}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                'Hello Skein Scene! I would like to inquire about your handmade crochet creations.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#C7D5C0] text-[#55483F] text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Message on WhatsApp</span>
            </a>
            <a
              href="https://www.instagram.com/skein_scene/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#55483F]/20 bg-white text-[#55483F] text-sm font-medium"
            >
              <Instagram className="w-4 h-4" />
              <span>{settings.instagramHandle}</span>
            </a>
          </div>
        </div>

        <form onSubmit={submit} className="lg:col-span-7 bg-white rounded-3xl border border-[#55483F]/10 p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-2xl font-medium text-[#55483F]">Send an Inquiry</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name *"
              className="px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address *"
              className="px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp / Phone"
              className="px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
          </div>
          <textarea
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your question or custom idea here..."
            className="w-full px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </div>
    </main>
  );
}

export function TrackPage() {
  const params = new URLSearchParams(window.location.search);
  const [code, setCode] = useState(params.get('code') || '');
  const [orderResult, setOrderResult] = useState<Order | null>(null);
  const [customResult, setCustomResult] = useState<CustomRequest | null>(null);
  const [aptResult, setAptResult] = useState<Appointment | null>(null);
  const [error, setError] = useState('');

  const runSearch = async (targetCode: string) => {
    const clean = targetCode.trim().toUpperCase();
    if (!clean) return;
    setError('');
    setOrderResult(null);
    setCustomResult(null);
    setAptResult(null);

    if (clean.startsWith('SS-CUST')) {
      const res = await fetch(`/api/custom-requests/track/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok) setCustomResult(data.customRequest);
      else setError(data.error || 'Custom booking not found.');
    } else if (clean.startsWith('SS-APT')) {
      const res = await fetch(`/api/appointments/track/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok) setAptResult(data.appointment);
      else setError(data.error || 'Consultation booking not found.');
    } else {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (res.ok) setOrderResult(data.order);
      else setError(data.error || 'Order number not found.');
    }
  };

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('code');
    if (initial) runSearch(initial);
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Order & Booking Lookup</p>
        <h1 className="font-serif text-4xl font-medium text-[#55483F]">Track Your Creation</h1>
        <p className="text-sm text-[#78695F]">
          Enter your Shop Order ID (<span className="font-mono">SS-...</span>), Custom Booking ID (
          <span className="font-mono">SS-CUST-...</span>), or Consultation ID (<span className="font-mono">SS-APT-...</span>).
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runSearch(code);
        }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#78695F] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. SS-2611-A1B2 or SS-CUST-2611-C3D4"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-[#55483F]/20 text-sm"
          />
        </div>
        <button type="submit" className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium">
          Track
        </button>
      </form>

      {error && <p className="text-sm text-red-700 bg-red-50 p-4 rounded-xl">{error}</p>}

      {orderResult && (
        <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#55483F]/10 pb-4">
            <div>
              <p className="font-mono text-xs text-[#78695F]">{orderResult.orderNumber}</p>
              <h2 className="font-serif text-2xl text-[#55483F]">Status: {orderResult.status}</h2>
              <p className="text-xs text-[#78695F]">
                Placed {formatDateIN(orderResult.createdAt)} · Payment: {orderResult.paymentStatus.toUpperCase()}
              </p>
            </div>
            <a
              href={`/api/orders/${orderResult.orderNumber}/invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#55483F] text-white text-xs font-medium"
            >
              <FileText className="w-4 h-4" />
              <span>Download Invoice</span>
            </a>
          </div>
          {orderResult.trackingNumber && (
            <p className="text-sm text-[#55483F]">
              Courier: <strong>{orderResult.courierName || 'Partner Courier'}</strong> · Tracking:{' '}
              <span className="font-mono">{orderResult.trackingNumber}</span>
            </p>
          )}
          <div className="space-y-2 text-sm">
            {orderResult.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {item.productName} ({item.selectedColor}) × {item.quantity}
                </span>
                <span className="tabular-nums font-medium">{formatINR(item.finalUnitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {customResult && (
        <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
          <p className="font-mono text-xs text-[#78695F]">{customResult.bookingCode}</p>
          <h2 className="font-serif text-2xl text-[#55483F]">
            {customResult.productType} · {customResult.status}
          </h2>
          <div className="space-y-2 text-xs">
            {customResult.timeline.map((t, i) => (
              <div key={i} className="flex justify-between py-1.5 border-b border-[#55483F]/8">
                <span>
                  <strong>{t.status}:</strong> {t.note}
                </span>
                <span className="text-[#78695F]">{formatDateIN(t.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {aptResult && (
        <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-2">
          <p className="font-mono text-xs text-[#78695F]">{aptResult.bookingCode}</p>
          <h2 className="font-serif text-2xl text-[#55483F]">{aptResult.appointmentType}</h2>
          <p className="text-sm text-[#55483F]">
            {aptResult.date} at {aptResult.timeSlot} · Status: <strong>{aptResult.status}</strong>
          </p>
        </div>
      )}
    </main>
  );
}

export function PolicyPage({ type }: { type: 'shipping' | 'returns' | 'privacy' | 'terms' }) {
  const { settings } = useStore();
  const content = {
    shipping: {
      title: 'Shipping & Studio Pickup Policy',
      paragraphs: [
        `Standard domestic orders across India are complimentary on eligible cart totals of ${formatINR(settings.freeShippingThreshold)} and above. Orders below that threshold carry a flat shipping fee of ${formatINR(settings.standardShippingFee)}.`,
        'Each handmade crochet piece takes 1–6 business days to prepare depending on complexity. Once dispatched from our Laggere, Bengaluru studio, standard delivery typically takes 2–4 days within Bengaluru and 4–7 days pan-India.',
        `Local Studio Pickup is available free of charge at ${settings.address} once you receive your order-ready confirmation.`,
      ],
    },
    returns: {
      title: 'Returns, Replacements & Refunds',
      paragraphs: [
        'Because every Skein Scene piece is crafted by hand—and many items are customized—returns are accepted only for items damaged in transit or incorrect deliveries reported within 48 hours of receipt with unboxing photos.',
        'Approved refunds are processed back to your original UPI, card, or bank payment source within 5–7 business days via Razorpay.',
        'Custom order advances cover yarn procurement and studio time and are non-refundable once production has commenced.',
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      paragraphs: [
        'Skein Scene collects only the contact, delivery, and design details needed to fulfill your handmade orders, custom bookings, and studio consultations.',
        'Online payments are processed through Razorpay. Skein Scene never stores card numbers, CVVs, or UPI PINs on our servers.',
      ],
    },
    terms: {
      title: 'Terms & Conditions',
      paragraphs: [
        'All crochet pieces are handmade; slight natural variations in stitch tension and floral petal shaping are hallmarks of authentic artisan work.',
        'Custom order production starts after quotation acceptance and advance payment verification.',
      ],
    },
  }[type];

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
      <h1 className="font-serif text-4xl font-medium text-[#55483F]">{content.title}</h1>
      <div className="bg-white rounded-3xl border border-[#55483F]/10 p-8 space-y-4 text-sm text-[#55483F]/85 leading-relaxed">
        {content.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </main>
  );
}
