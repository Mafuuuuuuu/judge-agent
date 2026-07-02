import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ChatlogSummary, ChatlogRecord, ChatlogInsertRequest, ChatlogEvaluateRequest } from '../models/chatlog.model';

@Injectable({ providedIn: 'root' })
export class ChatlogsService {
  private base = '/api/chatlogs';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<ChatlogSummary> {
    return this.http.get<ChatlogSummary>(`${this.base}/analytics/summary`);
  }

  getList(): Observable<ChatlogRecord[]> {
    return this.http.get<ChatlogRecord[]>(`${this.base}/analytics/list`);
  }

  insert(payload: ChatlogInsertRequest): Observable<any> {
    return this.http.post(`${this.base}/insert`, payload);
  }

  evaluate(payload: ChatlogEvaluateRequest): Observable<any> {
    return this.http.post(`${this.base}/evaluate`, payload);
  }

  delete(logId: string): Observable<any> {
    return this.http.delete(`${this.base}/delete/${encodeURIComponent(logId)}`);
  }
}
