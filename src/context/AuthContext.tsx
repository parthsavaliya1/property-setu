import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type AuthUser } from "../lib/api";
import { getSupabase, startOAuth } from "../lib/supabase";
import type { Me } from "../types/database";

const SESSION_KEY = "propertyhub.session";

export type AppSession = {
  access_token: string;
  user: AuthUser;
};

type AuthValue = {
  ready: boolean;
  configured: boolean;
  session: AppSession | null;
  me: Me | null;
  token: string | null;
  refreshMe: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<string | null>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SESSION_KEY).then((raw) => {
      if (!active) return;
      if (raw) {
        try {
          setSession(JSON.parse(raw) as AppSession);
        } catch {
          setSession(null);
        }
      }
      setReady(true);
    }).catch(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  async function refreshMe() {
    if (!session?.access_token) {
      setMe(null);
      return;
    }
    setMe(await api.me(session.access_token));
  }

  useEffect(() => {
    refreshMe().catch(() => setMe(null));
  }, [session?.access_token]);

  async function store(next: AppSession) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    setSession(next);
  }

  const value = useMemo<AuthValue>(() => ({
    ready,
    configured: true,
    session,
    me,
    token: session?.access_token ?? null,
    refreshMe,
    signInEmail: async (email, password) => {
      const result = await api.login(email, password);
      await store({ access_token: result.token, user: result.user });
    },
    signUpEmail: async (name, email, password) => {
      const result = await api.signup(email, password, name);
      await store({ access_token: result.token, user: result.user });
      return null;
    },
    signInGoogle: async () => {
      const accessToken = await startOAuth("google");
      try {
        const result = await api.google(accessToken);
        await store({ access_token: result.token, user: result.user });
      } finally {
        const supabase = await getSupabase();
        if (supabase) await supabase.auth.signOut();
      }
    },
    signOut: async () => {
      await AsyncStorage.removeItem(SESSION_KEY);
      setSession(null);
      setMe(null);
    },
  }), [ready, session, me]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider is missing");
  return value;
}
