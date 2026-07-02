import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'info', duration = 3500) {
    const id = this.nextId++;
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error', 5000); }
  info(msg: string)    { this.show(msg, 'info'); }

  dismiss(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
