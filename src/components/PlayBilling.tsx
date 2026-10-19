import type { ReactNode } from "react";

export function PlayBillingHost({ children }: { children: ReactNode }) { return <>{children}</>; }
export function usePlayCredits(): (minimumCredits: number) => Promise<{ balance: number; credited: number }> {
  return async () => { throw new Error("Google Play purchases are available in the Android app."); };
}
