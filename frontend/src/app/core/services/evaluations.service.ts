import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap, map } from 'rxjs';
import { Evaluation, EvaluationListResponse, EvaluationMediaScore } from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationsService {
  private base = '/api/evaluations';
  private _cachedList: Evaluation[] | null = null;

  constructor(private http: HttpClient) {}

  getMediaScore(fromDate?: string, toDate?: string): Observable<EvaluationMediaScore> {
    let params = new HttpParams();
    if (fromDate) params = params.set('from_date', fromDate);
    if (toDate) params = params.set('to_date', toDate);
    return this.http.get<EvaluationMediaScore>(`${this.base}/analytics/mediascore`, { params });
  }

  getCachedList(): Evaluation[] | null {
    return this._cachedList;
  }

  getList(forceRefresh = false): Observable<Evaluation[]> {
    if (!forceRefresh && this._cachedList !== null) {
      return of(this._cachedList);
    }
    // Il backend risponde paginato ({page, size, total, items}): chiediamo la size
    // massima (500) e spacchettiamo items, i componenti filtrano/paginano lato client
    const params = new HttpParams().set('page', 1).set('size', 500);
    return this.http.get<EvaluationListResponse>(`${this.base}/analytics/list`, { params }).pipe(
      map(r => r.items),
      tap(data => this._cachedList = data)
    );
  }

  invalidateCache() {
    this._cachedList = null;
  }

  delete(evalId: string): Observable<any> {
    return this.http.delete(`${this.base}/delete/${encodeURIComponent(evalId)}`).pipe(
      tap(() => this._cachedList = null)
    );
  }
}
