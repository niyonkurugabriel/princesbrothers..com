import { AUTH_COOKIE_NAME } from "./config";

export const authCookieOptions = {
  httpOnly: true,
  secure: true,
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