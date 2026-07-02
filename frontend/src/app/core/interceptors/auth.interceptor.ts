import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const token = authService.getToken();
  let authReq = req;

  // Aggiunge il token Bearer a tutte le richieste verso /api tranne login
  if (token && req.url.startsWith('/api') && !req.url.includes('/api/auth/login')) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Token non valido o scaduto
        authService.logout();
        toastService.error('Sessione scaduta o non valida. Effettua nuovamente il login.');
        router.navigate(['/login']);
      } else if (error.status === 403) {
        // Privilegi insufficienti
        toastService.error('Non hai i permessi necessari per eseguire questa azione.');
      } else if (error.status === 429) {
        // Troppe richieste (rate limit)
        toastService.error('Troppe richieste in breve tempo. Riprova tra qualche istante.');
      }
      return throwError(() => error);
    })
  );
};
