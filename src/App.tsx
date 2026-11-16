import { Footer } from './components/Footer.tsx';
import { Header } from './components/Header.tsx';
import {
  AuthModal,
  CartAndCheckoutDrawer,
  QuickViewModal,
  RazorpayGatewayModal,
  SearchModal,
} from './components/Modals.tsx';
import { WhatsAppFloat } from './components/WhatsAppFloat.tsx';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { ConsultationsPage } from './pages/ConsultationsPage.tsx';
import { CustomOrderPage } from './pages/CustomOrderPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ContactPage, OurStoryPage, PolicyPage, TrackPage } from './pages/StoryContactPolicies.tsx';

function RouterView() {
  const { route, toast } = useStore();

  const renderPage = () => {
    if (route === '/' || route === '') return <HomePage />;
    if (route === '/shop') return <ShopPage mode="shop" />;
    if (route === '/collections') return <ShopPage mode="collections" />;
    if (route.startsWith('/collections/')) {
      return <ShopPage mode="shop" categorySlug={route.replace('/collections/', '')} />;
    }
    if (route.startsWith('/product/')) {
      return <ProductDetailPage slug={route.replace('/product/', '')} />;
    }
    if (route === '/custom-orders') return <CustomOrderPage />;
    if (route === '/consultations') return <ConsultationsPage />;
    if (route === '/our-story') return <OurStoryPage />;
    if (route === '/contact') return <ContactPage />;
    if (route === '/track') return <TrackPage />;
    if (route === '/account') return <AccountPage />;
    if (route === '/admin') return <AdminPage />;
    if (route === '/policies/shipping') return <PolicyPage type="shipping" />;
    if (route === '/policies/returns') return <PolicyPage type="returns" />;
    if (route === '/policies/privacy') return <PolicyPage type="privacy" />;
    if (route === '/policies/terms') return <PolicyPage type="terms" />;
    return <HomePage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F1E9] text-[#55483F]">
      <Header />
      <div className="flex-1">{renderPage()}</div>
      <Footer />
      <WhatsAppFloat />
      <CartAndCheckoutDrawer />
      <RazorpayGatewayModal />
      <QuickViewModal />
      <SearchModal />
      <AuthModal />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70] px-5 py-2.5 rounded-full bg-[#55483F] text-[#F7F1E9] text-xs font-medium shadow-lg border border-white/10"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <RouterView />
    </StoreProvider>
  );
}
