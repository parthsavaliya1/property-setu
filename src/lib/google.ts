import { AuthRequest, Prompt, ResponseType } from "expo-auth-session";
import { discovery } from "expo-auth-session/providers/google";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { apiBase } from "./api";

WebBrowser.maybeCompleteAuthSession();

export type GoogleProof = {
  code: string;
  code_verifier: string;
  redirect_uri: string;
  client_id: string;
};

function googleClientId() {
  return process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
}

function browserRedirect() {
  if (typeof window === "undefined") return "http://localhost:8081";
  const url = new URL(window.location.href);
  return `${url.protocol}//${url.host}`;
}

function phoneRedirect() {
  return `${apiBase().replace(/\/$/, "")}/api/auth/google/callback`;
}

function explainGoogleError(message: string, redirectUri: string) {
  const text = message.replace(/\+/g, " ");
  if (/redirect_uri/i.test(text)) {
    return `In Google Cloud → your Web client → Authorized redirect URIs, add exactly: ${redirectUri}`;
  }
  return text;
}

function callbackParams(url: string) {
  const params = new URLSearchParams();
  const query = url.split("#")[0]?.split("?")[1];
  const hash = url.split("#")[1];
  if (query) new URLSearchParams(query).forEach((value, key) => params.set(key, value));
  if (hash) new URLSearchParams(hash).forEach((value, key) => params.set(key, value));
  return params;
}

async function openPhone(authUrl: string, returnUrl: string) {
  let settled = false;
  const url = await new Promise<string>((resolve, reject) => {
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      resolve(value);
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      reject(error);
    };
    const subscription = Linking.addEventListener("url", ({ url: incoming }) => {
      if (incoming.includes("code=") || incoming.includes("error=") || incoming.includes("errorCode=")) finish(incoming);
    });
    WebBrowser.openAuthSessionAsync(authUrl, returnUrl)
      .then((value) => {
        if (value.type === "success" && value.url) finish(value.url);
        else setTimeout(() => fail(new Error("Google sign-in was cancelled.")), 800);
      })
      .catch((error: unknown) => {
        fail(error instanceof Error ? error : new Error("Google sign-in failed"));
      });
  });
  const params = callbackParams(url);
  const errorCode = params.get("error_description") || params.get("error") || params.get("errorCode");
  if (errorCode) throw new Error(explainGoogleError(errorCode, phoneRedirect()));
  return url;
}

function proofFromResult(result: Awaited<ReturnType<AuthRequest["promptAsync"]>>, request: AuthRequest, redirectUri: string): GoogleProof {
  if (result.type === "cancel" || result.type === "dismiss" || result.type === "locked") {
    throw new Error("Google sign-in was cancelled.");
  }
  if (result.type === "error") {
    const description = result.error?.message || result.params.error_description || result.params.error || "Google sign-in failed";
    throw new Error(explainGoogleError(description, redirectUri));
  }
  if (result.type !== "success" || !result.params.code || !request.codeVerifier) {
    throw new Error("Google did not return a login code.");
  }
  return {
    code: result.params.code,
    code_verifier: request.codeVerifier,
    redirect_uri: redirectUri,
    client_id: request.clientId,
  };
}

export async function startGoogleSignIn(): Promise<GoogleProof> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new Error("Add EXPO_PUBLIC_GOOGLE_CLIENT_ID in property-app/.env, and the same ID plus GOOGLE_CLIENT_SECRET on the API. Then restart both.");
  }

  const phone = Platform.OS !== "web";
  const returnUrl = phone ? Linking.createURL("auth/callback") : "";
  const redirectUri = phone ? phoneRedirect() : browserRedirect();
  if (!phone && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(redirectUri)) {
    throw new Error("Open http://localhost:8081 on this computer. Google does not allow the phone or network address in the browser.");
  }

  const extraParams: Record<string, string> = { prompt: Prompt.SelectAccount };
  if (phone) {
    extraParams.device_id = "propertyhub";
    extraParams.device_name = "PropertySetu";
  }

  const request = new AuthRequest({
    clientId,
    redirectUri,
    state: phone ? returnUrl : undefined,
    scopes: ["openid", "profile", "email"],
    responseType: ResponseType.Code,
    usePKCE: true,
    extraParams,
  });

  const result = phone
    ? request.parseReturnUrl(await openPhone(await request.makeAuthUrlAsync(discovery), returnUrl))
    : await request.promptAsync(discovery, { windowFeatures: { width: 515, height: 680 } });

  return proofFromResult(result, request, redirectUri);
}
