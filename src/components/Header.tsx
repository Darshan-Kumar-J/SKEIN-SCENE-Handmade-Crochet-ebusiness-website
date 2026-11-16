import { useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function Header() {
  const {
    settings,
    route,
    navigate,
    cart,
    wishlist,
    user,
    setCartOpen,
    setSearchOpen,
    setAuthOpen,
  } = useStore();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalBagItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/shop' },
    { label: 'Collections', path: '/collections' },
    { label: 'Custom Orders', path: '/custom-orders' },
    { label: 'Our Story', path: '/our-story' },
    { label: 'Contact', path: '/contact' },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="sticky top-0 z-40">
      {settings.announcementEnabled && !bannerDismissed && (
        <div className="bg-[#55483F] text-[#F7F1E9] px-4 py-1.5 text-center text-xs tracking-wide relative">
          <p className="truncate px-6">{settings.announcementText}</p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#F7F1E9]/80 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="bg-[#F7F1E9]/95 backdrop-blur-md border-b border-[#55483F]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
          {/* Mobile menu button + Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNav('/');
              }}
              className="font-serif text-xl sm:text-2xl font-semibold tracking-[0.14em] text-[#55483F] whitespace-nowrap shrink-0"
            >
              SKEIN SCENE
            </a>
          </div>

          {/* Zone 2: Clean single-line text navigation */}
          <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#55483F]/80">
            {navItems.map((item) => {
              const active =
                item.path === '/'
                  ? route === '/'
                  : route === item.path || route.startsWith(`${item.path}/`);
              return (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(item.path);
                  }}
                  className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors duration-200 ${
                    active
                      ? 'text-[#55483F] border-[#55483F]'
                      : 'border-transparent hover:text-[#55483F] hover:border-[#B78C70]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Action Icons */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2.5 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg transition-colors"
              aria-label="Search crochet products"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => handleNav('/account?tab=wishlist')}
              className="relative p-2.5 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-[18px] h-[18px]" />
              {wishlist.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#B78C70] text-white text-[10px] font-medium flex items-center justify-center tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => (user ? handleNav(user.role === 'admin' ? '/admin' : '/account') : setAuthOpen(true))}
              className="p-2.5 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg transition-colors flex items-center gap-1.5"
              aria-label="Account"
            >
              <User className="w-[18px] h-[18px]" />
              {user && (
                <span className="hidden xl:inline text-xs font-medium max-w-[90px] truncate">
                  {user.role === 'admin' ? 'Admin' : user.name.split(' ')[0]}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative p-2.5 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg transition-colors"
              aria-label="Open shopping bag"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
              {totalBagItems > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#55483F] text-white text-[10px] font-medium flex items-center justify-center tabular-nums">
                  {totalBagItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#55483F]/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-[#F7F1E9] h-full shadow-2xl flex flex-col justify-between p-6">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-[#55483F]/10">
                <span className="font-serif text-xl font-semibold tracking-[0.14em] text-[#55483F]">
                  SKEIN SCENE
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-[#55483F] hover:bg-[#55483F]/5 rounded-lg"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-6 flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNav(item.path)}
                    className={`text-left px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                      route === item.path ? 'bg-white text-[#55483F]' : 'text-[#55483F]/80 hover:bg-white/60'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleNav('/consultations')}
                  className="text-left px-3 py-3 rounded-lg text-base font-medium text-[#55483F]/80 hover:bg-white/60"
                >
                  Book Consultation
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/track')}
                  className="text-left px-3 py-3 rounded-lg text-base font-medium text-[#55483F]/80 hover:bg-white/60"
                >
                  Track Order & Custom Booking
                </button>
              </nav>
            </div>
            <div className="pt-4 border-t border-[#55483F]/10 text-xs text-[#78695F] space-y-1.5">
              <p className="font-medium text-[#55483F]">Laggere Studio, Bengaluru</p>
              <p>{settings.weekdayHours}</p>
              <p>{settings.sundayHours}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
