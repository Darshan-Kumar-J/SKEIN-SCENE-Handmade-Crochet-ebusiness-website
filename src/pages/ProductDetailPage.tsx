import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Clock,
  Heart,
  MessageCircle,
  PackageCheck,
  Ruler,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import type { Product, ProductReview } from '../types.ts';
import { buildWhatsAppUrl, formatDateIN, formatINR, getDiscountedPrice } from '../utils/format.ts';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { products, settings, user, wishlist, toggleWishlist, addToCart, navigate, showToast } = useStore();

  const [product, setProduct] = useState<Product | null>(() => products.find((p) => p.slug === slug) || null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  const [revName, setRevName] = useState(user?.name || '');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setActiveImageIdx(0);
    setQuantity(1);
    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.product) {
          setProduct(data.product);
          setSelectedColor(data.product.colors[0] || 'Classic');
          setReviews(data.reviews || []);
          setRelated(data.related || []);
          document.title = `${data.product.name} – SKEIN SCENE`;
        }
      });
    return () => {
      document.title = 'SKEIN SCENE – Little Things, Lovingly Made | Handmade Crochet Studio';
    };
  }, [slug]);

  if (!product) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#55483F]">Creation not found</h1>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 rounded-xl bg-[#55483F] text-white text-sm font-medium"
        >
          Return to Shop
        </button>
      </main>
    );
  }

  const finalPrice = getDiscountedPrice(product.price, product.discountPercent);
  const activeColor = selectedColor || product.colors[0] || 'Classic';
  const inWishlist = wishlist.includes(product.id);
  const isOutOfStock = product.stock <= 0;

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.slug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: revName || user?.name,
          rating: revRating,
          comment: revComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not submit review.');
        return;
      }
      if (data.review?.approved) {
        setReviews((prev) => [data.review, ...prev]);
      }
      setRevComment('');
      showToast(data.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      <button
        type="button"
        onClick={() => navigate('/shop')}
        className="inline-flex items-center gap-2 text-sm text-[#78695F] hover:text-[#55483F]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Handmade Shop</span>
      </button>

      {/* Main Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-white border border-[#55483F]/10">
            <ResilientImage
              src={product.images[activeImageIdx] || product.images[0]}
              alt={`${product.name} view ${activeImageIdx + 1}`}
              className="w-full h-full object-cover"
              eager
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                    activeImageIdx === idx ? 'border-[#55483F]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <ResilientImage src={img} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Purchase Info */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#55483F]/10 p-6 sm:p-8 space-y-6 lg:sticky lg:top-24">
          <div className="space-y-2">
            <p className="text-xs text-[#78695F]">
              {product.category} · {isOutOfStock ? 'Made to order' : `${product.stock} ready in stock`}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-[#55483F] leading-tight">
              {product.name}
            </h1>
            <div className="flex items-baseline gap-3 pt-1 tabular-nums">
              <span className="text-2xl font-semibold text-[#55483F]">{formatINR(finalPrice)}</span>
              {product.discountPercent > 0 && (
                <>
                  <span className="text-base text-[#78695F] line-through">{formatINR(product.price)}</span>
                  <span className="text-xs font-medium text-[#8E5B3E]">Save {product.discountPercent}%</span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm text-[#55483F]/85 leading-relaxed">{product.description}</p>

          {/* Colour Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-wider text-[#78695F]">
              Colour Palette: <span className="text-[#55483F]">{activeColor}</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    activeColor === c
                      ? 'border-[#55483F] bg-[#55483F] text-white'
                      : 'border-[#55483F]/20 bg-[#FBF8F3] text-[#55483F] hover:border-[#55483F]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {!isOutOfStock && (
                <div className="inline-flex items-center border border-[#55483F]/20 rounded-xl bg-[#FBF8F3]">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="px-3.5 py-3 text-sm font-medium text-[#55483F]"
                  >
                    −
                  </button>
                  <span className="px-3 text-sm font-medium tabular-nums">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="px-3.5 py-3 text-sm font-medium text-[#55483F]"
                  >
                    +
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  isOutOfStock ? navigate('/custom-orders') : addToCart(product.id, activeColor, quantity)
                }
                className="flex-1 py-3.5 px-6 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] transition-colors inline-flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{isOutOfStock ? 'Request Custom Order' : 'Add to Shopping Bag'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle wishlist"
                className="p-3.5 rounded-xl border border-[#55483F]/20 bg-[#FBF8F3] text-[#55483F] hover:bg-[#E9C4CB]/30"
              >
                <Heart className={`w-5 h-5 ${inWishlist ? 'fill-[#E9C4CB]' : ''}`} />
              </button>
            </div>

            <a
              href={buildWhatsAppUrl(
                settings.whatsappNumber,
                `Hello Skein Scene! I'm interested in "${product.name}" (${activeColor}) priced at ${formatINR(finalPrice)}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-xl bg-[#C7D5C0] text-[#55483F] text-sm font-medium hover:bg-[#b8cab0] transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Inquire on WhatsApp</span>
            </a>
          </div>

          {/* Craftsmanship & Logistics Details */}
          <div className="pt-4 border-t border-[#55483F]/10 space-y-3 text-xs text-[#55483F]/85">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#B78C70] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#55483F]">Materials: </span>
                {product.materials}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Ruler className="w-4 h-4 text-[#B78C70] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#55483F]">Dimensions: </span>
                {product.dimensions}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#B78C70] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#55483F]">Estimated Preparation: </span>
                {product.prepTimeDays}
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <PackageCheck className="w-4 h-4 text-[#B78C70] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#55483F]">Care & Delivery: </span>
                {product.careInstructions} · {product.deliveryInfo}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews */}
      <section className="pt-10 border-t border-[#55483F]/10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-5">
          <h2 className="font-serif text-3xl font-medium text-[#55483F]">Customer Reviews</h2>
          {reviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#55483F]/10 p-6 text-sm text-[#78695F]">
              No reviews yet for this handmade piece. Verified purchasers and patrons can share a review alongside.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white rounded-2xl border border-[#55483F]/10 p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#78695F]">
                    <span className="font-semibold text-[#55483F]">
                      {rev.customerName} {rev.verifiedPurchase ? '· Verified Buyer' : ''}
                    </span>
                    <span>{formatDateIN(rev.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[#B78C70]">
                    {Array.from({ length: rev.rating }).map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-[#B78C70]" />
                    ))}
                  </div>
                  <p className="text-sm text-[#55483F]/90">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#55483F]/10 p-6 space-y-4">
          <h3 className="font-serif text-2xl font-medium text-[#55483F]">Share Your Review</h3>
          <form onSubmit={submitReview} className="space-y-3">
            <input
              type="text"
              required
              value={revName}
              onChange={(e) => setRevName(e.target.value)}
              placeholder="Your Name *"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#FBF8F3] border border-[#55483F]/15"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#78695F]">Rating:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRevRating(star)}
                  className="p-1"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= revRating ? 'fill-[#B78C70] text-[#B78C70]' : 'text-[#55483F]/25'
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              required
              rows={3}
              value={revComment}
              onChange={(e) => setRevComment(e.target.value)}
              placeholder="Tell us about the yarn texture, craftsmanship, and packaging..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-[#FBF8F3] border border-[#55483F]/15"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="w-full py-2.5 rounded-xl bg-[#55483F] text-white text-sm font-medium hover:bg-[#433830] disabled:opacity-60"
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="pt-10 border-t border-[#55483F]/10 space-y-8">
          <h2 className="font-serif text-3xl font-medium text-[#55483F]">You May Also Love</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
