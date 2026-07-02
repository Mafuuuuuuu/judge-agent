import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/sidebar/sidebar.component';
import { ToastComponent } from './shared/toast/toast.component';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastComponent],
  template: `
    <div class="app-shell">
      @if (isLoggedIn()) {
        <app-sidebar></app-sidebar>
      }
      <main class="main-content" [class.main-content--full]="!isLoggedIn()">
        <router-outlet></router-outlet>
      </main>
    </div>
    <app-toast></app-toast>
  `,
  styles: [`
    .main-content--full {
      margin-left: 0 !important;
    }
  `]
})
export class AppComponent {
  private authService = inject(AuthService);
  isLoggedIn = this.authService.isLoggedIn;
}
