import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardProvider } from "@/components/dashboard";
import { LogoutButton } from "@/components/ui/LogoutButton";
import { createServerClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const [businessResponse, subscriptionResponse] = await Promise.all([
    supabase
      .from("businesses")
      .select("id,nama")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan,status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const business = businessResponse.data
    ? {
        id: businessResponse.data.id as string,
        nama: businessResponse.data.nama as string,
      }
    : null;
  const subscription = subscriptionResponse.data
    ? {
        plan: String(subscriptionResponse.data.plan ?? "FREE"),
        status: String(subscriptionResponse.data.status ?? "ACTIVE"),
        current_period_end:
          typeof subscriptionResponse.data.current_period_end === "string"
            ? subscriptionResponse.data.current_period_end
            : null,
      }
    : {
        plan: "FREE",
        status: "ACTIVE",
        current_period_end: null,
      };

  return (
    <DashboardProvider
      value={{
        user: {
          id: user.id,
          email: user.email ?? null,
        },
        business,
        subscription,
      }}
    >
      <div className="min-h-screen bg-transparent">
        <nav className="border-b border-slate-200 bg-white/85 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link href="/dashboard" className="text-base font-bold text-emerald-700">
                Rekapin.id
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {business?.nama ?? "Bisnis Saya"}
                </p>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {subscription.plan}
                </span>
              </div>
            </div>

            <LogoutButton className="shrink-0" />
          </div>
        </nav>

        {children}
      </div>
    </DashboardProvider>
  );
}

