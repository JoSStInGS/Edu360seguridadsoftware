import { ReactNode } from "react";
import DashboardLayout from "./components/DashboardLayout";
import { requireWebAuthContext } from "@/app/lib/session";

export default async function Layout({ children }: { children: ReactNode }) {
  await requireWebAuthContext();

  return <DashboardLayout>{children}</DashboardLayout>;
}
