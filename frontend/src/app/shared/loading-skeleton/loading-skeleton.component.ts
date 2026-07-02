import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrap">
      @for (i of rows; track i) {
        <div class="skeleton skeleton-row" [style.height.px]="height"></div>
      }
    </div>
  `,
  styles: [`
    .skeleton-wrap { display: flex; flex-direction: column; gap: 12px; }
    .skeleton-row { border-radius: 10px; }
  `]
})
export class LoadingSkeletonComponent {
  @Input() count = 3;
  @Input() height = 56;
  get rows() { return Array(this.count).fill(0); }
}
