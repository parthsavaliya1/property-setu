import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { PROPERTY_PAGE_SIZE, api, appendProperties } from "../lib/api";
import { getRemoteSettings, subscribeRemoteSettings } from "../lib/remoteConfig";
import type { PropertyCard } from "../types/database";

type FavoritesValue = {
  items: PropertyCard[];
  ready: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  isSaved: (id: string, fallback?: boolean) => boolean;
  toggle: (item: PropertyCard) => Promise<void>;
  reload: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const changes = useRef(0);
  const paging = useRef({ offset: 0, hasMore: true, busy: false, gen: 0 });
  const [apiUrl, setApiUrl] = useState(() => getRemoteSettings().apiUrl || "");

  useEffect(() => subscribeRemoteSettings(() => setApiUrl(getRemoteSettings().apiUrl || "")), []);

  const applyPage = useCallback((rows: PropertyCard[], replace: boolean) => {
    setItems((current) => (replace ? rows : appendProperties(current, rows)));
    setSaved((current) => {
      const next = replace ? {} : { ...current };
      rows.forEach((row) => {
        next[row.id] = true;
      });
      return next;
    });
    paging.current.offset = (replace ? 0 : paging.current.offset) + rows.length;
    paging.current.hasMore = rows.length >= PROPERTY_PAGE_SIZE;
    setHasMore(paging.current.hasMore);
  }, []);

  const fetchPage = useCallback(async (replace: boolean) => {
    if (!token) return;
    if (!replace && (paging.current.busy || !paging.current.hasMore)) return;
    const gen = ++paging.current.gen;
    paging.current.busy = true;
    if (!replace) setLoadingMore(true);
    const start = replace ? 0 : paging.current.offset;
    const stamp = changes.current;
    try {
      const rows = await api.favorites(token, `?limit=${PROPERTY_PAGE_SIZE}&offset=${start}`);
      if (gen !== paging.current.gen || stamp !== changes.current) return;
      applyPage(rows, replace);
    } catch {
      if (gen !== paging.current.gen || stamp !== changes.current) return;
      if (replace) {
        setItems([]);
        setSaved({});
        setHasMore(false);
      }
    } finally {
      if (gen === paging.current.gen) {
        paging.current.busy = false;
        setLoadingMore(false);
      }
    }
  }, [applyPage, token]);

  useEffect(() => {
    changes.current += 1;
    paging.current = { offset: 0, hasMore: true, busy: false, gen: paging.current.gen + 1 };
    if (!token) {
      setItems([]);
      setSaved({});
      setHasMore(false);
      setReady(true);
      return;
    }
    let active = true;
    const stamp = changes.current;
    setReady(false);
    api.favorites(token, `?limit=${PROPERTY_PAGE_SIZE}&offset=0`).then((rows) => {
      if (!active || stamp !== changes.current) return;
      applyPage(rows, true);
    }).catch(() => {
      if (!active || stamp !== changes.current) return;
      setItems([]);
      setSaved({});
      setHasMore(false);
    }).finally(() => {
      if (active && stamp === changes.current) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [apiUrl, applyPage, token]);

  const isSaved = useCallback((id: string, fallback?: boolean) => {
    if (id in saved) return saved[id];
    return Boolean(fallback);
  }, [saved]);

  const toggle = useCallback(async (item: PropertyCard) => {
    if (!token) return;
    const liked = item.id in saved ? saved[item.id] : Boolean(item.is_favorite);
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
  }, [saved, token]);

  const reload = useCallback(async () => {
    paging.current = { offset: 0, hasMore: true, busy: false, gen: paging.current.gen };
    await fetchPage(true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    await fetchPage(false);
  }, [fetchPage]);

  const value = useMemo(() => ({ items, ready, loadingMore, hasMore, isSaved, toggle, reload, loadMore }), [hasMore, isSaved, items, loadMore, loadingMore, ready, reload, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error("FavoritesProvider is missing");
  return value;
}
