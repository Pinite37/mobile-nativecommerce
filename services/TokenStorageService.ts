import * as SecureStore from 'expo-secure-store';

// Toutes les données d'auth sous une seule clé JSON — lecture/écriture atomique,
// élimine les fenêtres de cache incohérent entre les champs.
const AUTH_KEY = 'axi_auth_v2';
const DEVICE_ID_KEY = 'axi_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface AuthData {
  accessToken: string;
  refreshToken: string;
  userId: string;
  userRole: string;
  userData: any;
}

class TokenStorageService {
  // Cache mémoire — une seule entrée, toujours cohérente
  private cached: AuthData | null | undefined = undefined; // undefined = jamais lu
  private cacheTs = 0;
  private readonly CACHE_TTL = 30_000;

  private isCacheValid(): boolean {
    return this.cached !== undefined && Date.now() - this.cacheTs < this.CACHE_TTL;
  }

  private invalidate(): void {
    this.cached = undefined;
    this.cacheTs = 0;
  }

  // ── Lecture ───────────────────────────────────────────────────────────────────

  private async read(): Promise<AuthData | null> {
    if (this.isCacheValid()) return this.cached ?? null;
    try {
      const raw = await SecureStore.getItemAsync(AUTH_KEY);
      this.cached = raw ? JSON.parse(raw) : null;
      this.cacheTs = Date.now();
      return this.cached ?? null;
    } catch {
      return null;
    }
  }

  private async write(data: AuthData): Promise<void> {
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(data));
    this.cached = data;
    this.cacheTs = Date.now();
  }

  // ── API publique ──────────────────────────────────────────────────────────────

  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    const d = await this.read();
    return { accessToken: d?.accessToken ?? null, refreshToken: d?.refreshToken ?? null };
  }

  async getAccessToken(): Promise<string | null> {
    return (await this.read())?.accessToken ?? null;
  }

  async getRefreshToken(): Promise<string | null> {
    return (await this.read())?.refreshToken ?? null;
  }

  async getUserData(): Promise<any | null> {
    return (await this.read())?.userData ?? null;
  }

  async getUserRole(): Promise<string | null> {
    return (await this.read())?.userRole ?? null;
  }

  async getUserId(): Promise<string | null> {
    return (await this.read())?.userId ?? null;
  }

  /** Écriture atomique complète à la connexion */
  async saveSession(data: AuthData): Promise<void> {
    await this.write(data);
  }

  /** Met à jour uniquement les tokens (à l'issue d'un refresh) */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    const existing = await this.read();
    if (!existing) return; // pas de session en cours, rien à faire
    await this.write({ ...existing, accessToken, refreshToken });
  }

  // Compatibilité avec les appels existants (login via AuthService)
  async setAccessToken(token: string): Promise<void> {
    const existing = await this.read();
    if (existing) {
      await this.write({ ...existing, accessToken: token });
    } else {
      // Session partielle pendant le login — on ne peut pas écrire sans l'ensemble
      // Les anciennes clés séparées sont conservées en transit, saveSession() finalisera
      this._pendingAccessToken = token;
    }
  }
  private _pendingAccessToken: string | null = null;

  async setRefreshToken(token: string): Promise<void> {
    const existing = await this.read();
    if (existing) {
      await this.write({ ...existing, refreshToken: token });
    } else {
      this._pendingRefreshToken = token;
    }
  }
  private _pendingRefreshToken: string | null = null;

  async setUserData(userData: any): Promise<void> {
    const existing = await this.read();
    if (existing) {
      await this.write({ ...existing, userData });
    }
  }

  async setUserRole(role: string): Promise<void> {
    const existing = await this.read();
    if (existing) {
      await this.write({ ...existing, userRole: role });
    }
  }

  async isLoggedIn(): Promise<boolean> {
    const d = await this.read();
    return !!(d?.accessToken && d?.refreshToken);
  }

  async clearAll(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(AUTH_KEY);
      // Nettoyer aussi les anciennes clés séparées (migration)
      await Promise.allSettled([
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('user_data'),
        SecureStore.deleteItemAsync('user_role'),
      ]);
    } catch {}
    this.invalidate();
    this._pendingAccessToken = null;
    this._pendingRefreshToken = null;
  }

  async clearTokens(): Promise<void> {
    const existing = await this.read();
    if (existing) {
      await this.write({ ...existing, accessToken: '', refreshToken: '' });
    }
  }

  /** Identifiant stable de l'appareil — généré une seule fois, persisté dans SecureStore */
  async getOrCreateDeviceId(): Promise<string> {
    try {
      let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
      if (!id) {
        id = generateUUID();
        await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
      }
      return id;
    } catch {
      return generateUUID(); // fallback non persisté si SecureStore inaccessible
    }
  }

  /** Migration depuis les anciennes clés séparées (une seule fois) */
  async migrateFromLegacy(): Promise<void> {
    const already = await SecureStore.getItemAsync(AUTH_KEY);
    if (already) return; // déjà migré
    try {
      const [at, rt, rawUser, role] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('refresh_token'),
        SecureStore.getItemAsync('user_data'),
        SecureStore.getItemAsync('user_role'),
      ]);
      if (at && rt && rawUser && role) {
        const userData = JSON.parse(rawUser);
        await this.write({
          accessToken: at,
          refreshToken: rt,
          userId: userData._id ?? userData.id ?? '',
          userRole: role,
          userData,
        });
        await Promise.allSettled([
          SecureStore.deleteItemAsync('access_token'),
          SecureStore.deleteItemAsync('refresh_token'),
          SecureStore.deleteItemAsync('user_data'),
          SecureStore.deleteItemAsync('user_role'),
        ]);
      }
    } catch {}
  }
}

export default new TokenStorageService();
