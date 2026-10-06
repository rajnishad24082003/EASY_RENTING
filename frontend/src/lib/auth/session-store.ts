import type { AuthResponse, UserDto } from "@/lib/api/types";

export type SessionStatus = "loading" | "authenticated" | "anonymous";

export interface SessionState {
  status: SessionStatus;
  user: UserDto | null;
  /** Kept in memory only; never persisted. */
  accessToken: string | null;
  /** Epoch millis at which the access token expires. */
  expiresAt: number | null;
}

const INITIAL_STATE: SessionState = { status: "loading", user: null, accessToken: null, expiresAt: null };

let state: SessionState = INITIAL_STATE;
const listeners = new Set<() => void>();

function setState(next: SessionState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export const sessionStore = {
  getState: (): SessionState => state,
  getServerState: (): SessionState => INITIAL_STATE,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSession(auth: AuthResponse) {
    setState({
      status: "authenticated",
      user: auth.user,
      accessToken: auth.accessToken,
      expiresAt: Date.now() + auth.expiresIn * 1000,
    });
  },
  setUser(user: UserDto) {
    if (state.status !== "authenticated") return;
    setState({ ...state, user });
  },
  clear() {
    setState({ status: "anonymous", user: null, accessToken: null, expiresAt: null });
  },
  /** Test helper: restore the pristine boot state. */
  reset() {
    setState(INITIAL_STATE);
  },
};
