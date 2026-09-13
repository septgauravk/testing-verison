import crypto from "node:crypto";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, router } from "./_core/trpc";
import { memoryDb, addStoreUser, deleteBrand, deleteProduct, deleteWishlistById, findBrandById, findOrderById, findProductById, findRefundById, getStoreUserByEmail, getStoreUserById, listBrands, listOrders, listProducts, listRefunds, saveOrder, saveRefund, saveWishlist, upsertBrand, upsertProduct } from "./db";
import { clearStoreSession, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, hashPassword, issueStoreSession, setStoreSession } from "./storeAuth";

const email = z.string().trim().email().max(320);
export const wholeQuantity = z.number().int().min(1).max(1000);
const mediaUrl = z.string().trim().refine(value => value.startsWith("/storage/") || /^https?:\/\//i.test(value), "Enter a valid media URL");
export const imageList = z.array(mediaUrl).min(1).max(5);
const optionalUrl = z.preprocess(value => value === "" ? null : value, mediaUrl.nullable().optional()).optional();
const shippingAddress = z.object({
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(3).max(180),
  line2: z.string().trim().max(180).optional().default(""),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postalCode: z.string().regex(/^\d{6}$/, "Enter a valid six-digit postal code"),
  country: z.string().trim().min(1).max(80).default("India"),
  phone: z.string().regex(/^\+?[0-9]{10,15}$/, "Enter a valid phone number"),
});
const storeTaxRate = Math.min(1, Math.max(0, Number(process.env.STORE_TAX_RATE ?? "0.18")));
export const productInput = z.object({
  brandId: z.number().int().positive(),
  collection: z.enum(["men", "women"]),
  name: z.string().trim().min(1).max(150),
  shortDescription: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(500),
  images: imageList,
  videoUrl: optionalUrl,
  videoPoster: optionalUrl,
  price: z.number().min(0),
  discount: z.number().min(0).max(100),
  stock: z.number().int().min(1).max(1000),
});

const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.storeUser || ctx.storeUser.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  return next({ ctx });
});
const customerProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.storeUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email and password login required" });
  return next({ ctx });
});

const fallbackBrands = [
  { id: 1, title: "Aster & Meridian", description: "Independent Swiss-inspired timepieces built around quiet precision.", image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85" },
  { id: 2, title: "Nox Atelier", description: "Night-ready silhouettes with a graphic, architectural point of view.", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85" },
];
const fallbackProducts = [
  { id: 1, brandId: 1, collection: "men" as const, name: "The Meridian 39", shortDescription: "Brushed steel · automatic movement", description: "A quietly confident everyday watch with a balanced 39mm case, domed sapphire crystal, and a hand-finished automatic movement.", images: JSON.stringify(["https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=85"]), videoUrl: null, videoPoster: null, price: "42000.00", discount: "15.00", stock: 18 },
  { id: 2, brandId: 2, collection: "women" as const, name: "Nocturne Petite", shortDescription: "Gold-tone steel · 28mm case", description: "A refined, scaled-down silhouette with a warm gold-tone finish and a midnight dial that catches the light without chasing it.", images: JSON.stringify(["https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=85", "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=900&q=85"]), videoUrl: null, videoPoster: null, price: "36500.00", discount: "10.00", stock: 7 },
  { id: 3, brandId: 1, collection: "men" as const, name: "Field Note 41", shortDescription: "Olive canvas · luminous numerals", description: "A versatile field watch designed for long weekends and late trains, with an olive canvas strap and luminous numerals.", images: JSON.stringify(["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=85"]), videoUrl: null, videoPoster: null, price: "28000.00", discount: "0.00", stock: 24 },
  { id: 4, brandId: 2, collection: "women" as const, name: "Linea Mini", shortDescription: "Silver mesh · sunray dial", description: "A slim, polished daily watch with a silver mesh bracelet and a clear sunray dial.", images: JSON.stringify(["https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=900&q=85"]), videoUrl: null, videoPoster: null, price: "24500.00", discount: "20.00", stock: 12 },
];

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  store: router({
    session: publicProcedure.query(({ ctx }) => ctx.storeUser),
    auth: router({
      login: publicProcedure.input(z.object({ email, password: z.string().min(1).max(200) })).mutation(async ({ input, ctx }) => {
        const normalized = input.email.toLowerCase();
        if (normalized === (process.env.OWNER_EMAIL || DEMO_ADMIN_EMAIL).toLowerCase() && input.password === (process.env.OWNER_PASSWORD || DEMO_ADMIN_PASSWORD)) {
          const user = { id: 0, name: "Store owner", email: normalized, role: "admin" as const };
          setStoreSession(ctx.res, user);
          return { ...user, sessionToken: issueStoreSession(user) };
        }

        const found = await getStoreUserByEmail(normalized);
        if (!found || !verifyStorePassword(input.password, found.passwordHash)) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect email or password" });
        }

        const user = { id: found.id, name: found.name, email: found.email, role: found.role === "admin" ? "admin" as const : "customer" as const };
        setStoreSession(ctx.res, user);
        return { ...user, sessionToken: issueStoreSession(user) };
      }),
      signup: publicProcedure.input(z.object({ email, password: z.string().min(8).max(200) })).mutation(async ({ input, ctx }) => {
        const normalized = input.email.toLowerCase();
        if (await getStoreUserByEmail(normalized)) {
          throw new TRPCError({ code: "CONFLICT", message: "An account already exists for this email" });
        }

        const displayName = normalized.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()).slice(0, 120) || "Customer";
        const user = {
          id: memoryDb.storeUsers.length + 1,
          name: displayName,
          email: normalized,
          passwordHash: hashPassword(input.password),
          role: "customer" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addStoreUser(user);
        setStoreSession(ctx.res, { id: user.id, name: displayName, email: normalized, role: "customer" as const });
        return { id: user.id, name: displayName, email: normalized, role: "customer" as const, sessionToken: issueStoreSession({ id: user.id, name: displayName, email: normalized, role: "customer" as const }) };
      }),
      logout: publicProcedure.mutation(({ ctx }) => {
        clearStoreSession(ctx.res);
        return { success: true } as const;
      }),
    }),
    wishlist: router({
      list: customerProcedure.query(async ({ ctx }) => memoryDb.wishlists.filter(item => item.customerUserId === ctx.storeUser!.id).map(item => ({ productId: item.productId }))),
      toggle: customerProcedure.input(z.object({ productId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const list = memoryDb.wishlists.filter(item => item.customerUserId === ctx.storeUser!.id && item.productId === input.productId);
        if (list.length > 0) {
          const id = list[0].id;
          deleteWishlistById(id);
          return { saved: false };
        }

        const item = { id: memoryDb.wishlists.length + 1, customerUserId: ctx.storeUser!.id, productId: input.productId, createdAt: new Date() };
        saveWishlist(item);
        return { saved: true };
      }),
    }),
    catalog: router({
      brands: publicProcedure.query(async () => listBrands().then(rows => rows.length ? rows : fallbackBrands)),
      products: publicProcedure.input(z.object({ collection: z.enum(["all", "men", "women"]).default("all") }).optional()).query(async ({ input }) => {
        const rows = await listProducts();
        const source = rows.length ? rows : fallbackProducts;
        return input?.collection && input.collection !== "all" ? source.filter((item: any) => item.collection === input.collection) : source;
      }),
      product: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
        const rows = await listProducts();
        return rows.find((item: any) => item.id === input.id) || fallbackProducts.find((item: any) => item.id === input.id) || null;
      }),
    }),
    checkout: router({
      config: publicProcedure.query(() => ({ taxRate: storeTaxRate })),
      createPaymentOrder: customerProcedure.input(z.object({ orderId: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
        const order = await findOrderById(input.orderId);
        if (!order || order.customerEmail !== ctx.storeUser!.email) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keyId || !keySecret) {
          return { provider: "razorpay" as const, amount: Number(order.total), currency: "INR", keyId: "rzp_test_demo", configured: false, orderId: null };
        }

        const response = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(Number(order.total) * 100),
            currency: "INR",
            receipt: order.orderNumber,
            notes: { store: "horologe", internalOrderId: String(order.id) },
          }),
        });

        if (!response.ok) throw new TRPCError({ code: "BAD_GATEWAY", message: "Razorpay order creation failed" });
        const razorpayOrder = await response.json() as { id: string };
        order.razorpayOrderId = razorpayOrder.id;
        await saveOrder(order);
        return { provider: "razorpay" as const, amount: Number(order.total), currency: "INR", keyId, configured: true, orderId: razorpayOrder.id };
      }),
      createOrder: customerProcedure.input(z.object({ email, items: z.array(z.object({ productId: z.number().int().positive(), quantity: wholeQuantity })).min(1), shippingAddress })).mutation(async ({ input, ctx }) => {
        if (input.email.toLowerCase() !== ctx.storeUser!.email.toLowerCase()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Checkout email must match the signed-in customer" });
        }

        let verifiedSubtotal = 0;
        let originalSubtotal = 0;
        const verifiedItems: Array<{ productId: number; quantity: number; price: number }> = [];

        for (const item of input.items) {
          const product = await findProductById(item.productId);
          if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
          if (product.stock < item.quantity) throw new TRPCError({ code: "CONFLICT", message: `${product.name} only has ${product.stock} remaining` });
          const originalPrice = Number(product.price);
          const price = originalPrice * (1 - Number(product.discount) / 100);
          verifiedSubtotal += price * item.quantity;
          originalSubtotal += originalPrice * item.quantity;
          verifiedItems.push({ productId: item.productId, quantity: item.quantity, price });
        }

        const discountAmount = originalSubtotal - verifiedSubtotal;
        const taxAmount = verifiedSubtotal * storeTaxRate;
        const total = verifiedSubtotal + taxAmount;
        const orderNumber = `HRG-${Date.now().toString(36).toUpperCase()}`;
        const id = memoryDb.orders.length + 1;
        const order = {
          id,
          orderNumber,
          customerUserId: ctx.storeUser!.id || null,
          customerEmail: input.email.toLowerCase(),
          items: JSON.stringify(verifiedItems),
          subtotal: originalSubtotal.toFixed(2),
          discount: discountAmount.toFixed(2),
          tax: taxAmount.toFixed(2),
          shippingAddress: JSON.stringify(input.shippingAddress),
          total: total.toFixed(2),
          status: "pending" as const,
          paymentId: null,
          razorpayOrderId: null,
          webhookVerifiedAt: null,
          trackingNumber: null,
          trackingUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await saveOrder(order);
        return { id, orderNumber, subtotal: verifiedSubtotal, tax: taxAmount, total };
      }),
      confirmPayment: customerProcedure.input(z.object({ orderId: z.number().int().positive(), paymentId: z.string().min(3).max(120), razorpayOrderId: z.string().optional(), razorpaySignature: z.string().optional() })).mutation(async ({ input, ctx }) => {
        const order = await findOrderById(input.orderId);
        if (!order || order.customerEmail !== ctx.storeUser!.email) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        if (order.status === "paid") return { success: true };

        const items = JSON.parse(order.items) as Array<{ productId: number; quantity: number }>;
        if (process.env.RAZORPAY_KEY_SECRET) {
          if (!input.razorpayOrderId || !input.razorpaySignature) throw new TRPCError({ code: "BAD_REQUEST", message: "Verified Razorpay payment details are required" });
          const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${input.razorpayOrderId}|${input.paymentId}`).digest("hex");
          if (expected !== input.razorpaySignature) throw new TRPCError({ code: "UNAUTHORIZED", message: "Razorpay signature verification failed" });
        }

        for (const item of items) {
          const product = await findProductById(item.productId);
          if (!product || product.stock < item.quantity) throw new TRPCError({ code: "CONFLICT", message: `${product?.name || "A product"} no longer has enough stock` });
          product.stock = Math.max(0, product.stock - item.quantity);
          await upsertProduct(product);
        }

        order.status = "paid";
        order.paymentId = input.paymentId;
        order.razorpayOrderId = input.razorpayOrderId || order.razorpayOrderId;
        order.updatedAt = new Date();
        await saveOrder(order);
        return { success: true };
      }),
      myOrders: customerProcedure.query(async ({ ctx }) => (await listOrders()).filter((order: any) => order.customerEmail === ctx.storeUser!.email)),
      requestRefund: customerProcedure.input(z.object({ orderId: z.number().int().positive(), amount: z.number().positive(), reason: z.string().trim().min(5).max(500) })).mutation(async ({ input, ctx }) => {
        const order = await findOrderById(input.orderId);
        if (!order || order.customerEmail !== ctx.storeUser!.email || !["paid", "packed", "shipped", "delivered"].includes(order.status)) {
          throw new TRPCError({ code: "NOT_FOUND", message: "This order is not eligible for a refund request" });
        }
        if (input.amount > Number(order.total)) throw new TRPCError({ code: "BAD_REQUEST", message: "Refund cannot exceed the order total" });

        const refund = {
          id: memoryDb.refunds.length + 1,
          orderId: input.orderId,
          amount: input.amount.toFixed(2),
          reason: input.reason,
          status: "requested" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await saveRefund(refund);
        return { success: true };
      }),
    }),
    admin: router({
      dashboard: adminProcedure.query(async () => {
        const [productRows, orderRows, refundRows] = await Promise.all([listProducts(), listOrders(), listRefunds()]);
        return {
          products: productRows.length,
          orders: orderRows.length,
          refunds: refundRows.length,
          revenue: orderRows.filter((order: any) => order.status !== "cancelled").reduce((sum: number, order: any) => sum + Number(order.total), 0),
        };
      }),
      brands: adminProcedure.query(() => listBrands()),
      products: adminProcedure.query(() => listProducts()),
      orders: adminProcedure.query(() => listOrders()),
      refunds: adminProcedure.query(() => listRefunds()),
      media: adminProcedure.input(z.object({ productId: z.number().int().positive() })).query(async ({ input }) => memoryDb.productMedia.filter(item => item.productId === input.productId).sort((a, b) => a.sortOrder - b.sortOrder)),
      createBrand: adminProcedure.input(z.object({ title: z.string().trim().min(1).max(150), description: z.string().trim().min(1).max(500), image: mediaUrl })).mutation(async ({ input }) => {
        const brand = { id: memoryDb.brands.length + 1, title: input.title, description: input.description, image: input.image, createdAt: new Date(), updatedAt: new Date() };
        await upsertBrand(brand);
        return { success: true };
      }),
      updateBrand: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1).max(150), description: z.string().trim().min(1).max(500), image: mediaUrl })).mutation(async ({ input }) => {
        const brand = await findBrandById(input.id);
        if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Brand not found" });
        Object.assign(brand, { title: input.title, description: input.description, image: input.image, updatedAt: new Date() });
        await upsertBrand(brand);
        return { success: true };
      }),
      deleteBrand: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        if (memoryDb.products.some(product => product.brandId === input.id)) throw new TRPCError({ code: "CONFLICT", message: "Move or delete linked products before deleting this brand" });
        await deleteBrand(input.id);
        return { success: true };
      }),
      createProduct: adminProcedure.input(productInput).mutation(async ({ input }) => {
        const product = {
          id: memoryDb.products.length + 1,
          brandId: input.brandId,
          collection: input.collection,
          name: input.name,
          shortDescription: input.shortDescription,
          description: input.description,
          images: JSON.stringify(input.images),
          videoUrl: input.videoUrl ?? null,
          videoPoster: input.videoPoster ?? null,
          price: input.price.toFixed(2),
          discount: input.discount.toFixed(2),
          stock: input.stock,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await upsertProduct(product);
        return { success: true };
      }),
      updateProduct: adminProcedure.input(productInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        const product = await findProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        Object.assign(product, {
          brandId: input.brandId,
          collection: input.collection,
          name: input.name,
          shortDescription: input.shortDescription,
          description: input.description,
          images: JSON.stringify(input.images),
          videoUrl: input.videoUrl ?? null,
          videoPoster: input.videoPoster ?? null,
          price: input.price.toFixed(2),
          discount: input.discount.toFixed(2),
          stock: input.stock,
          updatedAt: new Date(),
        });
        await upsertProduct(product);
        return { success: true };
      }),
      deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
        await deleteProduct(input.id);
        memoryDb.productMedia = memoryDb.productMedia.filter(item => item.productId !== input.id);
        return { success: true };
      }),
      setStock: adminProcedure.input(z.object({ id: z.number().int().positive(), stock: z.number().int().min(1).max(1000) })).mutation(async ({ input }) => {
        const product = await findProductById(input.id);
        if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
        product.stock = input.stock;
        product.updatedAt = new Date();
        await upsertProduct(product);
        return { success: true };
      }),
      updateOrder: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"]), trackingNumber: z.string().trim().max(180).optional(), trackingUrl: optionalUrl })).mutation(async ({ input }) => {
        const order = await findOrderById(input.id);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        order.status = input.status;
        order.trackingNumber = input.trackingNumber ?? order.trackingNumber;
        order.trackingUrl = input.trackingUrl ?? order.trackingUrl;
        order.updatedAt = new Date();
        await saveOrder(order);
        return { success: true };
      }),
      updateRefund: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(["requested", "approved", "processed", "rejected"]) })).mutation(async ({ input }) => {
        const refund = await findRefundById(input.id);
        if (!refund) throw new TRPCError({ code: "NOT_FOUND", message: "Refund request not found" });
        refund.status = input.status;
        refund.updatedAt = new Date();
        await saveRefund(refund);
        return { success: true };
      }),
    }),
  }),
});

function verifyStorePassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return key.length === derived.length && crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
}

export type AppRouter = typeof appRouter;
