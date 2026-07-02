import { Component, Input, OnChanges, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

@Component({
  selector: 'app-doughnut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-container"><canvas #doughnutCanvas></canvas></div>`,
  styles: [`.chart-container { position: relative; width: 100%; height: 200px; }`]
})
export class DoughnutChartComponent implements OnChanges, OnDestroy {
  @Input() data: number[] = [];
  @Input() labels: string[] = [];
  @Input() colors: string[] = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  @Input() label = 'Distribuzione';

  @ViewChild('doughnutCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngOnChanges(): void { this.render(); }

  private render() {
    if (this.chart) { this.chart.destroy(); }
    if (!this.data || this.data.length === 0) return;
    
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.labels,
        datasets: [{
          label: this.label,
          data: this.data,
          backgroundColor: this.colors,
          borderWidth: 2,
          borderColor: '#e5e7eb',
          hoverOffset: 16
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: {
              color: '#6b7280',
              font: { size: 11, family: "'Inter', sans-serif" },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${Math.round((ctx.raw as number / this.data.reduce((a, b) => a + b, 0)) * 100)}%)`
            }
          }
        },
        cutout: '65%'
      }
    });
  }

  ngOnDestroy() { this.chart?.destroy(); }
}
