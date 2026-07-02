import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ChatlogsService } from '../../../core/services/chatlogs.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-chatlogs-insert',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Sincronizza Chat Log</h1>
          <p>Recupera i messaggi di una chat da PlatformHero</p>
        </div>
        <a routerLink="/chatlogs" class="btn btn--secondary btn--sm"><span class="mat-icon" style="font-size:14px;vertical-align:middle">arrow_back</span> Torna alla lista</a>
      </div>

      <div style="max-width:600px">
        <div class="card">
          <div class="card-title">Parametri Sincronizzazione</div>

          <div style="display:flex;flex-direction:column;gap:20px">
            <div class="form-group">
              <label>ASSISTANT ID</label>
              <input class="form-control" type="text" [(ngModel)]="assistantId" placeholder="es. asst_abc123..." />
              <span class="text-sm text-muted">ID dell'assistente su PlatformHero</span>
            </div>

            <div class="form-group">
              <label>CHAT ID</label>
              <input class="form-control" type="text" [(ngModel)]="chatId" placeholder="es. chat_xyz789..." />
              <span class="text-sm text-muted">ID della conversazione da sincronizzare</span>
            </div>

            @if (result) {
              <div class="result-card card" [class.result--success]="result.is_updated" style="padding:16px">
                <div class="flex gap-12">
                  <span class="mat-icon" style="font-size:24px" [style.color]="result.is_updated ? '#10b981' : '#6366f1'">{{ result.is_updated ? 'check_circle' : 'info' }}</span>
                  <div>
                    <strong>{{ result.message }}</strong>
                    <p class="text-sm text-muted mt-16">Log ID: <span>{{ result.log_id }}</span></p>
                  </div>
                </div>
              </div>
            }

            <div class="flex gap-12">
              <button
                class="btn btn--primary"
                [disabled]="submitting || !assistantId || !chatId"
                (click)="submit()">
                @if (submitting) { <span class="spinner"></span> Sincronizzazione... }
                @else { <span class="mat-icon" style="font-size:14px;vertical-align:middle">sync</span> Sincronizza }
              </button>
              <a routerLink="/chatlogs" class="btn btn--secondary"><span class="mat-icon" style="font-size:14px;vertical-align:middle">arrow_back</span> Lista log</a>
            </div>
          </div>
        </div>

        <div class="card mt-16" style="background:rgba(99,102,241,0.05);border-color:rgba(99,102,241,0.2)">
          <div class="card-title">Come funziona</div>
          <ul style="list-style:none;display:flex;flex-direction:column;gap:8px;font-size:13px;color:#94a3b8;counter-reset:step">
            <li>1. Il sistema recupera i messaggi dall'API di PlatformHero</li>
            <li>2. Salva il log nella tabella <code style="color:#6366f1">chat_logs</code></li>
            <li>3. Se la chat esiste già, aggiorna solo se ci sono nuovi messaggi</li>
            <li>4. Dopo la sincronizzazione puoi valutare il log con il Judge AI</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .result--success { background: rgba(16,185,129,0.08) !important; border-color: rgba(16,185,129,0.3) !important; }
    code { font-family: monospace; font-size: 12px; }
  `]
})
export class ChatlogsInsertComponent {
  private svc   = inject(ChatlogsService);
  private toast = inject(ToastService);
  private router = inject(Router);

  assistantId = '';
  chatId = '';
  submitting = false;
  result: any = null;

  submit() {
    this.submitting = true;
    this.result = null;
    this.svc.insert({ assistant_id: this.assistantId, chat_id: this.chatId }).subscribe({
      next: r => {
        this.result = r;
        this.submitting = false;
        this.toast.success(r.message);
      },
      error: err => {
        this.toast.error(err?.error?.detail || 'Errore sincronizzazione');
        this.submitting = false;
      }
    });
  }
}
