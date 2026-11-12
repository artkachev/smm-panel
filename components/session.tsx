"use client";

import { createContext, useContext } from "react";

export type Me = { role: "viewer" | "operator" | "admin"; password_source?: "env" | "settings" | "unset" };
export const SessionContext = createContext<Me | null>(null);

const RANK = { viewer: 0, operator: 1, admin: 2 };
export function useMe() {
  return useContext(SessionContext);
}
export function useCan(role: Me["role"]) {
  const me = useMe();
  return !!me && RANK[me.role] >= RANK[role];
}
