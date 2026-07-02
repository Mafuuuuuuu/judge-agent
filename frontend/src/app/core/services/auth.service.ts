import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface UserResponse {
  id: string;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenKey = 'judge_agent_token';
  
  // Signals per gestire lo stato in modo reattivo
  private tokenSignal = signal<string | null>(localStorage.getItem(this.tokenKey));
  currentUser = signal<UserResponse | null>(null);
  
  isLoggedIn = computed(() => !!this.tokenSignal());
  
  constructor(private http: HttpClient) {
    // Se c'è un token all'avvio, proviamo a caricare i dettagli dell'utente
    if (this.isLoggedIn()) {
      this.fetchCurrentUser().subscribe({
        error: () => this.logout() // Se il token è non valido o scaduto, eseguiamo il logout
      });
    }
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  login(username: string, password: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/login', { username, password }).pipe(
      tap(res => {
        localStorage.setItem(this.tokenKey, res.access_token);
        this.tokenSignal.set(res.access_token);
      }),
      tap(() => {
        this.fetchCurrentUser().subscribe();
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.tokenSignal.set(null);
    this.currentUser.set(null);
  }

  fetchCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>('/api/auth/me').pipe(
      tap(user => {
        this.currentUser.set(user);
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  // Decodifica manuale del payload JWT per una verifica immediata del ruolo (senza attendere il server)
  getRoleFromToken(): 'admin' | 'analyst' | 'viewer' | null {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.role || null;
    } catch (e) {
      return null;
    }
  }

  getUsernameFromToken(): string | null {
    const token = this.tokenSignal();
    if (!token) return null;
    try {
      const payloadBase64 = token.split('.')[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);
      return payload.sub || null;
    } catch (e) {
      return null;
    }
  }

  hasRole(allowedRoles: string[]): boolean {
    // Preferiamo il ruolo restituito da /me, altrimenti ripieghiamo su quello decodificato dal JWT
    const role = this.currentUser()?.role || this.getRoleFromToken();
    if (!role) return false;
    return allowedRoles.includes(role);
  }

  // Metodi amministrativi per gestione utenti (solo admin)
  getUsers(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>('/api/auth/users');
  }

  registerUser(payload: any): Observable<UserResponse> {
    return this.http.post<UserResponse>('/api/auth/register', payload);
  }

  changeRole(username: string, role: string): Observable<any> {
    return this.http.patch(`/api/auth/users/${encodeURIComponent(username)}/role`, { role });
  }

  changePassword(username: string, new_password: string): Observable<any> {
    return this.http.patch(`/api/auth/users/${encodeURIComponent(username)}/password`, { new_password });
  }

  deleteUser(username: string): Observable<any> {
    return this.http.delete(`/api/auth/users/${encodeURIComponent(username)}`);
  }
}
