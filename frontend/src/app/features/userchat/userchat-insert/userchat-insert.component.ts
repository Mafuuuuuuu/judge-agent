import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserchatService } from '../../../core/services/userchat.service';
import { ToastService } from '../../../shared/toast/toast.service';

@Component({
  selector: 'app-userchat-insert',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="fade-in">
      <div class="page-header flex-between">
        <div>
          <h1>Inserisci User Chat</h1>
          <p>Carica una nuova conversazione nel sistema</p>
        </div>
        <a routerLink="/userchat" class="btn btn--secondary btn--sm"><span class="mat-icon" style="font-size:14px;vertical-align:middle">arrow_back</span> Torna alla lista</a>
      </div>

      <div style="max-width:960px;margin:0 auto">
        <div class="card">
          <div class="card-title">Dati Conversazione</div>

          <div style="display:flex;flex-direction:column;gap:20px">
            <div class="form-group">
              <label>CHAT ID (opzionale)</label>
              <input class="form-control" type="text" [(ngModel)]="chatId" placeholder="Lascia vuoto per generarlo automaticamente" />
            </div>

            <div class="form-group">
              <label>SYSTEM PROMPT (opzionale)</label>
              <textarea class="form-control" [(ngModel)]="systemPrompt" placeholder="Inserisci il system prompt dell'agente..." rows="4"></textarea>
            </div>

            <div class="form-group">
              <label>MESSAGGI (JSON array)</label>
              <textarea
                class="form-control font-mono"
                [(ngModel)]="messagesJson"
                rows="12"
                [class.is-error]="jsonError"
                placeholder='[{"role":"user","content":"Ciao"},{"role":"assistant","content":"Salve!"}]'>
              </textarea>
              @if (jsonError) {
                <span style="color:#ef4444;font-size:12px;margin-top:4px"><span class="mat-icon" style="font-size:12px;vertical-align:middle">warning</span> JSON non valido: {{ jsonError }}</span>
              }
            </div>

            <!-- JSON Preview -->
            @if (parsedMessages.length > 0) {
              <div class="card" style="background:rgba(255,255,255,0.02); padding:16px">
                <div class="card-title">Anteprima ({{ parsedMessages.length }} messaggi)</div>
                <div class="messages-preview">
                  @for (msg of parsedMessages; track $index) {
                    <div class="msg" [class.msg--user]="msg.role === 'user'" [class.msg--assistant]="msg.role !== 'user'">
                      <span class="msg-role">{{ msg.role?.toUpperCase() }}</span>
                      <p class="msg-content">{{ msg.content }}</p>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="flex gap-12">
              <button class="btn btn--primary" [disabled]="submitting || !!jsonError" (click)="submit()">
                @if (submitting) { <span class="spinner"></span> Caricamento... }
                @else { <span class="mat-icon" style="font-size:14px;vertical-align:middle">save</span> Salva Chat }
              </button>
              <button class="btn btn--secondary" (click)="loadExample()"><span class="mat-icon" style="font-size:14px;vertical-align:middle">content_paste</span> Carica esempio</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .is-error { border-color: #ef4444 !important; }
    .messages-preview { display: flex; flex-direction: column; gap: 10px; max-height: 280px; overflow-y: auto; }
    .msg { padding: 10px 14px; border-radius: 10px; }
    .msg--user { background: rgba(99,102,241,0.1); border-left: 3px solid #6366f1; }
    .msg--assistant { background: rgba(16,185,129,0.1); border-left: 3px solid #10b981; }
    .msg-role { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #6b7280; }
    .msg-content { margin-top: 4px; font-size: 13px; color: #d1d5db; line-height: 1.5; }
  `]
})
export class UserchatInsertComponent {
  private svc   = inject(UserchatService);
  private toast = inject(ToastService);
  private router = inject(Router);

  chatId = '';
  systemPrompt = '';
  messagesJson = '';
  jsonError = '';
  submitting = false;
  parsedMessages: any[] = [];

  onJsonChange() {
    try {
      this.parsedMessages = JSON.parse(this.messagesJson);
      this.jsonError = '';
    } catch (e: any) {
      this.jsonError = e.message;
      this.parsedMessages = [];
    }
  }

  loadExample() {
    this.messagesJson = JSON.stringify([
      { role: 'user', content: 'Ho un problema con il login, ricevo errore 403.' },
      { role: 'assistant', content: 'Capisco. Può fornirmi l\'ID utente e la timestamp dell\'errore?' },
      { role: 'user', content: 'Utente: mario.rossi, timestamp: 2024-01-15T09:30:00Z' },
      { role: 'assistant', content: 'Ho verificato: il token è scaduto. La guido al rinnovo...' }
    ], null, 2);
    this.onJsonChange();
  }

  submit() {
    this.onJsonChange();
    if (this.jsonError || this.parsedMessages.length === 0) {
      this.toast.error('Inserisci messaggi JSON validi');
      return;
    }
    this.submitting = true;
    this.svc.insert({
      chat_id: this.chatId || undefined,
      system_prompt: this.systemPrompt || undefined,
      messages: this.parsedMessages
    }).subscribe({
      next: r => {
        this.toast.success(`Chat "${r.chat_id}" salvata con ${r.message_count} messaggi`);
        this.router.navigate(['/userchat']);
      },
      error: err => {
        this.toast.error(err?.error?.detail || 'Errore inserimento');
        this.submitting = false;
      }
    });
  }
}
