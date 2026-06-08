// Pi Network SDK helpers.
// Requires the Pi Browser; window.Pi is injected there.

export type PiUser = { uid: string; username: string };
export type PiAuthResult = { user: PiUser; accessToken: string };

declare global {
  interface Window {
    Pi?: {
      init: (opts: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (p: unknown) => void,
      ) => Promise<PiAuthResult>;
    };
  }
}

export function isPiBrowser(): boolean {
  return typeof window !== "undefined" && !!window.Pi;
}

export async function piAuthenticate(): Promise<PiAuthResult> {
  if (!isPiBrowser()) {
    throw new Error("Pi SDK unavailable. Please open this app inside the Pi Browser.");
  }
  window.Pi!.init({ version: "2.0", sandbox: true });
  return window.Pi!.authenticate(["username", "payments"], (p) => {
    console.warn("Incomplete Pi payment found:", p);
  });
}
