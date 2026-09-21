import type { PropsWithChildren } from "react";

export default function AdminLayout({ children }: PropsWithChildren) {
  return <div className="admin-app">{children}</div>;
}