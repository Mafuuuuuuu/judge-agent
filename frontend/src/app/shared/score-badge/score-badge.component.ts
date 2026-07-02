import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="score-badge" [class]="badgeClass">
      {{ value !== null && value !== undefined ? (value | number:'1.1-1') : 'N/A' }}
    </span>
  `,
  styles: [`
    .score-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .score-excellent { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .score-good      { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
    .score-warning   { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
    .score-danger    { background: rgba(239,68,68,0.15);  color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .score-null      { background: rgba(75,85,99,0.2);    color: #6b7280; border: 1px solid rgba(75,85,99,0.3); }
  `]
})
export class ScoreBadgeComponent {
  @Input() set value(v: number | null | undefined) {
    if (v === null || v === undefined) { this._value = null; return; }
    const n = Number(v);
    this._value = isNaN(n) ? null : n;
  }
  get value(): number | null { return this._value; }
  _value: number | null = null;

  get badgeClass(): string {
    if (this._value === null || this._value === undefined) return 'score-null';
    if (this._value >= 8) return 'score-excellent';
    if (this._value >= 6) return 'score-good';
    if (this._value >= 4) return 'score-warning';
    return 'score-danger';
  }
}
