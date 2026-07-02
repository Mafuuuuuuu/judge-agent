import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  { 
    path: '', 
    redirectTo: 'dashboard', 
    pathMatch: 'full' 
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst', 'viewer'] }
  },
  {
    path: 'userchat',
    loadComponent: () => import('./features/userchat/userchat-list/userchat-list.component').then(m => m.UserchatListComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst', 'viewer'] }
  },
  {
    path: 'userchat/insert',
    loadComponent: () => import('./features/userchat/userchat-insert/userchat-insert.component').then(m => m.UserchatInsertComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst'] }
  },
  {
    path: 'chatlogs',
    loadComponent: () => import('./features/chatlogs/chatlogs-list/chatlogs-list.component').then(m => m.ChatlogsListComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst', 'viewer'] }
  },
  {
    path: 'chatlogs/insert',
    loadComponent: () => import('./features/chatlogs/chatlogs-insert/chatlogs-insert.component').then(m => m.ChatlogsInsertComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst'] }
  },
  {
    path: 'evaluations',
    loadComponent: () => import('./features/evaluations/evaluations-list/evaluations-list.component').then(m => m.EvaluationsListComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst', 'viewer'] }
  },
  {
    path: 'analytics',
    loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [authGuard],
    data: { roles: ['admin', 'analyst', 'viewer'] }
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./features/admin/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard],
    data: { roles: ['admin'] }
  },
  { path: '**', redirectTo: 'dashboard' }
];
