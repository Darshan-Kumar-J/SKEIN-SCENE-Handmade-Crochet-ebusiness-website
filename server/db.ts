import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AdminNotification,
  Appointment,
  Coupon,
  CustomRequest,
  Order,
  PaymentRecord,
  Product,
  ProductCategory,
  ProductReview,
  StoreSettings,
  SupportRequest,
  Testimonial,
  UserProfile,
} from '../src/types.ts';

export interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  categories: ProductCategory[];
  products: Product[];
  reviews: ProductReview[];
  orders: Order[];
  customRequests: CustomRequest[];
  appointments: Appointment[];
  coupons: Coupon[];
  testimonials: Testimonial[];
  subscribers: NewsletterSubscriber[];
  supportRequests: SupportRequest[];
  payments: PaymentRecord[];
  notifications: AdminNotification[];
  settings: StoreSettings;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'skein_scene_db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

const IMAGES = {
  heroBouquet: '/src/assets/images/hero_crochet_bouquet_1794827807834.jpg',
  tulipsRoses: '/src/assets/images/crochet_tulips_roses_1794827807798.jpg',
  keychains: '/src/assets/images/crochet_animal_keychains_1794827808098.jpg',
  teddy: '/src/assets/images/crochet_teddy_plushie_1794827807149.jpg',
  handbag: '/src/assets/images/crochet_daisy_handbag_1794827807999.jpg',
  babyOutfit: '/src/assets/images/crochet_baby_outfit_1794827808470.jpg',
  bookmarks: '/src/assets/images/crochet_floral_bookmarks_1794827809663.jpg',
  rakhi: '/src/assets/images/crochet_festive_rakhi_1794827809671.jpg',
  giftBox: '/src/assets/images/crochet_gift_packaging_1794827810801.jpg',
  crafting: '/src/assets/images/crochet_crafting_yarn_1794827810996.jpg',
};

function buildInitialSeed(): DatabaseSchema {
  const now = new Date().toISOString();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'SkeinAdmin@2026';
  const adminCreds = hashPassword(adminPassword);
  const demoCustomerCreds = hashPassword('Customer@2026');

  const users: StoredUser[] = [
    {
      id: 'usr_admin_1',
      name: 'Skein Scene Studio Admin',
      email: 'admin@skeinscene.in',
      phone: '+91 81973 82703',
      role: 'admin',
      addresses: [
        {
          id: 'addr_studio',
          label: 'Studio Pickup',
          recipientName: 'Skein Scene Studio',
          phone: '+91 81973 82703',
          line1: 'Muneshwara Layout, Laggere',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560058',
          isDefault: true,
        },
      ],
      wishlist: [],
      createdAt: now,
      passwordHash: adminCreds.hash,
      passwordSalt: adminCreds.salt,
    },
    {
      id: 'usr_cust_1',
      name: 'Ananya Rao',
      email: 'ananya.rao@example.in',
      phone: '+91 98450 11223',
      role: 'customer',
      addresses: [
        {
          id: 'addr_ananya_1',
          label: 'Home',
          recipientName: 'Ananya Rao',
          phone: '+91 98450 11223',
          line1: '14th Cross, Malleswaram',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560003',
          isDefault: true,
        },
      ],
      wishlist: ['prod_pastel_bouquet', 'prod_animal_keychain'],
      createdAt: now,
      passwordHash: demoCustomerCreds.hash,
      passwordSalt: demoCustomerCreds.salt,
    },
  ];

  const categories: ProductCategory[] = [
    {
      id: 'cat_flower_bouquets',
      name: 'Flower Bouquets',
      slug: 'flower-bouquets',
      collectionGroup: 'Crochet Flowers',
      description: 'Everlasting hand-crocheted floral bouquets wrapped in linen paper and satin ribbon.',
      image: IMAGES.heroBouquet,
    },
    {
      id: 'cat_crochet_flowers',
      name: 'Crochet Flowers',
      slug: 'crochet-flowers',
      collectionGroup: 'Crochet Flowers',
      description: 'Individual crochet tulips, roses, and botanical stems crafted with combed cotton yarn.',
      image: IMAGES.tulipsRoses,
    },
    {
      id: 'cat_keychains',
      name: 'Crochet Keychains',
      slug: 'crochet-keychains',
      collectionGroup: 'Cute Keychains',
      description: 'Pocket-sized crochet companions with brushed brass clasps for bags and keys.',
      image: IMAGES.keychains,
    },
    {
      id: 'cat_animal_charms',
      name: 'Animal Charms',
      slug: 'animal-charms',
      collectionGroup: 'Cute Keychains',
      description: 'Soft amigurumi bunnies, bears, and plush keepsakes lovingly stitched by hand.',
      image: IMAGES.teddy,
    },
    {
      id: 'cat_bags',
      name: 'Crochet Bags',
      slug: 'crochet-bags',
      collectionGroup: 'Handmade Accessories',
      description: 'Structured daisy granny-square totes and everyday carryalls lined with cotton.',
      image: IMAGES.handbag,
    },
    {
      id: 'cat_baby',
      name: 'Baby Clothing',
      slug: 'baby-clothing',
      collectionGroup: 'Baby Collection',
      description: 'Breathable organic cotton baby cardigans, booties, and heirloom bonnets.',
      image: IMAGES.babyOutfit,
    },
    {
      id: 'cat_accessories',
      name: 'Crochet Accessories',
      slug: 'crochet-accessories',
      collectionGroup: 'Crochet Wearables',
      description: 'Soft wearable accents, scrunchies, collar ties, and artisanal textile pieces.',
      image: IMAGES.crafting,
    },
    {
      id: 'cat_bookmarks',
      name: 'Bookmarks',
      slug: 'bookmarks',
      collectionGroup: 'Personalized Gifts',
      description: 'Pressed-style crochet daisy and eucalyptus leaf bookmarks with hand-twisted tassels.',
      image: IMAGES.bookmarks,
    },
    {
      id: 'cat_festive',
      name: 'Rakhis and Festive Gifts',
      slug: 'rakhis-festive-gifts',
      collectionGroup: 'Festive Collection',
      description: 'Reusable floral crochet rakhis, torans, and curated festive keepsake boxes.',
      image: IMAGES.rakhi,
    },
    {
      id: 'cat_custom',
      name: 'Custom Gifts',
      slug: 'custom-gifts',
      collectionGroup: 'Personalized Gifts',
      description: 'Tailor-made crochet gift hampers with personalized notes and ribbon wrapping.',
      image: IMAGES.giftBox,
    },
  ];

  const products: Product[] = [
    {
      id: 'prod_pastel_bouquet',
      slug: 'blush-tulip-ivory-rose-bouquet',
      name: 'Blush Tulip & Ivory Rose Bouquet',
      category: 'Flower Bouquets',
      collectionGroup: 'Crochet Flowers',
      description:
        'A timeless, zero-wilt bouquet featuring four dusty pink tulips, two layered ivory roses, and sage eucalyptus sprigs, wrapped in textured ivory linen and tied with a raw cotton ribbon.',
      price: 1899,
      discountPercent: 10,
      stock: 8,
      images: [IMAGES.heroBouquet, IMAGES.tulipsRoses, IMAGES.giftBox],
      materials: '100% combed mercerized cotton yarn, floral wire stems, linen wrap',
      dimensions: '38 cm height × 24 cm bouquet spread',
      colors: ['Dusty Pink & Ivory', 'Sage & Cream', 'Warm Peach & Oat'],
      careInstructions: 'Dust lightly with a dry soft brush or cool hairdryer air. Keep away from moisture.',
      prepTimeDays: '3–4 business days',
      deliveryInfo: 'Delivered across Bengaluru & pan-India in crush-proof gift boxes. Studio pickup available in Laggere.',
      featured: true,
      bestSeller: true,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_tulip_stem_trio',
      slug: 'pastel-tulip-rose-stem-set',
      name: 'Pastel Tulip & Rose Stem Set (Set of 5)',
      category: 'Crochet Flowers',
      collectionGroup: 'Crochet Flowers',
      description:
        'Hand-shaped crochet tulip buds paired with heirloom ivory and sage roses on bendable stems—perfect for bedside ceramic vases or thoughtful desk gifting.',
      price: 1099,
      discountPercent: 0,
      stock: 14,
      images: [IMAGES.tulipsRoses, IMAGES.heroBouquet],
      materials: 'Combed cotton yarn, bendable coated stem wire, polyfill bud core',
      dimensions: '32 cm stem length',
      colors: ['Dusty Rose & Sage', 'Ivory & Cocoa', 'Blush Mix'],
      careInstructions: 'Spot clean gently with a damp cloth; air dry flat.',
      prepTimeDays: '2–3 business days',
      deliveryInfo: 'Ships in 48 hours for ready stock; 3 days for custom colour pairings.',
      featured: true,
      bestSeller: true,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_animal_keychain',
      slug: 'woodland-amigurumi-keychain-trio',
      name: 'Woodland Amigurumi Keychain',
      category: 'Crochet Keychains',
      collectionGroup: 'Cute Keychains',
      description:
        'Choose your pocket companion—cream bunny, warm mocha bear, or sleepy sage frog—stitched tightly in soft cotton yarn and finished with an antique brushed-brass swivel clasp.',
      price: 399,
      discountPercent: 0,
      stock: 22,
      images: [IMAGES.keychains, IMAGES.teddy],
      materials: '4-ply soft cotton yarn, hypoallergenic fiberfill, safety eyes, antique brass clasp',
      dimensions: '9 cm × 6 cm (excluding clasp)',
      colors: ['Cream Bunny', 'Mocha Bear', 'Sage Frog'],
      careInstructions: 'Hand wash gently in cool water with mild soap and air dry.',
      prepTimeDays: '1–2 business days',
      deliveryInfo: 'Ready to ship from Laggere studio.',
      featured: true,
      bestSeller: true,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_oat_teddy',
      slug: 'oatmeal-heirloom-teddy-plushie',
      name: 'Oatmeal Heirloom Teddy Plushie',
      category: 'Animal Charms',
      collectionGroup: 'Cute Keychains',
      description:
        'A huggable, finely stitched amigurumi teddy bear in warm oat and cocoa cotton yarn, finished with a sage satin ribbon bow. Crafted as a keepsake nursery or anniversary gift.',
      price: 1499,
      discountPercent: 8,
      stock: 6,
      images: [IMAGES.teddy, IMAGES.giftBox],
      materials: 'Organic combed cotton yarn, virgin polyfill, satin ribbon',
      dimensions: '24 cm seated height',
      colors: ['Oat & Cocoa', 'Ivory & Dusty Pink'],
      careInstructions: 'Surface spot clean only; reshape gently while drying.',
      prepTimeDays: '4–5 business days',
      deliveryInfo: 'Packed in an ivory tissue gift box ready for gifting.',
      featured: true,
      bestSeller: true,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_daisy_tote',
      slug: 'sage-daisy-granny-square-tote',
      name: 'Sage & Ivory Daisy Tote Handbag',
      category: 'Crochet Bags',
      collectionGroup: 'Handmade Accessories',
      description:
        'Structured granny-square shoulder tote featuring raised ivory daisies framed in soft sage green, finished with reinforced braided straps for books, tablets, and daily essentials.',
      price: 2199,
      discountPercent: 12,
      stock: 4,
      images: [IMAGES.handbag, IMAGES.crafting],
      materials: 'Heavyweight 6-ply cotton cord, inner cotton canvas lining',
      dimensions: '34 cm × 32 cm × 9 cm (strap drop 26 cm)',
      colors: ['Sage & Ivory', 'Mocha & Cream', 'Dusty Pink & Ivory'],
      careInstructions: 'Cold hand wash inside out; dry flat away from direct heat.',
      prepTimeDays: '5–6 business days',
      deliveryInfo: 'Eligible for complimentary standard shipping across India.',
      featured: true,
      bestSeller: true,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_baby_set',
      slug: 'organic-sage-baby-cardigan-booties-set',
      name: 'Heirloom Baby Cardigan, Bonnet & Booties Set',
      category: 'Baby Clothing',
      collectionGroup: 'Baby Collection',
      description:
        'Ultra-soft, breathable organic cotton 3-piece newborn set with natural coconut-shell buttons, scalloped lace bonnet trim, and tie-up booties.',
      price: 2499,
      discountPercent: 0,
      stock: 5,
      images: [IMAGES.babyOutfit, IMAGES.giftBox],
      materials: '100% GOTS-grade organic baby cotton yarn, natural wooden buttons',
      dimensions: '0–3 months & 3–6 months options',
      colors: ['Ivory & Sage', 'Warm Cream & Dusty Rose'],
      careInstructions: 'Gentle hand wash in baby-safe detergent; lay flat on towel to dry.',
      prepTimeDays: '5–7 business days',
      deliveryInfo: 'Presented in muslin wrap with complimentary gift note.',
      featured: true,
      bestSeller: true,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_floral_bookmarks',
      slug: 'pressed-daisy-leaf-crochet-bookmarks',
      name: 'Daisy & Eucalyptus Crochet Bookmark',
      category: 'Bookmarks',
      collectionGroup: 'Personalized Gifts',
      description:
        'Flat-woven botanical bookmarks embellished with miniature daisies or trailing sage leaves and a hand-combed yarn tassel—made for slow mornings and thoughtful reader gifts.',
      price: 349,
      discountPercent: 0,
      stock: 30,
      images: [IMAGES.bookmarks, IMAGES.crafting],
      materials: 'Fine mercerized cotton thread, hand-twisted tassel',
      dimensions: '21 cm × 5.5 cm (plus 7 cm tassel)',
      colors: ['Dusty Pink Daisy', 'Ivory Daisy', 'Sage Leaf'],
      careInstructions: 'Press gently under a cool cloth if curled; keep dry.',
      prepTimeDays: '1–2 business days',
      deliveryInfo: 'Ideal add-on gift; ships within 48 hours.',
      featured: false,
      bestSeller: false,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_festive_rakhi',
      slug: 'artisan-floral-crochet-rakhi-box',
      name: 'Artisan Floral Crochet Rakhi & Keepsake Box',
      category: 'Rakhis and Festive Gifts',
      collectionGroup: 'Festive Collection',
      description:
        'Handcrafted floral crochet rakhi accented with miniature pearl beads, terracotta wooden spacers, and braided zari-cotton ties, accompanied by a keepsake ceramic-finish gift box.',
      price: 549,
      discountPercent: 10,
      stock: 18,
      images: [IMAGES.rakhi, IMAGES.giftBox],
      materials: 'Mercerized cotton thread, wooden beads, gold zari braid, keepsake box',
      dimensions: 'Motif 4.5 cm; total cord length 34 cm',
      colors: ['Terracotta & Ivory', 'Dusty Rose & Gold', 'Set of 2 Assorted'],
      careInstructions: 'Store in the keepsake box after festivities; reusable as a keepsake charm.',
      prepTimeDays: '2–3 business days',
      deliveryInfo: 'Pan-India express dispatch during festive weeks.',
      featured: true,
      bestSeller: false,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_rose_gift_box',
      slug: 'single-eternal-rose-luxury-gift-box',
      name: 'Single Eternal Rose Luxury Gift Box',
      category: 'Custom Gifts',
      collectionGroup: 'Personalized Gifts',
      description:
        'One sculpted dusty-pink crochet rose stem cradled in ivory tissue paper inside a ribbon-tied keepsake box, paired with your handwritten calligraphy message card.',
      price: 699,
      discountPercent: 0,
      stock: 15,
      images: [IMAGES.giftBox, IMAGES.tulipsRoses],
      materials: 'Combed cotton yarn, rigid linen gift box, satin sage ribbon, cotton card',
      dimensions: 'Box: 26 cm × 18 cm × 7 cm',
      colors: ['Dusty Pink Rose', 'Ivory Rose', 'Sage & Cream Rose'],
      careInstructions: 'Keep rose out of direct harsh sunlight to preserve pastel tones.',
      prepTimeDays: '2 business days',
      deliveryInfo: 'Ready-to-gift unboxing experience with custom note included.',
      featured: false,
      bestSeller: false,
      isCustomFriendly: true,
      createdAt: now,
    },
    {
      id: 'prod_collar_scarf_wearable',
      slug: 'botanical-daisy-collar-headband-set',
      name: 'Botanical Motif Collar & Scrunchie Set',
      category: 'Crochet Accessories',
      collectionGroup: 'Crochet Wearables',
      description:
        'Delicate scalloped floral crochet motif wearable collar and matching soft-cotton scrunchie—designed for effortless layered styling across seasons.',
      price: 899,
      discountPercent: 5,
      stock: 9,
      images: [IMAGES.crafting, IMAGES.handbag],
      materials: 'Breathable organic cotton yarn, soft elastic core',
      dimensions: 'Free size tie-up collar (42 cm neckline)',
      colors: ['Sage & Ivory', 'Dusty Pink & Cream'],
      careInstructions: 'Gentle hand wash in cool water; reshape and dry flat.',
      prepTimeDays: '3–4 business days',
      deliveryInfo: 'Ships within 4 days with care card.',
      featured: false,
      bestSeller: false,
      isCustomFriendly: true,
      createdAt: now,
    },
  ];

  const coupons: Coupon[] = [
    {
      id: 'cpn_1',
      code: 'LOVE10',
      type: 'percent',
      value: 10,
      minOrderAmount: 999,
      active: true,
      description: '10% off handmade orders of ₹999 or more',
    },
    {
      id: 'cpn_2',
      code: 'BENGALURU150',
      type: 'flat',
      value: 150,
      minOrderAmount: 1500,
      active: true,
      description: '₹150 off curated gift boxes above ₹1,500',
    },
  ];

  const settings: StoreSettings = {
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

  return {
    users,
    categories,
    products,
    reviews: [],
    orders: [],
    customRequests: [],
    appointments: [],
    coupons,
    testimonials: [],
    subscribers: [],
    supportRequests: [],
    payments: [],
    notifications: [],
    settings,
  };
}

let cachedDb: DatabaseSchema | null = null;

export function getDb(): DatabaseSchema {
  if (cachedDb) return cachedDb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  if (!fs.existsSync(DB_FILE)) {
    cachedDb = buildInitialSeed();
    saveDb(cachedDb);
    return cachedDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cachedDb = JSON.parse(raw) as DatabaseSchema;
    return cachedDb;
  } catch {
    cachedDb = buildInitialSeed();
    saveDb(cachedDb);
    return cachedDb;
  }
}

export function saveDb(db: DatabaseSchema): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  cachedDb = db;
  const tmpFile = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function sanitizeUser(user: StoredUser): UserProfile {
  const { passwordHash: _h, passwordSalt: _s, ...profile } = user;
  return profile;
}
