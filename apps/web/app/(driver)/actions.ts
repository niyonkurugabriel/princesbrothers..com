"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@princess-brothers/db";
import { authCookie } from "../../lib/auth/cookies";
import { defaultTtlFor } from "../../lib/auth/config";
import { getRedisSessionStore } from "../../lib/auth/redis";
import { createSession } from "../../lib/auth/session";

export type DriverLoginState = { error?: string; success?: boolean };

export async function loginDriver(
  _previousState: DriverLoginState,
  formData: FormData,
): Promise<DriverLoginState> {
  const phone = String(formData.get("phone") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!phone || !/^\d{4,6}$/.test(pin)) return { error: "Enter your phone number and 4-6 digit PIN." };

  try {
    const user = await db.user.findFirst({
      where: { phone, status: "ACTIVE", driver: { isNot: null } },
      include: { driver: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } }
    });
    if (!user?.driver?.pinHash || !(await bcrypt.compare(pin, user.driver.pinHash))) {
      return { error: "That phone number or PIN is not recognised." };
    }

    const roles = user.roles.map(({ role }) => role.name);
    const permissions = user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key));
    const ttlSeconds = defaultTtlFor("driver", "driver-pin");
    const session = await createSession(getRedisSessionStore(), {
      id: user.id,
      roles,
      permissions,
      portal: "driver",
      authMethod: "driver-pin",
      ttlSeconds
    });
    const cookie = authCookie(session.token, ttlSeconds);
    cookies().set(cookie.name, cookie.value, cookie);
    return { success: true };
  } catch {
    return { error: "Driver sign-in is temporarily unavailable. Try again shortly." };
  }
}