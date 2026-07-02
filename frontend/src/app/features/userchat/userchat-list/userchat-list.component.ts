import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { UserchatService } from '../../../core/services/userchat.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ScoreBadgeComponent } from '../../../shared/score-badge/score-badge.component';
import { ScoreRadarComponent } from '../../../shared/score-radar/score-radar.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { LoadingSkeletonComponent } from '../../../shared/loading-skeleton/loading-skeleton.component';
import { ChatPreviewComponent } from '../../../shared/chat-preview/chat-preview.component';
import { UserChatRecord } from '../../../core/models/userchat.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-userchat-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    ScoreBadgeComponent, ScoreRadarComponent,
    ConfirmDialogComponent, LoadingSkeletonComponent,
    ChatPreviewComponent
  ],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>User Chats</h1>
          <p>{{ total }} conversazioni nel sistema</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn--secondary btn--sm" (click)="load()"><span class="mat-icon" style="font-size:14px;vertical-align:middle">refresh</span> Aggiorna</button>
          @if (hasWriteRole()) {
            <a routerLink="/userchat/insert" class="btn btn--primary btn--sm">+ Nuova Chat</a>
          }
        </div>
      </div>

      @if (loading) {
        <app-loading-skeleton [count]="5" [height]="64"></app-loading-skeleton>
      } @else if (chats.length === 0) {
        <div class="card empty-state">
          <div class="empty-icon"><span class="mat-icon" style="font-size:40px">forum</span></div>
          <p>Nessuna chat trovata.</p>
          @if (hasWriteRole()) {
            <a routerLink="/userchat/insert" class="btn btn--primary mt-16">+ Inserisci la prima chat</a>
          }
        </div>
      } @else {
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:28px"></th>
                  <th>ID</th>
                  <th>System Prompt</th>
                  <th>Messaggi</th>
                  <th>Creata</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                @for (chat of chats; track chat.id) {
                  <tr class="chat-row" [class.chat-row--open]="expanded === chat.id" (click)="togglePreview(chat.id)">
                    <td><span class="mat-icon expand-chevron" [class.expand-chevron--open]="expanded === chat.id">chevron_right</span></td>
                    <td class="truncate">{{ chat.id }}</td>
                    <td class="truncate text-muted">{{ chat.system_prompt || '—' }}</td>
                    <td><span class="badge badge--accent">{{ chat.message_count }}</span></td>
                    <td class="text-sm text-muted">{{ chat.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td (click)="$event.stopPropagation()">
                      <div class="flex gap-8">
                        @if (hasWriteRole()) {
                          <button
                            class="btn btn--success btn--sm"
                            [disabled]="evaluating === chat.id"
                            (click)="evaluate(chat.id)">
                            @if (evaluating === chat.id) {
                              <span class="spinner"></span>
                            } @else {
                              <span class="mat-icon" style="font-size:14px;vertical-align:middle">star_rate</span> Valuta
                            }
                          </button>
                        }
                        @if (hasAdminRole()) {
                          <button class="btn btn--danger btn--sm" (click)="askDelete(chat.id)"><span class="mat-icon" style="font-size:16px">delete</span></button>
                        }
                        @if (!hasWriteRole() && !hasAdminRole()) {
                          <span class="text-sm text-muted">-</span>
                        }
                      </div>
                    </td>
                  </tr>
                  <!-- Anteprima conversazione -->
                  @if (expanded === chat.id) {
                    <tr class="preview-row">
                      <td colspan="6">
                        <div class="preview-wrap">
                          <app-chat-preview
                            [messagesJson]="chat.messages_json"
                            [systemPrompt]="chat.system_prompt">
                          </app-chat-preview>
                        </div>
                      </td>
                    </tr>
                  }
                  <!-- Evaluation result row -->
                  @if (evalResults[chat.id]) {
                    <tr class="eval-row">
                      <td colspan="6">
                        <div class="eval-expand card--glass" style="padding: 16px; border-radius: 10px; margin: 4px 0;">
                          <div class="flex-between mb-16">
                            <strong style="color:#6366f1;font-size:13px;text-transform:uppercase;letter-spacing:0.06em">Risultato Valutazione</strong>
                            <app-score-badge [value]="evalResults[chat.id].overall_score"></app-score-badge>
                          </div>
                          <div class="flex gap-16">
                            <div style="flex:1">
                              <app-score-radar [scores]="evalResults[chat.id]"></app-score-radar>
                            </div>
                            <div style="flex:1">
                              <div class="eval-feedback">
                                <div class="card-title">Feedback</div>
                                <p style="color:#1e1b4b;font-size:13px;line-height:1.7">{{ evalResults[chat.id].feedback }}</p>
                                @if (evalResults[chat.id].issues) {
                                  <div class="mt-16">
                                    <div class="card-title">Issues</div>
                                    <div class="flex gap-8" style="flex-wrap:wrap">
                                      @for (issue of evalResults[chat.id].issues.split(','); track issue) {
                                        <span class="badge badge--danger">{{ issue.trim() }}</span>
                                      }
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                  <!-- Error row -->
                  @if (evalErrors[chat.id]) {
                    <tr class="error-row">
                      <td colspan="6">
                        <div class="error-expand" style="padding:14px 16px;margin:4px 0;border-radius:10px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25)">
                          <div class="flex gap-10" style="align-items:flex-start">
                            <span class="mat-icon" style="font-size:18px;flex-shrink:0;color:#ef4444">warning</span>
                            <div>
                              <div style="font-size:12px;font-weight:700;color:#ef4444;margin-bottom:4px">Errore Valutazione</div>
                              <div style="font-size:12px;color:#fca5a5;line-height:1.6;word-break:break-all">{{ evalErrors[chat.id] }}</div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          <div class="flex-between mt-16">
            <span class="text-sm text-muted">Mostrando {{ chats.length }} di {{ total }}</span>
            <div class="flex gap-8">
              <button class="btn btn--secondary btn--sm" [disabled]="offset === 0" (click)="prev()"><span class="mat-icon" style="font-size:14px;vertical-align:middle">chevron_left</span> Precedente</button>
              <button class="btn btn--secondary btn--sm" [disabled]="offset + limit >= total" (click)="next()">Successiva <span class="mat-icon" style="font-size:14px;vertical-align:middle">chevron_right</span></button>
            </div>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="showDelete"
        message="Verranno eliminate anche le valutazioni collegate."
        (confirm)="doDelete()"
        (cancel)="showDelete = false">
      </app-confirm-dialog>
    </div>
  `,
  styles: [`
    .eval-row td { background: rgba(99,102,241,0.03); }
    .eval-expand { background: linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.05) 100%); border: 1px solid rgba(99,102,241,0.2); }

    .chat-row { cursor: pointer; }
    .chat-row:hover td { background: rgba(99,102,241,0.04); }
    .chat-row--open td { background: rgba(99,102,241,0.06); }
    .expand-chevron {
      font-size: 18px;
      color: var(--text-muted);
      transition: transform 0.2s ease, color 0.2s ease;
      display: inline-block;
    }
    .expand-chevron--open { transform: rotate(90deg); color: var(--accent); }
    .preview-row td { background: rgba(99,102,241,0.03); }
    .preview-wrap {
      padding: 14px 8px;
      margin: 4px 0;
    }
  `]
})
export class UserchatListComponent implements OnInit {
  private svc   = inject(UserchatService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);

  chats: UserChatRecord[] = [];
  total = 0;
  limit = 20;
  offset = 0;
  loading = true;
  evaluating: string | null = null;
  evalResults: Record<string, any> = {};
  evalErrors: Record<string, string> = {};
  showDelete = false;
  pendingDelete: string | null = null;
  expanded: string | null = null;

  ngOnInit() { this.load(); }

  togglePreview(id: string) {
    this.expanded = this.expanded === id ? null : id;
  }

  load() {
    this.loading = true;
    this.expanded = null;
    this.svc.getList(this.limit, this.offset).subscribe({
      next: r => { this.chats = r.risultati; this.total = r.totale; this.loading = false; },
      error: () => { this.toast.error('Errore caricamento chat'); this.loading = false; }
    });
  }

  prev() { this.offset = Math.max(0, this.offset - this.limit); this.load(); }
  next() { this.offset += this.limit; this.load(); }

  evaluate(id: string) {
    this.evaluating = id;
    delete this.evalErrors[id];
    delete this.evalResults[id];
    this.svc.evaluate(id).subscribe({
      next: r => {
        const scoreKeys = ['technical','completeness','business','consistency',
                           'prompt_compliance','helpfulness','tone','hallucination',
                           'efficiency','source_reliability'];
        const radarMap: Record<string, number | null> = {};
        scoreKeys.forEach(k => radarMap[k] = r.scores[`${k}_score`] ?? null);
        this.evalResults[id] = { ...r.scores, ...radarMap };
        this.evaluating = null;
        this.toast.success('Valutazione completata!');
      },
      error: (err) => {
        const detail = err?.error?.detail || err?.message || 'Errore sconosciuto durante la valutazione';
        this.evalErrors[id] = detail;
        this.toast.error('Valutazione fallita: ' + detail.substring(0, 80));
        this.evaluating = null;
      }
    });
  }

  askDelete(id: string) { this.pendingDelete = id; this.showDelete = true; }

  doDelete() {
    if (!this.pendingDelete) return;
    this.svc.delete(this.pendingDelete).subscribe({
      next: () => { this.showDelete = false; this.pendingDelete = null; this.load(); this.toast.success('Chat eliminata'); },
      error: () => { this.toast.error('Errore eliminazione'); this.showDelete = false; }
    });
  }

  hasAdminRole(): boolean {
    return this.auth.hasRole(['admin']);
  }

  hasWriteRole(): boolean {
    return this.auth.hasRole(['admin', 'analyst']);
  }
}
