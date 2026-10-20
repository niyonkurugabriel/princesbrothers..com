import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME } from "@/features/auth/config";
import { verifyActiveSession } from "@/features/auth/server";
import { DriverPortal } from "@/features/driver/components/portal";
import { getDriverProfile, getDriverStops } from "@/features/driver/server/data";

export default async function DriverPage() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const claims = token ? await verifyActiveSession(token) : null;
  if (!claims || claims.portal !== "driver") redirect("/driver/login");
  const [profile, stops] = await Promise.all([getDriverProfile(claims.sub), getDriverStops(claims.sub)]);
  return <main className="driver-page"><DriverPortal profile={profile} initialStops={stops} /></main>;
}