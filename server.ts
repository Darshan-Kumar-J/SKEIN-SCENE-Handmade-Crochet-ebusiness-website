import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import {
  attachOptionalUser,
  clearSessionCookie,
  createRazorpaySignature,
  PAYMENT_WEBHOOK_SECRET,
  publicUserResponse,
  requireAdmin,
  requireAuth,
  setSessionCookie,
  verifyRazorpaySignature,
  type AuthRequest,
} from './server/auth.ts';
import { getDb, hashPassword, saveDb, UPLOADS_DIR, verifyPassword } from './server/db.ts';
import { renderOrderInvoiceHtml } from './server/invoice.ts';
import {
  getBookedSlotCountsFromSupabase,
  listAppointmentsFromSupabase,
  saveAppointmentToSupabase,
  syncCustomRequestToSupabase,
  syncOrderToSupabase,
  updateAppointmentInSupabase,
} from './server/supabase.ts';
import type {
  Appointment,
  AppointmentType,
  CustomOrderStatus,
  CustomRequest,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  SavedAddress,
} from './src/types.ts';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '5mb' }));
app.use(attachOptionalUser);

// Simple sliding-window rate limiter for API mutations
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: express.NextFunction) => {
    const key = `${req.ip || 'local'}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (bucket.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }
    bucket.count += 1;
    next();
  };
}

// Serve validated custom reference uploads safely
app.use('/uploads', express.static(UPLOADS_DIR));

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function makeCode(prefix: string): string {
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const datePart = new Date().toISOString().slice(2, 7).replace('-', '');
  return `${prefix}-${datePart}-${suffix}`;
}

function computeProductUnitPrice(price: number, discountPercent: number): number {
  if (!discountPercent || discountPercent <= 0) return price;
  return Math.round(price * (1 - discountPercent / 100));
}

// ---------------- SEO: SITEMAP & ROBOTS ----------------

app.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${baseUrl}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const db = getDb();
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const staticRoutes = ['', '/shop', '/collections', '/custom-orders', '/consultations', '/our-story', '/contact', '/track'];
  const categoryRoutes = db.categories.map((c) => `/collections/${c.slug}`);
  const productRoutes = db.products.map((p) => `/product/${p.slug}`);
  const allUrls = [...staticRoutes, ...categoryRoutes, ...productRoutes];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>weekly</changefreq>
    <priority>${route === '' ? '1.0' : route.startsWith('/product/') ? '0.8' : '0.7'}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

// ---------------- PUBLIC STOREFRONT & CATALOG ----------------

app.get('/api/storefront', (req: AuthRequest, res) => {
  const db = getDb();
  res.json({
    settings: db.settings,
    categories: db.categories,
    products: db.products,
    testimonials: db.testimonials.filter((t) => t.approved),
    reviews: db.reviews.filter((r) => r.approved),
    activeCoupons: db.coupons
      .filter((c) => c.active)
      .map((c) => ({ code: c.code, description: c.description, minOrderAmount: c.minOrderAmount })),
    user: req.authUser ? publicUserResponse(req.authUser) : null,
  });
});

app.get('/api/products', (req, res) => {
  const db = getDb();
  const { category, collection, search, minPrice, maxPrice, sort } = req.query as Record<string, string | undefined>;
  let items = [...db.products];

  if (category && category !== 'all') {
    items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }
  if (collection && collection !== 'all') {
    items = items.filter((p) => p.collectionGroup.toLowerCase() === collection.toLowerCase());
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.materials.toLowerCase().includes(q)
    );
  }
  if (minPrice) {
    const min = Number(minPrice);
    if (!Number.isNaN(min)) {
      items = items.filter((p) => computeProductUnitPrice(p.price, p.discountPercent) >= min);
    }
  }
  if (maxPrice) {
    const max = Number(maxPrice);
    if (!Number.isNaN(max)) {
      items = items.filter((p) => computeProductUnitPrice(p.price, p.discountPercent) <= max);
    }
  }

  if (sort === 'price-asc') {
    items.sort(
      (a, b) => computeProductUnitPrice(a.price, a.discountPercent) - computeProductUnitPrice(b.price, b.discountPercent)
    );
  } else if (sort === 'price-desc') {
    items.sort(
      (a, b) => computeProductUnitPrice(b.price, b.discountPercent) - computeProductUnitPrice(a.price, a.discountPercent)
    );
  } else if (sort === 'newest') {
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } else {
    items.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
  }

  res.json({ products: items });
});

app.get('/api/products/:slug', (req, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.slug === req.params.slug || p.id === req.params.slug);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const reviews = db.reviews.filter((r) => r.productId === product.id && r.approved);
  const related = db.products
    .filter((p) => p.id !== product.id && (p.category === product.category || p.collectionGroup === product.collectionGroup))
    .slice(0, 3);
  res.json({ product, reviews, related });
});

app.post('/api/products/:slug/reviews', rateLimit(10, 60_000), (req: AuthRequest, res) => {
  const db = getDb();
  const product = db.products.find((p) => p.slug === req.params.slug || p.id === req.params.slug);
  if (!product) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const { customerName, rating, comment } = req.body as {
    customerName?: string;
    rating?: number;
    comment?: string;
  };
  const cleanName = (customerName || req.authUser?.name || '').trim();
  const cleanComment = (comment || '').trim();
  const numRating = Number(rating);

  if (!cleanName || cleanComment.length < 5 || Number.isNaN(numRating) || numRating < 1 || numRating > 5) {
    res.status(400).json({ error: 'Please provide your name, a rating (1–5), and a short review.' });
    return;
  }

  const hasPurchased = req.authUser
    ? db.orders.some(
        (o) =>
          o.userId === req.authUser?.id &&
          o.paymentStatus === 'paid' &&
          o.items.some((item) => item.productId === product.id)
      )
    : false;

  const review = {
    id: `rev_${crypto.randomUUID().slice(0, 8)}`,
    productId: product.id,
    customerName: cleanName.slice(0, 80),
    rating: Math.round(numRating),
    comment: cleanComment.slice(0, 600),
    verifiedPurchase: hasPurchased,
    approved: hasPurchased, // Verified purchasers publish immediately; others await studio approval
    createdAt: new Date().toISOString(),
  };

  db.reviews.unshift(review);
  saveDb(db);
  res.status(201).json({
    review,
    message: review.approved
      ? 'Thank you! Your verified review is now published.'
      : 'Thank you! Your review has been submitted for studio verification.',
  });
});

// ---------------- NEWSLETTER & CONTACT ----------------

app.post('/api/newsletter', rateLimit(10, 60_000), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }
  const db = getDb();
  if (db.subscribers.some((s) => s.email === email)) {
    res.json({ message: 'You are already subscribed to Skein Scene updates.' });
    return;
  }
  db.subscribers.unshift({
    id: `sub_${crypto.randomUUID().slice(0, 8)}`,
    email,
    subscribedAt: new Date().toISOString(),
  });
  saveDb(db);
  res.status(201).json({ message: 'Welcome to Skein Scene! You will hear from us about new launches and seasonal drops.' });
});

app.post('/api/contact', rateLimit(10, 60_000), (req: AuthRequest, res) => {
  const { name, email, phone, subject, message } = req.body as Record<string, string | undefined>;
  if (!name?.trim() || !isValidEmail(email || '') || !message?.trim()) {
    res.status(400).json({ error: 'Please provide your name, a valid email, and your message.' });
    return;
  }
  const db = getDb();
  const supportItem = {
    id: `sup_${crypto.randomUUID().slice(0, 8)}`,
    userId: req.authUser?.id,
    customerName: name.trim().slice(0, 100),
    email: email!.trim().toLowerCase(),
    phone: (phone || '').trim().slice(0, 25),
    type: 'Contact Inquiry' as const,
    subject: (subject || 'General Studio Inquiry').trim().slice(0, 120),
    message: message.trim().slice(0, 1500),
    status: 'Open' as const,
    createdAt: new Date().toISOString(),
  };
  db.supportRequests.unshift(supportItem);
  db.notifications.unshift({
    id: `not_${crypto.randomUUID().slice(0, 8)}`,
    title: 'New Contact Message',
    detail: `${supportItem.customerName}: ${supportItem.subject}`,
    type: 'support',
    referenceId: supportItem.id,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
  res.status(201).json({ message: 'Thank you for reaching out! Our Laggere studio team will reply shortly.' });
});

// ---------------- AUTH & CUSTOMER ACCOUNT ----------------

app.post('/api/auth/register', rateLimit(10, 60_000), (req, res) => {
  const { name, email, phone, password } = req.body as Record<string, string | undefined>;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!name?.trim() || !isValidEmail(cleanEmail) || !password || password.length < 6) {
    res.status(400).json({ error: 'Name, valid email, and a password of at least 6 characters are required.' });
    return;
  }

  const db = getDb();
  if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    return;
  }

  const creds = hashPassword(password);
  const newUser = {
    id: `usr_${crypto.randomUUID().slice(0, 8)}`,
    name: name.trim().slice(0, 80),
    email: cleanEmail,
    phone: (phone || '').trim().slice(0, 25),
    role: 'customer' as const,
    addresses: [],
    wishlist: [],
    createdAt: new Date().toISOString(),
    passwordHash: creds.hash,
    passwordSalt: creds.salt,
  };

  db.users.push(newUser);
  saveDb(db);
  setSessionCookie(res, newUser);
  res.status(201).json({ user: publicUserResponse(newUser) });
});

app.post('/api/auth/login', rateLimit(15, 60_000), (req, res) => {
  const { email, password } = req.body as Record<string, string | undefined>;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const db = getDb();
  const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user || !verifyPassword(password, user.passwordHash, user.passwordSalt)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  setSessionCookie(res, user);
  res.json({ user: publicUserResponse(user) });
});

app.post('/api/auth/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req: AuthRequest, res) => {
  res.json({ user: req.authUser ? publicUserResponse(req.authUser) : null });
});

app.put('/api/account/profile', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.authUser!.id);
  if (!user) {
    res.status(404).json({ error: 'Account not found.' });
    return;
  }
  const { name, phone, addresses } = req.body as {
    name?: string;
    phone?: string;
    addresses?: SavedAddress[];
  };
  if (name?.trim()) user.name = name.trim().slice(0, 80);
  if (typeof phone === 'string') user.phone = phone.trim().slice(0, 25);
  if (Array.isArray(addresses)) {
    user.addresses = addresses.slice(0, 8).map((a) => ({
      id: a.id || `addr_${crypto.randomUUID().slice(0, 6)}`,
      label: String(a.label || 'Home').slice(0, 40),
      recipientName: String(a.recipientName || user.name).slice(0, 80),
      phone: String(a.phone || user.phone).slice(0, 25),
      line1: String(a.line1 || '').slice(0, 180),
      line2: a.line2 ? String(a.line2).slice(0, 120) : '',
      city: String(a.city || '').slice(0, 60),
      state: String(a.state || '').slice(0, 60),
      pincode: String(a.pincode || '').slice(0, 12),
      isDefault: Boolean(a.isDefault),
    }));
  }
  saveDb(db);
  res.json({ user: publicUserResponse(user) });
});

app.post('/api/account/wishlist', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const user = db.users.find((u) => u.id === req.authUser!.id);
  const productId = String(req.body?.productId || '');
  if (!user || !db.products.some((p) => p.id === productId)) {
    res.status(400).json({ error: 'Invalid product.' });
    return;
  }
  const exists = user.wishlist.includes(productId);
  user.wishlist = exists ? user.wishlist.filter((id) => id !== productId) : [...user.wishlist, productId];
  saveDb(db);
  res.json({ wishlist: user.wishlist });
});

app.get('/api/account/dashboard', requireAuth, (req: AuthRequest, res) => {
  const db = getDb();
  const uid = req.authUser!.id;
  const email = req.authUser!.email.toLowerCase();

  const orders = db.orders.filter((o) => o.userId === uid || o.customerEmail.toLowerCase() === email);
  const customRequests = db.customRequests.filter((c) => c.userId === uid || c.email.toLowerCase() === email);
  const appointments = db.appointments.filter((a) => a.userId === uid || a.email.toLowerCase() === email);
  const payments = db.payments.filter((p) => p.customerEmail.toLowerCase() === email);
  const supportRequests = db.supportRequests.filter(
    (s) => s.userId === uid || s.email.toLowerCase() === email
  );

  res.json({ orders, customRequests, appointments, payments, supportRequests });
});

app.post('/api/account/support', requireAuth, (req: AuthRequest, res) => {
  const { type, referenceCode, subject, message } = req.body as Record<string, string | undefined>;
  if (!subject?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Subject and message are required.' });
    return;
  }
  const db = getDb();
  const item = {
    id: `sup_${crypto.randomUUID().slice(0, 8)}`,
    userId: req.authUser!.id,
    customerName: req.authUser!.name,
    email: req.authUser!.email,
    phone: req.authUser!.phone,
    type: type === 'Cancellation' ? ('Cancellation' as const) : ('Support' as const),
    referenceCode: referenceCode?.trim().slice(0, 40),
    subject: subject.trim().slice(0, 120),
    message: message.trim().slice(0, 1200),
    status: 'Open' as const,
    createdAt: new Date().toISOString(),
  };
  db.supportRequests.unshift(item);
  db.notifications.unshift({
    id: `not_${crypto.randomUUID().slice(0, 8)}`,
    title: `${item.type} Request`,
    detail: `${item.customerName} (${item.referenceCode || 'General'})`,
    type: 'support',
    referenceId: item.id,
    read: false,
    createdAt: new Date().toISOString(),
  });
  saveDb(db);
  res.status(201).json({ supportRequest: item });
});

// ---------------- COUPONS, CHECKOUT & PAYMENT VERIFICATION ----------------

app.post('/api/coupons/validate', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const subtotal = Number(req.body?.subtotal || 0);
  const db = getDb();
  const coupon = db.coupons.find((c) => c.code.toUpperCase() === code && c.active);
  if (!coupon) {
    res.status(404).json({ error: 'Invalid or expired coupon code.' });
    return;
  }
  if (subtotal < coupon.minOrderAmount) {
    res.status(400).json({
      error: `Minimum order value of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for ${coupon.code}.`,
    });
    return;
  }
  const discountAmount =
    coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(subtotal, coupon.value);
  res.json({ coupon, discountAmount });
});

app.post('/api/checkout/create-order', rateLimit(12, 60_000), async (req: AuthRequest, res) => {
  const db = getDb();
  const {
    customerName,
    customerEmail,
    customerPhone,
    fulfillmentMethod,
    shippingAddress,
    items,
    couponCode,
    giftWrap,
    giftMessage,
  } = req.body as {
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    fulfillmentMethod?: 'standard' | 'pickup';
    shippingAddress?: SavedAddress;
    items?: { productId: string; quantity: number; selectedColor: string }[];
    couponCode?: string;
    giftWrap?: boolean;
    giftMessage?: string;
  };

  if (!customerName?.trim() || !isValidEmail(customerEmail || '') || !customerPhone?.trim()) {
    res.status(400).json({ error: 'Please provide your full name, valid email, and mobile/WhatsApp number.' });
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Your shopping bag is empty.' });
    return;
  }
  if (fulfillmentMethod !== 'pickup') {
    if (!shippingAddress?.line1?.trim() || !shippingAddress?.city?.trim() || !shippingAddress?.pincode?.trim()) {
      res.status(400).json({ error: 'Complete delivery address with city and PIN code is required.' });
      return;
    }
  }

  const orderItems: OrderItem[] = [];
  let subtotal = 0;

  for (const entry of items) {
    const product = db.products.find((p) => p.id === entry.productId);
    const qty = Math.max(1, Math.floor(Number(entry.quantity) || 0));
    if (!product) {
      res.status(400).json({ error: 'One or more items in your bag are no longer available.' });
      return;
    }
    if (product.stock < qty) {
      res.status(400).json({ error: `Only ${product.stock} left in stock for "${product.name}".` });
      return;
    }
    const finalUnitPrice = computeProductUnitPrice(product.price, product.discountPercent);
    subtotal += finalUnitPrice * qty;
    orderItems.push({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || '',
      selectedColor: entry.selectedColor || product.colors[0] || 'Default',
      quantity: qty,
      unitPrice: product.price,
      discountPercent: product.discountPercent,
      finalUnitPrice,
    });
  }

  let discountAmount = 0;
  let appliedCoupon: string | undefined;
  if (couponCode?.trim()) {
    const found = db.coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.active && subtotal >= c.minOrderAmount
    );
    if (found) {
      appliedCoupon = found.code;
      discountAmount =
        found.type === 'percent' ? Math.round((subtotal * found.value) / 100) : Math.min(subtotal, found.value);
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const method = fulfillmentMethod === 'pickup' ? 'pickup' : 'standard';
  const shippingFee =
    method === 'pickup' || afterDiscount >= db.settings.freeShippingThreshold ? 0 : db.settings.standardShippingFee;
  const taxAmount = Math.round((afterDiscount * (db.settings.taxPercent || 0)) / 100);
  const totalAmount = afterDiscount + shippingFee + taxAmount;

  const now = new Date().toISOString();
  const razorpayOrderId = `order_rzp_${crypto.randomBytes(6).toString('hex')}`;
  const newOrder: Order = {
    id: `ord_${crypto.randomUUID().slice(0, 8)}`,
    orderNumber: makeCode('SS'),
    userId: req.authUser?.id,
    customerName: customerName.trim().slice(0, 80),
    customerEmail: customerEmail!.trim().toLowerCase(),
    customerPhone: customerPhone.trim().slice(0, 25),
    fulfillmentMethod: method,
    shippingAddress: method === 'standard' ? shippingAddress : undefined,
    items: orderItems,
    subtotal,
    discountAmount,
    couponCode: appliedCoupon,
    shippingFee,
    taxAmount,
    totalAmount,
    giftWrap: Boolean(giftWrap),
    giftMessage: giftMessage ? giftMessage.trim().slice(0, 240) : undefined,
    status: 'Pending Payment',
    paymentStatus: 'pending',
    razorpayOrderId,
    createdAt: now,
    updatedAt: now,
  };

  db.orders.unshift(newOrder);
  saveDb(db);
  const orderSync = await syncOrderToSupabase(newOrder);

  res.status(201).json({
    order: newOrder,
    supabaseSynced: orderSync.ok,
    razorpay: {
      orderId: razorpayOrderId,
      amountPaise: totalAmount * 100,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_skeinscene_bengaluru',
    },
  });
});

// Server-side Razorpay Test Gateway Authorization & Signed Verification
app.post('/api/payments/gateway-authorize', rateLimit(15, 60_000), (req, res) => {
  const { razorpayOrderId, method, simulateFailure } = req.body as {
    razorpayOrderId?: string;
    method?: string;
    simulateFailure?: boolean;
  };
  if (!razorpayOrderId) {
    res.status(400).json({ error: 'Missing gateway order ID.' });
    return;
  }
  const db = getDb();
  const order = db.orders.find((o) => o.razorpayOrderId === razorpayOrderId);
  const custom = db.customRequests.find((c) => c.advanceRazorpayOrderId === razorpayOrderId);
  if (!order && !custom) {
    res.status(404).json({ error: 'Payment order not found.' });
    return;
  }

  if (simulateFailure) {
    if (order) {
      order.paymentStatus = 'failed';
      order.updatedAt = new Date().toISOString();
      saveDb(db);
    }
    res.status(402).json({
      error: 'Payment declined by bank/UPI provider. Please retry with another method.',
      code: 'PAYMENT_DECLINED',
    });
    return;
  }

  const razorpayPaymentId = `pay_rzp_${crypto.randomBytes(6).toString('hex')}`;
  const razorpaySignature = createRazorpaySignature(razorpayOrderId, razorpayPaymentId);

  res.json({
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
    method: method || 'UPI',
  });
});

app.post('/api/payments/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, method } = req.body as Record<
    string,
    string | undefined
  >;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: 'Missing payment verification credentials.' });
    return;
  }

  if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    res.status(400).json({ error: 'Payment signature verification failed.' });
    return;
  }

  const db = getDb();
  const order = db.orders.find((o) => o.razorpayOrderId === razorpay_order_id);
  if (order) {
    if (order.paymentStatus !== 'paid') {
      // Deduct stock atomically
      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }
      }
      order.paymentStatus = 'paid';
      order.status = 'Confirmed';
      order.paymentMethod = method || 'UPI';
      order.razorpayPaymentId = razorpay_payment_id;
      order.razorpaySignature = razorpay_signature;
      order.updatedAt = new Date().toISOString();

      db.payments.unshift({
        id: `payrec_${crypto.randomUUID().slice(0, 8)}`,
        referenceType: 'order',
        referenceCode: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        amount: order.totalAmount,
        method: order.paymentMethod,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
        createdAt: new Date().toISOString(),
      });

      db.notifications.unshift({
        id: `not_${crypto.randomUUID().slice(0, 8)}`,
        title: `New Paid Order ${order.orderNumber}`,
        detail: `₹${order.totalAmount.toLocaleString('en-IN')} via ${order.paymentMethod} by ${order.customerName}`,
        type: 'order',
        referenceId: order.orderNumber,
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveDb(db);
    }
    const orderSync = await syncOrderToSupabase(order);
    res.json({ verified: true, type: 'order', order, supabaseSynced: orderSync.ok });
    return;
  }

  const custom = db.customRequests.find((c) => c.advanceRazorpayOrderId === razorpay_order_id);
  if (custom) {
    if (!custom.advancePaid) {
      custom.advancePaid = true;
      custom.advanceRazorpayPaymentId = razorpay_payment_id;
      custom.status = 'Confirmed';
      custom.updatedAt = new Date().toISOString();
      custom.timeline.push({
        status: 'Confirmed',
        note: `Advance payment of ₹${(custom.advanceAmount || 0).toLocaleString('en-IN')} verified (${razorpay_payment_id}).`,
        timestamp: new Date().toISOString(),
      });

      db.payments.unshift({
        id: `payrec_${crypto.randomUUID().slice(0, 8)}`,
        referenceType: 'custom_advance',
        referenceCode: custom.bookingCode,
        customerName: custom.customerName,
        customerEmail: custom.email,
        amount: custom.advanceAmount || 0,
        method: method || 'UPI',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        status: 'paid',
        createdAt: new Date().toISOString(),
      });

      db.notifications.unshift({
        id: `not_${crypto.randomUUID().slice(0, 8)}`,
        title: `Custom Advance Paid (${custom.bookingCode})`,
        detail: `₹${(custom.advanceAmount || 0).toLocaleString('en-IN')} advance verified`,
        type: 'custom',
        referenceId: custom.bookingCode,
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveDb(db);
    }
    const customSync = await syncCustomRequestToSupabase(custom);
    res.json({ verified: true, type: 'custom_advance', customRequest: custom, supabaseSynced: customSync.ok });
    return;
  }

  res.status(404).json({ error: 'Matching order not found.' });
});

app.post('/api/payments/webhook', (req, res) => {
  const sigHeader = String(req.headers['x-razorpay-signature'] || '');
  const rawBody = JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', PAYMENT_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(sigHeader);
  const b = Buffer.from(expected);
  if (!sigHeader || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Invalid webhook signature.' });
    return;
  }
  res.json({ received: true });
});

app.get('/api/orders/track/:orderNumber', (req, res) => {
  const db = getDb();
  const code = req.params.orderNumber.trim().toUpperCase();
  const order = db.orders.find((o) => o.orderNumber.toUpperCase() === code);
  if (!order) {
    res.status(404).json({ error: 'Order number not found.' });
    return;
  }
  res.json({ order });
});

app.get('/api/orders/:orderNumber/invoice', (req, res) => {
  const db = getDb();
  const code = req.params.orderNumber.trim().toUpperCase();
  const order = db.orders.find((o) => o.orderNumber.toUpperCase() === code);
  if (!order) {
    res.status(404).send('Invoice not found.');
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderOrderInvoiceHtml(order));
});

// ---------------- CUSTOM CROCHET ORDER BOOKING ----------------

app.post('/api/custom-requests/upload', rateLimit(10, 60_000), (req, res) => {
  const { dataUrl, fileName } = req.body as { dataUrl?: string; fileName?: string };
  if (!dataUrl || typeof dataUrl !== 'string') {
    res.status(400).json({ error: 'Missing image data.' });
    return;
  }
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    res.status(400).json({ error: 'Only PNG, JPEG, or WebP reference images are accepted.' });
    return;
  }
  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 3 * 1024 * 1024) {
    res.status(400).json({ error: 'Image size must be under 3 MB.' });
    return;
  }
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const safeBase = (fileName || 'ref').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'ref';
  const outName = `${safeBase}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, outName), buffer);
  res.status(201).json({ url: `/uploads/${outName}` });
});

app.post('/api/custom-requests', rateLimit(10, 60_000), async (req: AuthRequest, res) => {
  const {
    customerName,
    email,
    phone,
    category,
    productType,
    preferredColors,
    preferredSize,
    quantity,
    budgetRange,
    requiredDate,
    giftWrapping,
    personalizedMessage,
    designInstructions,
    referenceImageUrl,
  } = req.body as Partial<CustomRequest>;

  if (
    !customerName?.trim() ||
    !isValidEmail(email || '') ||
    !phone?.trim() ||
    !category?.trim() ||
    !productType?.trim() ||
    !designInstructions?.trim()
  ) {
    res.status(400).json({ error: 'Please complete all required custom order fields.' });
    return;
  }

  const db = getDb();
  const now = new Date().toISOString();
  const bookingCode = makeCode('SS-CUST');
  const reqRecord: CustomRequest = {
    id: `cust_${crypto.randomUUID().slice(0, 8)}`,
    bookingCode,
    userId: req.authUser?.id,
    customerName: customerName.trim().slice(0, 80),
    email: email!.trim().toLowerCase(),
    phone: phone.trim().slice(0, 25),
    category: category.trim(),
    productType: productType.trim().slice(0, 100),
    preferredColors: Array.isArray(preferredColors) ? preferredColors.slice(0, 6) : ['Warm Ivory'],
    preferredSize: (preferredSize || 'Medium').trim(),
    quantity: Math.max(1, Number(quantity) || 1),
    budgetRange: (budgetRange || '₹1,000 – ₹2,500').trim(),
    requiredDate: (requiredDate || '').trim(),
    giftWrapping: Boolean(giftWrapping),
    personalizedMessage: (personalizedMessage || '').trim().slice(0, 200),
    designInstructions: designInstructions.trim().slice(0, 1500),
    referenceImageUrl: referenceImageUrl || undefined,
    status: 'Request Received',
    advancePaid: false,
    timeline: [
      {
        status: 'Request Received',
        note: 'Custom request received by Skein Scene studio in Laggere, Bengaluru.',
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  db.customRequests.unshift(reqRecord);
  db.notifications.unshift({
    id: `not_${crypto.randomUUID().slice(0, 8)}`,
    title: `New Custom Request ${bookingCode}`,
    detail: `${reqRecord.customerName} requested ${reqRecord.productType}`,
    type: 'custom',
    referenceId: bookingCode,
    read: false,
    createdAt: now,
  });
  saveDb(db);
  const customSync = await syncCustomRequestToSupabase(reqRecord);
  res.status(201).json({ customRequest: reqRecord, supabaseSynced: customSync.ok });
});

app.get('/api/custom-requests/track/:bookingCode', (req, res) => {
  const db = getDb();
  const code = req.params.bookingCode.trim().toUpperCase();
  const custom = db.customRequests.find((c) => c.bookingCode.toUpperCase() === code);
  if (!custom) {
    res.status(404).json({ error: 'Custom booking ID not found.' });
    return;
  }
  res.json({ customRequest: custom });
});

app.post('/api/custom-requests/:bookingCode/respond', async (req, res) => {
  const db = getDb();
  const code = req.params.bookingCode.trim().toUpperCase();
  const custom = db.customRequests.find((c) => c.bookingCode.toUpperCase() === code);
  if (!custom) {
    res.status(404).json({ error: 'Custom booking not found.' });
    return;
  }
  const { action, feedback } = req.body as { action?: 'accept' | 'request_changes'; feedback?: string };
  const now = new Date().toISOString();
  if (action === 'accept') {
    custom.status = 'Awaiting Payment';
    custom.timeline.push({
      status: 'Awaiting Payment',
      note: 'Quotation accepted by customer. Ready for advance payment.',
      timestamp: now,
    });
  } else {
    custom.status = 'Under Review';
    custom.customerFeedback = feedback?.trim().slice(0, 500);
    custom.timeline.push({
      status: 'Under Review',
      note: `Revision requested by customer: ${custom.customerFeedback || 'Updated specs'}`,
      timestamp: now,
    });
  }
  custom.updatedAt = now;
  saveDb(db);
  await syncCustomRequestToSupabase(custom);
  res.json({ customRequest: custom });
});

app.post('/api/custom-requests/:bookingCode/create-advance-order', (req, res) => {
  const db = getDb();
  const code = req.params.bookingCode.trim().toUpperCase();
  const custom = db.customRequests.find((c) => c.bookingCode.toUpperCase() === code);
  if (!custom || !custom.advanceAmount || custom.advanceAmount <= 0) {
    res.status(400).json({ error: 'Quotation advance amount is not ready yet.' });
    return;
  }
  const razorpayOrderId = `order_rzp_adv_${crypto.randomBytes(5).toString('hex')}`;
  custom.advanceRazorpayOrderId = razorpayOrderId;
  custom.status = 'Awaiting Payment';
  custom.updatedAt = new Date().toISOString();
  saveDb(db);

  res.json({
    customRequest: custom,
    razorpay: {
      orderId: razorpayOrderId,
      amountPaise: custom.advanceAmount * 100,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_skeinscene_bengaluru',
    },
  });
});

// ---------------- CONSULTATION APPOINTMENTS ----------------

app.get('/api/appointments/availability', async (req, res) => {
  const date = String(req.query.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: 'Valid YYYY-MM-DD date required.' });
    return;
  }
  const db = getDb();
  const isBlocked = db.settings.blockedDates.includes(date);
  if (isBlocked) {
    res.json({ date, blocked: true, slots: [], durationMins: db.settings.appointmentDurationMins });
    return;
  }

  const supabaseCounts = await getBookedSlotCountsFromSupabase(date);

  const slots = db.settings.appointmentSlots.map((slot) => {
    const localCount = db.appointments.filter(
      (a) => a.date === date && a.timeSlot === slot && a.status !== 'Rejected' && a.status !== 'Cancelled'
    ).length;
    const remoteCount = supabaseCounts ? supabaseCounts[slot] || 0 : 0;
    const bookedCount = Math.max(localCount, remoteCount);
    return {
      timeSlot: slot,
      available: bookedCount < db.settings.maxBookingsPerSlot,
      remaining: Math.max(0, db.settings.maxBookingsPerSlot - bookedCount),
    };
  });

  res.json({
    date,
    blocked: false,
    durationMins: db.settings.appointmentDurationMins,
    slots,
  });
});

app.post('/api/appointments', rateLimit(10, 60_000), async (req: AuthRequest, res) => {
  const { customerName, email, phone, appointmentType, date, timeSlot, notes } = req.body as {
    customerName?: string;
    email?: string;
    phone?: string;
    appointmentType?: AppointmentType;
    date?: string;
    timeSlot?: string;
    notes?: string;
  };

  if (!customerName?.trim() || !isValidEmail(email || '') || !phone?.trim() || !date || !timeSlot) {
    res.status(400).json({ error: 'Name, email, mobile number, date, and time slot are required.' });
    return;
  }

  const db = getDb();
  if (db.settings.blockedDates.includes(date)) {
    res.status(400).json({ error: 'Selected date is unavailable for studio consultations.' });
    return;
  }
  if (!db.settings.appointmentSlots.includes(timeSlot)) {
    res.status(400).json({ error: 'Selected time slot is invalid.' });
    return;
  }

  const supabaseCounts = await getBookedSlotCountsFromSupabase(date);
  const localCount = db.appointments.filter(
    (a) => a.date === date && a.timeSlot === timeSlot && a.status !== 'Rejected' && a.status !== 'Cancelled'
  ).length;
  const remoteCount = supabaseCounts ? supabaseCounts[timeSlot] || 0 : 0;
  const existingCount = Math.max(localCount, remoteCount);

  if (existingCount >= db.settings.maxBookingsPerSlot) {
    res.status(409).json({ error: 'That time slot has just been booked. Please select another slot.' });
    return;
  }

  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: `apt_${crypto.randomUUID().slice(0, 8)}`,
    bookingCode: makeCode('SS-APT'),
    userId: req.authUser?.id,
    customerName: customerName.trim().slice(0, 80),
    email: email!.trim().toLowerCase(),
    phone: phone.trim().slice(0, 25),
    appointmentType: appointmentType || 'Custom Gift Consultation',
    date,
    timeSlot,
    notes: (notes || '').trim().slice(0, 800),
    status: 'Pending',
    createdAt: now,
  };

  const supabaseResult = await saveAppointmentToSupabase(appointment);

  db.appointments.unshift(appointment);
  db.notifications.unshift({
    id: `not_${crypto.randomUUID().slice(0, 8)}`,
    title: `Consultation Request ${appointment.bookingCode}`,
    detail: `${appointment.customerName} · ${appointment.date} at ${appointment.timeSlot}${supabaseResult.ok ? ' (Synced to Supabase)' : ''}`,
    type: 'appointment',
    referenceId: appointment.bookingCode,
    read: false,
    createdAt: now,
  });
  saveDb(db);
  res.status(201).json({ appointment, supabaseSynced: supabaseResult.ok, supabaseReason: supabaseResult.reason });
});

app.get('/api/appointments/track/:code', (req, res) => {
  const db = getDb();
  const code = req.params.code.trim().toUpperCase();
  const appointment = db.appointments.find((a) => a.bookingCode.toUpperCase() === code);
  if (!appointment) {
    res.status(404).json({ error: 'Appointment booking ID not found.' });
    return;
  }
  res.json({ appointment });
});

// ---------------- ADMIN DASHBOARD APIS ----------------

app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  const db = getDb();
  const paidOrders = db.orders.filter((o) => o.paymentStatus === 'paid');
  const orderRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const advanceRevenue = db.customRequests
    .filter((c) => c.advancePaid)
    .reduce((sum, c) => sum + (c.advanceAmount || 0), 0);

  const remoteAppointments = await listAppointmentsFromSupabase();
  const mergedAppointments = remoteAppointments && remoteAppointments.length > 0 ? remoteAppointments : db.appointments;

  const lowStockProducts = db.products.filter((p) => p.stock <= 5);
  const customers = db.users.filter((u) => u.role === 'customer').map(publicUserResponse);

  res.json({
    metrics: {
      totalSales: orderRevenue + advanceRevenue,
      totalOrders: db.orders.length,
      pendingOrders: db.orders.filter((o) => o.status === 'Pending Payment' || o.status === 'Confirmed' || o.status === 'Crafting').length,
      customRequestsCount: db.customRequests.length,
      confirmedBookingsCount: mergedAppointments.filter((a) => a.status === 'Approved').length,
      lowStockCount: lowStockProducts.length,
      subscribersCount: db.subscribers.length,
    },
    lowStockProducts,
    products: db.products,
    categories: db.categories,
    orders: db.orders,
    customRequests: db.customRequests,
    appointments: mergedAppointments,
    coupons: db.coupons,
    testimonials: db.testimonials,
    reviews: db.reviews,
    subscribers: db.subscribers,
    supportRequests: db.supportRequests,
    notifications: db.notifications,
    customers,
    settings: db.settings,
  });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const db = getDb();
  const body = req.body as Partial<Product>;
  if (!body.name?.trim() || !body.category?.trim() || Number(body.price) <= 0) {
    res.status(400).json({ error: 'Product name, category, and positive price are required.' });
    return;
  }
  const cat = db.categories.find((c) => c.name === body.category);
  const slugBase = body.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const product: Product = {
    id: `prod_${crypto.randomUUID().slice(0, 8)}`,
    slug: `${slugBase}-${crypto.randomBytes(2).toString('hex')}`,
    name: body.name.trim(),
    category: body.category.trim(),
    collectionGroup: body.collectionGroup || cat?.collectionGroup || 'Personalized Gifts',
    description: (body.description || 'Handmade with love at Skein Scene Bengaluru.').trim(),
    price: Math.round(Number(body.price)),
    discountPercent: Math.min(80, Math.max(0, Number(body.discountPercent) || 0)),
    stock: Math.max(0, Math.floor(Number(body.stock) || 0)),
    images:
      Array.isArray(body.images) && body.images.length > 0
        ? body.images
        : ['/src/assets/images/crochet_gift_packaging_1794827810801.jpg'],
    materials: body.materials || '100% combed cotton yarn',
    dimensions: body.dimensions || 'Handcrafted standard size',
    colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : ['Warm Ivory', 'Dusty Pink'],
    careInstructions: body.careInstructions || 'Gentle hand wash in cool water; air dry flat.',
    prepTimeDays: body.prepTimeDays || '3–5 business days',
    deliveryInfo: body.deliveryInfo || 'Ships across India in protective packaging.',
    featured: Boolean(body.featured),
    bestSeller: Boolean(body.bestSeller),
    isCustomFriendly: body.isCustomFriendly !== false,
    createdAt: new Date().toISOString(),
  };
  db.products.unshift(product);
  saveDb(db);
  res.status(201).json({ product });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const idx = db.products.findIndex((p) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  const existing = db.products[idx];
  const updates = req.body as Partial<Product>;
  db.products[idx] = {
    ...existing,
    ...updates,
    id: existing.id,
    slug: existing.slug,
    price: updates.price !== undefined ? Math.max(1, Math.round(Number(updates.price))) : existing.price,
    discountPercent:
      updates.discountPercent !== undefined
        ? Math.min(80, Math.max(0, Number(updates.discountPercent)))
        : existing.discountPercent,
    stock: updates.stock !== undefined ? Math.max(0, Math.floor(Number(updates.stock))) : existing.stock,
  };
  saveDb(db);
  res.json({ product: db.products[idx] });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.products = db.products.filter((p) => p.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

app.put('/api/admin/orders/:id', requireAdmin, async (req, res) => {
  const db = getDb();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found.' });
    return;
  }
  const { status, paymentStatus, courierName, trackingNumber, notes } = req.body as {
    status?: OrderStatus;
    paymentStatus?: Order['paymentStatus'];
    courierName?: string;
    trackingNumber?: string;
    notes?: string;
  };
  if (status) order.status = status;
  if (paymentStatus) order.paymentStatus = paymentStatus;
  if (courierName !== undefined) order.courierName = courierName;
  if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
  if (notes !== undefined) order.notes = notes;
  order.updatedAt = new Date().toISOString();
  saveDb(db);
  await syncOrderToSupabase(order);
  res.json({ order });
});

app.put('/api/admin/custom-requests/:id', requireAdmin, async (req, res) => {
  const db = getDb();
  const custom = db.customRequests.find((c) => c.id === req.params.id);
  if (!custom) {
    res.status(404).json({ error: 'Custom request not found.' });
    return;
  }
  const { status, quotedTotal, advanceAmount, adminNotes, timelineNote } = req.body as {
    status?: CustomOrderStatus;
    quotedTotal?: number;
    advanceAmount?: number;
    adminNotes?: string;
    timelineNote?: string;
  };
  const now = new Date().toISOString();
  if (quotedTotal !== undefined && Number(quotedTotal) > 0) {
    custom.quotedTotal = Math.round(Number(quotedTotal));
  }
  if (advanceAmount !== undefined && Number(advanceAmount) >= 0) {
    custom.advanceAmount = Math.round(Number(advanceAmount));
  }
  if (adminNotes !== undefined) custom.adminNotes = adminNotes;
  if (status && status !== custom.status) {
    custom.status = status;
    custom.timeline.push({
      status,
      note:
        timelineNote?.trim() ||
        (status === 'Quotation Sent' && custom.quotedTotal
          ? `Quotation sent: ₹${custom.quotedTotal.toLocaleString('en-IN')} (Advance: ₹${(custom.advanceAmount || 0).toLocaleString('en-IN')}).`
          : `Status updated to ${status}.`),
      timestamp: now,
    });
  }
  custom.updatedAt = now;
  saveDb(db);
  await syncCustomRequestToSupabase(custom);
  res.json({ customRequest: custom });
});

app.put('/api/admin/appointments/:id', requireAdmin, async (req, res) => {
  const db = getDb();
  const apt = db.appointments.find((a) => a.id === req.params.id);
  if (!apt) {
    res.status(404).json({ error: 'Appointment not found.' });
    return;
  }
  const { status, date, timeSlot, adminNote } = req.body as Partial<Appointment>;
  if (status) apt.status = status;
  if (date) apt.date = date;
  if (timeSlot) apt.timeSlot = timeSlot;
  if (adminNote !== undefined) apt.adminNote = adminNote;
  await updateAppointmentInSupabase(apt.id, { status, date, timeSlot, adminNote });
  saveDb(db);
  res.json({ appointment: apt });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const db = getDb();
  db.settings = {
    ...db.settings,
    ...req.body,
    freeShippingThreshold: Math.max(0, Number(req.body?.freeShippingThreshold ?? db.settings.freeShippingThreshold)),
    standardShippingFee: Math.max(0, Number(req.body?.standardShippingFee ?? db.settings.standardShippingFee)),
    appointmentDurationMins: Math.max(15, Number(req.body?.appointmentDurationMins ?? db.settings.appointmentDurationMins)),
    maxBookingsPerSlot: Math.max(1, Number(req.body?.maxBookingsPerSlot ?? db.settings.maxBookingsPerSlot)),
  };
  saveDb(db);
  res.json({ settings: db.settings });
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const db = getDb();
  const { code, type, value, minOrderAmount, description } = req.body as {
    code?: string;
    type?: 'percent' | 'flat';
    value?: number;
    minOrderAmount?: number;
    description?: string;
  };
  if (!code?.trim() || Number(value) <= 0) {
    res.status(400).json({ error: 'Coupon code and positive value required.' });
    return;
  }
  const coupon = {
    id: `cpn_${crypto.randomUUID().slice(0, 6)}`,
    code: code.trim().toUpperCase(),
    type: type === 'flat' ? ('flat' as const) : ('percent' as const),
    value: Math.round(Number(value)),
    minOrderAmount: Math.max(0, Math.round(Number(minOrderAmount) || 0)),
    active: true,
    description: (description || 'Promotional offer').trim(),
  };
  db.coupons.unshift(coupon);
  saveDb(db);
  res.status(201).json({ coupon });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.coupons = db.coupons.filter((c) => c.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

app.post('/api/admin/testimonials', requireAdmin, (req, res) => {
  const db = getDb();
  const { customerName, city, productPurchased, quote, rating, approved } = req.body as {
    customerName?: string;
    city?: string;
    productPurchased?: string;
    quote?: string;
    rating?: number;
    approved?: boolean;
  };
  if (!customerName?.trim() || !quote?.trim()) {
    res.status(400).json({ error: 'Customer name and verified quote are required.' });
    return;
  }
  const t = {
    id: `test_${crypto.randomUUID().slice(0, 6)}`,
    customerName: customerName.trim(),
    city: (city || 'Bengaluru').trim(),
    productPurchased: (productPurchased || 'Handmade Crochet Creation').trim(),
    quote: quote.trim(),
    rating: Math.min(5, Math.max(1, Number(rating) || 5)),
    approved: approved !== false,
    createdAt: new Date().toISOString(),
  };
  db.testimonials.unshift(t);
  saveDb(db);
  res.status(201).json({ testimonial: t });
});

app.put('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const t = db.testimonials.find((x) => x.id === req.params.id);
  if (!t) {
    res.status(404).json({ error: 'Testimonial not found.' });
    return;
  }
  t.approved = Boolean(req.body?.approved);
  saveDb(db);
  res.json({ testimonial: t });
});

app.delete('/api/admin/testimonials/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.testimonials = db.testimonials.filter((x) => x.id !== req.params.id);
  saveDb(db);
  res.json({ ok: true });
});

app.put('/api/admin/reviews/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const r = db.reviews.find((x) => x.id === req.params.id);
  if (!r) {
    res.status(404).json({ error: 'Review not found.' });
    return;
  }
  r.approved = Boolean(req.body?.approved);
  saveDb(db);
  res.json({ review: r });
});

app.put('/api/admin/support/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const s = db.supportRequests.find((x) => x.id === req.params.id);
  if (!s) {
    res.status(404).json({ error: 'Support request not found.' });
    return;
  }
  if (req.body?.status) s.status = req.body.status;
  saveDb(db);
  res.json({ supportRequest: s });
});

app.post('/api/admin/notifications/read-all', requireAdmin, (_req, res) => {
  const db = getDb();
  db.notifications.forEach((n) => {
    n.read = true;
  });
  saveDb(db);
  res.json({ ok: true });
});

app.get('/api/admin/export/:type', requireAdmin, (req, res) => {
  const db = getDb();
  if (req.params.type === 'orders') {
    const header = 'OrderNumber,Date,CustomerName,Email,Phone,Method,Subtotal,Discount,Shipping,Total,PaymentStatus,OrderStatus\n';
    const rows = db.orders
      .map((o) =>
        [
          o.orderNumber,
          o.createdAt,
          `"${o.customerName.replace(/"/g, '""')}"`,
          o.customerEmail,
          o.customerPhone,
          o.fulfillmentMethod,
          o.subtotal,
          o.discountAmount,
          o.shippingFee,
          o.totalAmount,
          o.paymentStatus,
          o.status,
        ].join(',')
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="skein-scene-orders.csv"');
    res.send(header + rows);
    return;
  }

  if (req.params.type === 'customers') {
    const header = 'ID,Name,Email,Phone,Role,Joined\n';
    const rows = db.users
      .map((u) => [u.id, `"${u.name.replace(/"/g, '""')}"`, u.email, u.phone, u.role, u.createdAt].join(','))
      .join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="skein-scene-customers.csv"');
    res.send(header + rows);
    return;
  }

  res.status(400).json({ error: 'Unknown export type.' });
});

// ---------------- VITE / STATIC SPA SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SKEIN SCENE running at http://localhost:${PORT}`);
  });
}

startServer();
