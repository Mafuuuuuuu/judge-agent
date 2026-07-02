import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ChatlogSummary, ChatlogRecord, ChatlogListResponse, ChatlogInsertRequest, ChatlogEvaluateRequest } from '../models/chatlog.model';

@Injectable({ providedIn: 'root' })
export class ChatlogsService {
  private base = '/api/chatlogs';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<ChatlogSummary> {
    return this.http.get<ChatlogSummary>(`${this.base}/analytics/summary`);
  }

  getList(): Observable<ChatlogRecord[]> {
    // Il backend risponde paginato ({page, size, total, items}): chiediamo la size
    // massima (500) e spacchettiamo items, la lista filtra/pagina lato client
    const params = new HttpParams().set('page', 1).set('size', 500);
    return this.http.get<ChatlogListResponse>(`${this.base}/analytics/list`, { params }).pipe(
      map(r => r.items)
    );
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
