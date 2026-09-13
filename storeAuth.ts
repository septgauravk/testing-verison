import crypto from "node:crypto";
import type { Request, Response } from "express";
import { getStoreUserById } from "./db";

export const STORE_SESSION_COOKIE = "horologe_store_session";
export const DEMO_ADMIN_EMAIL = "owner@horologe.com";
export const DEMO_ADMIN_PASSWORD = "horologe-demo";

export type StoreSessionUser = { id: number; name: string; email: string; role: "customer" | "admin" };

const secret = () => process.env.JWT_SECRET || "horologe-local-development-secret";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), Buffer.from(derived, "hex"));
}

export function issueStoreSession(user: StoreSessionUser) {
  const payload = `${user.id}.${user.role}`;
  const signature = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

function parseSession(value?: string | null) {
  if (!value) return null;
  const [idText, role, signature] = value.split(".");
  if (!idText || !role || !signature || (role !== "customer" && role !== "admin")) return null;
  const payload = `${idText}.${role}`;
  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const id = Number(idText);
  return Number.isFinite(id) ? { id, role } : null;
}

export function setStoreSession(res: Response, user: StoreSessionUser) {
  res.cookie(STORE_SESSION_COOKIE, issueStoreSession(user), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 30, path: "/" });
}

export function clearStoreSession(res: Response) {
  res.clearCookie(STORE_SESSION_COOKIE, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}

export async function getStoreUserFromRequest(req: Request): Promise<StoreSessionUser | null> {
  const cookieHeader = req.headers.cookie || "";
  const cookieValue = cookieHeader.split(";").map(part => part.trim()).find(part => part.startsWith(`${STORE_SESSION_COOKIE}=`))?.slice(STORE_SESSION_COOKIE.length + 1);
  const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
  const parsed = parseSession(bearer || cookieValue);
  if (!parsed) return null;
  if (parsed.id === 0 && parsed.role === "admin") return { id: 0, name: "Store owner", email: process.env.OWNER_EMAIL || DEMO_ADMIN_EMAIL, role: "admin" };
  const user = await getStoreUserById(parsed.id);
  if (!user || user.role !== parsed.role) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
