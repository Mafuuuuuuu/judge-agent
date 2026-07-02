import { Component, inject, computed, HostListener, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles?: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar" [class.sidebar--collapsed]="collapsed">

      <!-- Toggle sul bordo destro, centrato verticalmente -->
      <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="collapsed ? 'Espandi' : 'Comprimi'">
        <span class="mat-icon">{{ collapsed ? 'chevron_right' : 'chevron_left' }}</span>
      </button>

      <!-- Wrapper che clippa il contenuto interno -->
      <div class="sidebar-inner">

        <div class="sidebar-logo">
          <div class="logo-icon"><span class="mat-icon" style="font-size:22px;color:#fff">gavel</span></div>
          <div class="logo-text">
            <span class="logo-title">Judge Agent</span>
            <span class="logo-sub">v2 · Quality Layer</span>
          </div>
        </div>

        <div *ngIf="currentUser()" class="user-profile"
             (click)="collapsed ? toggleSidebar() : toggleProfile()"
             [class.user-profile--open]="profileOpen && !collapsed"
             [title]="collapsed ? currentUser()?.username : ''">
          <div class="user-avatar"><span class="mat-icon">face</span></div>
          <div class="user-info">
            <span class="user-username">{{ currentUser()?.username }}</span>
            <span class="user-role-badge" [class]="'role--' + currentUser()?.role">{{ currentUser()?.role | uppercase }}</span>
          </div>
          <span class="mat-icon profile-chevron">{{ profileOpen ? 'expand_less' : 'expand_more' }}</span>
        </div>

        <div *ngIf="profileOpen && !collapsed && currentUser()" class="profile-panel">
          <div class="profile-panel-row">
            <span class="mat-icon profile-panel-icon">badge</span>
            <div>
              <div class="profile-panel-label">ID Utente</div>
              <div class="profile-panel-value">{{ currentUser()?.id }}</div>
            </div>
          </div>
          <div class="profile-panel-row">
            <span class="mat-icon profile-panel-icon">shield</span>
            <div>
              <div class="profile-panel-label">Ruolo</div>
              <div class="profile-panel-value">
                <span class="user-role-badge" [class]="'role--' + currentUser()?.role">{{ currentUser()?.role | uppercase }}</span>
              </div>
            </div>
          </div>
          <div class="profile-panel-row">
            <span class="mat-icon profile-panel-icon">calendar_today</span>
            <div>
              <div class="profile-panel-label">Membro dal</div>
              <div class="profile-panel-value">{{ currentUser()?.created_at | date:'dd/MM/yyyy' }}</div>
            </div>
          </div>

          <!-- Bottone cambia password -->
          <button class="pw-toggle-btn" (click)="togglePwForm()">
            <span class="mat-icon" style="font-size:14px">lock_reset</span>
            {{ pwFormOpen ? 'Annulla' : 'Cambia password' }}
          </button>

          <!-- Form cambia password -->
          <div *ngIf="pwFormOpen" class="pw-form">
            <div *ngIf="pwSuccess" class="pw-msg pw-msg--ok">
              <span class="mat-icon" style="font-size:14px">check_circle</span> Password aggiornata!
            </div>
            <div *ngIf="pwError" class="pw-msg pw-msg--err">
              <span class="mat-icon" style="font-size:14px">error</span> {{ pwError }}
            </div>
            <input class="pw-input" type="password" placeholder="Nuova password" [(ngModel)]="pwNew" [disabled]="pwLoading" (keyup.enter)="submitPw()" />
            <input class="pw-input" type="password" placeholder="Conferma password" [(ngModel)]="pwConfirm" [disabled]="pwLoading" (keyup.enter)="submitPw()" />
            <button class="pw-submit-btn" (click)="submitPw()" [disabled]="pwLoading || !pwNew || !pwConfirm">
              <span *ngIf="pwLoading" class="spinner" style="width:12px;height:12px;border-width:2px"></span>
              <span *ngIf="!pwLoading" class="mat-icon" style="font-size:14px">save</span>
              {{ pwLoading ? 'Salvataggio…' : 'Salva' }}
            </button>
          </div>
        </div>

        <nav class="sidebar-nav">
          <a *ngFor="let item of filteredNavItems()"
             class="nav-item"
             [routerLink]="item.route"
             routerLinkActive="nav-item--active"
             [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
             [title]="collapsed ? item.label : ''">
            <span class="nav-icon mat-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="footer-content">
            <div class="api-status">
              <span class="status-dot"></span>
              <span class="api-label">API :8000</span>
            </div>
            <button class="logout-btn" (click)="onLogout()" title="Disconnetti">
              <span class="mat-icon">logout</span>
            </button>
          </div>
        </div>

      </div><!-- /sidebar-inner -->
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      left: 0; top: 0; bottom: 0;
      width: 240px;
      background: #ffffff;
      border-right: 1px solid rgba(99,102,241,0.15);
      box-shadow: 2px 0 12px rgba(99,102,241,0.07);
      display: flex;
      flex-direction: column;
      z-index: 100;
      overflow: visible;
      transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    .sidebar--collapsed { width: 64px; }
    .sidebar--collapsed .logo-text,
    .sidebar--collapsed .user-info,
    .sidebar--collapsed .profile-chevron,
    .sidebar--collapsed .nav-label,
    .sidebar--collapsed .api-label { opacity: 0; width: 0; overflow: hidden; }
    .sidebar--collapsed .sidebar-logo { justify-content: center; gap: 0; }
    .sidebar--collapsed .user-profile { justify-content: center; padding: 8px; gap: 0; width: 42px; margin-left: auto; margin-right: auto; }
    .sidebar--collapsed .user-info { flex: 0; }
    .sidebar--collapsed .profile-chevron { margin-left: 0; flex: 0; }
    .sidebar--collapsed .nav-item { justify-content: center; padding: 10px 0; gap: 0; }
    .sidebar--collapsed .footer-content { flex-direction: column; gap: 10px; padding: 0; align-items: center; }

    /* Wrapper interno che clippa il contenuto ma non il toggle */
    .sidebar-inner {
      width: 100%;
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 20px 12px;
    }

    /* Toggle button sul bordo centrale */
    .sidebar-toggle {
      position: absolute;
      right: -13px;
      top: 50%;
      transform: translateY(-50%);
      width: 26px; height: 26px;
      background: #ffffff;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 50%;
      color: #6366f1;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 2px 0 8px rgba(99,102,241,0.15);
      transition: background 0.15s, box-shadow 0.15s;
      z-index: 101;
      padding: 0;
    }
    .sidebar-toggle .mat-icon { font-size: 16px; }
    .sidebar-toggle:hover { background: rgba(99,102,241,0.08); box-shadow: 2px 0 14px rgba(99,102,241,0.25); }
    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 4px 20px;
      border-bottom: 1px solid rgba(99,102,241,0.1);
      transition: justify-content 0.25s;
    }
    .logo-icon {
      width: 40px; height: 40px; flex-shrink: 0;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .logo-text { flex: 1; min-width: 0; overflow: hidden; transition: opacity 0.2s; white-space: nowrap; }
    .logo-title { display: block; font-size: 14px; font-weight: 700; color: #1e1b4b; }
    .logo-sub { display: block; font-size: 10px; color: #9ca3af; letter-spacing: 0.04em; }

    /* Profilo utente in sidebar */
    .user-profile {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 8px;
      background: rgba(99,102,241,0.04);
      border: 1px solid rgba(99,102,241,0.12);
      border-radius: 12px;
      margin: 14px 0 0;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, justify-content 0.25s;
      user-select: none;
      overflow: hidden;
      &:hover { background: rgba(99,102,241,0.09); border-color: rgba(99,102,241,0.25); }
      &--open { background: rgba(99,102,241,0.09); border-color: rgba(99,102,241,0.3); border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none; }
    }
    .profile-chevron { font-size: 16px; color: #9ca3af; margin-left: auto; flex-shrink: 0; transition: opacity 0.2s; }
    .profile-panel {
      background: rgba(99,102,241,0.04);
      border: 1px solid rgba(99,102,241,0.3);
      border-top: none;
      border-radius: 0 0 12px 12px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .profile-panel-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }
    .profile-panel-icon { font-size: 16px; color: #6366f1; margin-top: 2px; flex-shrink: 0; }
    .profile-panel-label { font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
    .profile-panel-value { font-size: 12px; color: #1e1b4b; font-weight: 500; word-break: break-all; }
    .user-avatar {
      width: 34px; height: 34px; flex-shrink: 0;
      border-radius: 50%;
      background: rgba(99,102,241,0.12);
      border: 1px solid rgba(99,102,241,0.3);
      display: flex; align-items: center; justify-content: center;
      color: #6366f1;
    }
    .user-avatar .mat-icon { font-size: 20px; }
    .user-info { flex: 1; min-width: 0; overflow: hidden; transition: opacity 0.2s; white-space: nowrap; display: flex; flex-direction: column; gap: 2px; }
    .user-username { display: block; font-size: 13px; font-weight: 600; color: #1e1b4b; }
    .user-role-badge { font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 4px; width: fit-content; display: inline-block; }
    .role--viewer { background: rgba(107,114,128,0.1); color: #6b7280; }
    .role--analyst { background: rgba(59,130,246,0.1); color: #3b82f6; }
    .role--admin { background: rgba(220,38,38,0.1); color: #dc2626; }

    .sidebar-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; margin-top: 8px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      color: #6b7280; font-size: 13px; font-weight: 500;
      transition: background 0.15s, color 0.15s, justify-content 0.25s;
      text-decoration: none; white-space: nowrap; overflow: hidden;
      &:hover { background: rgba(99,102,241,0.07); color: #1e1b4b; }
    }
    .nav-item--active {
      background: rgba(99,102,241,0.1) !important; color: #6366f1 !important;
      font-weight: 600; border: 1px solid rgba(99,102,241,0.25);
    }
    .nav-icon { font-size: 18px; width: 22px; text-align: center; flex-shrink: 0; }
    .nav-label { overflow: hidden; transition: opacity 0.2s; }

    .sidebar-footer { border-top: 1px solid rgba(99,102,241,0.1); padding-top: 14px; }
    .footer-content { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; transition: flex-direction 0.2s; }
    .api-status { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #9ca3af; }
    .api-label { overflow: hidden; transition: opacity 0.2s; white-space: nowrap; }
    .status-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
      background: #059669; box-shadow: 0 0 6px #059669; animation: pulse 2s infinite;
    }
    .logout-btn {
      background: rgba(220,38,38,0.07); border: 1px solid rgba(220,38,38,0.2);
      border-radius: 8px; color: #dc2626; width: 32px; height: 32px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
      &:hover { background: rgba(220,38,38,0.15); }
    }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }

    .pw-toggle-btn {
      display: flex; align-items: center; gap: 6px;
      width: 100%; padding: 6px 8px; margin-top: 4px;
      background: none; border: 1px dashed rgba(99,102,241,0.3);
      border-radius: 8px; color: #6366f1; font-size: 11px; font-weight: 600;
      cursor: pointer; transition: background 0.15s, border-color 0.15s;
      &:hover { background: rgba(99,102,241,0.07); border-color: rgba(99,102,241,0.5); }
    }
    .pw-form {
      display: flex; flex-direction: column; gap: 8px; margin-top: 4px;
    }
    .pw-input {
      width: 100%; padding: 7px 10px; font-size: 12px;
      background: #fff; border: 1px solid rgba(99,102,241,0.25);
      border-radius: 8px; color: #1e1b4b; font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
      &:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
      &::placeholder { color: #9ca3af; }
      &:disabled { opacity: 0.6; }
    }
    .pw-submit-btn {
      display: flex; align-items: center; justify-content: center; gap: 6px;
      width: 100%; padding: 7px; font-size: 12px; font-weight: 600;
      background: linear-gradient(135deg,#6366f1,#8b5cf6); color: #fff;
      border: none; border-radius: 8px; cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
      &:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .pw-msg {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; padding: 6px 8px; border-radius: 6px;
      &--ok  { background: rgba(5,150,105,0.1); color: #059669; }
      &--err { background: rgba(220,38,38,0.1); color: #dc2626; }
    }
  `]
})
export class SidebarComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser;
  profileOpen = false;
  collapsed = false;

  pwFormOpen = false;
  pwNew = '';
  pwConfirm = '';
  pwLoading = false;
  pwError = '';
  pwSuccess = false;

  toggleProfile() { this.profileOpen = !this.profileOpen; }

  togglePwForm() {
    this.pwFormOpen = !this.pwFormOpen;
    this.pwNew = '';
    this.pwConfirm = '';
    this.pwError = '';
    this.pwSuccess = false;
  }

  submitPw() {
    this.pwError = '';
    this.pwSuccess = false;
    if (this.pwNew.length < 6) { this.pwError = 'Minimo 6 caratteri.'; return; }
    if (this.pwNew !== this.pwConfirm) { this.pwError = 'Le password non coincidono.'; return; }
    const username = this.currentUser()?.username;
    if (!username) return;
    this.pwLoading = true;
    this.authService.changePassword(username, this.pwNew).subscribe({
      next: () => {
        this.pwLoading = false;
        this.pwSuccess = true;
        this.pwNew = '';
        this.pwConfirm = '';
        setTimeout(() => { this.pwSuccess = false; this.pwFormOpen = false; }, 2000);
      },
      error: (err: any) => {
        this.pwLoading = false;
        this.pwError = err?.error?.detail || 'Errore durante il salvataggio.';
      }
    });
  }

  ngOnInit() {
    this.checkWidth(window.innerWidth);
  }

  @HostListener('window:resize', ['$event.target.innerWidth'])
  onResize(width: number) {
    this.checkWidth(width);
  }

  private checkWidth(width: number) {
    const shouldCollapse = width <= 900;
    if (shouldCollapse !== this.collapsed) {
      this.collapsed = shouldCollapse;
      document.documentElement.style.setProperty('--sidebar-w', this.collapsed ? '64px' : '240px');
    }
  }

  toggleSidebar() {
    this.collapsed = !this.collapsed;
    if (this.collapsed) {
      this.profileOpen = false;
      document.documentElement.style.setProperty('--sidebar-w', '64px');
    } else {
      document.documentElement.style.setProperty('--sidebar-w', '240px');
    }
  }

  navItems: NavItem[] = [
    { label: 'Dashboard',    icon: 'dashboard', route: '/dashboard' },
    { label: 'User Chats',   icon: 'forum', route: '/userchat' },
    { label: 'Chat Logs',    icon: 'description', route: '/chatlogs' },
    { label: 'Valutazioni',  icon: 'star_rate', route: '/evaluations' },
    { label: 'Analytics',    icon: 'monitoring', route: '/analytics' },
    { label: 'Gestione Utenti', icon: 'manage_accounts', route: '/admin/users', roles: ['admin'] },
  ];

  filteredNavItems = computed(() => {
    return this.navItems.filter(item => {
      if (!item.roles) return true;
      return this.authService.hasRole(item.roles);
    });
  });

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
