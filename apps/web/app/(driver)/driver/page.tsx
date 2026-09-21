import { DriverPortal } from "../../../components/driver/portal";
import { getDriverStops } from "../../../lib/driver/data";

export default async function DriverPage() {
  const stops = await getDriverStops();
  return <main className="driver-page"><DriverPortal initialStops={stops} /></main>;
}