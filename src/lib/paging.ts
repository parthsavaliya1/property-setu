import { useCallback, useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { PROPERTY_PAGE_SIZE, appendProperties } from "./api";
import { getRemoteSettings, subscribeRemoteSettings } from "./remoteConfig";
import type { PropertyCard } from "../types/database";

export function nearScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>, axis: "x" | "y" = "y") {
  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
  const view = axis === "y" ? layoutMeasurement.height : layoutMeasurement.width;
  const offset = axis === "y" ? contentOffset.y : contentOffset.x;
  const size = axis === "y" ? contentSize.height : contentSize.width;
  return size > 0 && view + offset >= size - 320;
}

export function usePagedProperties(
  loadPage: (offset: number) => Promise<PropertyCard[]>,
  signature: string,
  enabled = true,
  arrange?: (rows: PropertyCard[], mode: "load" | "refresh" | "more") => PropertyCard[],
) {
  const [items, setItems] = useState<PropertyCard[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const paging = useRef({ offset: 0, hasMore: true, gen: 0 });
  const flight = useRef(false);
  const loadPageRef = useRef(loadPage);
  const arrangeRef = useRef(arrange);
  const [apiUrl, setApiUrl] = useState(() => getRemoteSettings().apiUrl || "");
  loadPageRef.current = loadPage;
  arrangeRef.current = arrange;

  useEffect(() => subscribeRemoteSettings(() => setApiUrl(getRemoteSettings().apiUrl || "")), []);

  const run = useCallback(async (mode: "load" | "refresh" | "more") => {
    const state = paging.current;
    if (!enabled) {
      state.gen += 1;
      state.offset = 0;
      state.hasMore = false;
      flight.current = false;
      setItems([]);
      setHasMore(false);
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }
    if (mode === "more" && (flight.current || !state.hasMore)) return;
    const gen = ++state.gen;
    flight.current = true;
    const offset = mode === "more" ? state.offset : 0;
    if (mode === "load") setLoading(true);
    else if (mode === "refresh") setRefreshing(true);
    else setLoadingMore(true);
    try {
      const loaded = await loadPageRef.current(offset);
      const page = Array.isArray(loaded) ? loaded : [];
      const rows = arrangeRef.current ? arrangeRef.current(page, mode) : page;
      if (gen !== paging.current.gen) return;
      setItems((current) => (mode === "more" ? appendProperties(current, rows) : rows));
      paging.current.offset = offset + rows.length;
      paging.current.hasMore = rows.length >= PROPERTY_PAGE_SIZE;
      setHasMore(paging.current.hasMore);
      if (mode !== "more") setError("");
    } catch (err) {
      if (gen !== paging.current.gen) return;
      if (mode === "load") {
        setItems([]);
        paging.current.hasMore = false;
        setHasMore(false);
      }
      if (mode !== "more") setError(err instanceof Error ? err.message : "Could not refresh");
    } finally {
      if (gen === paging.current.gen) {
        flight.current = false;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    void run("load");
  }, [apiUrl, run, signature]);

  const refresh = useCallback(() => run("refresh"), [run]);
  const loadMore = useCallback(() => run("more"), [run]);

  return { items, setItems, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore };
}
