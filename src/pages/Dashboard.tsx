import { useQuery } from '@tanstack/react-query';
import { inventoryApi, paymentsApi } from '../api/client';
import { Layers, CreditCard, RefreshCw, AlertTriangle, TrendingUp, Users } from 'lucide-react';

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string; icon: any; accent: string;
}) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="label">{label}</p>
        <p className="font-display font-700 text-2xl text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: inventoryApi.getTenants,
  });

  const firstTenantId = tenants[0]?.id;

  const { data: payments = [] } = useQuery({
    queryKey: ['payments', firstTenantId],
    queryFn: () => paymentsApi.getPayments(firstTenantId!),
    enabled: !!firstTenantId,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['stock-items', firstTenantId],
    queryFn: () => inventoryApi.getStockItems(firstTenantId!),
    enabled: !!firstTenantId,
  });

  const confirmed = payments.filter(p => p.status === 'CONFIRMED').length;
  const failed = payments.filter(p => ['FAILED', 'TIMEOUT'].includes(p.status)).length;
  const revenue = payments
    .filter(p => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const lowStock = items.filter(
    i => Number(i.currentQuantity) <= Number(i.lowStockThreshold) && Number(i.lowStockThreshold) > 0,
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display font-800 text-3xl text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1 font-body">
          Bountip Bake Platform — Overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 lg:grid-cols-4">
        <StatCard
          label="Locations"
          value={tenants.length}
          sub="Active tenants"
          icon={Users}
          accent="bg-brand-500/15 text-brand-400"
        />
        <StatCard
          label="Stock Items"
          value={items.length}
          sub={`${lowStock.length} low stock`}
          icon={Layers}
          accent="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          label="Payments"
          value={confirmed}
          sub={`${failed} failed`}
          icon={CreditCard}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          label="Revenue"
          value={`₦${(revenue / 100).toLocaleString()}`}
          sub="Confirmed only"
          icon={TrendingUp}
          accent="bg-purple-500/15 text-purple-400"
        />
      </div>

      {/* Task summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-brand-400" />
            <h3 className="font-display font-600 text-sm text-white">Task 1: Sync Engine</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-400 font-body">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Offline queue with sequence numbers</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Server-wins conflict resolution</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Idempotency via unique keys</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Structured diff response</li>
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-display font-600 text-sm text-white">Task 2: Inventory API</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-400 font-body">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Tenant isolation at DB layer</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Stock movements with audit trail</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Aggregate view across locations</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Low-stock alerts via structured logs</li>
          </ul>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-purple-400" />
            <h3 className="font-display font-600 text-sm text-white">Task 3: Payments</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-gray-400 font-body">
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Idempotent initiation (sha256 key)</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>3 failure modes handled</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Durable event log</li>
            <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Reconciliation engine</li>
          </ul>
        </div>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="mt-6 card border-amber-900/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="font-display font-600 text-sm text-amber-400">Low Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-surface-600 last:border-0">
                <span className="text-sm text-gray-300 font-body">{item.name}</span>
                <span className="text-xs text-amber-400 font-mono">
                  {item.currentQuantity} / {item.lowStockThreshold} {item.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
