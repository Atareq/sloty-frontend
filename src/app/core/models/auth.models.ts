/**
 * Frontend-side authentication token state.
 *
 * This is not a backend response contract. It only describes what the Angular
 * app needs to know while Sprint 1 authentication APIs are still undefined.
 */
export interface AuthTokenState {
  readonly accessToken: string | null;
}

/**
 * Product roles documented for Sloty MVP planning.
 *
 * Keep role names centralized so future navigation and guards use one typed
 * source instead of repeated string literals.
 */
export type SlotyUserRole =
  | 'platform_super_admin'
  | 'club_owner'
  | 'club_manager'
  | 'court_staff';
