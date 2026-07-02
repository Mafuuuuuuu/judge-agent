import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserResponse } from '../../core/services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton/loading-skeleton.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent, LoadingSkeletonComponent],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Gestione Utenti</h1>
          <p>Crea, modifica ed elimina gli utenti e assegna i ruoli di accesso</p>
        </div>
      </div>

      <div class="grid grid--2 mt-24">
        <!-- Tabella Utenti -->
        <div class="card">
          <div class="card-title flex-between">
            <span>Utenti Registrati</span>
            <button class="btn btn--secondary btn--sm" (click)="loadUsers()">
              <span class="mat-icon" style="font-size:16px;vertical-align:middle">refresh</span>
            </button>
          </div>

          @if (loading()) {
            <app-loading-skeleton [count]="4" [height]="55"></app-loading-skeleton>
          } @else if (users().length === 0) {
            <div class="empty-state">
              <span class="mat-icon" style="font-size:48px;color:#475569">people</span>
              <p>Nessun utente trovato</p>
            </div>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Ruolo</th>
                    <th>Creato il</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of users(); track u.id) {
                    <tr>
                      <td class="font-bold">{{ u.username }}</td>
                      <td>
                        <span class="badge" [class]="getRoleBadgeClass(u.role)">
                          {{ u.role | uppercase }}
                        </span>
                      </td>
                      <td class="text-sm text-muted">{{ u.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td>
                        <div class="flex gap-8">
                          <!-- Modifica Password -->
                          <button 
                            class="btn btn--secondary btn--sm" 
                            (click)="selectUserForPassword(u.username)"
                            title="Cambia password"
                          >
                            <span class="mat-icon" style="font-size:16px">key</span>
                          </button>

                          <!-- Cambia Ruolo -->
                          <button 
                            class="btn btn--secondary btn--sm" 
                            (click)="selectUserForRole(u)"
                            title="Cambia ruolo"
                          >
                            <span class="mat-icon" style="font-size:16px">manage_accounts</span>
                          </button>

                          <!-- Elimina (disabilitato per sé stessi) -->
                          <button 
                            class="btn btn--danger btn--sm" 
                            (click)="askDelete(u.username)"
                            [disabled]="isCurrentUser(u.username)"
                            [title]="isCurrentUser(u.username) ? 'Impossibile eliminare sé stessi' : 'Elimina utente'"
                          >
                            <span class="mat-icon" style="font-size:16px">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Sezione Form Dinamica -->
        <div class="flex-column gap-24">
          <!-- Registrazione nuovo utente -->
          <div class="card">
            <div class="card-title">Registra Nuovo Utente</div>
            <form (ngSubmit)="onRegisterSubmit()" #regForm="ngForm" style="display:flex;flex-direction:column;gap:16px">
              <div class="form-group">
                <label>USERNAME</label>
                <input 
                  type="text" 
                  name="newUsername"
                  class="form-control" 
                  [(ngModel)]="newUsername" 
                  required
                  placeholder="Inserisci username"
                  [disabled]="submitting()"
                />
              </div>

              <div class="form-group">
                <label>PASSWORD</label>
                <input 
                  type="password" 
                  name="newPassword"
                  class="form-control" 
                  [(ngModel)]="newPassword" 
                  required
                  placeholder="Minimo 6 caratteri"
                  [disabled]="submitting()"
                />
              </div>

              <div class="form-group">
                <label>RUOLO</label>
                <select 
                  name="newRole"
                  class="form-control" 
                  [(ngModel)]="newRole"
                  [disabled]="submitting()"
                >
                  <option value="viewer">Viewer (Sola lettura)</option>
                  <option value="analyst">Analyst (Scrittura e Valutazione)</option>
                  <option value="admin">Admin (Tutti i permessi)</option>
                </select>
              </div>

              <button 
                type="submit" 
                class="btn btn--primary" 
                [disabled]="regForm.invalid || newPassword.length < 6 || submitting()"
              >
                @if (submitting()) {
                  <span class="spinner"></span> Registrazione...
                } @else {
                  <span class="mat-icon" style="font-size:16px;vertical-align:middle">person_add</span> Crea Utente
                }
              </button>
            </form>
          </div>

          <!-- Modifica Password Utente (se selezionato) -->
          @if (selectedUsernameForPassword()) {
            <div class="card fade-in" style="border-color: rgba(99,102,241,0.3)">
              <div class="card-title flex-between">
                <span>Cambia Password per <strong>{{ selectedUsernameForPassword() }}</strong></span>
                <button class="btn btn--secondary btn--sm" (click)="selectedUsernameForPassword.set(null)">
                  <span class="mat-icon" style="font-size:14px">close</span>
                </button>
              </div>

              <div style="display:flex;flex-direction:column;gap:16px">
                <div class="form-group">
                  <label>NUOVA PASSWORD</label>
                  <input 
                    type="password" 
                    class="form-control" 
                    [(ngModel)]="editPasswordVal" 
                    placeholder="Minimo 6 caratteri"
                    [disabled]="editingPassword()"
                  />
                </div>

                <div class="flex gap-12">
                  <button 
                    class="btn btn--primary" 
                    [disabled]="editPasswordVal.length < 6 || editingPassword()" 
                    (click)="changePasswordSubmit()"
                  >
                    @if (editingPassword()) { <span class="spinner"></span> Aggiornamento... }
                    @else { Salva Password }
                  </button>
                  <button class="btn btn--secondary" (click)="selectedUsernameForPassword.set(null)">Annulla</button>
                </div>
              </div>
            </div>
          }

          <!-- Modifica Ruolo Utente (se selezionato) -->
          @if (selectedUserForRole()) {
            <div class="card fade-in" style="border-color: rgba(16,185,129,0.3)">
              <div class="card-title flex-between">
                <span>Cambia Ruolo per <strong>{{ selectedUserForRole()?.username }}</strong></span>
                <button class="btn btn--secondary btn--sm" (click)="selectedUserForRole.set(null)">
                  <span class="mat-icon" style="font-size:14px">close</span>
                </button>
              </div>

              <div style="display:flex;flex-direction:column;gap:16px">
                <div class="form-group">
                  <label>SELEZIONA RUOLO</label>
                  <select class="form-control" [(ngModel)]="editRoleVal" [disabled]="editingRole()">
                    <option value="viewer">Viewer (Sola lettura)</option>
                    <option value="analyst">Analyst (Scrittura e Valutazione)</option>
                    <option value="admin">Admin (Tutti i permessi)</option>
                  </select>
                </div>

                <div class="flex gap-12">
                  <button 
                    class="btn btn--primary" 
                    [disabled]="editingRole()" 
                    (click)="changeRoleSubmit()"
                  >
                    @if (editingRole()) { <span class="spinner"></span> Aggiornamento... }
                    @else { Salva Ruolo }
                  </button>
                  <button class="btn btn--secondary" (click)="selectedUserForRole.set(null)">Annulla</button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Dialog di conferma eliminazione -->
      <app-confirm-dialog
        [open]="showDeleteDialog()"
        [message]="getDeleteMessage()"
        (confirm)="doDeleteUser()"
        (cancel)="showDeleteDialog.set(false)">
      </app-confirm-dialog>
    </div>
  `,
  styles: [`
    .grid--2 {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 24px;
    }
    @media (max-width: 1024px) {
      .grid--2 {
        grid-template-columns: 1fr;
      }
    }
    .flex-column {
      display: flex;
      flex-direction: column;
    }
    .font-bold {
      font-weight: 600;
    }
    .badge--viewer {
      background: rgba(100, 116, 139, 0.1) !important;
      color: #94a3b8 !important;
      border: 1px solid rgba(100, 116, 139, 0.2) !important;
    }
    .badge--analyst {
      background: rgba(59, 130, 246, 0.1) !important;
      color: #60a5fa !important;
      border: 1px solid rgba(59, 130, 246, 0.2) !important;
    }
    .badge--admin {
      background: rgba(239, 68, 68, 0.1) !important;
      color: #f87171 !important;
      border: 1px solid rgba(239, 68, 68, 0.2) !important;
    }
  `]
})
export class UserManagementComponent implements OnInit {
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  users = signal<UserResponse[]>([]);
  loading = signal(true);
  submitting = signal(false);

  // Form registrazione
  newUsername = '';
  newPassword = '';
  newRole: 'admin' | 'analyst' | 'viewer' = 'viewer';

  // Stato modifiche
  selectedUsernameForPassword = signal<string | null>(null);
  editPasswordVal = '';
  editingPassword = signal(false);

  selectedUserForRole = signal<UserResponse | null>(null);
  editRoleVal: 'admin' | 'analyst' | 'viewer' = 'viewer';
  editingRole = signal(false);

  // Stato eliminazione
  showDeleteDialog = signal(false);
  pendingDeleteUser = signal<string | null>(null);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.authService.getUsers().subscribe({
      next: (res) => {
        this.users.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.toast.error('Errore nel caricamento della lista utenti.');
        this.loading.set(false);
      }
    });
  }

  isCurrentUser(username: string): boolean {
    const current = this.authService.currentUser();
    if (current) {
      return current.username === username;
    }
    // Fallback decodifica JWT
    return this.authService.getUsernameFromToken() === username;
  }

  getRoleBadgeClass(role: string): string {
    return `badge--${role}`;
  }

  onRegisterSubmit() {
    if (!this.newUsername || this.newPassword.length < 6) return;
    this.submitting.set(true);
    
    this.authService.registerUser({
      username: this.newUsername,
      password: this.newPassword,
      role: this.newRole
    }).subscribe({
      next: (user) => {
        this.toast.success(`Utente ${user.username} registrato correttamente!`);
        this.newUsername = '';
        this.newPassword = '';
        this.newRole = 'viewer';
        this.submitting.set(false);
        this.loadUsers();
      },
      error: (err) => {
        let msg = 'Errore durante la registrazione.';
        if (err.status === 409) {
          msg = 'Questo username è già registrato.';
        } else if (err.error?.detail) {
          msg = err.error.detail;
        }
        this.toast.error(msg);
        this.submitting.set(false);
      }
    });
  }

  // Modifica Password
  selectUserForPassword(username: string) {
    this.selectedUsernameForPassword.set(username);
    this.editPasswordVal = '';
  }

  changePasswordSubmit() {
    const username = this.selectedUsernameForPassword();
    if (!username || this.editPasswordVal.length < 6) return;
    this.editingPassword.set(true);

    this.authService.changePassword(username, this.editPasswordVal).subscribe({
      next: () => {
        this.toast.success(`Password dell'utente ${username} aggiornata.`);
        this.selectedUsernameForPassword.set(null);
        this.editingPassword.set(false);
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Errore aggiornamento password.');
        this.editingPassword.set(false);
      }
    });
  }

  // Modifica Ruolo
  selectUserForRole(user: UserResponse) {
    this.selectedUserForRole.set(user);
    this.editRoleVal = user.role;
  }

  changeRoleSubmit() {
    const user = this.selectedUserForRole();
    if (!user) return;
    this.editingRole.set(true);

    this.authService.changeRole(user.username, this.editRoleVal).subscribe({
      next: () => {
        this.toast.success(`Ruolo dell'utente ${user.username} aggiornato a ${this.editRoleVal}.`);
        this.selectedUserForRole.set(null);
        this.editingRole.set(false);
        this.loadUsers();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Errore aggiornamento ruolo.');
        this.editingRole.set(false);
      }
    });
  }

  // Eliminazione
  askDelete(username: string) {
    this.pendingDeleteUser.set(username);
    this.showDeleteDialog.set(true);
  }

  doDeleteUser() {
    const username = this.pendingDeleteUser();
    if (!username) return;

    this.authService.deleteUser(username).subscribe({
      next: () => {
        this.toast.success(`Utente ${username} eliminato.`);
        this.showDeleteDialog.set(false);
        this.pendingDeleteUser.set(null);
        this.loadUsers();
      },
      error: (err) => {
        this.toast.error(err.error?.detail || 'Errore durante l\'eliminazione.');
        this.showDeleteDialog.set(false);
        this.pendingDeleteUser.set(null);
      }
    });
  }

  getDeleteMessage(): string {
    const user = this.pendingDeleteUser();
    return `Vuoi davvero eliminare l'utente ${user}? L'azione è irreversibile.`;
  }
}
