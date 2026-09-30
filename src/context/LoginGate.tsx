import { createContext, useContext } from "react";

export const RequireLoginContext = createContext<(message: string) => void>(() => undefined);

export function useRequireLogin() {
  return useContext(RequireLoginContext);
}
