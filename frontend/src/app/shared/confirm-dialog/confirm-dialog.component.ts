import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (open) {
      <div class="backdrop" (click)="cancel.emit()">
        <div class="dialog" (click)="$event.stopPropagation()">
          <div class="dialog-icon"><span class="mat-icon" style="font-size:36px">delete_forever</span></div>
          <h3>{{ title }}</h3>
          <p>{{ message }}</p>
          <div class="dialog-actions">
            <button class="btn btn--secondary" (click)="cancel.emit()">Annulla</button>
            <button class="btn btn--danger" (click)="confirm.emit()">Elimina</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.95) translateY(-10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.15s ease-out forwards;
    }
    .dialog {
      background: #111827;
      border: 1px solid rgba(239,68,68,0.3);
      border-radius: 18px;
      padding: 32px 28px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      animation: scaleUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    .dialog-icon { font-size: 36px; margin-bottom: 16px; color: #ef4444; }
    h3 { font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px; margin-top: 0; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .dialog-actions { display: flex; gap: 12px; justify-content: center; }
  `]
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Conferma eliminazione';
  @Input() message = 'Sei sicuro? Questa azione è irreversibile.';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel  = new EventEmitter<void>();
}

