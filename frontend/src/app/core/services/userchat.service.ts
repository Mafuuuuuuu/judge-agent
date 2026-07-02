import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserChatSummary, UserChatListResponse, UserChatInsertRequest } from '../models/userchat.model';

@Injectable({ providedIn: 'root' })
export class UserchatService {
  private base = '/api/userchat';

  constructor(private http: HttpClient) {}

  getSummary(): Observable<UserChatSummary> {
    return this.http.get<UserChatSummary>(`${this.base}/analytics/summary`);
  }

  getList(limit = 50, offset = 0): Observable<UserChatListResponse> {
    const params = new HttpParams().set('limit', limit).set('offset', offset);
    return this.http.get<UserChatListResponse>(`${this.base}/analytics/list`, { params });
  }

  insert(payload: UserChatInsertRequest): Observable<any> {
    return this.http.post(`${this.base}/insert`, payload);
  }

  evaluate(chatId: string): Observable<any> {
    return this.http.post(`${this.base}/evaluate/${encodeURIComponent(chatId)}`, {});
  }

  delete(chatId: string): Observable<any> {
    return this.http.delete(`${this.base}/delete/${encodeURIComponent(chatId)}`);
  }
}
