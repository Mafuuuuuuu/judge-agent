import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserchatService } from '../../core/services/userchat.service';
import { ChatlogsService } from '../../core/services/chatlogs.service';
import { EvaluationsService } from '../../core/services/evaluations.service';
import { TrendChartComponent } from '../../shared/trend-chart/trend-chart.component';
import { ScoreBadgeComponent } from '../../shared/score-badge/score-badge.component';
import { LoadingSkeletonComponent } from '../../shared/loading-skeleton/loading-skeleton.component';
import { UserChatSummary } from '../../core/models/userchat.model';
import { ChatlogSummary } from '../../core/models/chatlog.model';
import { EvaluationMediaScore, SCORE_LABELS, Evaluation } from '../../core/models/evaluation.model';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    TrendChartComponent,
    ScoreBadgeComponent,
    LoadingSkeletonComponent
  ],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Analytics</h1>
          <p>Statistiche aggregate, performance del modello e monitoraggio della qualità</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn--secondary btn--sm" (click)="load()">
            <span class="mat-icon" style="font-size:14px;vertical-align:middle">refresh</span> Aggiorna
          </button>
        </div>
      </div>

      <!-- Sleek Custom Tab Navigation -->
      <div class="tabs-header">
        <button class="tab-btn" [class.active]="activeTab === 'overview'" (click)="activeTab = 'overview'">
          <span class="mat-icon">dashboard</span> Panoramica
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'userchat'" (click)="activeTab = 'userchat'">
          <span class="mat-icon">chat</span> User Chat
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'chatlogs'" (click)="activeTab = 'chatlogs'">
          <span class="mat-icon">sync</span> Chat Logs
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'evaluations'" (click)="activeTab = 'evaluations'">
          <span class="mat-icon">star</span> Valutazioni Quality
        </button>
      </div>

      @if (loading) {
        <app-loading-skeleton [count]="4" [height]="120"></app-loading-skeleton>
        <div class="mt-24">
          <app-loading-skeleton [count]="2" [height]="240"></app-loading-skeleton>
        </div>
      }

      @if (!loading) {
        <!-- PANORAMICA (OVERVIEW) TAB -->
        @if (activeTab === 'overview') {
          <div class="fade-in">
            <!-- Overview KPI Cards Grid -->
            <div class="grid-4 section">
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--indigo">
                  <span class="mat-icon">forum</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Volume Totale</div>
                  <div class="big-num">{{ (uc?.totale_conversazioni || 0) + (cl?.totale_chat_logs || 0) }}</div>
                  <div class="kpi-subtitle">Chat totali nel sistema</div>
                </div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--purple">
                  <span class="mat-icon">message</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Messaggi Scambiati</div>
                  <div class="big-num">{{ (uc?.media_messaggi?.totale_messaggi || 0) + (cl?.media_messaggi?.totale_messaggi || 0) }}</div>
                  <div class="kpi-subtitle">Totale interazioni registrate</div>
                </div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--amber">
                  <span class="mat-icon">star_rate</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Valutazioni Eseguite</div>
                  <div class="big-num">{{ ev?.totale_valutazioni || 0 }}</div>
                  <div class="kpi-subtitle">Chat analizzate da Judge Agent</div>
                </div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--success">
                  <span class="mat-icon">verified_user</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Qualità Media</div>
                  <div class="big-num" [class]="scoreClass(ev?.score_medi?.overall || null)">
                    {{ ev?.score_medi?.overall ?? 'N/A' }}<span class="big-num-unit">/10</span>
                  </div>
                  <div class="kpi-subtitle">Overall score medio combinato</div>
                </div>
              </div>
            </div>

            <!-- Double Charts Grid -->
            <div class="grid-2 section">
              <div class="card" style="overflow:hidden;min-width:0">
                <div class="card-header-row">
                  <div class="card-title">Trend Volume User Chats</div>
                  <span class="badge badge--accent">User Chat</span>
                </div>
                @if (uc && (uc.trend_giornaliero?.length ?? 0) > 0) {
                  <app-trend-chart [data]="uc.trend_giornaliero" label="User Chat"></app-trend-chart>
                } @else {
                  <div class="empty-state">
                    <div class="empty-icon"><span class="mat-icon" style="font-size:40px">show_chart</span></div>
                    <p>Nessun dato di trend disponibile</p>
                  </div>
                }
              </div>

              <div class="card" style="overflow:hidden;min-width:0">
                <div class="card-header-row">
                  <div class="card-title">Trend Volume Chat Logs</div>
                  <span class="badge badge--info">Chat Logs</span>
                </div>
                @if (cl && (cl.trend_giornaliero?.length ?? 0) > 0) {
                  <app-trend-chart [data]="cl.trend_giornaliero" label="Chat Logs"></app-trend-chart>
                } @else {
                  <div class="empty-state">
                    <div class="empty-icon"><span class="mat-icon" style="font-size:40px">show_chart</span></div>
                    <p>Nessun dato di trend disponibile</p>
                  </div>
                }
              </div>
            </div>

            <!-- Top Chats list grid -->
            <div class="grid-2 section">
              <!-- Top User Chats -->
              <div class="card" style="overflow:hidden;min-width:0">
                <div class="card-header-row mb-16">
                  <h3 class="section-heading-sm">User Chat più attive (top 3)</h3>
                  <span class="text-xs text-muted">Per numero messaggi</span>
                </div>
                @if (uc && uc.top_chat && uc.top_chat.length > 0) {
                  <div class="top-list">
                    @for (chat of uc.top_chat.slice(0, 3); track chat.id) {
                      <div class="top-list-item">
                        <div class="top-list-header">
                          <span class="item-id truncate" style="max-width:180px">{{ chat.id }}</span>
                          <span class="badge badge--accent">{{ chat.message_count }} messaggi</span>
                        </div>
                        <div class="progress-bar-small">
                          <div class="progress-bar-fill" [style.width.%]="(chat.message_count / (uc.media_messaggi.massimo || 1)) * 100"></div>
                        </div>
                        <div class="prompt-preview" title="{{ chat.system_prompt }}">
                          <strong>Prompt:</strong> {{ chat.system_prompt || 'Nessun system prompt impostato' }}
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="empty-state-small">Nessuna chat utente disponibile</div>
                }
              </div>

              <!-- Top Chat Logs -->
              <div class="card" style="overflow:hidden;min-width:0">
                <div class="card-header-row mb-16">
                  <h3 class="section-heading-sm">Chat Logs più attive (top 3)</h3>
                  <span class="text-xs text-muted">Per numero messaggi</span>
                </div>
                @if (cl && cl.top_chat && cl.top_chat.length > 0) {
                  <div class="top-list">
                    @for (log of cl.top_chat.slice(0, 3); track log.id) {
                      <div class="top-list-item">
                        <div class="top-list-header">
                          <span class="item-id truncate" style="max-width:180px">{{ log.chat_id }}</span>
                          <span class="badge badge--info">{{ log.message_count }} messaggi</span>
                        </div>
                        <div class="progress-bar-small">
                          <div class="progress-bar-fill" [style.width.%]="(log.message_count / (cl.media_messaggi.massimo || 1)) * 100"></div>
                        </div>
                        <div class="prompt-preview">
                          <strong>Assistant ID:</strong> <span>{{ log.assistant_id }}</span>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <div class="empty-state-small">Nessun log disponibile</div>
                }
              </div>
            </div>
          </div>
        }

        <!-- USER CHAT TAB -->
        @if (activeTab === 'userchat' && uc) {
          <div class="fade-in">
            <div class="grid-4 section">
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--indigo">
                  <span class="mat-icon">forum</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Totale Chat</div>
                  <div class="big-num">{{ uc.totale_conversazioni }}</div>
                  <div class="kpi-subtitle">Conversazioni totali utente</div>
                </div>
              </div>
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--indigo">
                  <span class="mat-icon">question_answer</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Media Messaggi</div>
                  <div class="big-num">{{ uc.media_messaggi.media }}</div>
                  <div class="kpi-subtitle">Lunghezza media conversazione</div>
                </div>
              </div>
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--indigo">
                  <span class="mat-icon">vertical_align_top</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Max Messaggi</div>
                  <div class="big-num">{{ uc.media_messaggi.massimo }}</div>
                  <div class="kpi-subtitle">Chat più lunga registrata</div>
                </div>
              </div>
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--indigo">
                  <span class="mat-icon">chat_bubble</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Tot Messaggi</div>
                  <div class="big-num">{{ uc.media_messaggi.totale_messaggi }}</div>
                  <div class="kpi-subtitle">Interazioni totali utente</div>
                </div>
              </div>
            </div>

            <!-- Trend -->
            <div class="card section" style="overflow:hidden;min-width:0">
              <div class="card-title">Trend Giornaliero User Chat</div>
              @if ((uc.trend_giornaliero?.length ?? 0) > 0) {
                <app-trend-chart [data]="uc.trend_giornaliero" label="User Chat"></app-trend-chart>
              } @else {
                <div class="empty-state">
                  <div class="empty-icon"><span class="mat-icon" style="font-size:40px">show_chart</span></div>
                  <p>Nessun dato disponibile</p>
                </div>
              }
            </div>

            <!-- System prompt distribution -->
            <div class="card section" style="overflow:hidden;min-width:0">
              <div class="card-title">Distribuzione per System Prompt ({{ uc.distribuzione_system_prompt?.length }} distinti)</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>System Prompt</th>
                      <th>Totale Chat</th>
                      <th>Media Messaggi</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of uc.distribuzione_system_prompt; track r.system_prompt) {
                      <tr>
                        <td class="prompt-text" title="{{ r.system_prompt }}">
                          {{ r.system_prompt === '__nessuno__' ? 'Nessun System Prompt' : r.system_prompt }}
                        </td>
                        <td>
                          <span class="badge badge--accent">{{ r.totale }}</span>
                        </td>
                        <td>
                          <div class="flex gap-12">
                            <span style="font-weight: 500; min-width: 24px;">{{ r.media_messaggi }}</span>
                            <div class="progress-bar-small" style="flex: 1;">
                              <div class="progress-bar-fill" [style.width.%]="(r.media_messaggi / (uc.media_messaggi.massimo || 1)) * 100"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- CHATLOGS TAB -->
        @if (activeTab === 'chatlogs' && cl) {
          <div class="fade-in">
            <div class="grid-4 section">
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--purple">
                  <span class="mat-icon">sync</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Totale Log</div>
                  <div class="big-num">{{ cl.totale_chat_logs }}</div>
                  <div class="kpi-subtitle">Log sincronizzati da PlatformHero</div>
                </div>
              </div>
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--purple">
                  <span class="mat-icon">question_answer</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Media Messaggi</div>
                  <div class="big-num">{{ cl.media_messaggi.media }}</div>
                  <div class="kpi-subtitle">Messaggi medi per log sync</div>
                </div>
              </div>
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--purple">
                  <span class="mat-icon">vertical_align_top</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Max Messaggi</div>
                  <div class="big-num">{{ cl.media_messaggi.massimo }}</div>
                  <div class="kpi-subtitle">Log chat più lungo registrato</div>
                </div>
              </div>
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--purple">
                  <span class="mat-icon">smart_toy</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Assistant Distinti</div>
                  <div class="big-num">{{ cl.distribuzione_assistant?.length || 0 }}</div>
                  <div class="kpi-subtitle">Agenti AI monitorati</div>
                </div>
              </div>
            </div>

            <!-- Trend -->
            <div class="card section" style="overflow:hidden;min-width:0">
              <div class="card-title">Trend Giornaliero Chat Logs</div>
              @if ((cl.trend_giornaliero?.length ?? 0) > 0) {
                <app-trend-chart [data]="cl.trend_giornaliero" label="Chat Logs"></app-trend-chart>
              } @else {
                <div class="empty-state">
                  <div class="empty-icon"><span class="mat-icon" style="font-size:40px">show_chart</span></div>
                  <p>Nessun dato disponibile</p>
                </div>
              }
            </div>

            <!-- Distribuzione per assistant -->
            <div class="card section" style="overflow:hidden;min-width:0">
              <div class="card-title">Distribuzione per Assistant</div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Assistant ID</th>
                      <th>Chat Sincronizzate</th>
                      <th>Media Messaggi</th>
                      <th>Tot Messaggi</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of cl.distribuzione_assistant; track r.assistant_id) {
                      <tr>
                        <td class="text-xs">{{ r.assistant_id }}</td>
                        <td>
                          <span class="badge badge--info">{{ r.totale_chat }}</span>
                        </td>
                        <td>{{ r.media_messaggi }}</td>
                        <td>
                          <div class="flex gap-12">
                            <span style="font-weight: 500; min-width: 32px;">{{ r.totale_messaggi }}</span>
                            <div class="progress-bar-small" style="flex: 1;">
                              <div class="progress-bar-fill" [style.width.%]="(r.totale_messaggi / (cl.media_messaggi.totale_messaggi || 1)) * 100"></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- VALUTAZIONI QUALITY TAB -->
        @if (activeTab === 'evaluations' && ev) {
          <div class="fade-in">
            <!-- KPIs -->
            <div class="grid-3 section">
              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--amber">
                  <span class="mat-icon">fact_check</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Totale Valutazioni</div>
                  <div class="big-num">{{ ev.totale_valutazioni }}</div>
                  <div class="kpi-subtitle">Audit eseguiti complessivamente</div>
                </div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--amber">
                  <span class="mat-icon">verified_user</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Overall Score Medio</div>
                  <div class="big-num" [class]="scoreClass(ev.score_medi.overall)">
                    {{ ev.score_medi.overall ?? 'N/A' }}<span class="big-num-unit">/10</span>
                  </div>
                  <div class="kpi-subtitle">Indice di qualità generale del sistema</div>
                </div>
              </div>

              <div class="card kpi-card">
                <div class="kpi-icon-wrap kpi-icon-wrap--amber">
                  <span class="mat-icon">rule</span>
                </div>
                <div class="kpi-body">
                  <div class="card-title">Range Punteggio</div>
                  <div class="flex gap-8 mt-16" style="margin-top: 8px;">
                    <span class="badge badge--danger" style="padding: 4px 10px;">Min: {{ ev.overall_range.min ?? 'N/A' }}</span>
                    <span class="badge badge--success" style="padding: 4px 10px;">Max: {{ ev.overall_range.max ?? 'N/A' }}</span>
                  </div>
                  <div class="kpi-subtitle">Punteggi estremi registrati</div>
                </div>
              </div>
            </div>

            <!-- Quality Breakdown & Details -->
            <div class="grid-2-1 section">
              <!-- Score per dimensions -->
              <div class="card">
                <div class="card-title">Dettaglio Dimensioni di Valutazione</div>
                <p class="text-xs text-muted mb-16" style="margin-top: -10px; margin-bottom: 16px;">
                  Punteggi medi (0-10) su ciascuno dei criteri analizzati dall'AI Auditor.
                </p>
                <div class="score-dimension-grid">
                  @for (k of scoreKeys; track k) {
                    <div class="score-dim-item">
                      <div class="score-dim-header flex-between">
                        <span class="score-dim-name">{{ scoreLabels[k] }}</span>
                        <app-score-badge [value]="getEvScore(k)"></app-score-badge>
                      </div>
                      <div class="score-dim-bar">
                        <div class="score-dim-fill" 
                             [class.score-dim-fill--success]="(getEvScore(k) ?? 0) >= 8"
                             [class.score-dim-fill--warning]="(getEvScore(k) ?? 0) >= 6 && (getEvScore(k) ?? 0) < 8"
                             [class.score-dim-fill--danger]="(getEvScore(k) ?? 0) < 6"
                             [style.width.%]="((getEvScore(k) ?? 0) / 10) * 100">
                        </div>
                      </div>
                      <div class="score-dim-desc">{{ scoreDescriptions[k] }}</div>
                    </div>
                  }
                </div>
              </div>

              <!-- Quality Breakdown Gauge/Metrics -->
              <div class="card flex-col">
                <div class="card-title">Distribuzione Qualitativa</div>
                <p class="text-xs text-muted mb-16" style="margin-top: -10px; margin-bottom: 16px;">
                  Suddivisione delle chat valutate per soglia di conformità.
                </p>

                <!-- Stacked Progress Bar -->
                <div class="stacked-bar">
                  <div class="stacked-fill stacked-fill--success" 
                       [style.width.%]="getQualityPercent('excellent')"
                       title="Eccellente ({{ getQualityPercent('excellent') }}%)"></div>
                  <div class="stacked-fill stacked-fill--warning" 
                       [style.width.%]="getQualityPercent('good')"
                       title="Accettabile ({{ getQualityPercent('good') }}%)"></div>
                  <div class="stacked-fill stacked-fill--danger" 
                       [style.width.%]="getQualityPercent('poor')"
                       title="Critica ({{ getQualityPercent('poor') }}%)"></div>
                </div>

                <!-- Breakdown Items -->
                <div class="breakdown-items-list mt-16" style="display: flex; flex-direction: column; gap: 12px; flex: 1;">
                  <div class="breakdown-item flex-between">
                    <div class="flex gap-8">
                      <span class="color-dot color-dot--success"></span>
                      <span class="breakdown-label">Eccellente (8.0 - 10.0)</span>
                    </div>
                    <div class="breakdown-val">
                      <strong>{{ excellentCount }}</strong> 
                      <span class="text-muted text-xs" style="margin-left: 4px;">({{ getQualityPercent('excellent') }}%)</span>
                    </div>
                  </div>

                  <div class="breakdown-item flex-between">
                    <div class="flex gap-8">
                      <span class="color-dot color-dot--warning"></span>
                      <span class="breakdown-label">Buona/Accettabile (6.0 - 7.9)</span>
                    </div>
                    <div class="breakdown-val">
                      <strong>{{ goodCount }}</strong>
                      <span class="text-muted text-xs" style="margin-left: 4px;">({{ getQualityPercent('good') }}%)</span>
                    </div>
                  </div>

                  <div class="breakdown-item flex-between">
                    <div class="flex gap-8">
                      <span class="color-dot color-dot--danger"></span>
                      <span class="breakdown-label">Critica (&lt; 6.0)</span>
                    </div>
                    <div class="breakdown-val">
                      <strong>{{ poorCount }}</strong>
                      <span class="text-muted text-xs" style="margin-left: 4px;">({{ getQualityPercent('poor') }}%)</span>
                    </div>
                  </div>
                </div>

                <div class="card-footer-note mt-24">
                  <span class="mat-icon text-muted" style="font-size: 16px; vertical-align: middle;">info</span>
                  <span class="text-xs text-muted" style="margin-left: 6px;">
                    Le soglie riflettono i parametri standard di conformità.
                  </span>
                </div>
              </div>
            </div>

            <!-- Recent Critical Issues List -->
            <div class="card section">
              <div class="card-title flex gap-8" style="color:var(--danger)">
                <span class="mat-icon">warning</span> Criticità Rilevate Recenti (Punteggio &lt; 6.0)
              </div>
              @if (getCriticalEvaluations().length > 0) {
                <div class="critical-list">
                  @for (evItem of getCriticalEvaluations(); track evItem.id) {
                    <div class="critical-item">
                      <div class="critical-header flex-between">
                        <div class="flex gap-12">
                          <span class="badge badge--danger" style="font-size: 12px; padding: 4px 10px;">Score: {{ evItem.overall_score }}</span>
                          <span class="critical-date">{{ evItem.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                          <span class="text-xs text-muted">ID Log: {{ evItem.log_id }}</span>
                        </div>
                        <a [routerLink]="['/evaluations']" [queryParams]="{highlight: evItem.id}" class="critical-link flex">
                          Vedi scheda <span class="mat-icon" style="font-size:16px;margin-left:4px">arrow_forward</span>
                        </a>
                      </div>
                      <div class="critical-body">
                        <p class="critical-feedback"><strong>Analisi Judge:</strong> {{ evItem.feedback }}</p>
                        @if (evItem.issues) {
                          <div class="critical-issues-tags">
                            <span class="badge badge--danger" style="border-radius: 4px; font-weight: 500;">
                              {{ evItem.issues }}
                            </span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state">
                  <div class="empty-icon"><span class="mat-icon" style="font-size:40px;color:var(--success)">check_circle</span></div>
                  <p style="color: var(--success); font-weight: 500;">Nessun problema grave rilevato di recente!</p>
                  <p style="font-size: 13px; margin-top: 4px;">Tutte le conversazioni analizzate mantengono un punteggio medio superiore a 6.0/10.</p>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .tabs-header {
      display: flex;
      gap: 6px;
      background: #f8f7ff;
      border: 1px solid var(--border);
      padding: 5px;
      border-radius: var(--radius-lg);
      margin-bottom: 28px;
      width: 100%;
      flex-wrap: wrap;
    }
    .tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 18px;
      border-radius: var(--radius-md);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-weight: 500;
      font-size: 13px;
      transition: all 0.2s ease;
      cursor: pointer;
      &:hover {
        color: var(--text-primary);
        background: rgba(99,102,241,0.07);
      }
      &.active {
        background: var(--bg-elevated);
        color: var(--accent);
        box-shadow: var(--shadow-sm);
        font-weight: 600;
        border: 1px solid rgba(99,102,241,0.2);
      }
    }
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 20px;
      position: relative;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 22px;
      background: #ffffff;
      box-shadow: var(--shadow-accent);
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      &:hover {
        transform: translateY(-2px);
        border-color: var(--border-accent);
        box-shadow: 0 0 40px rgba(99,102,241,0.25);
      }
    }
    .kpi-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px;
      height: 52px;
      border-radius: 14px;
      font-size: 24px;
      flex-shrink: 0;
      &--indigo { background: rgba(99,102,241,0.12); color: #6366f1; }
      &--purple { background: rgba(139,92,246,0.12); color: #7c3aed; }
      &--amber  { background: rgba(217,119,6,0.12);  color: #d97706; }
      &--success{ background: rgba(5,150,105,0.12);  color: #059669; }
    }
    .kpi-body {
      display: flex;
      flex-direction: column;
      min-width: 0;
      .card-title {
        margin-bottom: 2px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: var(--text-secondary);
      }
      .big-num {
        margin-top: 0;
        font-size: 32px;
        font-weight: 800;
        color: var(--text-primary);
        line-height: 1.1;
      }
    }
    .big-num-unit { font-size: 16px; font-weight: 500; color: var(--text-secondary); }
    .kpi-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      .card-title { margin-bottom: 0; }
    }
    .section-heading-sm {
      font-size: 14px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .top-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .top-list-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
    }
    .top-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      .item-id {
        font-weight: 600;
        color: var(--text-primary);
        font-size: 12px;
      }
    }
    .prompt-preview {
      font-size: 11px;
      color: var(--text-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-top: 2px;
    }
    .progress-bar-small {
      width: 100%;
      height: 4px;
      background: rgba(99,102,241,0.12);
      border-radius: 99px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--accent-grad);
      border-radius: 99px;
    }
    .empty-state-small {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 120px;
      font-size: 12px;
      color: var(--text-muted);
      border: 1px dashed var(--border);
      border-radius: var(--radius-md);
    }
    .prompt-text {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      color: var(--text-secondary);
    }
    .score-dimension-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media(max-width: 900px) {
      .score-dimension-grid { grid-template-columns: 1fr; }
    }
    .score-dim-item {
      background: rgba(99,102,241,0.04);
      border: 1px solid rgba(99,102,241,0.12);
      border-radius: var(--radius-md);
      padding: 14px 16px;
    }
    .score-dim-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-primary);
    }
    .score-dim-bar {
      width: 100%;
      height: 6px;
      background: rgba(99,102,241,0.1);
      border-radius: 99px;
      margin: 8px 0;
      overflow: hidden;
    }
    .score-dim-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      &--success { background: var(--success); }
      &--warning { background: var(--warning); }
      &--danger  { background: var(--danger); }
    }
    .score-dim-desc {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.4;
      margin-top: 4px;
    }
    .grid-2-1 {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
    }
    @media(max-width: 1024px) {
      .grid-2-1 { grid-template-columns: 1fr; }
    }
    @media(max-width: 900px) {
      .tab-btn { padding: 8px 12px; font-size: 12px; gap: 5px; }
      .tab-btn .mat-icon { font-size: 16px; }
    }
    @media(max-width: 600px) {
      .tab-btn span:not(.mat-icon) { display: none; }
      .tab-btn { padding: 9px; }
    }
    .flex-col {
      display: flex;
      flex-direction: column;
    }
    .stacked-bar {
      display: flex;
      width: 100%;
      height: 16px;
      border-radius: 99px;
      background: rgba(99,102,241,0.08);
      overflow: hidden;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    .stacked-fill {
      height: 100%;
      transition: width 0.5s ease;
      &--success { background: var(--success); }
      &--warning { background: var(--warning); }
      &--danger  { background: var(--danger); }
    }
    .color-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
      &--success { background: var(--success); }
      &--warning { background: var(--warning); }
      &--danger  { background: var(--danger); }
    }
    .breakdown-label {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .breakdown-val {
      font-size: 13px;
      color: var(--text-primary);
    }
    .critical-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 14px;
    }
    .critical-item {
      background: rgba(239, 68, 68, 0.03);
      border: 1px solid rgba(239, 68, 68, 0.12);
      border-radius: var(--radius-md);
      padding: 16px;
      transition: border-color 0.2s ease;
      &:hover {
        border-color: rgba(239, 68, 68, 0.25);
      }
    }
    .critical-header {
      border-bottom: 1px dashed rgba(239, 68, 68, 0.1);
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .critical-date {
      font-size: 11px;
      color: var(--text-muted);
    }
    .critical-link {
      font-size: 11px;
      font-weight: 600;
      color: var(--danger);
      transition: color 0.15s;
      &:hover { color: #f87171; }
    }
    .critical-feedback {
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .critical-issues-tags {
      margin-top: 8px;
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  private ucSvc = inject(UserchatService);
  private clSvc = inject(ChatlogsService);
  private evSvc = inject(EvaluationsService);

  loading = true;
  activeTab = 'overview';

  uc: UserChatSummary | null = null;
  cl: ChatlogSummary | null = null;
  ev: EvaluationMediaScore | null = null;
  evalsList: Evaluation[] = [];

  // Quality breakdown metrics
  excellentCount = 0;
  goodCount = 0;
  poorCount = 0;

  scoreKeys = [
    'technical', 'completeness', 'business', 'consistency', 'prompt_compliance',
    'helpfulness', 'tone', 'hallucination', 'efficiency', 'source_reliability'
  ];
  scoreLabels = SCORE_LABELS;

  scoreDescriptions: Record<string, string> = {
    technical: 'Correttezza tecnica e logica del codice o delle nozioni prodotte.',
    completeness: 'Livello di esaustività e copertura dei requisiti dell\'utente.',
    business: 'Allineamento e rispetto degli obiettivi e vincoli di business.',
    consistency: 'Mantenimento della coerenza logica lungo tutta la conversazione.',
    prompt_compliance: 'Conformità rigorosa alle istruzioni del System Prompt.',
    helpfulness: 'Utilità percepita e capacità di dare risposte risolutive.',
    tone: 'Tono professionale, chiaro, educato e contestuale.',
    hallucination: 'Assenza di concetti inventati, fake facts o allucinazioni.',
    efficiency: 'Rapidità logica ed efficacia sintattica nel fornire la risposta.',
    source_reliability: 'Affidabilità e accuratezza nell\'uso/citazione dei dati di base.',
  };

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    let done = 0;
    const check = () => {
      if (++done === 4) {
        this.calculateQualityBreakdown();
        this.loading = false;
      }
    };

    this.ucSvc.getSummary().subscribe({
      next: d => { this.uc = d; check(); },
      error: () => check()
    });

    this.clSvc.getSummary().subscribe({
      next: d => { this.cl = d; check(); },
      error: () => check()
    });

    this.evSvc.getMediaScore().subscribe({
      next: d => { this.ev = d; check(); },
      error: () => check()
    });

    this.evSvc.getList().subscribe({
      next: d => { this.evalsList = d; check(); },
      error: () => check()
    });
  }

  getEvScore(key: string): number | null {
    return (this.ev?.score_medi as any)?.[key] ?? null;
  }

  scoreClass(v: number | null): string {
    if (v === null) return '';
    return v >= 8 ? 'score-excellent' : v >= 6 ? 'score-good' : v >= 4 ? 'score-warning' : 'score-danger';
  }

  calculateQualityBreakdown() {
    this.excellentCount = 0;
    this.goodCount = 0;
    this.poorCount = 0;
    if (!this.evalsList || this.evalsList.length === 0) return;

    for (const evItem of this.evalsList) {
      if (evItem.overall_score >= 8.0) {
        this.excellentCount++;
      } else if (evItem.overall_score >= 6.0) {
        this.goodCount++;
      } else {
        this.poorCount++;
      }
    }
  }

  getQualityPercent(type: 'excellent' | 'good' | 'poor'): number {
    const total = this.evalsList?.length || 0;
    if (total === 0) return 0;

    let count = 0;
    if (type === 'excellent') count = this.excellentCount;
    else if (type === 'good') count = this.goodCount;
    else if (type === 'poor') count = this.poorCount;

    return Math.round((count / total) * 100);
  }

  getCriticalEvaluations(): Evaluation[] {
    if (!this.evalsList) return [];
    return this.evalsList.filter(evItem => evItem.overall_score < 6.0).slice(0, 5);
  }
}

