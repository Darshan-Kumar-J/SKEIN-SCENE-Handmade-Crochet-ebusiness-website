import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Gift,
  HeartHandshake,
  Instagram,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { motion } from 'motion/react';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { useStore } from '../context/StoreContext.tsx';

const FEATURED_COLLECTIONS = [
  {
    name: 'Crochet Flowers',
    subtitle: 'Everlasting tulips, roses & wrapped bouquets',
    image: '/src/assets/images/crochet_tulips_roses_1794827807798.jpg',
  },
  {
    name: 'Cute Keychains',
    subtitle: 'Bunnies, bears & woodland bag charms',
    image: '/src/assets/images/crochet_animal_keychains_1794827808098.jpg',
  },
  {
    name: 'Handmade Accessories',
    subtitle: 'Daisy granny-square totes & everyday carryalls',
    image: '/src/assets/images/crochet_daisy_handbag_1794827807999.jpg',
  },
  {
    name: 'Crochet Wearables',
    subtitle: 'Scalloped collars, scrunchies & soft cotton accents',
    image: '/src/assets/images/crochet_crafting_yarn_1794827810996.jpg',
  },
  {
    name: 'Baby Collection',
    subtitle: 'Organic cotton cardigans, bonnets & booties',
    image: '/src/assets/images/crochet_baby_outfit_1794827808470.jpg',
  },
  {
    name: 'Personalized Gifts',
    subtitle: 'Floral bookmarks, plushies & keepsake boxes',
    image: '/src/assets/images/crochet_floral_bookmarks_1794827809663.jpg',
  },
  {
    name: 'Festive Collection',
    subtitle: 'Artisanal floral rakhis & festive hampers',
    image: '/src/assets/images/crochet_festive_rakhi_1794827809671.jpg',
  },
];

const GALLERY_POSTS = [
  {
    image: '/src/assets/images/hero_crochet_bouquet_1794827807834.jpg',
    caption: 'Pastel tulip & rose bouquet wrapped in linen',
  },
  {
    image: '/src/assets/images/crochet_animal_keychains_1794827808098.jpg',
    caption: 'Morning batch of woodland keychains',
  },
  {
    image: '/src/assets/images/crochet_gift_packaging_1794827810801.jpg',
    caption: 'Ready-to-gift keepsake box with sage ribbon',
  },
  {
    image: '/src/assets/images/crochet_crafting_yarn_1794827810996.jpg',
    caption: 'Behind the stitches at our Laggere studio',
  },
  {
    image: '/src/assets/images/crochet_daisy_handbag_1794827807999.jpg',
    caption: 'Hand-joined daisy granny-square tote',
  },
  {
    image: '/src/assets/images/crochet_festive_rakhi_1794827809671.jpg',
    caption: 'Festive crochet floral rakhis & keepsakes',
  },
];

export function HomePage() {
  const { settings, products, testimonials, navigate, showToast } = useStore();
  const [slideIdx, setSlideIdx] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [submittingNews, setSubmittingNews] = useState(false);

  const bestSellers = products.filter((p) => p.bestSeller).slice(0, 6);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingNews(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not subscribe.');
        return;
      }
      setNewsletterEmail('');
      showToast(data.message);
    } finally {
      setSubmittingNews(false);
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 sm:pt-10 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-5 flex flex-col justify-center space-y-6 py-4"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#78695F]">
              Handcrafted in Laggere, Bengaluru
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-medium text-[#55483F] leading-[1.08] text-balance">
              {settings.heroHeadline}
            </h1>
            <p className="text-base text-[#55483F]/80 leading-relaxed max-w-md">
              {settings.heroSubheading}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] transition-colors whitespace-nowrap"
              >
                <span>Shop Handmade</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/custom-orders')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#55483F]/25 bg-white text-[#55483F] text-sm font-medium hover:bg-[#FBF8F3] transition-colors whitespace-nowrap"
              >
                <span>Create Your Custom Order</span>
              </button>
            </div>
            <p className="text-xs text-[#78695F] pt-2">
              100% hand-crocheted cotton · Complimentary gift wrapping · Studio pickup & pan-India shipping
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-7"
          >
            <div className="relative rounded-3xl overflow-hidden border border-[#55483F]/10 bg-white aspect-[16/10] lg:h-full shadow-sm">
              <ResilientImage
                src="/src/assets/images/hero_crochet_bouquet_1794827807834.jpg"
                alt="Handmade pastel crochet tulip and rose bouquet wrapped in linen at Skein Scene Bengaluru"
                className="w-full h-full object-cover"
                eager
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Collections */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 border-t border-[#55483F]/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#78695F] mb-2">Curated Worlds</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">Featured Collections</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/collections')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#55483F] hover:text-[#B78C70] transition-colors self-start sm:self-auto"
          >
            <span>Explore all collections</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURED_COLLECTIONS.map((col, idx) => (
            <button
              key={col.name}
              type="button"
              onClick={() => navigate(`/shop?collection=${encodeURIComponent(col.name)}`)}
              className={`group text-left bg-white rounded-2xl border border-[#55483F]/10 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                idx === 0 ? 'sm:col-span-2 lg:col-span-2' : ''
              }`}
            >
              <div className={`overflow-hidden bg-[#FBF8F3] ${idx === 0 ? 'aspect-[16/9] sm:aspect-[2/1]' : 'aspect-[4/3]'}`}>
                <ResilientImage
                  src={col.image}
                  alt={col.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-xl font-medium text-[#55483F]">{col.name}</h3>
                  <p className="text-xs text-[#78695F] mt-1">{col.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#B78C70] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 border-t border-[#55483F]/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#78695F] mb-2">Studio Favorites</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">Best Sellers</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#55483F] hover:text-[#B78C70] self-start sm:self-auto"
          >
            <span>View complete catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {bestSellers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Made Just For You (Custom Orders Banner) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18">
        <div className="bg-white rounded-3xl border border-[#55483F]/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 aspect-[4/3] lg:aspect-auto">
            <ResilientImage
              src="/src/assets/images/crochet_crafting_yarn_1794827810996.jpg"
              alt="Wooden crochet hook and pastel cotton yarn skeins on linen studio table"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#B78C70]">Made Just For You</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F] leading-tight text-balance">
              Your Imagination, Our Handmade Magic.
            </h2>
            <p className="text-sm sm:text-base text-[#55483F]/80 leading-relaxed">
              From custom bridal and anniversary bouquets in your exact colour palette to monogrammed baby hampers and
              bulk wedding favours, share your idea or reference photo and our studio will craft a bespoke quotation.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={() => navigate('/custom-orders')}
                className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] transition-colors"
              >
                Request a Custom Creation
              </button>
              <button
                type="button"
                onClick={() => navigate('/consultations')}
                className="px-6 py-3 rounded-xl border border-[#55483F]/25 text-[#55483F] text-sm font-medium hover:bg-[#F7F1E9] transition-colors"
              >
                Book Design Consultation
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Skein Scene */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 border-t border-[#55483F]/10">
        <div className="max-w-2xl mb-10">
          <p className="text-xs uppercase tracking-[0.18em] text-[#78695F] mb-2">Studio Promise</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">Why Choose Skein Scene?</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Sparkles,
              title: '100% Handmade Craftsmanship',
              body: 'Every petal, stitch, and seam is crocheted entirely by hand using combed cotton and soft baby yarns.',
            },
            {
              icon: HeartHandshake,
              title: 'Thoughtfully Designed Products',
              body: 'Timeless pastel palettes and balanced proportions inspired by botanicals and heirloom textiles.',
            },
            {
              icon: Gift,
              title: 'Personalized Creations',
              body: 'Choose custom shades, sizes, handwritten notes, or upload inspiration photos for bespoke orders.',
            },
            {
              icon: Gift,
              title: 'Beautiful Gift Packaging',
              body: 'Each order arrives nestled in ivory tissue, satin ribbon, and keepsake boxing ready for gifting.',
            },
            {
              icon: ShieldCheck,
              title: 'Secure Online Payments',
              body: 'Pay effortlessly via UPI, cards, net banking, or wallets with server-verified Razorpay checkout.',
            },
            {
              icon: Truck,
              title: 'Delivery & Studio Pickup',
              body: `Pan-India shipping (free above ${formatINRSimple(settings.freeShippingThreshold)}) plus Laggere studio pickup.`,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-[#FBF8F3] rounded-2xl border border-[#55483F]/10 p-6 space-y-3"
              >
                <Icon className="w-5 h-5 text-[#B78C70]" />
                <h3 className="font-serif text-xl font-medium text-[#55483F]">{item.title}</h3>
                <p className="text-sm text-[#78695F] leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Verified Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 border-t border-[#55483F]/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#78695F] mb-2">Verified Stories</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">Loved by Our Patrons</h2>
          </div>
          {testimonials.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSlideIdx((i) => (i - 1 + testimonials.length) % testimonials.length)}
                className="p-2.5 rounded-lg border border-[#55483F]/15 bg-white text-[#55483F] hover:bg-[#FBF8F3]"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIdx((i) => (i + 1) % testimonials.length)}
                className="p-2.5 rounded-lg border border-[#55483F]/15 bg-white text-[#55483F] hover:bg-[#FBF8F3]"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {testimonials.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h3 className="font-serif text-2xl text-[#55483F]">Verified Reviews Only</h3>
              <p className="text-sm text-[#78695F] leading-relaxed">
                We publish only genuine, administrator-approved reviews from verified Skein Scene customers. Place an
                order or share your feedback on any product page to see your note featured here.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="px-5 py-2.5 rounded-xl bg-[#55483F] text-white text-sm font-medium whitespace-nowrap"
            >
              Explore Products
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#55483F]/10 p-8 sm:p-12">
            {(() => {
              const active = testimonials[slideIdx % testimonials.length];
              return (
                <div className="max-w-3xl space-y-5">
                  <div className="flex items-center gap-1 text-[#B78C70]">
                    {Array.from({ length: active.rating }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-[#B78C70]" />
                    ))}
                  </div>
                  <blockquote className="font-serif text-2xl sm:text-3xl text-[#55483F] leading-snug italic">
                    “{active.quote}”
                  </blockquote>
                  <p className="text-sm text-[#78695F]">
                    <span className="font-semibold text-[#55483F]">{active.customerName}</span> · {active.city} ·{' '}
                    {active.productPurchased}
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </section>

      {/* Instagram-inspired Studio Gallery */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 border-t border-[#55483F]/10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#78695F] mb-2">Studio Journal</p>
            <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">
              From Our Workbench ({settings.instagramHandle})
            </h2>
          </div>
          <a
            href="https://www.instagram.com/skein_scene/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#55483F]/25 bg-white text-sm font-medium text-[#55483F] hover:bg-[#FBF8F3] self-start sm:self-auto"
          >
            <Instagram className="w-4 h-4" />
            <span>Follow Us {settings.instagramHandle}</span>
          </a>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {GALLERY_POSTS.map((post) => (
            <a
              key={post.caption}
              href="https://www.instagram.com/skein_scene/"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white border border-[#55483F]/10"
            >
              <ResilientImage
                src={post.image}
                alt={post.caption}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#55483F]/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <p className="text-[11px] text-white leading-snug">{post.caption}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10">
        <div className="bg-[#E9C4CB]/35 rounded-3xl border border-[#55483F]/10 px-6 py-12 sm:px-12 sm:py-16 text-center max-w-4xl mx-auto space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#78695F]">Studio Notes</p>
          <h2 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F]">Stay in the Loop!</h2>
          <p className="text-sm text-[#55483F]/80 max-w-md mx-auto">
            Join our mailing list for seasonal floral releases, festive rakhi drops, and studio offers.
          </p>
          <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-[#55483F]/15 text-sm text-[#55483F] focus:outline-none focus:border-[#55483F]"
            />
            <button
              type="submit"
              disabled={submittingNews}
              className="px-6 py-3 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60 whitespace-nowrap"
            >
              {submittingNews ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function formatINRSimple(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
