import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { buildWhatsAppUrl } from '../utils/format.ts';

export function WhatsAppFloat() {
  const { settings } = useStore();
  const href = buildWhatsAppUrl(
    settings.whatsappNumber,
    'Hello Skein Scene! I visited your website and would like to know more about your handmade crochet products.'
  );

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Skein Scene on WhatsApp"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-[#55483F] text-[#F7F1E9] shadow-lg border border-white/15 hover:bg-[#433830] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <MessageCircle className="w-5 h-5 text-[#C7D5C0]" />
      <span className="hidden sm:inline text-xs font-medium whitespace-nowrap">Chat on WhatsApp</span>
    </a>
  );
}
