import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { Appointment, AppointmentType } from '../types.ts';
import { buildWhatsAppUrl } from '../utils/format.ts';

const APPOINTMENT_TYPES: AppointmentType[] = [
  'Custom Gift Consultation',
  'Bouquet Design Consultation',
  'Bulk Order Discussion',
  'Product Inquiry',
];

export function ConsultationsPage() {
  const { user, settings, showToast } = useStore();

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [date, setDate] = useState(tomorrow);
  const [appointmentType, setAppointmentType] = useState<AppointmentType>('Custom Gift Consultation');
  const [slots, setSlots] = useState<{ timeSlot: string; available: boolean; remaining: number }[]>([]);
  const [blocked, setBlocked] = useState(false);
  const [durationMins, setDurationMins] = useState(settings.appointmentDurationMins);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  useEffect(() => {
    setLoadingSlots(true);
    setSelectedSlot('');
    fetch(`/api/appointments/availability?date=${encodeURIComponent(date)}`)
      .then((r) => r.json())
      .then((data) => {
        setBlocked(Boolean(data.blocked));
        setSlots(data.slots || []);
        if (data.durationMins) setDurationMins(data.durationMins);
      })
      .finally(() => setLoadingSlots(false));
  }, [date]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!selectedSlot) {
      setErrorMsg('Please select an available time slot.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          email,
          phone,
          appointmentType,
          date,
          timeSlot: selectedSlot,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to book slot.');
        return;
      }
      setConfirmed(data.appointment);
      showToast(`Consultation ${data.appointment.bookingCode} scheduled!`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Personal Design Sessions</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#55483F]">
          Book a Crochet Design Consultation
        </h1>
        <p className="text-sm sm:text-base text-[#78695F] leading-relaxed">
          Schedule a dedicated {durationMins}-minute studio or WhatsApp call with Skein Scene in Laggere to plan custom
          bouquets, wedding return favours, or personalized gift hampers.
        </p>
      </div>

      {confirmed ? (
        <div className="bg-white rounded-3xl border border-[#55483F]/10 p-8 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-[#53724C] shrink-0 mt-1" />
            <div>
              <p className="text-xs uppercase tracking-wider text-[#78695F]">Consultation Scheduled</p>
              <h2 className="font-serif text-3xl text-[#55483F]">
                Booking ID: <span className="font-mono text-2xl">{confirmed.bookingCode}</span>
              </h2>
              <p className="text-sm text-[#78695F] mt-1">
                {confirmed.appointmentType} · {confirmed.date} at {confirmed.timeSlot} ({durationMins} mins)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                `Hello Skein Scene! I booked consultation ${confirmed.bookingCode} (${confirmed.appointmentType}) on ${confirmed.date} at ${confirmed.timeSlot}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C7D5C0] text-[#55483F] text-sm font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Confirm on WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={() => setConfirmed(null)}
              className="px-5 py-2.5 rounded-xl border border-[#55483F]/20 text-sm font-medium text-[#55483F]"
            >
              Schedule Another Session
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleBook} className="bg-white rounded-3xl border border-[#55483F]/10 p-6 sm:p-10 space-y-8">
          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#78695F]">
              1. Consultation Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APPOINTMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAppointmentType(type)}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                    appointmentType === type
                      ? 'border-[#55483F] bg-[#F7F1E9] text-[#55483F]'
                      : 'border-[#55483F]/15 bg-[#FBF8F3] text-[#78695F] hover:text-[#55483F]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#78695F]">
                <Calendar className="w-4 h-4 text-[#B78C70]" />
                <span>2. Select Date</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/20 text-sm text-[#55483F]"
              />
            </div>

            <div className="md:col-span-7 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#78695F]">
                <Clock className="w-4 h-4 text-[#B78C70]" />
                <span>3. Select Available Slot ({durationMins} mins)</span>
              </label>
              {loadingSlots ? (
                <p className="text-xs text-[#78695F] py-3">Checking studio availability...</p>
              ) : blocked ? (
                <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl">
                  This date is blocked on the studio calendar. Please pick another day.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {slots.map((slot) => (
                    <button
                      key={slot.timeSlot}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.timeSlot)}
                      className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                        !slot.available
                          ? 'border-[#55483F]/10 bg-[#F7F1E9]/60 text-[#78695F]/50 line-through cursor-not-allowed'
                          : selectedSlot === slot.timeSlot
                          ? 'border-[#55483F] bg-[#55483F] text-white'
                          : 'border-[#55483F]/20 bg-[#FBF8F3] text-[#55483F] hover:border-[#55483F]'
                      }`}
                    >
                      {slot.timeSlot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your Name *"
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
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp / Mobile *"
              className="px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#78695F] mb-1.5">Consultation Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Share what you would like to discuss (occasion, estimated quantity, colour ideas)..."
              className="w-full px-4 py-3 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm"
            />
          </div>

          {errorMsg && <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl">{errorMsg}</p>}

          <button
            type="submit"
            disabled={submitting || blocked}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60"
          >
            {submitting ? 'Confirming Slot...' : 'Book Consultation Slot'}
          </button>
        </form>
      )}
    </main>
  );
}
