import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';

/**
 * Adds the current access token to outgoing HTTP requests when one exists.
 *
 * Interceptors are the right place for this because pages and feature services
 * should not manually repeat authorization header setup for every request.
 * The exact backend endpoints will be introduced in later sprints.
 */
export const authTokenInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(AuthService).getAccessToken();

  if (token === null) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};
