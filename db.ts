import type { Brand, InsertUser, Order, Product, Refund, StoreUser, User, Wishlist } from "../drizzle/schema";

const defaultBrands: Brand[] = [
  {
    id: 1,
    title: "Aster & Meridian",
    description: "Independent Swiss-inspired timepieces built around quiet precision.",
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: "Nox Atelier",
    description: "Night-ready silhouettes with a graphic, architectural point of view.",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const defaultProducts: Product[] = [
  {
    id: 1,
    brandId: 1,
    collection: "men",
    name: "The Meridian 39",
    shortDescription: "Brushed steel · automatic movement",
    description: "A quietly confident everyday watch with a balanced 39mm case, domed sapphire crystal, and a hand-finished automatic movement.",
    images: JSON.stringify(["https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"]),
    videoUrl: null,
    videoPoster: null,
    price: "42000.00",
    discount: "15.00",
    stock: 18,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    brandId: 2,
    collection: "women",
    name: "Nocturne Petite",
    shortDescription: "Gold-tone steel · 28mm case",
    description: "A refined, scaled-down silhouette with a warm gold-tone finish and a midnight dial that catches the light without chasing it.",
    images: JSON.stringify(["https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=900&q=85"]),
    videoUrl: null,
    videoPoster: null,
    price: "36500.00",
    discount: "10.00",
    stock: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    brandId: 1,
    collection: "men",
    name: "Field Note 41",
    shortDescription: "Olive canvas · luminous numerals",
    description: "A versatile field watch designed for long weekends and late trains, with an olive canvas strap and luminous numerals.",
    images: JSON.stringify(["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=85"]),
    videoUrl: null,
    videoPoster: null,
    price: "28000.00",
    discount: "0.00",
    stock: 24,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    brandId: 2,
    collection: "women",
    name: "Linea Mini",
    shortDescription: "Silver mesh · sunray dial",
    description: "A slim, polished daily watch with a silver mesh bracelet and a clear sunray dial.",
    images: JSON.stringify(["https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=900&q=85"]),
    videoUrl: null,
    videoPoster: null,
    price: "24500.00",
    discount: "20.00",
    stock: 12,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export type MemoryDb = {
  users: User[];
  storeUsers: StoreUser[];
  brands: Brand[];
  products: Product[];
  orders: Order[];
  refunds: Refund[];
  productMedia: Array<{ id: number; productId: number; mediaType: "image" | "video"; url: string; poster: string | null; sortOrder: number; createdAt: Date }>;
  wishlists: Wishlist[];
};

export const memoryDb: MemoryDb = {
  users: [],
  storeUsers: [],
  brands: [...defaultBrands],
  products: [...defaultProducts],
  orders: [],
  refunds: [],
  productMedia: [],
  wishlists: [],
};

let seedInProgress: Promise<void> | null = null;

export async function getDb() {
  return memoryDb;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const existing = memoryDb.users.find(item => item.openId === user.openId);
  if (existing) {
    Object.assign(existing, {
      name: user.name ?? existing.name,
      email: user.email ?? existing.email,
      loginMethod: user.loginMethod ?? existing.loginMethod,
      role: user.role ?? existing.role,
      lastSignedIn: user.lastSignedIn ?? new Date(),
      updatedAt: new Date(),
    });
    return;
  }

  memoryDb.users.push({
    id: memoryDb.users.length + 1,
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  return memoryDb.users.find(user => user.openId === openId);
}

export async function getStoreUserByEmail(email: string) {
  return memoryDb.storeUsers.find(user => user.email.toLowerCase() === email.toLowerCase());
}

export async function getStoreUserById(id: number) {
  return memoryDb.storeUsers.find(user => user.id === id);
}

export async function ensureSeedCatalog() {
  if (seedInProgress) return seedInProgress;
  seedInProgress = Promise.resolve();
  return seedInProgress;
}

export async function listBrands() {
  await ensureSeedCatalog();
  return [...memoryDb.brands].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function listProducts() {
  await ensureSeedCatalog();
  return [...memoryDb.products].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function listOrders() {
  return [...memoryDb.orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function listRefunds() {
  return [...memoryDb.refunds].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function addStoreUser(user: StoreUser) {
  memoryDb.storeUsers.push(user);
}

export async function saveOrder(order: Order) {
  const index = memoryDb.orders.findIndex(item => item.id === order.id);
  if (index >= 0) {
    memoryDb.orders[index] = order;
  } else {
    memoryDb.orders.push(order);
  }
}

export async function saveRefund(refund: Refund) {
  const index = memoryDb.refunds.findIndex(item => item.id === refund.id);
  if (index >= 0) {
    memoryDb.refunds[index] = refund;
  } else {
    memoryDb.refunds.push(refund);
  }
}

export async function saveWishlist(wishlist: Wishlist) {
  const index = memoryDb.wishlists.findIndex(item => item.id === wishlist.id);
  if (index >= 0) {
    memoryDb.wishlists[index] = wishlist;
  } else {
    memoryDb.wishlists.push(wishlist);
  }
}

export async function clearWishlistForCustomer(customerUserId: number) {
  memoryDb.wishlists = memoryDb.wishlists.filter(item => item.customerUserId !== customerUserId);
}

export async function upsertProduct(product: Product) {
  const index = memoryDb.products.findIndex(item => item.id === product.id);
  if (index >= 0) {
    memoryDb.products[index] = product;
  } else {
    memoryDb.products.push(product);
  }
}

export async function upsertBrand(brand: Brand) {
  const index = memoryDb.brands.findIndex(item => item.id === brand.id);
  if (index >= 0) {
    memoryDb.brands[index] = brand;
  } else {
    memoryDb.brands.push(brand);
  }
}

export async function deleteProduct(id: number) {
  memoryDb.products = memoryDb.products.filter(product => product.id !== id);
}

export async function deleteBrand(id: number) {
  memoryDb.brands = memoryDb.brands.filter(brand => brand.id !== id);
}

export async function deleteWishlistById(id: number) {
  memoryDb.wishlists = memoryDb.wishlists.filter(item => item.id !== id);
}

export async function findProductById(id: number) {
  return memoryDb.products.find(product => product.id === id) ?? null;
}

export async function findBrandById(id: number) {
  return memoryDb.brands.find(brand => brand.id === id) ?? null;
}

export async function findOrderById(id: number) {
  return memoryDb.orders.find(order => order.id === id) ?? null;
}

export async function findRefundById(id: number) {
  return memoryDb.refunds.find(refund => refund.id === id) ?? null;
}

