import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { Linking, Modal, Platform, Pressable, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors } from "../theme";

export type RazorpayOrder = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  email?: string;
};

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type CheckoutContextValue = {
  pay: (order: RazorpayOrder) => Promise<RazorpaySuccess>;
};

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

function checkoutHtml(order: RazorpayOrder) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = {
    key: ${JSON.stringify(order.keyId)},
    amount: ${Number(order.amount)},
    currency: ${JSON.stringify(order.currency || "INR")},
    name: "PropertySetu",
    description: ${JSON.stringify(order.description)},
    order_id: ${JSON.stringify(order.orderId)},
    prefill: { email: ${JSON.stringify(order.email || "")} },
    theme: { color: "#B56A45" },
    handler: function (response) {
      window.ReactNativeWebView.postMessage(JSON.stringify(response));
    },
    modal: {
      ondismiss: function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ cancelled: true }));
      }
    }
  };
  var checkout = new Razorpay(options);
  checkout.on("payment.failed", function (response) {
    var description = response && response.error && response.error.description;
    window.ReactNativeWebView.postMessage(JSON.stringify({ failed: true, description: description || "Payment failed" }));
  });
  checkout.open();
</script>
</body>
</html>`;
}

function openWebCheckout(order: RazorpayOrder) {
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const start = () => {
      const Razorpay = (window as unknown as { Razorpay?: new (options: unknown) => { open: () => void; on: (event: string, fn: (response: { error?: { description?: string } }) => void) => void } }).Razorpay;
      if (!Razorpay) {
        reject(new Error("Could not open Razorpay"));
        return;
      }
      const checkout = new Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "PropertySetu",
        description: order.description,
        order_id: order.orderId,
        prefill: { email: order.email || "" },
        theme: { color: "#B56A45" },
        handler: (response: RazorpaySuccess) => resolve(response),
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      checkout.on("payment.failed", (response) => {
        reject(new Error(response.error?.description || "Payment failed"));
      });
      checkout.open();
    };
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => start();
    script.onerror = () => reject(new Error("Could not open Razorpay"));
    document.body.appendChild(script);
  });
}

function openExternalPayment(url: string) {
  try {
    const scheme = url.match(/scheme=([^;]+)/i)?.[1];
    const fallback = url.match(/browser_fallback_url=([^;]+)/i)?.[1];
    const target = url.startsWith("intent:")
      ? `${decodeURIComponent(scheme || "upi")}://${url.replace(/^intent:\/\//, "").split("#")[0]}`
      : url;
    Linking.openURL(target).catch(() => {
      if (!fallback) return;
      try {
        Linking.openURL(decodeURIComponent(fallback)).catch(() => undefined);
      } catch {
        /* the checkout stays open if the UPI app cannot be launched */
      }
    });
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
}

function isExternalPayment(url: string) {
  return /^(upi|intent|tez|phonepe|paytmmp|gpay|credpay|bhim):/i.test(url);
}

export function useRazorpay() {
  const checkout = useContext(CheckoutContext);
  if (!checkout) throw new Error("Payment is not ready");
  return checkout.pay;
}

export function RazorpayHost({ children }: { children: ReactNode }) {
  const [order, setOrder] = useState<RazorpayOrder | null>(null);
  const pending = useRef<{ resolve: (value: RazorpaySuccess) => void; reject: (error: Error) => void } | null>(null);

  function finish(error?: Error, value?: RazorpaySuccess) {
    const current = pending.current;
    pending.current = null;
    setOrder(null);
    if (!current) return;
    if (error) current.reject(error);
    else if (value) current.resolve(value);
  }

  async function pay(next: RazorpayOrder) {
    if (Platform.OS === "web") return openWebCheckout(next);
    return new Promise<RazorpaySuccess>((resolve, reject) => {
      pending.current = { resolve, reject };
      setOrder(next);
    });
  }

  return (
    <CheckoutContext.Provider value={{ pay }}>
      {children}
      <Modal visible={Boolean(order)} animationType="slide" onRequestClose={() => finish(new Error("Payment cancelled"))}>
        <View style={{ flex: 1, backgroundColor: colors.page }}>
          <View style={{ paddingTop: 18, paddingHorizontal: 20, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: colors.ink }}>Pay listing fee</Text>
            <Pressable onPress={() => finish(new Error("Payment cancelled"))} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Cancel</Text>
            </Pressable>
          </View>
          {order ? (
            <WebView
              originWhitelist={["*"]}
              source={{ html: checkoutHtml(order), baseUrl: "https://checkout.razorpay.com" }}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
              onShouldStartLoadWithRequest={(request) => {
                if (isExternalPayment(request.url)) {
                  openExternalPayment(request.url);
                  return false;
                }
                return true;
              }}
              onMessage={(event) => {
                try {
                  const payload = JSON.parse(event.nativeEvent.data) as RazorpaySuccess & { cancelled?: boolean; failed?: boolean; description?: string };
                  if (payload.cancelled) finish(new Error("Payment cancelled"));
                  else if (payload.failed) finish(new Error(payload.description || "Payment failed"));
                  else if (payload.razorpay_payment_id && payload.razorpay_signature) finish(undefined, payload);
                } catch {
                  finish(new Error("Payment could not be read"));
                }
              }}
            />
          ) : null}
        </View>
      </Modal>
    </CheckoutContext.Provider>
  );
}
