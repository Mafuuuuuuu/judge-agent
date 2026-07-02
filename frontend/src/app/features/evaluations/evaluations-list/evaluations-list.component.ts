import { Component, OnInit, inject, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EvaluationsService } from '../../../core/services/evaluations.service';
import { ToastService } from '../../../shared/toast/toast.service';
import { ScoreBadgeComponent } from '../../../shared/score-badge/score-badge.component';
import { BarChartComponent } from '../../../shared/bar-chart/bar-chart.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { LoadingSkeletonComponent } from '../../../shared/loading-skeleton/loading-skeleton.component';
import { Evaluation, SCORE_LABELS } from '../../../core/models/evaluation.model';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-evaluations-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ScoreBadgeComponent, BarChartComponent, ConfirmDialogComponent, LoadingSkeletonComponent],
  template: `
    <div class="fade-in">
      <!-- Page header -->
      <div class="page-header flex-between">
        <div>
          <h1>Valutazioni</h1>
          <p *ngIf="!hasActiveFilters">{{ evaluations.length }} valutazioni nel sistema</p>
          <p *ngIf="hasActiveFilters">
            <span style="color:#6366f1;font-weight:600">{{ filteredEvaluations.length }}</span>
            di {{ evaluations.length }} valutazioni
          </p>
        </div>
        <button class="btn btn--secondary btn--sm" (click)="load(true)">
          <span class="mat-icon" style="font-size:14px;vertical-align:middle">refresh</span> Aggiorna
        </button>
      </div>

      <!-- Filtri -->
      <div *ngIf="!loading && evaluations.length > 0" class="filters-bar card">

        <!-- Ricerca log ID -->
        <div class="filter-group filter-search">
          <span class="mat-icon filter-icon">search</span>
          <input
            class="filter-input"
            type="text"
            placeholder="Cerca per Log ID..."
            [(ngModel)]="searchText"
            (ngModelChange)="onFilterChange()"
          />
          <button *ngIf="searchText" class="filter-clear-btn" (click)="searchText = ''; onFilterChange()">
            <span class="mat-icon" style="font-size:16px">close</span>
          </button>
        </div>

        <!-- Score minimo -->
        <div class="filter-group">
          <span class="filter-label">Score min</span>
          <div class="filter-select-wrap">
            <select class="filter-select" [(ngModel)]="minScore" (ngModelChange)="onFilterChange()">
              <option [ngValue]="null">Tutti</option>
              <option [ngValue]="9">≥ 9.0</option>
              <option [ngValue]="7">≥ 7.0</option>
              <option [ngValue]="5">≥ 5.0</option>
              <option [ngValue]="3">≥ 3.0</option>
            </select>
          </div>
        </div>

        <!-- Data dal -->
        <div class="filter-group">
          <span class="filter-label">Dal</span>
          <input class="filter-input filter-date" type="date" [(ngModel)]="dateFrom" (ngModelChange)="onFilterChange()" />
        </div>

        <!-- Data al -->
        <div class="filter-group">
          <span class="filter-label">Al</span>
          <input class="filter-input filter-date" type="date" [(ngModel)]="dateTo" (ngModelChange)="onFilterChange()" />
        </div>

        <!-- Ordinamento -->
        <div class="filter-group">
          <span class="filter-label">Ordina</span>
          <div class="filter-select-wrap">
            <select class="filter-select" [(ngModel)]="sortBy" (ngModelChange)="onFilterChange()">
              <option value="date">Data</option>
              <option value="score">Score</option>
            </select>
          </div>
          <button class="sort-dir-btn" (click)="toggleSortDir()" [title]="sortDir === 'desc' ? 'Decrescente' : 'Crescente'">
            <span class="mat-icon" style="font-size:18px">{{ sortDir === 'desc' ? 'arrow_downward' : 'arrow_upward' }}</span>
          </button>
        </div>

        <!-- Reset -->
        <button *ngIf="hasActiveFilters" class="btn btn--secondary btn--sm reset-btn" (click)="resetFilters()">
          <span class="mat-icon" style="font-size:14px">filter_alt_off</span> Reset
        </button>
      </div>

      <app-loading-skeleton *ngIf="loading" [count]="5" [height]="80"></app-loading-skeleton>

      <div *ngIf="!loading && evaluations.length === 0" class="card empty-state">
        <div class="empty-icon"><span class="mat-icon" style="font-size:40px">star_rate</span></div>
        <p>Nessuna valutazione. Valuta una chat dalla sezione User Chats o Chat Logs.</p>
      </div>

      <!-- Nessun risultato per i filtri -->
      <div *ngIf="!loading && evaluations.length > 0 && filteredEvaluations.length === 0" class="card empty-state">
        <div class="empty-icon"><span class="mat-icon" style="font-size:40px">search_off</span></div>
        <p>Nessuna valutazione corrisponde ai filtri impostati.</p>
        <button class="btn btn--secondary btn--sm" style="margin-top:12px" (click)="resetFilters()">Rimuovi filtri</button>
      </div>

      <!-- Lista -->
      <div *ngIf="!loading && filteredEvaluations.length > 0" class="evals-list">
        <div *ngFor="let ev of pagedEvaluations; trackBy: trackById"
             class="card eval-card"
             [class.eval-card--expanded]="expanded === ev.id"
             [class.eval-card--highlight]="highlightId === ev.id"
             [id]="'eval-' + ev.id">

          <div class="eval-header" (click)="toggle(ev.id)">
            <div class="flex gap-12" style="flex:1;min-width:0">
              <app-score-badge [value]="ev.overall_score"></app-score-badge>
              <div style="min-width:0">
                <div class="text-sm truncate" style="color:#1e1b4b">Log: {{ ev.log_id }}</div>
                <div class="text-sm" style="color:#6b7280">{{ ev.created_at | date:'dd/MM/yyyy HH:mm' }}</div>
              </div>
            </div>

            <div class="mini-scores">
              <div *ngFor="let sk of scoreKeys" class="mini-score" [title]="scoreLabels[sk]">
                <span class="mini-label">{{ sk.substring(0,3) }}</span>
                <app-score-badge [value]="getScore(ev, sk)"></app-score-badge>
              </div>
            </div>

            <div class="flex gap-8" (click)="$event.stopPropagation()">
              <button *ngIf="hasAdminRole()" class="btn btn--danger btn--sm" (click)="askDelete(ev.id)">
                <span class="mat-icon" style="font-size:16px">delete</span>
              </button>
              <span class="expand-icon" (click)="toggle(ev.id)">{{ expanded === ev.id ? '▲' : '▼' }}</span>
            </div>
          </div>

          <div *ngIf="expanded === ev.id" class="eval-detail">
            <div class="grid-2 detail-grid">
              <div class="detail-radar">
                <app-bar-chart
                  [data]="toBarData(ev)"
                  [labels]="toBarLabels(ev)"
                  [horizontal]="true"
                  [label]="'Score'"
                  [color]="'rgba(99,102,241,0.75)'"
                  [maxValue]="10"
                ></app-bar-chart>
              </div>
              <div class="detail-right">
                <div class="detail-section">
                  <div class="detail-section-title">
                    <span class="mat-icon" style="font-size:15px">feedback</span> Feedback
                  </div>
                  <p class="detail-feedback">{{ ev.feedback }}</p>
                </div>
                <div *ngIf="ev.issues" class="detail-section">
                  <div class="detail-section-title">
                    <span class="mat-icon" style="font-size:15px">warning</span> Issues Rilevate
                  </div>
                  <div class="flex gap-8" style="flex-wrap:wrap">
                    <span *ngFor="let issue of ev.issues.split(',')" class="badge badge--danger">{{ issue.trim() }}</span>
                  </div>
                </div>
                <div class="detail-section">
                  <div class="detail-section-title">
                    <span class="mat-icon" style="font-size:15px">bar_chart</span> Score Dettaglio
                  </div>
                  <div class="score-grid">
                    <div *ngFor="let sk of scoreKeys" class="score-row flex-between">
                      <span class="score-row-label">{{ scoreLabels[sk] }}</span>
                      <app-score-badge [value]="getScore(ev, sk)"></app-score-badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Paginazione -->
      <div *ngIf="!loading && filteredEvaluations.length > pageSize" class="pagination">
        <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(1)">
          <span class="mat-icon">first_page</span>
        </button>
        <button class="page-btn" [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
          <span class="mat-icon">chevron_left</span>
        </button>
        <button
          *ngFor="let p of pageNumbers"
          class="page-btn"
          [class.page-btn--active]="p === currentPage"
          (click)="goToPage(p)">
          {{ p }}
        </button>
        <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">
          <span class="mat-icon">chevron_right</span>
        </button>
        <button class="page-btn" [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)">
          <span class="mat-icon">last_page</span>
        </button>
        <span class="page-info">{{ (currentPage - 1) * pageSize + 1 }}–{{ pageEnd }} di {{ filteredEvaluations.length }}</span>
      </div>

      <app-confirm-dialog
        [open]="showDelete"
        (confirm)="doDelete()"
        (cancel)="showDelete = false">
      </app-confirm-dialog>
    </div>
  `,
  styles: [`
    /* Filtri */
    .filters-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .filter-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .filter-label {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }
    .filter-icon { font-size: 18px; color: #9ca3af; }
    .filter-search {
      flex: 1;
      min-width: 180px;
      position: relative;
    }
    .filter-input {
      background: #f8f7ff;
      border: 1px solid rgba(99,102,241,0.18);
      border-radius: 8px;
      padding: 7px 10px 7px 32px;
      font-size: 13px;
      color: #1e1b4b;
      width: 100%;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }
    .filter-search .filter-icon {
      position: absolute;
      left: 8px;
      pointer-events: none;
    }
    .filter-input:focus { border-color: #6366f1; }
    .filter-date {
      padding-left: 10px;
      width: 130px;
    }
    .filter-clear-btn {
      position: absolute;
      right: 6px;
      background: none;
      border: none;
      color: #9ca3af;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
      &:hover { color: #6366f1; }
    }
    .filter-select-wrap { position: relative; }
    .filter-select {
      background: #f8f7ff;
      border: 1px solid rgba(99,102,241,0.18);
      border-radius: 8px;
      padding: 7px 28px 7px 10px;
      font-size: 13px;
      color: #1e1b4b;
      cursor: pointer;
      outline: none;
      appearance: none;
      font-family: inherit;
      transition: border-color 0.15s;
      &:focus { border-color: #6366f1; }
    }
    .filter-select-wrap::after {
      content: 'expand_more';
      font-family: 'Material Symbols Rounded';
      position: absolute;
      right: 6px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 16px;
      color: #9ca3af;
      pointer-events: none;
    }
    .sort-dir-btn {
      background: #f8f7ff;
      border: 1px solid rgba(99,102,241,0.18);
      border-radius: 8px;
      color: #6366f1;
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      &:hover { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.35); }
    }
    .reset-btn { margin-left: auto; white-space: nowrap; }

    /* Lista */
    .evals-list { display: flex; flex-direction: column; gap: 10px; }
    .eval-card { padding: 16px 20px; cursor: default; }
    .eval-header { display: flex; align-items: center; gap: 16px; cursor: pointer; user-select: none; }
    .mini-scores { display: flex; gap: 6px; flex-wrap: wrap; flex: 1; justify-content: flex-end; }
    .mini-score { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .mini-label { font-size: 9px; color: #4b5563; text-transform: uppercase; letter-spacing: 0.04em; }
    .expand-icon { color: #4b5563; font-size: 12px; width: 20px; text-align: center; }
    .eval-card--expanded { border-color: rgba(99,102,241,0.35); box-shadow: 0 4px 24px rgba(99,102,241,0.12); }
    @keyframes highlight-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5), 0 4px 24px rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.6); transform: scale(1.01); }
      50%  { box-shadow: 0 0 0 8px rgba(239,68,68,0), 0 4px 24px rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.4); transform: scale(1.01); }
      100% { box-shadow: none; border-color: var(--border); transform: scale(1); }
    }
    .eval-card--highlight {
      animation: highlight-pulse 3s ease forwards;
      z-index: 1;
      position: relative;
    }
    .eval-detail {
      margin: 16px -20px -16px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.04) 100%);
      border-top: 1px solid rgba(99,102,241,0.15);
      border-radius: 0 0 16px 16px;
    }
    .detail-grid { gap: 28px; grid-template-columns: 55% 1fr; }
    .detail-radar { display: flex; align-items: stretch; justify-content: center; min-height: 340px; }
    .detail-right { display: flex; flex-direction: column; gap: 16px; }
    .detail-section { display: flex; flex-direction: column; gap: 8px; }
    .detail-section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.07em; color: #6366f1;
    }
    .detail-feedback {
      font-size: 13px; line-height: 1.7; color: #1e1b4b;
      background: rgba(99,102,241,0.04);
      border-left: 3px solid rgba(99,102,241,0.35);
      border-radius: 0 8px 8px 0;
      padding: 10px 14px;
    }
    .score-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .score-row {
      padding: 6px 12px;
      background: rgba(99,102,241,0.05);
      border: 1px solid rgba(99,102,241,0.08);
      border-radius: 8px;
      transition: background 0.15s;
      &:hover { background: rgba(99,102,241,0.09); }
    }
    .score-row-label { font-size: 12px; color: #4b5563; font-weight: 500; }
    @media (max-width: 900px) {
      .detail-grid { grid-template-columns: 1fr !important; }
      .score-grid { grid-template-columns: 1fr; }
      .mini-scores { display: none; }
      .filters-bar { gap: 8px; }
    }
    @media (max-width: 600px) {
      .eval-header { flex-wrap: wrap; }
      .pagination { gap: 4px; }
      .page-info { display: none; }
    }
    .pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .page-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 34px;
      height: 34px;
      padding: 0 8px;
      border: 1px solid rgba(99,102,241,0.2);
      border-radius: 8px;
      background: #f8f7ff;
      color: #4b5563;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
      font-family: inherit;
      &:hover:not(:disabled) { background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.4); color: #6366f1; }
      &:disabled { opacity: 0.35; cursor: default; }
      .mat-icon { font-size: 18px; }
    }
    .page-btn--active {
      background: #6366f1;
      border-color: #6366f1;
      color: #fff;
      &:hover:not(:disabled) { background: #4f46e5; border-color: #4f46e5; color: #fff; }
    }
    .page-info {
      font-size: 12px;
      color: #6b7280;
      margin-left: 8px;
    }
  `]
})
export class EvaluationsListComponent implements OnInit {
  private svc   = inject(EvaluationsService);
  private toast = inject(ToastService);
  private auth  = inject(AuthService);
  private route = inject(ActivatedRoute);
  private zone  = inject(NgZone);

  evaluations: Evaluation[] = [];
  loading = true;
  expanded: string | null = null;
  showDelete = false;
  pendingDelete: string | null = null;
  highlightId: string | null = null;

  // Filtri
  searchText = '';
  minScore: number | null = null;
  dateFrom = '';
  dateTo = '';
  sortBy: 'date' | 'score' = 'date';
  sortDir: 'asc' | 'desc' = 'desc';

  filteredEvaluations: Evaluation[] = [];
  currentPage = 1;
  pageSize = 10;

  scoreKeys = ['technical', 'completeness', 'business', 'consistency', 'prompt_compliance',
               'helpfulness', 'tone', 'hallucination', 'efficiency', 'source_reliability'];
  scoreLabels = SCORE_LABELS;

  ngOnInit() {
    const id = this.route.snapshot.queryParamMap.get('highlight');
    this.load(false, id ?? undefined);
  }

  load(forceRefresh = false, highlightId?: string) {
    const cached = this.svc.getCachedList();
    if (!forceRefresh && cached !== null) {
      this.evaluations = [...cached];
      this.loading = false;
      this.applyFilters();
      if (highlightId) this.scrollToHighlight(highlightId);
      return;
    }
    this.loading = true;
    this.svc.getList(true).subscribe({
      next: r => {
        this.evaluations = [...r];
        this.loading = false;
        this.applyFilters();
        if (highlightId) this.scrollToHighlight(highlightId);
      },
      error: () => {
        this.toast.error('Errore caricamento valutazioni');
        this.loading = false;
      }
    });
  }

  private scrollToHighlight(id: string) {
    this.highlightId = id;
    const idx = this.filteredEvaluations.findIndex(ev => ev.id === id);
    if (idx !== -1) {
      this.currentPage = Math.floor(idx / this.pageSize) + 1;
    }
    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        const el = document.getElementById('eval-' + id);
        if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        setTimeout(() => { this.zone.run(() => { this.highlightId = null; }); }, 3000);
      }, 150);
    });
  }

  onFilterChange() { this.applyFilters(); }

  applyFilters() {
    let result = [...this.evaluations];

    if (this.searchText.trim()) {
      const q = this.searchText.toLowerCase();
      result = result.filter(ev => ev.log_id?.toLowerCase().includes(q));
    }

    if (this.minScore !== null) {
      result = result.filter(ev => ev.overall_score !== null && (ev.overall_score ?? 0) >= this.minScore!);
    }

    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      result = result.filter(ev => ev.created_at && new Date(ev.created_at) >= from);
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(ev => ev.created_at && new Date(ev.created_at) <= to);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (this.sortBy === 'date') {
        cmp = new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
      } else {
        cmp = (a.overall_score ?? 0) - (b.overall_score ?? 0);
      }
      return this.sortDir === 'desc' ? -cmp : cmp;
    });

    this.filteredEvaluations = result;
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredEvaluations.length / this.pageSize) || 1;
  }

  get pagedEvaluations(): Evaluation[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEvaluations.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const cur = this.currentPage;
    const delta = 2;
    const pages: number[] = [];
    for (let i = Math.max(1, cur - delta); i <= Math.min(total, cur + delta); i++) {
      pages.push(i);
    }
    return pages;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredEvaluations.length);
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages) return;
    this.currentPage = p;
    this.expanded = null;
  }

  get hasActiveFilters(): boolean {
    return !!this.searchText || this.minScore !== null || !!this.dateFrom || !!this.dateTo;
  }

  resetFilters() {
    this.searchText = '';
    this.minScore = null;
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }

  toggleSortDir() {
    this.sortDir = this.sortDir === 'desc' ? 'asc' : 'desc';
    this.applyFilters();
  }

  // Track per id: con filtri/ordinamento l'indice cambia, l'id no
  trackById(_index: number, ev: Evaluation): string { return ev.id; }

  toggle(id: string) {
    this.expanded = this.expanded === id ? null : id;
  }

  getScore(ev: Evaluation, key: string): number | null {
    const val = (ev as any)[`${key}_score`];
    if (val === null || val === undefined) return null;
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  toScoreMap(ev: Evaluation): Record<string, number | null> {
    return Object.fromEntries(this.scoreKeys.map(k => [k, this.getScore(ev, k)]));
  }

  toBarData(ev: Evaluation): number[] {
    return this.scoreKeys.map(k => this.getScore(ev, k) ?? 0);
  }

  toBarLabels(ev: Evaluation): string[] {
    return this.scoreKeys.map(k => this.scoreLabels[k]);
  }

  askDelete(id: string) { this.pendingDelete = id; this.showDelete = true; }

  doDelete() {
    if (!this.pendingDelete) return;
    this.svc.delete(this.pendingDelete).subscribe({
      next: () => {
        this.showDelete = false;
        this.pendingDelete = null;
        this.expanded = null;
        this.load(true);
        this.toast.success('Valutazione eliminata');
      },
      error: () => { this.toast.error('Errore eliminazione'); this.showDelete = false; }
    });
  }

  hasAdminRole(): boolean {
    return this.auth.hasRole(['admin']);
  }
}
