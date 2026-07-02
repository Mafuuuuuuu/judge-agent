import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserchatService } from '../../core/services/userchat.service';
import { ChatlogsService } from '../../core/services/chatlogs.service';
import { EvaluationsService } from '../../core/services/evaluations.service';
import { KpiCardComponent } from '../../shared/kpi-card/kpi-card.component';
import { ScoreRadarComponent } from '../../shared/score-radar/score-radar.component';
import { TrendChartComponent } from '../../shared/trend-chart/trend-chart.component';
import { ScoreBadgeComponent } from '../../shared/score-badge/score-badge.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton/loading-skeleton.component';
import { DoughnutChartComponent } from '../../shared/doughnut-chart/doughnut-chart.component';
import { BarChartComponent } from '../../shared/bar-chart/bar-chart.component';
import { UserChatSummary } from '../../core/models/userchat.model';
import { ChatlogSummary } from '../../core/models/chatlog.model';
import { EvaluationMediaScore, Evaluation } from '../../core/models/evaluation.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    KpiCardComponent, ScoreRadarComponent, TrendChartComponent,
    ScoreBadgeComponent, LoadingSkeletonComponent,
    DoughnutChartComponent, BarChartComponent
  ],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Dashboard</h1>
          <p>Overview del sistema AI Quality Intelligence</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn--secondary btn--sm" (click)="load()"><span class="mat-icon" style="font-size:14px;vertical-align:middle">refresh</span> Aggiorna</button>
        </div>
      </div>

      <!-- KPI row -->
      @if (loading) {
        <app-loading-skeleton [count]="4" [height]="90"></app-loading-skeleton>
      } @else {
        <div class="grid-4 section">
          <app-kpi-card
            icon="forum"
            label="User Chats"
            variant="indigo"
            [value]="userchatSummary?.totale_conversazioni ?? 0"
            [sub]="'Messaggi tot: ' + (userchatSummary?.media_messaggi?.totale_messaggi ?? 0)"
            [routerLink]="'/userchat'"
            style="cursor:pointer">
          </app-kpi-card>
          <app-kpi-card
            icon="description"
            label="Chat Logs"
            variant="purple"
            [value]="chatlogSummary?.totale_chat_logs ?? 0"
            [sub]="'Sync da PlatformHero'"
            [routerLink]="'/chatlogs'"
            style="cursor:pointer">
          </app-kpi-card>
          <app-kpi-card
            icon="star_rate"
            label="Valutazioni"
            variant="amber"
            [value]="evalScore?.totale_valutazioni ?? 0"
            [sub]="evalScore ? 'Overall medio: ' + (evalScore.score_medi.overall ?? 0) + '/10' : ''"
            [routerLink]="'/evaluations'"
            style="cursor:pointer">
          </app-kpi-card>
          <app-kpi-card
            icon="trending_up"
            label="% Valutate (User Chat)"
            variant="success"
            [value]="(userchatSummary?.evaluations?.percentuale_valutate ?? 0) + '%'"
            [sub]="(userchatSummary?.evaluations?.totale_valutate ?? 0) + ' su ' + (userchatSummary?.totale_conversazioni ?? 0)"
            [routerLink]="'/evaluations'"
            style="cursor:pointer">
          </app-kpi-card>
        </div>

        <!-- Score overview + Trend -->
        <div class="grid-2 section">
          <!-- Radar chart -->
          <div class="card card--accent">
            <div class="card-title">Score Medi — User Chat</div>
            @if (userchatSummary?.evaluations?.score_medi) {
              <app-score-radar [scores]="userchatSummary!.evaluations.score_medi"></app-score-radar>
            } @else {
              <div class="empty-state">
                <div class="empty-icon"><span class="mat-icon" style="font-size:40px">bar_chart</span></div>
                <p>Nessuna valutazione disponibile</p>
              </div>
            }
          </div>

          <!-- Trend chart -->
          <div class="card card--accent" style="overflow:hidden;min-width:0">
            <div class="card-title">Trend Giornaliero — User Chat</div>
            @if ((userchatSummary?.trend_giornaliero?.length ?? 0) > 0) {
              <app-trend-chart [data]="userchatSummary!.trend_giornaliero" label="Chat"></app-trend-chart>
            } @else {
              <div class="empty-state">
                <div class="empty-icon"><span class="mat-icon" style="font-size:40px">show_chart</span></div>
                <p>Nessun dato trend disponibile</p>
              </div>
            }
          </div>
        </div>

        <!-- Quality Metrics: Score Trend + Distribution -->
        <div class="grid-2 section">
          <!-- Quality score trend -->
          <div class="card card--accent" style="overflow:hidden;min-width:0">
            <div class="card-title">Trend della Qualità — Media Overall</div>
            @if (evalTrend.length > 0) {
              <app-trend-chart [data]="evalTrend" xKey="periodo" yKey="media_overall" label="Score Medio"></app-trend-chart>
            } @else {
              <div class="empty-state">
                <div class="empty-icon"><span class="mat-icon" style="font-size:40px">show_chart</span></div>
                <p>Nessun trend qualitativo disponibile</p>
              </div>
            }
          </div>

          <!-- Quality score distribution -->
          <div class="card card--accent">
            <div class="card-title">Distribuzione Qualitativa dei Giudizi</div>
            @if (evalDistribution.length > 0) {
              <div class="dist-chart-layout">
                <div class="dist-chart-container">
                  <app-doughnut-chart
                    [data]="distributionData"
                    [labels]="distributionLabels"
                    [colors]="distributionColors">
                  </app-doughnut-chart>
                </div>
                <div class="dist-bars-container">
                  @for (d of evalDistribution; track d.label) {
                    <div>
                      <div class="flex-between mb-4">
                        <span style="font-size:12px;font-weight:600;color:#4b5563">{{ d.label }}</span>
                        <span class="badge" [class]="d.class">{{ d.count }} ({{ d.percentage }}%)</span>
                      </div>
                      <div class="score-bar-wrap" style="height:8px">
                        <div class="score-bar" [class]="d.class" [style.width.%]="d.percentage"></div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="empty-state">
                <div class="empty-icon"><span class="mat-icon" style="font-size:40px">star_rate</span></div>
                <p>Nessuna statistica disponibile</p>
              </div>
            }
          </div>
        </div>

        <!-- Quality Observation Analytics: Issues & Prompt configuration -->
        <div class="grid-2 section">
          <!-- Top Common Issues -->
          <div class="card card--accent">
            <div class="card-title">Problemi Comuni Rilevati — Frequenza Tag</div>
            @if (commonIssuesData.length > 0) {
              <app-bar-chart
                [data]="commonIssuesData"
                [labels]="commonIssuesLabels"
                color="#ef4444"
                [horizontal]="true"
                label="Segnalazioni">
              </app-bar-chart>
            } @else {
              <div class="empty-state">
                <div class="empty-icon"><span class="mat-icon" style="font-size:40px">shield</span></div>
                <p>Nessun problema rilevato nelle valutazioni</p>
              </div>
            }
          </div>

          <!-- System Prompt Distribution -->
          <div class="card card--accent">
            <div class="card-title">Distribuzione System Prompt nelle Chat</div>
            @if (promptDistributionData.length > 0) {
              <app-bar-chart
                [data]="promptDistributionData"
                [labels]="promptDistributionLabels"
                color="#8b5cf6"
                [horizontal]="true"
                label="Conversazioni">
              </app-bar-chart>
            } @else {
              <div class="empty-state">
                <div class="empty-icon"><span class="mat-icon" style="font-size:40px">edit_note</span></div>
                <p>Nessun dato di distribuzione prompt</p>
              </div>
            }
          </div>
        </div>

        <!-- Score dimensions table -->
        @if (evalScore) {
          <div class="card section">
            <div class="card-title">Dimensioni Score — Media Globale ({{ evalScore.totale_valutazioni }} valutazioni)</div>
            <div class="score-grid">
              @for (item of scoreItems; track item.key) {
                <div class="score-item">
                  <div class="score-item-label">{{ item.label }}</div>
                  <app-score-badge [value]="item.value"></app-score-badge>
                  <div class="score-bar-wrap">
                    <div class="score-bar" [style.width.%]="(item.value ?? 0) * 10"></div>
                  </div>
                </div>
              }
            </div>
          </div>
        }

        <!-- Top chat -->
        <div class="grid-2">
          <div class="card">
            <div class="flex-between mb-16">
              <div class="card-title" style="margin:0">Top User Chat</div>
              <a routerLink="/userchat" class="btn btn--secondary btn--sm">Vedi tutte <span class="mat-icon" style="font-size:14px;vertical-align:middle">arrow_forward</span></a>
            </div>
            @if ((userchatSummary?.top_chat?.length ?? 0) > 0) {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>ID</th><th>Messaggi</th><th>Data</th></tr></thead>
                  <tbody>
                    @for (c of userchatSummary!.top_chat; track c.id) {
                      <tr>
                        <td class="truncate" style="max-width:160px">{{ c.id }}</td>
                        <td><span class="badge badge--accent">{{ c.message_count }}</span></td>
                        <td class="text-muted text-sm">{{ c.created_at | date:'dd/MM/yy' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><div class="empty-icon"><span class="mat-icon" style="font-size:40px">forum</span></div><p>Nessuna chat</p></div>
            }
          </div>

          <div class="card">
            <div class="flex-between mb-16">
              <div class="card-title" style="margin:0">Top Chat Logs</div>
              <a routerLink="/chatlogs" class="btn btn--secondary btn--sm">Vedi tutti <span class="mat-icon" style="font-size:14px;vertical-align:middle">arrow_forward</span></a>
            </div>
            @if ((chatlogSummary?.top_chat?.length ?? 0) > 0) {
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Chat ID</th><th>Messaggi</th><th>Data</th></tr></thead>
                  <tbody>
                    @for (c of chatlogSummary!.top_chat; track c.id) {
                      <tr>
                        <td class="truncate" style="max-width:160px">{{ c.chat_id }}</td>
                        <td><span class="badge badge--accent">{{ c.message_count }}</span></td>
                        <td class="text-muted text-sm">{{ c.created_at | date:'dd/MM/yy' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div class="empty-state"><div class="empty-icon"><span class="mat-icon" style="font-size:40px">description</span></div><p>Nessun log</p></div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .score-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(99,102,241,0.05);
      border: 1px solid rgba(99,102,241,0.12);
      border-radius: 10px;
    }
    .score-item-label {
      flex: 1;
      font-size: 12px;
      color: #4b5563;
      min-width: 90px;
    }
    .score-bar-wrap {
      flex: 1;
      height: 4px;
      background: rgba(99,102,241,0.12);
      border-radius: 99px;
      overflow: hidden;
    }
    .score-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 99px;
      transition: width 0.6s ease;
    }
    .score-bar.badge--success { background: linear-gradient(90deg, #10b981, #34d399) !important; }
    .score-bar.badge--info { background: linear-gradient(90deg, #3b82f6, #60a5fa) !important; }
    .score-bar.badge--warning { background: linear-gradient(90deg, #f59e0b, #fbbf24) !important; }
    .score-bar.badge--danger { background: linear-gradient(90deg, #ef4444, #f87171) !important; }
    .dist-chart-layout {
      display: grid;
      grid-template-columns: 1.2fr 1.8fr;
      gap: 20px;
      align-items: center;
      margin-top: 10px;
    }
    @media (max-width: 900px) {
      .dist-chart-layout { grid-template-columns: 1fr; }
      .score-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private uc = inject(UserchatService);
  private cl = inject(ChatlogsService);
  private ev = inject(EvaluationsService);

  loading = true;
  userchatSummary: UserChatSummary | null = null;
  chatlogSummary: ChatlogSummary | null = null;
  evalScore: EvaluationMediaScore | null = null;

  scoreItems: { key: string; label: string; value: number | null }[] = [];
  evalTrend: { periodo: string; media_overall: number }[] = [];
  evalDistribution: { label: string; count: number; percentage: number; class: string }[] = [];

  distributionData: number[] = [];
  distributionLabels: string[] = [];
  distributionColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  commonIssuesLabels: string[] = [];
  commonIssuesData: number[] = [];

  promptDistributionLabels: string[] = [];
  promptDistributionData: number[] = [];

  private scoreLabels: Record<string, string> = {
    overall: 'Overall',
    technical: 'Tecnico',
    completeness: 'Completezza',
    business: 'Business',
    consistency: 'Consistenza',
    prompt_compliance: 'Prompt Compliance',
    helpfulness: 'Utilità',
    tone: 'Tono',
    hallucination: 'Allucinazioni',
    efficiency: 'Efficienza',
    source_reliability: 'Affidabilità Fonti',
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    let done = 0;
    const check = () => { if (++done === 4) this.loading = false; };

    this.uc.getSummary().subscribe({
      next: d => {
        this.userchatSummary = d;
        if (d.distribuzione_system_prompt) {
          const sortedPrompts = [...d.distribuzione_system_prompt]
            .sort((a, b) => b.totale - a.totale)
            .slice(0, 6);
          this.promptDistributionLabels = sortedPrompts.map(p => {
            let text = p.system_prompt === '__nessuno__' || !p.system_prompt ? 'Nessun Prompt' : p.system_prompt;
            if (text.length > 30) {
              text = text.substring(0, 27) + '...';
            }
            return text;
          });
          this.promptDistributionData = sortedPrompts.map(p => p.totale);
        }
        check();
      },
      error: () => check()
    });
    this.cl.getSummary().subscribe({ next: d => { this.chatlogSummary = d; check(); }, error: () => check() });
    this.ev.getMediaScore().subscribe({
      next: d => {
        this.evalScore = d;
        this.scoreItems = Object.entries(d.score_medi).map(([key, value]) => ({
          key, label: this.scoreLabels[key] ?? key, value: value as number | null
        }));
        check();
      },
      error: () => check()
    });
    this.ev.getList().subscribe({
      next: list => {
        this.processEvaluations(list);
        check();
      },
      error: () => check()
    });
  }

  processEvaluations(list: Evaluation[]) {
    if (!list || list.length === 0) {
      this.evalTrend = [];
      this.evalDistribution = [];
      this.distributionData = [];
      this.distributionLabels = [];
      this.commonIssuesLabels = [];
      this.commonIssuesData = [];
      return;
    }

    // 1. Calculate Score Distribution
    let excellent = 0;
    let good = 0;
    let warning = 0;
    let danger = 0;

    list.forEach(e => {
      const v = e.overall_score;
      if (v >= 9.0) excellent++;
      else if (v >= 7.0) good++;
      else if (v >= 5.0) warning++;
      else danger++;
    });

    const tot = list.length;
    this.evalDistribution = [
      { label: 'Eccellente (9-10)', count: excellent, percentage: Math.round((excellent / tot) * 100), class: 'badge--success' },
      { label: 'Buono (7-8.9)', count: good, percentage: Math.round((good / tot) * 100), class: 'badge--info' },
      { label: 'Deficitario (5-6.9)', count: warning, percentage: Math.round((warning / tot) * 100), class: 'badge--warning' },
      { label: 'Grave (0-4.9)', count: danger, percentage: Math.round((danger / tot) * 100), class: 'badge--danger' }
    ];

    this.distributionData = this.evalDistribution.map(d => d.count);
    this.distributionLabels = this.evalDistribution.map(d => d.label.split(' ')[0]);

    // 2. Parse Common Issues
    const issueCounts: Record<string, number> = {};
    list.forEach(e => {
      if (!e.issues) return;
      e.issues.split(',').forEach(tag => {
        let cleaned = tag.trim();
        if (!cleaned) return;
        if (cleaned.includes('proattivit')) {
          cleaned = 'proattività';
        }
        cleaned = cleaned.replace(/_/g, ' ');
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        issueCounts[cleaned] = (issueCounts[cleaned] || 0) + 1;
      });
    });
    const sortedIssues = Object.entries(issueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    this.commonIssuesLabels = sortedIssues.map(x => x[0]);
    this.commonIssuesData = sortedIssues.map(x => x[1]);

    // 3. Calculate daily overall score trend
    const dailyMap: Record<string, { sum: number; count: number }> = {};
    list.forEach(e => {
      if (!e.created_at) return;
      const dateStr = e.created_at.substring(0, 10);
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { sum: 0, count: 0 };
      }
      dailyMap[dateStr].sum += e.overall_score;
      dailyMap[dateStr].count += 1;
    });

    this.evalTrend = Object.entries(dailyMap)
      .map(([dateStr, obj]) => ({
        periodo: dateStr,
        media_overall: Math.round((obj.sum / obj.count) * 10) / 10
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));
  }
}
