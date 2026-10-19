import { Platform } from "react-native";
import { usePlayCredits } from "../components/PlayBilling";
import { useRazorpay } from "../components/RazorpayCheckout";
import { useAuth } from "../context/AuthContext";
import { api } from "./api";

export function useWalletTopUp() {
  const { token, session } = useAuth();
  const play = usePlayCredits();
  const pay = useRazorpay();
  return async (amount: number): Promise<{ balance: number; credited: number }> => {
    if (!token) throw new Error("Sign in to add credits.");
    if (Platform.OS === "android") return play(amount);
    const order = await api.walletOrder(amount, token);
    const paid = await pay({ keyId: order.key_id, orderId: order.order_id, amount: order.amount, currency: order.currency, description: order.description, email: session?.user.email || undefined });
    const result = await api.walletVerify(paid, token);
    return { balance: result.balance, credited: amount };
  };
}
