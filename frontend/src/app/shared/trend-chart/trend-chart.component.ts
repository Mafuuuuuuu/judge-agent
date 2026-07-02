import { Component, Input, OnChanges, ViewChild, ElementRef, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip);

@Component({
  selector: 'app-trend-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-container" #containerRef><canvas #trendCanvas></canvas></div>`,
  styles: [`.chart-container { position: relative; width: 100%; height: 200px; overflow: hidden; }`]
})
export class TrendChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() data: any[] = [];
  @Input() xKey = 'periodo';
  @Input() yKey = 'totale_chat';
  @Input() label = 'Chat';
  @ViewChild('trendCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('containerRef', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  ngAfterViewInit(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        const canvas = this.canvasRef.nativeElement;
        canvas.style.width = '';
        this.chart.resize();
      }
    });
    this.resizeObserver.observe(this.containerRef.nativeElement);
  }

  ngOnChanges(): void { this.render(); }

  private render() {
    if (this.chart) { this.chart.destroy(); }
    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data: {
        labels: this.data.map(d => d[this.xKey]),
        datasets: [{
          label: this.label,
          data: this.data.map(d => d[this.yKey]),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99,102,241,0.08)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#6366f1',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
        scales: {
          x: { grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#4b5563', font: { size: 10 } } },
          y: { beginAtZero: true, grid: { color: 'rgba(99,102,241,0.06)' }, ticks: { color: '#4b5563' } }
        }
      }
    });
  }

  ngOnDestroy() {
    this.chart?.destroy();
    this.resizeObserver?.disconnect();
  }
}
