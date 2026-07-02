import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(ToastService);

  if (!authService.isLoggedIn()) {
    // Se non è loggato, reindirizza a login
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Verifica dei ruoli consentiti (se presenti in data.roles)
  const allowedRoles = route.data?.['roles'] as string[];
  if (allowedRoles && allowedRoles.length > 0) {
    if (!authService.hasRole(allowedRoles)) {
      toastService.error('Accesso negato: ruolo non autorizzato.');
      router.navigate(['/dashboard']);
      return false;
    }
  }

  return true;
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    // Se è già loggato, reindirizza alla dashboard
    router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
