import { sessionStore } from "@/lib/auth/session-store";
import { apiRequest } from "./client";
import type { AuthResponse, LoginRequest, RegisterRequest, UpdateProfileRequest, UserDto } from "./types";

export const authApi = {
  async login(body: LoginRequest): Promise<AuthResponse> {
    const auth = await apiRequest<AuthResponse>("/auth/login", { method: "POST", body });
    sessionStore.setSession(auth);
    return auth;
  },
  async register(body: RegisterRequest): Promise<AuthResponse> {
    const auth = await apiRequest<AuthResponse>("/auth/register", { method: "POST", body });
    sessionStore.setSession(auth);
    return auth;
  },
  async logout(): Promise<void> {
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
    } finally {
      sessionStore.clear();
    }
  },
};

export const usersApi = {
  me: () => apiRequest<UserDto>("/users/me"),
  async updateMe(body: UpdateProfileRequest): Promise<UserDto> {
    const user = await apiRequest<UserDto>("/users/me", { method: "PATCH", body });
    sessionStore.setUser(user);
    return user;
  },
};
