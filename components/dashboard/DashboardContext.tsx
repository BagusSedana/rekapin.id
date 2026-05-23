"use client";

import { createContext, useContext } from "react";

export type DashboardUser = {
  id: string;
  email: string | null;
};

export type DashboardBusiness = {
  id: string;
  nama: string;
} | null;

export type DashboardSubscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

type DashboardContextValue = {
  user: DashboardUser;
  business: DashboardBusiness;
  subscription: DashboardSubscription;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function DashboardProvider({
  value,
  children,
}: {
  value: DashboardContextValue;
  children: React.ReactNode;
}) {
  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  );
}

export function useDashboardContext() {
  const context = useContext(DashboardContext);

  if (!context) {
    throw new Error("useDashboardContext harus dipakai di dalam DashboardProvider.");
  }

  return context;
}

