// Pi Network SDK helpers.
// Requires the Pi Browser; window.Pi is injected there.

export type PiUser = { uid: string; username: string };
export type PiAuthResult = { user: PiUser; accessToken: string };

export type PiPaymentData = { amount: number; memo: string; metadata: Record<string, unknown> };
export type PiPaymentCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: unknown) => void;
};

declare global {
  interface Window {
    Pi?: {
      init: (opts: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (p: unknown) => void,
      ) => Promise<PiAuthResult>;
      createPayment: (data: PiPaymentData, callbacks: PiPaymentCallbacks) => Promise<unknown>;
    };
  }
}

export function isPiBrowser(): boolean {
  if (typeof window === "undefined") return false;
  if (window.Pi) return true;
  const ua = navigator.userAgent || "";
  return /PiBrowser/i.test(ua);
}

export async function waitForPiSdk(timeoutMs = 6000): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Pi) return true;
  const start = Date.now();
  return new Promise((resolve) => {
    const iv = setInterval(() => {
      if (window.Pi) { clearInterval(iv); resolve(true); }
      else if (Date.now() - start > timeoutMs) { clearInterval(iv); resolve(!!window.Pi); }
    }, 150);
  });
}

export async function piAuthenticate(): Promise<PiAuthResult> {
  if (!isPiBrowser()) {
    throw new Error("Pi SDK unavailable. Please open this app inside the Pi Browser.");
  }
  window.Pi!.init({ version: "2.0", sandbox: true });

  const onIncompletePaymentFound = (payment: unknown) => {
    console.log("Incomplete payment found:", payment);
    return payment;
  };
  const scopes = ["username", "payments"];

  return window.Pi!.authenticate(scopes, onIncompletePaymentFound)
    .then((authResult) => {
      console.log("Authentication successful!", authResult);
      return authResult;
    })
    .catch((error) => {
      console.error("Authentication failed:", error);
      throw error;
    });
}
