import { Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsAppUrl } from '../utils/format.ts';

export function Footer() {
  const { settings, navigate } = useStore();

  const whatsappUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    'Hello Skein Scene! I visited your website and would like to know more about your handmade crochet products.'
  );

  return (
    <footer className="bg-[#55483F] text-[#F7F1E9] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#F7F1E9]/15">
          {/* Brand & Studio */}
          <div className="space-y-4">
            <h2 className="font-serif text-2xl tracking-[0.14em] font-semibold text-white">SKEIN SCENE</h2>
            <p className="text-sm text-[#F7F1E9]/80 leading-relaxed max-w-xs">
              Little Things, Lovingly Made. Handcrafted crochet flowers, keepsake plushies, bags, baby knits, and
              custom gifts stitched with care in Bengaluru.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.instagram.com/skein_scene/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#F7F1E9]/25 text-xs font-medium hover:bg-white/10 transition-colors"
              >
                <Instagram className="w-4 h-4" />
                <span>{settings.instagramHandle}</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#C7D5C0] text-[#55483F] text-xs font-semibold hover:bg-[#d6e2d0] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Shop & Studio */}
          <div>
            <h3 className="font-serif text-lg font-medium text-white mb-4">Explore</h3>
            <ul className="space-y-2.5 text-sm text-[#F7F1E9]/80">
              <li>
                <button type="button" onClick={() => navigate('/shop')} className="hover:text-white transition-colors">
                  Shop All Handmade
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/collections')}
                  className="hover:text-white transition-colors"
                >
                  Curated Collections
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/custom-orders')}
                  className="hover:text-white transition-colors"
                >
                  Custom Crochet Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/consultations')}
                  className="hover:text-white transition-colors"
                >
                  Book a Design Consultation
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/our-story')}
                  className="hover:text-white transition-colors"
                >
                  Our Story & Craft
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care & Policies */}
          <div>
            <h3 className="font-serif text-lg font-medium text-white mb-4">Customer Support</h3>
            <ul className="space-y-2.5 text-sm text-[#F7F1E9]/80">
              <li>
                <button type="button" onClick={() => navigate('/track')} className="hover:text-white transition-colors">
                  Track Order & Booking
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/policies/shipping')}
                  className="hover:text-white transition-colors"
                >
                  Shipping Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/policies/returns')}
                  className="hover:text-white transition-colors"
                >
                  Returns & Refunds
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/policies/privacy')}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/policies/terms')}
                  className="hover:text-white transition-colors"
                >
                  Terms & Conditions
                </button>
              </li>
            </ul>
          </div>

          {/* Location & Hours */}
          <div className="space-y-3 text-sm text-[#F7F1E9]/85">
            <h3 className="font-serif text-lg font-medium text-white mb-4">Bengaluru Studio</h3>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-[#E9C4CB]" />
              <span>{settings.address}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 shrink-0 text-[#E9C4CB]" />
              <a href="tel:+918197382703" className="hover:text-white transition-colors">
                {settings.whatsappNumber}
              </a>
            </div>
            <div className="pt-2 text-xs text-[#F7F1E9]/70 space-y-1">
              <p>{settings.weekdayHours}</p>
              <p>{settings.sundayHours}</p>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#F7F1E9]/70">
          <p>© {new Date().getFullYear()} SKEIN SCENE · Bengaluru, India. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <button type="button" onClick={() => navigate('/contact')} className="hover:text-white transition-colors">
              Contact Studio
            </button>
            <button type="button" onClick={() => navigate('/account')} className="hover:text-white transition-colors">
              My Account
            </button>
            <button type="button" onClick={() => navigate('/admin')} className="hover:text-white transition-colors">
              Studio Admin
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
