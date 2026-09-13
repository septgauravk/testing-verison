export type UserRole = "user" | "admin";
export type StoreRole = "customer" | "admin";
export type ProductCollection = "men" | "women";
export type OrderStatus = "pending" | "paid" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded";
export type RefundStatus = "requested" | "approved" | "processed" | "rejected";
export type MediaType = "image" | "video";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

export type InsertUser = Partial<User> & { openId: string };

export type StoreUser = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: StoreRole;
  createdAt: Date;
  updatedAt: Date;
};

export type Brand = {
  id: number;
  title: string;
  description: string;
  image: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Product = {
  id: number;
  brandId: number;
  collection: ProductCollection;
  name: string;
  shortDescription: string;
  description: string;
  images: string;
  videoUrl: string | null;
  videoPoster: string | null;
  price: string;
  discount: string;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Order = {
  id: number;
  orderNumber: string;
  customerUserId: number | null;
  customerEmail: string;
  items: string;
  subtotal: string;
  discount: string;
  tax: string;
  shippingAddress: string | null;
  total: string;
  status: OrderStatus;
  paymentId: string | null;
  razorpayOrderId: string | null;
  webhookVerifiedAt: Date | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Refund = {
  id: number;
  orderId: number;
  amount: string;
  reason: string;
  status: RefundStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductMedia = {
  id: number;
  productId: number;
  mediaType: MediaType;
  url: string;
  poster: string | null;
  sortOrder: number;
  createdAt: Date;
};

export type Wishlist = {
  id: number;
  customerUserId: number;
  productId: number;
  createdAt: Date;
};

export const users: User[] = [];
export const storeUsers: StoreUser[] = [];
export const brands: Brand[] = [];
export const products: Product[] = [];
export const orders: Order[] = [];
export const refunds: Refund[] = [];
export const productMedia: ProductMedia[] = [];
export const wishlists: Wishlist[] = [];
