import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kpi-card card">
      <div class="kpi-icon" [class]="'kpi-icon--' + variant"><span class="mat-icon">{{ icon }}</span></div>
      <div class="kpi-body">
        <div class="kpi-label">{{ label }}</div>
        <div class="kpi-value">{{ value }}</div>
        @if (sub) {
          <div class="kpi-sub">{{ sub }}</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 20px;
      transition: 0.2s ease;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99,102,241,0.15); }
    }
    .kpi-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      flex-shrink: 0;
      &--indigo { background: rgba(99,102,241,0.12); color: #6366f1; }
      &--purple { background: rgba(139,92,246,0.12); color: #7c3aed; }
      &--amber  { background: rgba(217,119,6,0.12);  color: #d97706; }
      &--success{ background: rgba(5,150,105,0.12);  color: #059669; }
    }
    .kpi-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 28px;
      font-weight: 800;
      color: #1e1b4b;
      line-height: 1;
      letter-spacing: -0.5px;
    }
    .kpi-sub {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }
  `]
})
export class KpiCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() icon = '📊';
  @Input() sub = '';
  @Input() variant: 'indigo' | 'purple' | 'amber' | 'success' = 'indigo';
}
