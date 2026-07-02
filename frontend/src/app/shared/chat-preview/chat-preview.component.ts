import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface PreviewMessage {
  role: 'user' | 'assistant' | 'other';
  roleLabel: string;
  content: string;
  time: string | null;
  ts: number | null;
}

/**
 * Anteprima di una conversazione a bolle di chat.
 * Accetta il campo messages_json cosi' com'e' salvato a DB e normalizza i due
 * formati presenti: user_chats ({role, content: string}) e chat_logs
 * (formato PlatformHero: {role, content: {text}, created_timestamp}).
 */
@Component({
  selector: 'app-chat-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (systemPrompt) {
      <div class="system-banner">
        <span class="mat-icon" style="font-size:14px">smart_toy</span>
        <span class="system-text">{{ systemPrompt }}</span>
      </div>
    }

    @if (parseError) {
      <div class="parse-error">
        <span class="mat-icon" style="font-size:16px">error_outline</span>
        Impossibile interpretare i messaggi di questa chat.
      </div>
    } @else if (messages.length === 0) {
      <div class="parse-error">
        <span class="mat-icon" style="font-size:16px">chat_bubble_outline</span>
        Nessun messaggio in questa conversazione.
      </div>
    } @else {
      <div class="messages-scroll">
        @for (msg of messages; track $index) {
          @if (msg.role === 'other') {
            <div class="msg-other">
              <span class="badge badge--accent">{{ msg.roleLabel }}</span>
              <span class="msg-other-text">{{ msg.content }}</span>
            </div>
          } @else {
            <div class="msg-row" [class.msg-row--user]="msg.role === 'user'">
              <div class="bubble" [class.bubble--user]="msg.role === 'user'">
                <div class="bubble-meta">
                  <span class="bubble-role">{{ msg.roleLabel }}</span>
                  @if (msg.time) { <span class="bubble-time">{{ msg.time }}</span> }
                </div>
                <div class="bubble-text">{{ msg.content }}</div>
              </div>
            </div>
          }
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .system-banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      border-radius: 10px;
      border: 1px dashed rgba(99,102,241,0.35);
      background: rgba(99,102,241,0.05);
      color: #4f46e5;
      font-size: 12px;
      line-height: 1.6;
      .mat-icon { margin-top: 2px; flex-shrink: 0; }
    }
    .system-text { white-space: pre-wrap; word-break: break-word; }

    .parse-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px;
      font-size: 13px;
      color: var(--text-secondary);
    }

    .messages-scroll {
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 420px;
      overflow-y: auto;
      padding: 4px 6px 4px 2px;
    }

    .msg-row { display: flex; justify-content: flex-start; }
    .msg-row--user { justify-content: flex-end; }

    .bubble {
      max-width: 78%;
      padding: 10px 14px;
      border-radius: 14px 14px 14px 4px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
    }
    .bubble--user {
      border-radius: 14px 14px 4px 14px;
      background: var(--accent-grad);
      border-color: transparent;
      .bubble-text { color: #fff; }
      .bubble-role { color: rgba(255,255,255,0.85); }
      .bubble-time { color: rgba(255,255,255,0.6); }
    }

    .bubble-meta {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 4px;
    }
    .bubble-role {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
    }
    .bubble-time { font-size: 10px; color: var(--text-muted); }
    .bubble-text {
      font-size: 13px;
      line-height: 1.65;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-word;
    }

    .msg-other {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-muted);
      padding: 2px 0;
    }
    .msg-other-text {
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    @media (max-width: 700px) {
      .bubble { max-width: 92%; }
      .messages-scroll { max-height: 320px; }
    }
  `]
})
export class ChatPreviewComponent implements OnChanges {
  @Input() messagesJson: string | null = null;
  @Input() systemPrompt: string | null = null;

  messages: PreviewMessage[] = [];
  parseError = false;

  ngOnChanges() {
    this.messages = [];
    this.parseError = false;
    if (!this.messagesJson) return;

    let raw: unknown;
    try {
      raw = JSON.parse(this.messagesJson);
    } catch {
      this.parseError = true;
      return;
    }
    if (!Array.isArray(raw)) {
      this.parseError = true;
      return;
    }

    this.messages = raw.map(m => this.normalize(m));

    // PlatformHero salva i messaggi dal piu' recente al piu' vecchio: se tutti
    // hanno un timestamp li riordiniamo cronologicamente. Senza timestamp
    // (formato user_chats) l'ordine dell'array e' gia' quello di conversazione.
    if (this.messages.length > 1 && this.messages.every(m => m.ts !== null)) {
      this.messages.sort((a, b) => a.ts! - b.ts!);
    }
  }

  private normalize(m: any): PreviewMessage {
    const roleRaw = String(m?.role ?? 'assistant').toLowerCase();
    const role: PreviewMessage['role'] =
      roleRaw === 'user' ? 'user' : roleRaw === 'assistant' ? 'assistant' : 'other';

    // content: string diretta (user_chats) oppure oggetto {text} (chat_logs)
    let content = '';
    if (typeof m?.content === 'string') {
      content = m.content;
    } else if (m?.content && typeof m.content.text === 'string') {
      content = m.content.text;
    } else if (m?.content != null) {
      content = JSON.stringify(m.content);
    }

    // created_timestamp: epoch nel formato PlatformHero; sopra 1e12 e' gia'
    // in millisecondi (13 cifre), altrimenti in secondi
    let time: string | null = null;
    let ts: number | null = null;
    const rawTs = Number(m?.created_timestamp);
    if (Number.isFinite(rawTs) && rawTs > 0) {
      ts = rawTs > 1e12 ? rawTs : rawTs * 1000;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      } else {
        ts = null;
      }
    }

    const labels: Record<string, string> = { user: 'Utente', assistant: 'Assistente' };
    return { role, roleLabel: labels[role] ?? roleRaw, content, time, ts };
  }
}
