import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { hashPassword, verifyPassword } from "./storeAuth";
import type { TrpcContext } from "./_core/context";

function context(): TrpcContext {
  return {
    user: null,
    storeUser: null,
    req: { protocol: "https", headers: {}, cookies: {} } as TrpcContext["req"],
    res: { cookie: () => undefined, clearCookie: () => undefined } as TrpcContext["res"],
  };
}

describe("store email-password auth", () => {
  it("hashes and verifies passwords without accepting the wrong password", () => {
    const stored = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword("correct-horse-battery-staple", stored)).toBe(true);
    expect(verifyPassword("not-the-password", stored)).toBe(false);
  });

  it("keeps the public catalog available with the curated fallback", async () => {
    const result = await appRouter.createCaller(context()).store.catalog.products({ collection: "all" });
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.every(product => product.stock >= 1 && product.stock <= 1000)).toBe(true);
    expect(result.every(product => product.collection === "men" || product.collection === "women")).toBe(true);
  });
});


describe("wishlist access", () => {
  it("requires a customer session before reading saved watches", async () => {
    await expect(appRouter.createCaller(context()).store.wishlist.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns a list for an authenticated customer", async () => {
    const customerContext = { ...context(), storeUser: { id: 1000001, name: "Wishlist Customer", email: "wishlist@example.com", role: "customer" as const } };
    const result = await appRouter.createCaller(customerContext).store.wishlist.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
