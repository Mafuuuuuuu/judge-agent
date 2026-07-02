import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-container"><canvas #barCanvas></canvas></div>`,
  styles: [`.chart-container { position: relative; width: 100%; height: 320px; }`]
})
export class BarChartComponent implements AfterViewInit, OnDestroy {
  @Input() data: number[] = [];
  @Input() labels: string[] = [];
  @Input() color = '#6366f1';
  @Input() label = 'Frequenza';
  @Input() horizontal = false;
  @Input() maxValue: number | null = null;

  @ViewChild('barCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  ngAfterViewInit(): void {
    setTimeout(() => this.render(), 0);
  }

  private render() {
    if (this.chart) { this.chart.destroy(); }
    if (!this.data || this.data.length === 0) return;

    const ctx = this.canvasRef.nativeElement;
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.labels,
        datasets: [{
          label: this.label,
          data: this.data,
          backgroundColor: this.color,
          borderRadius: 6,
          borderWidth: 0,
          barThickness: 12,
          maxBarThickness: 16
        }]
      },
      options: {
        indexAxis: this.horizontal ? 'y' : 'x',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: this.maxValue ?? undefined,
            grid: { color: 'rgba(99,102,241,0.08)' },
            ticks: {
              color: '#6b7280',
              font: { size: 10, family: "'Inter', sans-serif" }
            }
          },
          y: {
            beginAtZero: true,
            max: this.horizontal ? undefined : (this.maxValue ?? undefined),
            grid: { color: 'rgba(99,102,241,0.08)' },
            ticks: {
              color: '#4b5563',
              font: { size: 11, family: "'Inter', sans-serif" },
              precision: 0
            }
          }
        }
      }
    });
  }

  ngOnDestroy() { this.chart?.destroy(); }
}
