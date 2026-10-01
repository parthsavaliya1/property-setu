import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../lib/api";
import type { PropertyCard } from "../types/database";

type FavoritesValue = {
  items: PropertyCard[];
  ready: boolean;
  isSaved: (id: string, fallback?: boolean) => boolean;
  toggle: (item: PropertyCard) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const changes = useRef(0);

  useEffect(() => {
    changes.current = 0;
    if (!token) {
      setItems([]);
      setSaved({});
      setReady(true);
      return;
    }
    let active = true;
    const stamp = changes.current;
    setReady(false);
    api.favorites(token).then((rows) => {
      if (!active || stamp !== changes.current) return;
      setItems(rows);
      const next: Record<string, boolean> = {};
      rows.forEach((row) => {
        next[row.id] = true;
      });
      setSaved(next);
    }).catch(() => {
      if (!active || stamp !== changes.current) return;
      setItems([]);
      setSaved({});
    }).finally(() => {
      if (active && stamp === changes.current) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const isSaved = useCallback((id: string, fallback?: boolean) => {
    if (id in saved) return saved[id];
    if (ready) return false;
    return Boolean(fallback);
  }, [ready, saved]);

  const toggle = useCallback(async (item: PropertyCard) => {
    if (!token) return;
    const liked = item.id in saved ? saved[item.id] : (!ready && Boolean(item.is_favorite));
    const next = !liked;
    changes.current += 1;
    setSaved((current) => ({ ...current, [item.id]: next }));
    setItems((current) => next
      ? [item, ...current.filter((row) => row.id !== item.id)]
      : current.filter((row) => row.id !== item.id));
    try {
      if (next) await api.favorite(item.id, token);
      else await api.unfavorite(item.id, token);
    } catch {
      setSaved((current) => ({ ...current, [item.id]: liked }));
      setItems((current) => liked
        ? [item, ...current.filter((row) => row.id !== item.id)]
        : current.filter((row) => row.id !== item.id));
    }
  }, [ready, saved, token]);

  const value = useMemo(() => ({ items, ready, isSaved, toggle }), [isSaved, items, ready, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("FavoritesProvider is missing");
  return value;
}
