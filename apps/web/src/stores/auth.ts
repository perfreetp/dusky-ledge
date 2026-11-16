import { defineStore } from 'pinia';
import { api, getToken, setToken } from '../api/client.js';
import type { UserDto } from '@pg/shared';

interface AuthState {
  token: string | null;
  user: UserDto | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: getToken(),
    user: JSON.parse(localStorage.getItem('pg-user') ?? 'null') as UserDto | null,
  }),
  getters: {
    isLoggedIn: (s) => !!s.token,
    role: (s) => s.user?.role ?? null,
  },
  actions: {
    async login(username: string, password: string) {
      const res = await api.login(username, password);
      this.token = res.token;
      this.user = res.user;
      setToken(res.token);
      localStorage.setItem('pg-user', JSON.stringify(res.user));
    },
    logout() {
      this.token = null;
      this.user = null;
      setToken(null);
      localStorage.removeItem('pg-user');
    },
  },
});
