import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

/**
 * Top-level route definitions for Sprint 0.
 *
 * Routes map URL paths to standalone page components. Lazy `loadComponent`
 * keeps future feature bundles separate and makes the app structure obvious.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    title: 'تسجيل الدخول | Sloty',
    loadComponent: () =>
      import('./features/auth/login-page.component').then(
        (component) => component.LoginPageComponent
      )
  },
  {
    path: 'dashboard',
    title: 'لوحة التحكم | Sloty',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard-page.component').then(
        (component) => component.DashboardPageComponent
      )
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
