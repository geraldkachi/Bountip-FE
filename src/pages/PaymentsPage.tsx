import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi, inventoryApi } from '../api/client';
import { CreditCard, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

type Scenario = 'success' | 'timeout' | 'provider_error' | 'network_failure';

const scenarioDescriptions: Record<Scenario, string> = {
  success: 'Payment processes successfully',
  timeout: 'Provider times out — stored as TIMEOUT status',
  provider_error: 'Provider declines (card) — stored as FAILED with PROVIDER_ERROR',
  network_failure: 'Network unreachable — stored as FAILED with NETWORK_FAILURE',
};

const statusIcon = (status: string) => {
  if (status === 'CONFIRMED') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === 'TIMEOUT') return <Clock className="w-4 h-4 text-amber-400" />;
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-400" />;
  return <AlertCircle className="w-4 h-4 text-gray-400" />;
};

const statusBadge = (status: string) => {
  if (status === 'CONFIRMED') return 'badge-green';
  if (status === 'FAILED') return 'badge-red';
  if (status === 'TIMEOUT') return 'badge-yellow';
  return 'badge-blue';
};

export function PaymentsPage() {
  const [tenantId, setTenantId] = useState('');
  const [scenario, setScenario] = useState<Scenario>('success');
  const [form, setForm] = useState({ orderId: `order_${Date.now()}`, amount: 15000, customerEmail: 'customer@example.com' });
  const [reconcileResult, setReconcileResult] = useState<any>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: inventoryApi.getTenants });
  const activeTenant = tenantId || tenants[0]?.id || '';

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', activeTenant],
    queryFn: () => paymentsApi.getPayments(activeTenant),
    enabled: !!activeTenant,
    refetchInterval: 5000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['payment-events', selectedPayment],
    queryFn: () => paymentsApi.getPaymentEvents(activeTenant, selectedPayment!),
    enabled: !!selectedPayment && !!activeTenant,
  });

  const payMut = useMutation({
    mutationFn: () => paymentsApi.initiatePayment({ tenantId: activeTenant, ...form }, scenario),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', activeTenant] });
      setForm(f => ({ ...f, orderId: `order_${Date.now()}` }));
    },
  });

  const reconcileMut = useMutation({
    mutationFn: () => {
      const confirmedPayments = payments.filter(p => p.providerReference);
      return paymentsApi.reconcile(activeTenant, {
        providerTransactions: confirmedPayments.map(p => ({
          reference: p.providerReference!,
          status: 'success',
          amount: p.amount,
          paidAt: p.updatedAt,
        })),
      });
    },
    onSuccess: (data) => setReconcileResult(data),
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-3xl text-white">Payments</h1>
          <p className="text-gray-400 text-sm mt-1">Payment reliability layer — Task 3</p>
        </div>
        <select className="input w-48" value={activeTenant} onChange={e => setTenantId(e.target.value)}>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Initiate payment */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-600 text-sm text-white mb-4">Initiate Payment</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Order ID</label>
                <input type="text" className="input" value={form.orderId}
                  onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} />
              </div>
              <div>
                <label className="label">Amount (₦ kobo)</label>
                <input type="number" className="input" value={form.amount} min={1}
                  onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                <p className="text-xs text-gray-600 mt-1">= ₦{(form.amount / 100).toLocaleString()}</p>
              </div>
              <div>
                <label className="label">Customer Email</label>
                <input type="email" className="input" value={form.customerEmail}
                  onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} />
              </div>
              <div>
                <label className="label">Test Scenario</label>
                <select className="input" value={scenario} onChange={e => setScenario(e.target.value as Scenario)}>
                  {(Object.keys(scenarioDescriptions) as Scenario[]).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">{scenarioDescriptions[scenario]}</p>
              </div>
            </div>

            <button
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              onClick={() => payMut.mutate()}
              disabled={payMut.isPending || !activeTenant}
            >
              <CreditCard className="w-4 h-4" />
              {payMut.isPending ? 'Processing...' : 'Charge Payment'}
            </button>

            {payMut.data && (
              <div className={`mt-3 p-3 rounded-lg text-xs ${
                payMut.data.payment.status === 'CONFIRMED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-900' :
                'bg-red-950 text-red-300 border border-red-900'
              }`}>
                {payMut.data.duplicate
                  ? '⚡ Idempotency: Duplicate request — returned existing payment'
                  : `Status: ${payMut.data.payment.status}${payMut.data.payment.failureMode ? ` (${payMut.data.payment.failureMode})` : ''}`
                }
              </div>
            )}
          </div>

          {/* Reconcile */}
          <div className="card">
            <h3 className="font-display font-600 text-sm text-white mb-3">Reconciliation</h3>
            <p className="text-xs text-gray-500 mb-3">
              Compare internal records against provider transactions to find discrepancies.
            </p>
            <button
              className="btn-ghost w-full flex items-center justify-center gap-2"
              onClick={() => reconcileMut.mutate()}
              disabled={reconcileMut.isPending}
            >
              <RefreshCw className="w-4 h-4" />
              Run Reconciliation
            </button>

            {reconcileResult && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-surface-700 rounded p-2 text-center">
                    <p className="text-emerald-400 font-display font-700 text-lg">{reconcileResult.summary.matched}</p>
                    <p className="text-xs text-gray-500">Matched</p>
                  </div>
                  <div className="bg-surface-700 rounded p-2 text-center">
                    <p className="text-red-400 font-display font-700 text-lg">{reconcileResult.summary.discrepancies}</p>
                    <p className="text-xs text-gray-500">Discrepancies</p>
                  </div>
                </div>
                {reconcileResult.discrepancies.map((d: any, i: number) => (
                  <div key={i} className="bg-red-950/50 border border-red-900/50 rounded p-2">
                    <p className="text-xs text-red-400 font-medium">{d.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{d.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payments list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-surface-600">
              <h3 className="font-display font-600 text-sm text-white">Transaction Log</h3>
            </div>
            {payments.length === 0 ? (
              <p className="text-gray-600 text-xs p-4">No payments yet.</p>
            ) : (
              <table className="w-full">
                <thead className="border-b border-surface-600">
                  <tr>
                    {['Order ID', 'Amount', 'Status', 'Failure', 'Time', 'Events'].map(h => (
                      <th key={h} className="text-left px-4 py-2 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-surface-700 last:border-0 hover:bg-surface-700/30">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{p.orderId}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-200">
                        ₦{(Number(p.amount) / 100).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(p.status)}
                          <span className={statusBadge(p.status)}>{p.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{p.failureMode || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">
                        {new Date(p.initiatedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <button className="btn-ghost text-xs px-2 py-1"
                          onClick={() => setSelectedPayment(selectedPayment === p.id ? null : p.id)}>
                          Audit log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Event log */}
          {selectedPayment && (
            <div className="card">
              <h3 className="font-display font-600 text-sm text-white mb-3">Audit Event Log</h3>
              {events.length === 0 ? (
                <p className="text-gray-600 text-xs">Loading events...</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-surface-600"></div>
                  <div className="space-y-3 pl-6">
                    {events.map((e: any) => (
                      <div key={e.id} className="relative">
                        <div className="absolute -left-4 top-1 w-2 h-2 rounded-full bg-brand-500 border-2 border-surface-800"></div>
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">{e.eventType}</span>
                            {e.metadata && (
                              <p className="text-xs text-gray-600 font-mono mt-0.5">
                                {JSON.stringify(e.metadata).slice(0, 60)}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-600 font-mono">{new Date(e.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
