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

  // Verrou séquentiel : chaîne toutes les opérations lecture-modification-
  // écriture les unes après les autres, jamais en parallèle. Sans ça, deux
  // écritures concurrentes (ex: un refresh de token qui écrit les nouveaux
  // tokens, en même temps qu'un rafraîchissement de profil qui écrit juste
  // userData) peuvent se marcher dessus — la seconde, partie d'un état lu
  // AVANT l'écriture de la première, écrase silencieusement ses changements
  // en réécrivant l'ancienne valeur. Concrètement : ça peut effacer des
  // tokens fraîchement renouvelés et les remplacer par les anciens (déjà
  // invalides), causant une "session expirée" au prochain appel.
  private queue: Promise<void> = Promise.resolve();

  private runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const result = this.queue.then(fn, fn);
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  private isCacheValid(): boolean {
    return this.cached !== undefined && Date.now() - this.cacheTs < this.CACHE_TTL;
  }

  private invalidate(): void {
    this.cached = undefined;
    this.cacheTs = 0;
  }

  // ── Lecture / écriture (toujours appelées depuis l'intérieur de runExclusive) ──

  // Une lecture ratée ici se propage jusqu'à AuthContext, qui interprète
  // `null` comme « aucune session » et efface tout — un unique incident
  // transitoire de SecureStore (device sous pression mémoire, keychain pas
  // encore prête juste après le lancement…) transformait donc un glitch en
  // déconnexion définitive. Un deuxième essai après une courte pause absorbe
  // ce cas sans changer le contrat public (les appelants reçoivent toujours
  // `null`, jamais une exception) : elle échoue vraiment deux fois de suite,
  // ce qui est beaucoup plus rare qu'une fois.
  private async readOnce(): Promise<AuthData | null> {
    const raw = await SecureStore.getItemAsync(AUTH_KEY);
    this.cached = raw ? JSON.parse(raw) : null;
    this.cacheTs = Date.now();
    return this.cached ?? null;
  }

  private async readRaw(): Promise<AuthData | null> {
    if (this.isCacheValid()) return this.cached ?? null;
    try {
      return await this.readOnce();
    } catch (e) {
      console.warn('⚠️ TokenStorage - lecture échouée, nouvel essai dans 150ms:', (e as any)?.message);
      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return await this.readOnce();
      } catch (e2) {
        console.error('❌ TokenStorage - lecture impossible après 2 tentatives:', (e2 as any)?.message);
        return null;
      }
    }
  }

  private async writeRaw(data: AuthData): Promise<void> {
    await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(data));
    this.cached = data;
    this.cacheTs = Date.now();
  }

  // ── API publique ──────────────────────────────────────────────────────────────

  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    return this.runExclusive(async () => {
      const d = await this.readRaw();
      return { accessToken: d?.accessToken ?? null, refreshToken: d?.refreshToken ?? null };
    });
  }

  async getAccessToken(): Promise<string | null> {
    return this.runExclusive(async () => (await this.readRaw())?.accessToken ?? null);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.runExclusive(async () => (await this.readRaw())?.refreshToken ?? null);
  }

  async getUserData(): Promise<any | null> {
    return this.runExclusive(async () => (await this.readRaw())?.userData ?? null);
  }

  async getUserRole(): Promise<string | null> {
    return this.runExclusive(async () => (await this.readRaw())?.userRole ?? null);
  }

  async getUserId(): Promise<string | null> {
    return this.runExclusive(async () => (await this.readRaw())?.userId ?? null);
  }

  /** Écriture atomique complète à la connexion */
  async saveSession(data: AuthData): Promise<void> {
    await this.runExclusive(() => this.writeRaw(data));
  }

  /** Met à jour uniquement les tokens (à l'issue d'un refresh) */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.runExclusive(async () => {
      const existing = await this.readRaw();
      if (!existing) return; // pas de session en cours, rien à faire
      await this.writeRaw({ ...existing, accessToken, refreshToken });
    });
  }

  // Compatibilité avec les appels existants (login via AuthService)
  async setAccessToken(token: string): Promise<void> {
    await this.runExclusive(async () => {
      const existing = await this.readRaw();
      if (existing) {
        await this.writeRaw({ ...existing, accessToken: token });
      } else {
        // Session partielle pendant le login — on ne peut pas écrire sans l'ensemble
        // Les anciennes clés séparées sont conservées en transit, saveSession() finalisera
        this._pendingAccessToken = token;
      }
    });
  }
  private _pendingAccessToken: string | null = null;

  async setRefreshToken(token: string): Promise<void> {
    await this.runExclusive(async () => {
      const existing = await this.readRaw();
      if (existing) {
        await this.writeRaw({ ...existing, refreshToken: token });
      } else {
        this._pendingRefreshToken = token;
      }
    });
  }
  private _pendingRefreshToken: string | null = null;

  async setUserData(userData: any): Promise<void> {
    await this.runExclusive(async () => {
      const existing = await this.readRaw();
      if (existing) {
        await this.writeRaw({ ...existing, userData });
      }
    });
  }

  async setUserRole(role: string): Promise<void> {
    await this.runExclusive(async () => {
      const existing = await this.readRaw();
      if (existing) {
        await this.writeRaw({ ...existing, userRole: role });
      }
    });
  }

  async isLoggedIn(): Promise<boolean> {
    return this.runExclusive(async () => {
      const d = await this.readRaw();
      return !!(d?.accessToken && d?.refreshToken);
    });
  }

  async clearAll(): Promise<void> {
    await this.runExclusive(async () => {
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
    });
  }

  async clearTokens(): Promise<void> {
    await this.runExclusive(async () => {
      const existing = await this.readRaw();
      if (existing) {
        await this.writeRaw({ ...existing, accessToken: '', refreshToken: '' });
      }
    });
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
        await this.runExclusive(() =>
          this.writeRaw({
            accessToken: at,
            refreshToken: rt,
            userId: userData._id ?? userData.id ?? '',
            userRole: role,
            userData,
          })
        );
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
