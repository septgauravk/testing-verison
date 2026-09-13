import { describe, expect, it } from "vitest";
import { getStoreUserFromRequest, issueStoreSession } from "./storeAuth";

describe("store session transport", () => {
  it("accepts the signed owner session from the cookie header", async () => {
    const token = issueStoreSession({ id: 0, name: "Store owner", email: "owner@horologe.com", role: "admin" });
    const user = await getStoreUserFromRequest({ headers: { cookie: `horologe_store_session=${token}` } } as any);
    expect(user).toMatchObject({ id: 0, role: "admin", email: "owner@horologe.com" });
  });

  it("rejects a tampered bearer session", async () => {
    const user = await getStoreUserFromRequest({ headers: { authorization: "Bearer 0.admin.invalid" } } as any);
    expect(user).toBeNull();
  });
});
