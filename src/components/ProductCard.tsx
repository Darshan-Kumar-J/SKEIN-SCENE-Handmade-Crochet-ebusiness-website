import { Eye, Heart, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { Product } from '../types.ts';
import { formatINR, getDiscountedPrice } from '../utils/format.ts';
import { ResilientImage } from './ResilientImage.tsx';

export function ProductCard({ product }: { product: Product }) {
  const { navigate, addToCart, wishlist, toggleWishlist, setQuickViewProduct } = useStore();
  const inWishlist = wishlist.includes(product.id);
  const finalPrice = getDiscountedPrice(product.price, product.discountPercent);
  const isOutOfStock = product.stock <= 0;

  return (
    <article className="group bg-[#FBF8F3] rounded-2xl border border-[#55483F]/10 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col">
      <div className="relative aspect-[4/3] bg-[#F7F1E9] overflow-hidden">
        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="w-full h-full block text-left"
          aria-label={`View ${product.name}`}
        >
          <ResilientImage
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </button>

        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={inWishlist ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`w-9 h-9 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-xs border border-[#55483F]/10 transition-colors ${
              inWishlist ? 'text-[#B78C70]' : 'text-[#55483F]/75 hover:text-[#55483F]'
            }`}
          >
            <Heart className={`w-4 h-4 ${inWishlist ? 'fill-[#E9C4CB] text-[#55483F]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            aria-label={`Quick view ${product.name}`}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/90 backdrop-blur-xs border border-[#55483F]/10 text-[#55483F]/75 hover:text-[#55483F] transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#78695F] mb-1.5">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span>
              {isOutOfStock ? 'Made to order' : product.stock <= 4 ? `Only ${product.stock} left` : 'In stock'}
            </span>
            {product.discountPercent > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#8E5B3E] font-medium">{product.discountPercent}% off</span>
              </>
            )}
          </div>
          <h3 className="font-serif text-xl font-medium text-[#55483F] leading-snug">
            <button
              type="button"
              onClick={() => navigate(`/product/${product.slug}`)}
              className="text-left hover:text-[#B78C70] transition-colors"
            >
              {product.name}
            </button>
          </h3>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#55483F]/8">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base font-semibold text-[#55483F]">{formatINR(finalPrice)}</span>
            {product.discountPercent > 0 && (
              <span className="text-xs text-[#78695F] line-through">{formatINR(product.price)}</span>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              isOutOfStock
                ? navigate('/custom-orders')
                : addToCart(product.id, product.colors[0] || 'Classic', 1)
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium bg-[#55483F] text-white hover:bg-[#433830] transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{isOutOfStock ? 'Custom Order' : 'Add to Bag'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
