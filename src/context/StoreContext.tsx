import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type {
  CartItem,
  Order,
  Product,
  ProductCategory,
  ProductReview,
  StoreSettings,
  Testimonial,
  UserProfile,
} from '../types.ts';

interface PublicCoupon {
  code: string;
  description: string;
  minOrderAmount: number;
}

export interface RazorpayModalSession {
  title: string;
  subtitle: string;
  amount: number;
  razorpayOrderId: string;
  keyId: string;
  prefillName: string;
  prefillEmail: string;
  prefillPhone: string;
  onSuccess: (result: { type: string; order?: Order; customRequest?: unknown }) => void;
}

interface StoreContextValue {
  loading: boolean;
  settings: StoreSettings;
  categories: ProductCategory[];
  products: Product[];
  testimonials: Testimonial[];
  reviews: ProductReview[];
  activeCoupons: PublicCoupon[];
  user: UserProfile | null;
  cart: CartItem[];
  wishlist: string[];
  route: string;
  navigate: (to: string) => void;
  refreshStorefront: () => Promise<void>;
  addToCart: (productId: string, selectedColor: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, selectedColor: string, quantity: number) => void;
  removeFromCart: (productId: string, selectedColor: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  authOpen: boolean;
  setAuthOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  paymentSession: RazorpayModalSession | null;
  setPaymentSession: (s: RazorpayModalSession | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
  logout: () => Promise<void>;
  setUser: (u: UserProfile | null) => void;
}

const DEFAULT_SETTINGS: StoreSettings = {
  announcementText: 'Handmade with love | Free shipping on eligible orders above ₹1,999',
  announcementEnabled: true,
  heroHeadline: 'Little Things, Lovingly Made.',
  heroSubheading:
    'Discover thoughtfully handcrafted crochet treasures, beautiful floral creations and personalized gifts made just for you.',
  freeShippingThreshold: 1999,
  standardShippingFee: 99,
  taxPercent: 0,
  weekdayHours: 'Monday–Saturday: 9 AM–8 PM',
  sundayHours: 'Sunday: 9 AM–7 PM',
  whatsappNumber: '+91 81973 82703',
  instagramHandle: '@skein_scene',
  address: 'Muneshwara Layout, Laggere, Bengaluru, Karnataka 560058, India',
  appointmentDurationMins: 30,
  appointmentSlots: ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM', '06:30 PM'],
  blockedDates: [],
  maxBookingsPerSlot: 1,
};

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'skein_scene_cart_v1';
const WISHLIST_STORAGE_KEY = 'skein_scene_wishlist_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [activeCoupons, setActiveCoupons] = useState<PublicCoupon[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  const [guestWishlist, setGuestWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [route, setRoute] = useState<string>(() => window.location.pathname || '/');
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [paymentSession, setPaymentSession] = useState<RazorpayModalSession | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3400);
  }, []);

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) return;
      const data = await res.json();
      setSettings(data.settings);
      setCategories(data.categories);
      setProducts(data.products);
      setTestimonials(data.testimonials);
      setReviews(data.reviews);
      setActiveCoupons(data.activeCoupons);
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
  }, [refreshStorefront]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(guestWishlist));
    } catch {
      // ignore
    }
  }, [guestWishlist]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(window.location.pathname || '/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    const clean = to.startsWith('/') ? to : `/${to}`;
    if (clean !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', clean);
    }
    setRoute(clean.split('?')[0] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addToCart = useCallback(
    (productId: string, selectedColor: string, quantity = 1) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      if (product.stock <= 0) {
        showToast('This piece is currently out of stock. You can request a custom order.');
        return;
      }
      setCart((prev) => {
        const idx = prev.findIndex((i) => i.productId === productId && i.selectedColor === selectedColor);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: Math.min(product.stock, next[idx].quantity + quantity),
          };
          return next;
        }
        return [...prev, { productId, selectedColor, quantity: Math.min(product.stock, quantity) }];
      });
      showToast(`Added "${product.name}" to your bag`);
      setCartOpen(true);
    },
    [products, showToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, selectedColor: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) => prev.filter((i) => !(i.productId === productId && i.selectedColor === selectedColor)));
        return;
      }
      const product = products.find((p) => p.id === productId);
      const maxStock = product ? product.stock : 99;
      setCart((prev) =>
        prev.map((i) =>
          i.productId === productId && i.selectedColor === selectedColor
            ? { ...i, quantity: Math.min(maxStock, quantity) }
            : i
        )
      );
    },
    [products]
  );

  const removeFromCart = useCallback((productId: string, selectedColor: string) => {
    setCart((prev) => prev.filter((i) => !(i.productId === productId && i.selectedColor === selectedColor)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const wishlist = user ? user.wishlist : guestWishlist;

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (user) {
        const res = await fetch('/api/account/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ ...user, wishlist: data.wishlist });
          showToast(data.wishlist.includes(productId) ? 'Saved to your wishlist' : 'Removed from wishlist');
        }
        return;
      }
      setGuestWishlist((prev) => {
        const exists = prev.includes(productId);
        const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
        showToast(exists ? 'Removed from wishlist' : 'Saved to your wishlist');
        return next;
      });
    },
    [user, showToast]
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    showToast('Signed out');
    if (route.startsWith('/admin') || route.startsWith('/account')) {
      navigate('/');
    }
  }, [navigate, route, showToast]);

  return (
    <StoreContext.Provider
      value={{
        loading,
        settings,
        categories,
        products,
        testimonials,
        reviews,
        activeCoupons,
        user,
        cart,
        wishlist,
        route,
        navigate,
        refreshStorefront,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
        authOpen,
        setAuthOpen,
        quickViewProduct,
        setQuickViewProduct,
        paymentSession,
        setPaymentSession,
        toast,
        showToast,
        logout,
        setUser,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
