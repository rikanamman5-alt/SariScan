import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forbidden, unauthorized } from "@/lib/errors";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "sariscan_token";
const TOKEN_TTL_DAYS = Number(process.env.AUTH_TOKEN_TTL_DAYS || "7");
const TOKEN_TTL_SECONDS = Math.max(60, TOKEN_TTL_DAYS * 24 * 60 * 60);
const BCRYPT_ROUNDS = 12;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  tokenVersion: number;
  storeName: string | null;
};

type AuthTokenPayload = {
  sub: string;
  email: string;
  role: Role;
  tv: number;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a random string of 32+ characters");
  }
  return new TextEncoder().encode(secret);
}

export function getCookieName() {
  return COOKIE_NAME;
}

export function getTokenTtlSeconds() {
  return TOKEN_TTL_SECONDS;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function signAuthToken(user: {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}) {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    tv: user.tokenVersion,
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getSecret());
}

function extractToken(request: NextRequest) {
  const header = request.headers.get("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }

  return request.cookies.get(COOKIE_NAME)?.value ?? null;
}

export async function getAuthUser(
  request: NextRequest,
): Promise<AuthUser | null> {
  const token = extractToken(request);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    });

    if (!payload.sub) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        storeName: true,
      },
    });

    if (!user || !user.isActive) return null;
    if (user.tokenVersion !== Number(payload.tv)) return null;

    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: NextRequest,
  allowedRoles?: Role[],
): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) throw unauthorized();

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw forbidden();
  }

  return user;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
  return response;
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
