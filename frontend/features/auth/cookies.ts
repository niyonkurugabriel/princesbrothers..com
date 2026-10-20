import { AUTH_COOKIE_NAME } from "@/features/auth/config";

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/"
};

export const authCookie = (token: string, maxAge: number) => ({
  name: AUTH_COOKIE_NAME,
  value: token,
  ...authCookieOptions,
  maxAge
});

export const expiredAuthCookie = () => ({
  name: AUTH_COOKIE_NAME,
  value: "",
  ...authCookieOptions,
  maxAge: 0
});