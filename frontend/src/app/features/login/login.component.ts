import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
      
      <div class="login-card">
        <div class="login-header">
          <div class="logo-container">
            <span class="mat-icon logo-icon">shield_lock</span>
          </div>
          <h1>Judge Agent v2</h1>
          <p>Quality Intelligence Layer</p>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="login-form">
          <div class="form-group">
            <label for="username">USERNAME</label>
            <div class="input-wrapper">
              <span class="mat-icon input-icon">person</span>
              <input 
                type="text" 
                id="username" 
                name="username" 
                class="form-control" 
                [(ngModel)]="username" 
                required 
                #usernameInput="ngModel"
                placeholder="Inserisci il tuo username"
                [disabled]="loading()"
              />
            </div>
            @if (usernameInput.touched && usernameInput.invalid) {
              <span class="error-text">Username obbligatorio</span>
            }
          </div>

          <div class="form-group">
            <label for="password">PASSWORD</label>
            <div class="input-wrapper">
              <span class="mat-icon input-icon">lock</span>
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                id="password" 
                name="password" 
                class="form-control" 
                [(ngModel)]="password" 
                required 
                #passwordInput="ngModel"
                placeholder="Inserisci la tua password"
                [disabled]="loading()"
              />
              <button 
                type="button" 
                class="password-toggle" 
                (click)="showPassword.set(!showPassword())"
                tabindex="-1"
              >
                <span class="mat-icon">{{ showPassword() ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            @if (passwordInput.touched && passwordInput.invalid) {
              <span class="error-text">Password obbligatoria</span>
            }
          </div>

          <button 
            type="submit" 
            class="btn btn--primary login-btn" 
            [disabled]="loginForm.invalid || loading()"
          >
            @if (loading()) {
              <span class="spinner"></span> Accesso in corso...
            } @else {
              <span class="mat-icon" style="font-size: 16px; margin-right: 8px;">login</span> Accedi
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #f8f7ff;
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      z-index: 9999;
      font-family: 'Inter', sans-serif;
    }

    /* Glow Orbs */
    .glow-orb {
      position: absolute;
      width: 400px;
      height: 400px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.18;
      z-index: 1;
      pointer-events: none;
    }
    .glow-orb-1 {
      top: -100px;
      left: -100px;
      background: #6366f1;
      animation: drift 15s infinite alternate ease-in-out;
    }
    .glow-orb-2 {
      bottom: -100px;
      right: -100px;
      background: #8b5cf6;
      animation: drift 20s infinite alternate-reverse ease-in-out;
    }

    @keyframes drift {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(50px, 50px) scale(1.2); }
    }

    /* Login Card */
    .login-card {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 420px;
      background: #ffffff;
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 60px rgba(99, 102, 241, 0.12);
      animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .login-header {
      text-align: center;
      margin-bottom: 35px;
    }

    .logo-container {
      width: 60px;
      height: 60px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.3);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
    }

    .logo-icon {
      color: #6366f1;
      font-size: 28px;
    }

    .login-header h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e1b4b;
      margin: 0 0 6px;
      letter-spacing: -0.5px;
    }

    .login-header p {
      font-size: 14px;
      color: #6b7280;
      margin: 0;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #6b7280;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      color: #9ca3af;
      font-size: 18px;
      pointer-events: none;
    }

    .form-control {
      width: 100%;
      background: #f8f7ff;
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 10px;
      padding: 12px 16px 12px 42px;
      color: #1e1b4b;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .form-control::placeholder { color: #9ca3af; }

    .form-control:focus {
      outline: none;
      border-color: #6366f1;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    }

    .password-toggle {
      position: absolute;
      right: 12px;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
    }

    .password-toggle:hover {
      color: #6366f1;
    }

    .error-text {
      display: block;
      font-size: 12px;
      color: #dc2626;
      margin-top: 6px;
    }

    .login-btn {
      margin-top: 10px;
      width: 100%;
      height: 44px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      cursor: pointer;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      border-radius: 10px;
      color: white;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
    }

    .login-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
    }

    .login-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Spinner */
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  loading = signal(false);
  showPassword = signal(false);

  onSubmit() {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Accesso effettuato con successo!');
        
        // Recuperiamo il returnUrl se presente, altrimenti andiamo su dashboard
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (err) => {
        this.loading.set(false);
        let errorMsg = 'Impossibile completare l\'accesso.';
        
        if (err.status === 403) {
          errorMsg = 'Account non attivo o disabilitato.';
        } else if (err.status === 401) {
          errorMsg = 'Credenziali non valide (username o password errati).';
        } else if (err.status === 429) {
          errorMsg = 'Troppi tentativi di login. Riprova più tardi (Rate Limit superato).';
        } else if (err.status === 0) {
          errorMsg = 'Nessuna connessione con il server backend.';
        } else if (err.error?.detail) {
          errorMsg = err.error.detail;
        }

        this.toastService.error(errorMsg);
      }
    });
  }
}
