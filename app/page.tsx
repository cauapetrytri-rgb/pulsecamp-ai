import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Dashboard } from "@/components/dashboard";
import { allowedClientIds, getServerUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/db";
import { isAppView, viewMeta } from "@/lib/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HomePageProps = {
  searchParams: Promise<{ view?: string | string[]; client?: string | string[] }>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const requestedView = first(params.view);
  const view = isAppView(requestedView) ? requestedView : "dashboard";
  return {
    title: view === "dashboard"
      ? "PulseCamp — Rastreamento e qualidade de leads"
      : `${viewMeta[view].title} — PulseCamp`,
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getServerUser();
  if (!user) redirect("/login");
  const data = getDashboardData(allowedClientIds(user));
  const params = await searchParams;
  const requestedView = first(params.view);
  const requestedClient = first(params.client);
  const initialView = isAppView(requestedView) ? requestedView : "dashboard";
  const initialClient = data.clients.some((client) => client.id === requestedClient) ? requestedClient! : "all";

  return <Dashboard data={data} initialView={initialView} initialClient={initialClient} user={user} />;
}
