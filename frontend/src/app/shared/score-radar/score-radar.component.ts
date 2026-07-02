import { Component, Input, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

@Component({
  selector: 'app-score-radar',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="chart-container"><canvas #radarCanvas></canvas></div>`,
  styles: [`.chart-container { position: relative; width: 100%; height: 280px; }`]
})
export class ScoreRadarComponent implements AfterViewInit, OnDestroy {
  @Input() scores: Record<string, number | null | undefined> = {};
  @ViewChild('radarCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private chart: Chart | null = null;

  private labels: Record<string, string> = {
    technical: 'Tecnico',
    completeness: 'Completezza',
    business: 'Business',
    consistency: 'Consistenza',
    helpfulness: 'Utilità',
    tone: 'Tono',
    hallucination: 'Allucinazioni',
    efficiency: 'Efficienza',
    source_reliability: 'Fonti',
    prompt_compliance: 'Compliance',
  };

  ngAfterViewInit(): void {
    setTimeout(() => this.render(), 0);
  }

  private render() {
    const keys = Object.keys(this.labels).filter(k => this.scores[k] !== undefined && this.scores[k] !== null);
    const data = keys.map(k => this.scores[k] ?? 0);
    const lbls = keys.map(k => this.labels[k]);

    if (this.chart) { this.chart.destroy(); }

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'radar',
      data: {
        labels: lbls,
        datasets: [{
          label: 'Score',
          data,
          backgroundColor: 'rgba(99,102,241,0.15)',
          borderColor: '#6366f1',
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointRadius: 4,
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw}/10` } }, legend: { display: false } },
        scales: {
          r: {
            min: 0, max: 10,
            ticks: { display: false, backdropColor: 'transparent', stepSize: 2 },
            pointLabels: { color: '#4b5563', font: { size: 11 } },
            grid: { color: 'rgba(99,102,241,0.15)' },
            angleLines: { color: 'rgba(99,102,241,0.15)' },
          }
        }
      }
    });
  }

  ngOnDestroy() { this.chart?.destroy(); }
}
