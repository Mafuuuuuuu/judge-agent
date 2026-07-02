import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('toast', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ],
  template: `
    <div class="toast-container">
      @for (t of svc.toasts(); track t.id) {
        <div class="toast toast--{{t.type}}" @toast (click)="svc.dismiss(t.id)">
          <span class="toast-icon mat-icon">{{ icon(t.type) }}</span>
          <span>{{ t.message }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      pointer-events: all;
      max-width: 360px;
      backdrop-filter: blur(12px);
      border: 1px solid;
    }
    .toast--success {
      background: rgba(16,185,129,0.15);
      border-color: rgba(16,185,129,0.4);
      color: #10b981;
    }
    .toast--error {
      background: rgba(239,68,68,0.15);
      border-color: rgba(239,68,68,0.4);
      color: #ef4444;
    }
    .toast--info {
      background: rgba(99,102,241,0.15);
      border-color: rgba(99,102,241,0.4);
      color: #6366f1;
    }
    .toast-icon { font-size: 18px; }
  `]
})
export class ToastComponent {
  svc = inject(ToastService);
  icon(type: string) {
    return type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
  }
}
