import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface Invoice {
  id?: number;
  client_name: string;
  project_title: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  due_date: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <header class="topbar">
        <div>
          <h1>Client & Invoice Tracker</h1>
          <p class="subtitle">Full-Stack Angular + FastAPI Management Dashboard</p>
        </div>
        <div class="actions">
          <button class="btn-secondary" (click)="exportCsv()">Export CSV</button>
          <button class="btn-primary" (click)="showForm = !showForm">
            {{ showForm ? 'Close Form' : '+ New Invoice' }}
          </button>
        </div>
      </header>

      <section class="stats">
        <div class="card">
          <span class="label">Total Billed</span>
          <h2>\${{ totalAmount | number:'1.0-0' }}</h2>
        </div>
        <div class="card">
          <span class="label">Collected (Paid)</span>
          <h2 class="green">\${{ paidAmount | number:'1.0-0' }}</h2>
        </div>
        <div class="card">
          <span class="label">Pending / Overdue</span>
          <h2 class="amber">\${{ pendingAmount | number:'1.0-0' }}</h2>
        </div>
      </section>

      <section class="form-card" *ngIf="showForm">
        <h3>Create New Invoice</h3>
        <form (ngSubmit)="addInvoice()" class="grid-form">
          <input [(ngModel)]="newInvoice.client_name" name="client" placeholder="Client Name" required />
          <input [(ngModel)]="newInvoice.project_title" name="project" placeholder="Project Title" required />
          <input type="number" [(ngModel)]="newInvoice.amount" name="amount" placeholder="Amount ($)" required />
          <select [(ngModel)]="newInvoice.status" name="status">
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
          <input type="date" [(ngModel)]="newInvoice.due_date" name="due" required />
          <button type="submit" class="btn-primary">Save Invoice</button>
        </form>
      </section>

      <section class="table-card">
        <div class="toolbar">
          <input [(ngModel)]="searchTerm" placeholder="Search client or project..." class="search" />
          <select [(ngModel)]="statusFilter" (change)="loadInvoices()" class="filter">
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Project</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredInvoices">
              <td><strong>{{ item.client_name }}</strong></td>
              <td>{{ item.project_title }}</td>
              <td>\${{ item.amount | number:'1.2-2' }}</td>
              <td>{{ item.due_date }}</td>
              <td>
                <span class="badge" [ngClass]="item.status.toLowerCase()">{{ item.status }}</span>
              </td>
              <td>
                <button class="link-btn" *ngIf="item.status !== 'Paid'" (click)="markPaid(item)">Mark Paid</button>
                <button class="link-btn danger" (click)="deleteInvoice(item.id!)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 1050px; margin: 32px auto; padding: 0 20px; font-family: Inter, system-ui, sans-serif; color: #0f172a; }
    .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 24px; }
    .subtitle { margin: 4px 0 0; color: #64748b; font-size: 14px; }
    .actions { display: flex; gap: 10px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .card, .form-card, .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .label { font-size: 13px; color: #64748b; }
    .card h2 { margin: 8px 0 0; font-size: 28px; }
    .green { color: #16a34a; } .amber { color: #d97706; }
    .form-card { margin-bottom: 24px; }
    .grid-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
    input, select { padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .search { flex: 1; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th, td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    th { color: #64748b; font-weight: 600; }
    .badge { padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
    .badge.paid { background: #dcfce7; color: #15803d; }
    .badge.pending { background: #fef3c7; color: #b45309; }
    .badge.overdue { background: #fee2e2; color: #b91c1c; }
    .btn-primary { background: #2563eb; color: #fff; border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .btn-secondary { background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .link-btn { background: none; border: none; color: #2563eb; cursor: pointer; font-weight: 600; margin-right: 10px; }
    .link-btn.danger { color: #dc2626; }
  `]
})
export class App implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = 'http://127.0.0.1:8000/api/invoices';

  invoices: Invoice[] = [];
  searchTerm = '';
  statusFilter = 'All';
  showForm = false;

  newInvoice: Invoice = {
    client_name: '',
    project_title: '',
    amount: 0,
    status: 'Pending',
    due_date: '2026-12-10'
  };

  ngOnInit() { this.loadInvoices(); }

  loadInvoices() {
    const url = this.statusFilter === 'All' ? this.apiUrl : `${this.apiUrl}?status=${this.statusFilter}`;
    this.http.get<Invoice[]>(url).subscribe(data => this.invoices = data);
  }

  get filteredInvoices() {
    const q = this.searchTerm.toLowerCase();
    return this.invoices.filter(i =>
      i.client_name.toLowerCase().includes(q) || i.project_title.toLowerCase().includes(q)
    );
  }

  get totalAmount() { return this.invoices.reduce((s, i) => s + i.amount, 0); }
  get paidAmount() { return this.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0); }
  get pendingAmount() { return this.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + i.amount, 0); }

  addInvoice() {
    this.http.post<Invoice>(this.apiUrl, this.newInvoice).subscribe(() => {
      this.newInvoice = { client_name: '', project_title: '', amount: 0, status: 'Pending', due_date: '2026-12-10' };
      this.showForm = false;
      this.loadInvoices();
    });
  }

  markPaid(item: Invoice) {
    this.http.put(`${this.apiUrl}/${item.id}`, { ...item, status: 'Paid' }).subscribe(() => this.loadInvoices());
  }

  deleteInvoice(id: number) {
    this.http.delete(`${this.apiUrl}/${id}`).subscribe(() => this.loadInvoices());
  }

  exportCsv() {
    const rows = [['Client', 'Project', 'Amount', 'Status', 'Due Date'],
      ...this.filteredInvoices.map(i => [i.client_name, i.project_title, i.amount, i.status, i.due_date])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'invoices.csv';
    a.click();
  }
}