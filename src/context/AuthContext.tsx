import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { api, type AuthUser } from "../lib/api";
import { startGoogleSignIn } from "../lib/google";
import { loadRemoteConfig, subscribeRemoteSettings } from "../lib/remoteConfig";
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
  sendOtp: (phone: string, create: boolean) => Promise<string>;
  verifyOtp: (phone: string, otp: string, sessionId: string, create: boolean, fullName?: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    let active = true;
    Promise.race([
      loadRemoteConfig(),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ])
      .catch(() => undefined)
      .then(() => AsyncStorage.getItem(SESSION_KEY))
      .then((raw) => {
        if (!active) return;
        if (raw) {
          try {
            setSession(JSON.parse(raw) as AppSession);
          } catch {
            setSession(null);
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") loadRemoteConfig().catch(() => undefined);
    });
    const settings = subscribeRemoteSettings(() => {
      const token = sessionRef.current?.access_token;
      if (!token) return;
      api.me(token).then((next) => {
        if (sessionRef.current?.access_token === token) setMe(next);
      }).catch(() => {
        if (sessionRef.current?.access_token === token) setMe(null);
      });
    });
    return () => {
      active = false;
      subscription.remove();
      settings();
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
    sendOtp: async (phone, create) => {
      const result = await api.sendOtp(phone, create);
      return result.sessionId;
    },
    verifyOtp: async (phone, otp, sessionId, create, fullName) => {
      const result = await api.verifyOtp(phone, otp, sessionId, create, fullName);
      await store({ access_token: result.token, user: result.user });
    },
    signInGoogle: async () => {
      const proof = await startGoogleSignIn();
      const result = await api.google(proof);
      await store({ access_token: result.token, user: result.user });
    },
    signOut: async () => {
      await AsyncStorage.removeItem(SESSION_KEY);
      setSession(null);
      setMe(null);
    },
    deleteAccount: async () => {
      if (!session?.access_token) throw new Error("Sign in required");
      await api.deleteMe(session.access_token);
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
