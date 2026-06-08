// Pi Network SDK placeholder.
// Once you add the Pi SDK to your Pi Browser app, replace these stubs with real calls.
//   const scopes = ["username", "payments", "wallet_address"];
//   const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
//
// For now we simulate a Pi user so the UI flow can be developed.

export type PiAuthResult = {
  username: string;
  walletAddress: string;
  accessToken: string;
};

declare global {
  interface Window {
    Pi?: {
      init: (opts: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (p: unknown) => void,
      ) => Promise<{ user: { uid: string; username: string }; accessToken: string }>;
    };
  }
}

export async function piAuthenticate(): Promise<PiAuthResult> {
  if (typeof window !== "undefined" && window.Pi) {
    try {
      window.Pi.init({ version: "2.0", sandbox: true });
      const res = await window.Pi.authenticate(["username", "payments", "wallet_address"], () => {});
      return {
        username: res.user.username,
        walletAddress: "pi_wallet_" + res.user.uid.slice(0, 10),
        accessToken: res.accessToken,
      };
    } catch (e) {
      console.warn("Pi SDK failed, falling back to mock:", e);
    }
  }
  // Mock for non-Pi-Browser environments
  await new Promise(r => setTimeout(r, 600));
  const tag = Math.random().toString(36).slice(2, 8);
  return {
    username: `pioneer_${tag}`,
    walletAddress: `GA${Math.random().toString(36).slice(2, 10).toUpperCase()}...${tag.toUpperCase()}`,
    accessToken: "mock-token-" + tag,
  };
}
