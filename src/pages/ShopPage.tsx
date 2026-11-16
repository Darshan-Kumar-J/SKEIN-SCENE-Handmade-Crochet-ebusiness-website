import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import { ProductCard } from '../components/ProductCard.tsx';
import { ResilientImage } from '../components/ResilientImage.tsx';
import { useStore } from '../context/StoreContext.tsx';
import { getDiscountedPrice } from '../utils/format.ts';

export function ShopPage({ mode = 'shop', categorySlug }: { mode?: 'shop' | 'collections'; categorySlug?: string }) {
  const { products, categories, navigate } = useStore();

  const urlParams = new URLSearchParams(window.location.search);
  const initialCollection = urlParams.get('collection') || 'All';
  const initialCategory = urlParams.get('category') || 'All';

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedCollection, setSelectedCollection] = useState<string>(initialCollection);
  const [searchQuery, setSearchQuery] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(3500);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');

  useEffect(() => {
    if (categorySlug) {
      const matchedCat = categories.find((c) => c.slug === categorySlug);
      if (matchedCat) {
        setSelectedCategory(matchedCat.name);
        setSelectedCollection('All');
      }
    }
  }, [categorySlug, categories]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const col = params.get('collection');
    const cat = params.get('category');
    if (col) {
      setSelectedCollection(col);
      setSelectedCategory('All');
    } else if (cat) {
      setSelectedCategory(cat);
      setSelectedCollection('All');
    }
  }, [mode, categorySlug]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (selectedCollection !== 'All') {
      list = list.filter((p) => p.collectionGroup === selectedCollection);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    list = list.filter((p) => getDiscountedPrice(p.price, p.discountPercent) <= maxPrice);

    if (sortBy === 'price-asc') {
      list.sort(
        (a, b) => getDiscountedPrice(a.price, a.discountPercent) - getDiscountedPrice(b.price, b.discountPercent)
      );
    } else if (sortBy === 'price-desc') {
      list.sort(
        (a, b) => getDiscountedPrice(b.price, b.discountPercent) - getDiscountedPrice(a.price, a.discountPercent)
      );
    } else if (sortBy === 'newest') {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else {
      list.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
    }
    return list;
  }, [products, selectedCategory, selectedCollection, searchQuery, maxPrice, sortBy]);

  if (mode === 'collections' && !categorySlug) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12">
        <div className="max-w-2xl space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-[#78695F]">Skein Scene Catalogue</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#55483F]">Handmade Collections</h1>
          <p className="text-sm sm:text-base text-[#78695F]">
            Explore dedicated crochet categories crafted in Bengaluru—from everlasting floral bouquets to organic baby
            heirlooms and festive keepsakes.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/collections/${cat.slug}`)}
              className="group text-left bg-white rounded-2xl border border-[#55483F]/10 overflow-hidden hover:shadow-md transition-all"
            >
              <div className="aspect-[4/3] bg-[#FBF8F3] overflow-hidden">
                <ResilientImage
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-6 space-y-2">
                <p className="text-xs text-[#78695F]">{cat.collectionGroup}</p>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-serif text-2xl font-medium text-[#55483F]">{cat.name}</h2>
                  <ArrowRight className="w-4 h-4 text-[#B78C70] shrink-0" />
                </div>
                <p className="text-sm text-[#78695F] leading-relaxed">{cat.description}</p>
              </div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#55483F]/10 pb-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-[#78695F]">Skein Scene Boutique</p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-[#55483F]">
            {selectedCategory !== 'All'
              ? selectedCategory
              : selectedCollection !== 'All'
              ? selectedCollection
              : 'Shop Handmade'}
          </h1>
          <p className="text-sm text-[#78695F]">
            {filteredProducts.length} handcrafted piece{filteredProducts.length === 1 ? '' : 's'} available
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/custom-orders')}
          className="self-start md:self-auto px-5 py-2.5 rounded-xl bg-[#E9C4CB]/55 text-[#55483F] text-sm font-medium hover:bg-[#E9C4CB]/80 transition-colors"
        >
          Looking for something bespoke? Book Custom Order
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-[#55483F]/10 p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#78695F] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bouquets, keychains, bags, bookmarks..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm text-[#55483F] focus:outline-none focus:border-[#55483F]"
            />
          </div>

          <div className="md:col-span-4 flex items-center gap-3">
            <SlidersHorizontal className="w-4 h-4 text-[#78695F] shrink-0" />
            <label className="text-xs text-[#78695F] whitespace-nowrap">
              Max Price: <strong className="text-[#55483F] tabular-nums">₹{maxPrice.toLocaleString('en-IN')}</strong>
            </label>
            <input
              type="range"
              min={350}
              max={3500}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="flex-1 accent-[#55483F]"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              aria-label="Sort products"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FBF8F3] border border-[#55483F]/15 text-sm text-[#55483F]"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#55483F]/8">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSelectedCollection('All');
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'All' && selectedCollection === 'All'
                ? 'bg-[#55483F] text-white'
                : 'bg-[#FBF8F3] text-[#55483F]/80 hover:text-[#55483F]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.name);
                setSelectedCollection('All');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat.name
                  ? 'bg-[#55483F] text-white'
                  : 'bg-[#FBF8F3] text-[#55483F]/80 hover:text-[#55483F]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#55483F]/10 p-12 text-center space-y-4">
          <h2 className="font-serif text-2xl text-[#55483F]">No matching crochet pieces found</h2>
          <p className="text-sm text-[#78695F] max-w-md mx-auto">
            Try clearing your price or keyword filters, or send us your custom design request and we will crochet it
            especially for you.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSelectedCollection('All');
                setSearchQuery('');
                setMaxPrice(3500);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#55483F]/20 text-sm font-medium text-[#55483F]"
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={() => navigate('/custom-orders')}
              className="px-5 py-2.5 rounded-lg bg-[#55483F] text-white text-sm font-medium"
            >
              Request Custom Creation
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
