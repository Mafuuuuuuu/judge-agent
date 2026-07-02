import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ChatlogsService } from '../../../core/services/chatlogs.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ScoreBadgeComponent } from '../../../shared/score-badge/score-badge.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { LoadingSkeletonComponent } from '../../../shared/loading-skeleton/loading-skeleton.component';
import { ChatlogRecord } from '../../../core/models/chatlog.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-chatlogs-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ScoreBadgeComponent, ConfirmDialogComponent, LoadingSkeletonComponent],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Chat Logs</h1>
          <p>{{ logs.length }} log sincronizzati da PlatformHero</p>
        </div>
        <div class="flex gap-8">
          <button class="btn btn--secondary btn--sm" (click)="load()"><span class="mat-icon" style="font-size:14px;vertical-align:middle">refresh</span> Aggiorna</button>
          @if (hasWriteRole()) {
            <a routerLink="/chatlogs/insert" class="btn btn--primary btn--sm">+ Sincronizza</a>
          }
        </div>
      </div>

      @if (loading) {
        <app-loading-skeleton [count]="5" [height]="64"></app-loading-skeleton>
      } @else if (logs.length === 0) {
        <div class="card empty-state">
          <div class="empty-icon"><span class="mat-icon" style="font-size:40px">description</span></div>
          <p>Nessun log trovato. Sincronizza da PlatformHero.</p>
          @if (hasWriteRole()) {
            <a routerLink="/chatlogs/insert" class="btn btn--primary mt-16">+ Sincronizza ora</a>
          }
        </div>
      } @else {
        <!-- Evaluate panel -->
        <div class="card section">
          <div class="card-title">Valuta un Chat Log</div>
          <div class="flex gap-12" style="flex-wrap:wrap">
            <input
              class="form-control"
              style="max-width:300px"
              type="text"
              [(ngModel)]="evalChatId"
              placeholder="Chat ID da valutare..." />
            <input
              class="form-control"
              style="max-width:400px"
              type="text"
              [(ngModel)]="evalSystemPrompt"
              placeholder="System prompt (opzionale)" />
            <button class="btn btn--success" [disabled]="evaluating || !evalChatId" (click)="evaluate()">
              @if (evaluating) { <span class="spinner"></span> } @else { <span class="mat-icon" style="font-size:14px;vertical-align:middle">star_rate</span> Valuta }
            </button>
          </div>
          @if (evalResult) {
            <div class="eval-result mt-16 card" style="padding:16px;background:rgba(16,185,129,0.05);border-color:rgba(16,185,129,0.2)">
              <div class="flex-between">
                <strong>Valutazione completata</strong>
                <app-score-badge [value]="evalResult.scores?.overall_score"></app-score-badge>
              </div>
              <p style="color:#1e1b4b;font-size:13px;margin-top:8px;line-height:1.7">{{ evalResult.scores?.feedback }}</p>
            </div>
          }
        </div>

        <div class="card">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Chat ID</th>
                  <th>Assistant ID</th>
                  <th>Messaggi</th>
                  <th>Creato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                @for (log of logs; track log.id) {
                  <tr>
                    <td class="truncate" style="max-width:140px">{{ log.id }}</td>
                    <td class="truncate text-muted" style="max-width:140px">{{ log.chat_id }}</td>
                    <td class="truncate text-muted" style="max-width:120px">{{ log.assistant_id }}</td>
                    <td><span class="badge badge--accent">{{ log.message_count }}</span></td>
                    <td class="text-sm text-muted">{{ log.created_at | date:'dd/MM/yy HH:mm' }}</td>
                    <td>
                      @if (hasAdminRole()) {
                        <button class="btn btn--danger btn--sm" (click)="askDelete(log.id)"><span class="mat-icon" style="font-size:16px">delete</span></button>
                      } @else {
                        <span class="text-sm text-muted">-</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="showDelete"
        message="Il log e le valutazioni collegate verranno eliminati."
        (confirm)="doDelete()"
        (cancel)="showDelete = false">
      </app-confirm-dialog>
    </div>
  `,
  styles: []
})
export class ChatlogsListComponent implements OnInit {
  private svc   = inject(ChatlogsService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);

  logs: ChatlogRecord[] = [];
  loading = true;
  evaluating = false;
  evalChatId = '';
  evalSystemPrompt = '';
  evalResult: any = null;
  showDelete = false;
  pendingDelete: string | null = null;

  // for ngModel without FormsModule import — need to add
  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getList().subscribe({
      next: r => { this.logs = r; this.loading = false; },
      error: () => { this.toast.error('Errore caricamento log'); this.loading = false; }
    });
  }

  evaluate() {
    this.evaluating = true;
    this.evalResult = null;
    this.svc.evaluate({ chat_id: this.evalChatId, system_prompt_agente: this.evalSystemPrompt }).subscribe({
      next: r => { this.evalResult = r; this.evaluating = false; this.toast.success('Valutazione completata!'); },
      error: err => { this.toast.error(err?.error?.detail || 'Errore valutazione'); this.evaluating = false; }
    });
  }

  askDelete(id: string) { this.pendingDelete = id; this.showDelete = true; }

  doDelete() {
    if (!this.pendingDelete) return;
    this.svc.delete(this.pendingDelete).subscribe({
      next: () => { this.showDelete = false; this.pendingDelete = null; this.load(); this.toast.success('Log eliminato'); },
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
