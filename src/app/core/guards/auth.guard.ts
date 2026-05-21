import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../auth/auth.service';

/**
 * Protects routes that should only be visible after authentication.
 *
 * A route guard runs before Angular activates a route. If the user has no
 * frontend token yet, the guard redirects to `/login` instead of rendering the
 * private page.
 */
export const authGuard: CanActivateFn = (): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
