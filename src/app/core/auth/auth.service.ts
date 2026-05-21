import { Injectable, signal } from '@angular/core';
import { AuthTokenState } from '../models/auth.models';

const ACCESS_TOKEN_STORAGE_KEY = 'sloty.accessToken';

/**
 * Owns frontend authentication state for the Angular app.
 *
 * Keeping token storage in one service avoids scattering browser storage reads
 * across pages, guards, and interceptors. Future login/logout API integration
 * should update this service instead of duplicating token logic elsewhere.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly accessToken = signal<string | null>(this.readStoredToken());

  readonly token = this.accessToken.asReadonly();

  getTokenState(): AuthTokenState {
    return {
      accessToken: this.accessToken()
    };
  }

  getAccessToken(): string | null {
    return this.accessToken();
  }

  setAccessToken(token: string): void {
    this.accessToken.set(token);
    this.storage?.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  }

  clearAccessToken(): void {
    this.accessToken.set(null);
    this.storage?.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }

  isAuthenticated(): boolean {
    return this.accessToken() !== null;
  }

  private readStoredToken(): string | null {
    return this.storage?.getItem(ACCESS_TOKEN_STORAGE_KEY) ?? null;
  }

  private get storage(): Storage | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.sessionStorage;
  }
}
