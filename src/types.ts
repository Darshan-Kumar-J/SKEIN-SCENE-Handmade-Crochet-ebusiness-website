export type UserRole = 'customer' | 'admin';

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  addresses: SavedAddress[];
  wishlist: string[];
  createdAt: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  collectionGroup: string;
  description: string;
  image: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  category: string;
  collectionGroup: string;
  description: string;
  price: number;
  discountPercent: number;
  stock: number;
  images: string[];
  materials: string;
  dimensions: string;
  colors: string[];
  careInstructions: string;
  prepTimeDays: string;
  deliveryInfo: string;
  featured: boolean;
  bestSeller: boolean;
  isCustomFriendly: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  selectedColor: string;
  giftNote?: string;
}

export type OrderStatus =
  | 'Pending Payment'
  | 'Confirmed'
  | 'Crafting'
  | 'Quality Check'
  | 'Ready for Pickup'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled'
  | 'Refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export type FulfillmentMethod = 'standard' | 'pickup';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  finalUnitPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fulfillmentMethod: FulfillmentMethod;
  shippingAddress?: SavedAddress;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  shippingFee: number;
  taxAmount: number;
  totalAmount: number;
  giftWrap: boolean;
  giftMessage?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  courierName?: string;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomOrderStatus =
  | 'Request Received'
  | 'Under Review'
  | 'Quotation Sent'
  | 'Awaiting Payment'
  | 'Confirmed'
  | 'In Production'
  | 'Quality Check'
  | 'Ready for Dispatch'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface CustomRequest {
  id: string;
  bookingCode: string;
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  category: string;
  productType: string;
  preferredColors: string[];
  preferredSize: string;
  quantity: number;
  budgetRange: string;
  requiredDate: string;
  giftWrapping: boolean;
  personalizedMessage: string;
  designInstructions: string;
  referenceImageUrl?: string;
  status: CustomOrderStatus;
  quotedTotal?: number;
  advanceAmount?: number;
  advancePaid: boolean;
  advanceRazorpayOrderId?: string;
  advanceRazorpayPaymentId?: string;
  adminNotes?: string;
  customerFeedback?: string;
  timeline: {
    status: CustomOrderStatus;
    note: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export type AppointmentType =
  | 'Custom Gift Consultation'
  | 'Bouquet Design Consultation'
  | 'Bulk Order Discussion'
  | 'Product Inquiry';

export type AppointmentStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Rescheduled' | 'Cancelled';

export interface Appointment {
  id: string;
  bookingCode: string;
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  appointmentType: AppointmentType;
  date: string;
  timeSlot: string;
  notes: string;
  status: AppointmentStatus;
  adminNote?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minOrderAmount: number;
  active: boolean;
  description: string;
}

export interface Testimonial {
  id: string;
  customerName: string;
  city: string;
  productPurchased: string;
  quote: string;
  rating: number;
  approved: boolean;
  createdAt: string;
}

export interface SupportRequest {
  id: string;
  userId?: string;
  customerName: string;
  email: string;
  phone: string;
  type: 'Cancellation' | 'Support' | 'Contact Inquiry';
  referenceCode?: string;
  subject: string;
  message: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  title: string;
  detail: string;
  type: 'order' | 'custom' | 'appointment' | 'support';
  referenceId: string;
  read: boolean;
  createdAt: string;
}

export interface StoreSettings {
  announcementText: string;
  announcementEnabled: boolean;
  heroHeadline: string;
  heroSubheading: string;
  freeShippingThreshold: number;
  standardShippingFee: number;
  taxPercent: number;
  weekdayHours: string;
  sundayHours: string;
  whatsappNumber: string;
  instagramHandle: string;
  address: string;
  appointmentDurationMins: number;
  appointmentSlots: string[];
  blockedDates: string[];
  maxBookingsPerSlot: number;
}

export interface PaymentRecord {
  id: string;
  referenceType: 'order' | 'custom_advance';
  referenceCode: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  method: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  status: PaymentStatus;
  createdAt: string;
}
