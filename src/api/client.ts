import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export interface StockItem {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category?: string;
  currentQuantity: number;
  lowStockThreshold: number;
  unit: string;
  costPerUnit: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  stockItemId: string;
  type: 'SALE' | 'RESTOCK' | 'WASTE' | 'ADJUSTMENT';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceId?: string;
  notes?: string;
  performedBy?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  tenantId: string;
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  status: 'INITIATED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'REFUNDED' | 'TIMEOUT';
  providerReference?: string;
  failureMode?: 'PROVIDER_TIMEOUT' | 'PROVIDER_ERROR' | 'NETWORK_FAILURE';
  failureReason?: string;
  initiatedAt: string;
  updatedAt: string;
}

export interface SyncResult {
  idempotencyKey: string;
  status: 'accepted' | 'rejected' | 'merged' | 'duplicate';
  message?: string;
}

export interface SyncResponse {
  batchId: string;
  processedAt: string;
  results: SyncResult[];
  summary: { accepted: number; rejected: number; merged: number; duplicates: number };
}

// ─── Inventory API ────────────────────────────────────────────────────────────

export const inventoryApi = {
  getTenants: () => api.get<Tenant[]>('/inventory/tenants').then(r => r.data),
  createTenant: (data: { slug: string; name: string; parentId?: string }) =>
    api.post<Tenant>('/inventory/tenants', data).then(r => r.data),
  getStockItems: (tenantId: string) =>
    api.get<StockItem[]>(`/inventory/tenants/${tenantId}/items`).then(r => r.data),
  getLowStock: (tenantId: string) =>
    api.get<StockItem[]>(`/inventory/tenants/${tenantId}/items/low-stock`).then(r => r.data),
  createStockItem: (tenantId: string, data: Partial<StockItem>) =>
    api.post<StockItem>(`/inventory/tenants/${tenantId}/items`, data).then(r => r.data),
  recordMovement: (tenantId: string, itemId: string, data: any) =>
    api.post<StockMovement>(`/inventory/tenants/${tenantId}/items/${itemId}/movements`, data).then(r => r.data),
  getMovements: (tenantId: string, itemId: string) =>
    api.get<{ item: StockItem; movements: StockMovement[] }>(`/inventory/tenants/${tenantId}/items/${itemId}/movements`).then(r => r.data),
  getAggregate: (parentId: string) =>
    api.get(`/inventory/aggregate/${parentId}`).then(r => r.data),
};

// ─── Payments API ─────────────────────────────────────────────────────────────

export const paymentsApi = {
  initiatePayment: (data: any, scenario = 'success') =>
    api.post<{ payment: Payment; duplicate: boolean }>(`/payments/initiate?scenario=${scenario}`, data).then(r => r.data),
  getPayments: (tenantId: string) =>
    api.get<Payment[]>(`/payments/${tenantId}`).then(r => r.data),
  getPaymentEvents: (tenantId: string, paymentId: string) =>
    api.get(`/payments/${tenantId}/${paymentId}/events`).then(r => r.data),
  reconcile: (tenantId: string, data: any) =>
    api.post(`/payments/${tenantId}/reconcile`, data).then(r => r.data),
};

// ─── Sync API ─────────────────────────────────────────────────────────────────

export const syncApi = {
  syncBatch: (data: any) =>
    api.post<SyncResponse>('/sync/batch', data).then(r => r.data),
  getOperations: (tenantId: string) =>
    api.get(`/sync/operations?tenantId=${tenantId}`).then(r => r.data),
};
