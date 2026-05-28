import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../api/client';
import type { StockItem } from '../api/client';
import { Plus, Package, TrendingDown, TrendingUp, Trash2, BarChart2 } from 'lucide-react';

function MovementModal({ item, tenantId, onClose }: { item: StockItem; tenantId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ type: 'SALE', quantity: 1, notes: '', referenceId: '' });

  const mut = useMutation({
    mutationFn: () => inventoryApi.recordMovement(tenantId, item.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stock-items', tenantId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md">
        <h2 className="font-display font-700 text-lg text-white mb-4">Record Movement — {item.name}</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Movement Type</label>
            <select className="input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="SALE">Sale</option>
              <option value="RESTOCK">Restock</option>
              <option value="WASTE">Waste</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" className="input" min={0.1} step={0.1} value={form.quantity}
              onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))} />
          </div>
          <div>
            <label className="label">Reference ID (optional)</label>
            <input type="text" className="input" placeholder="order_123" value={form.referenceId}
              onChange={e => setForm(p => ({ ...p, referenceId: e.target.value }))} />
          </div>
          <div>
            <label className="label">Notes</label>
            <input type="text" className="input" value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? 'Saving...' : 'Record'}
          </button>
        </div>
        {mut.isError && (
          <p className="text-red-400 text-xs mt-2">{(mut.error as any)?.response?.data?.message || 'Error recording movement'}</p>
        )}
      </div>
    </div>
  );
}

function AddItemModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ sku: '', name: '', category: '', currentQuantity: 0, lowStockThreshold: 5, unit: 'pcs', costPerUnit: 0 });

  const mut = useMutation({
    mutationFn: () => inventoryApi.createStockItem(tenantId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stock-items', tenantId] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-lg">
        <h2 className="font-display font-700 text-lg text-white mb-4">Add Stock Item</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'sku', label: 'SKU', placeholder: 'CHOC-001' },
            { key: 'name', label: 'Name', placeholder: 'Chocolate Cake' },
            { key: 'category', label: 'Category', placeholder: 'Cakes' },
            { key: 'unit', label: 'Unit', placeholder: 'pcs' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="text" className="input" placeholder={placeholder}
                value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          {[
            { key: 'currentQuantity', label: 'Initial Qty' },
            { key: 'lowStockThreshold', label: 'Low Stock Alert' },
            { key: 'costPerUnit', label: 'Cost per Unit (₦)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="number" className="input" min={0}
                value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}

const movementIcon = (type: string) => {
  if (type === 'RESTOCK') return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (type === 'SALE') return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
  if (type === 'WASTE') return <Trash2 className="w-3.5 h-3.5 text-amber-400" />;
  return <BarChart2 className="w-3.5 h-3.5 text-blue-400" />;
};

export function InventoryPage() {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<string | null>(null);

  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: inventoryApi.getTenants });
  const activeTenantId = selectedTenant || tenants[0]?.id || '';

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['stock-items', activeTenantId],
    queryFn: () => inventoryApi.getStockItems(activeTenantId),
    enabled: !!activeTenantId,
  });

  const { data: history } = useQuery({
    queryKey: ['movements', activeTenantId, historyItem],
    queryFn: () => inventoryApi.getMovements(activeTenantId, historyItem!),
    enabled: !!historyItem && !!activeTenantId,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-3xl text-white">Inventory</h1>
          <p className="text-gray-400 text-sm mt-1">Multi-tenant stock management</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input w-48" value={activeTenantId}
            onChange={e => setSelectedTenant(e.target.value)}>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn-primary flex items-center gap-2" onClick={() => setAddOpen(true)}
            disabled={!activeTenantId}>
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading inventory...</div>
      ) : items.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No stock items yet. Add some to get started.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead className="border-b border-surface-600">
              <tr>
                {['SKU', 'Name', 'Category', 'Qty', 'Low Stock', 'Unit', 'Cost', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isLow = Number(item.currentQuantity) <= Number(item.lowStockThreshold) && Number(item.lowStockThreshold) > 0;
                return (
                  <tr key={item.id} className="border-b border-surface-700 last:border-0 hover:bg-surface-700/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{item.category || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono text-sm font-medium ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {Number(item.currentQuantity).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.lowStockThreshold}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.unit}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">₦{Number(item.costPerUnit).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="btn-ghost text-xs px-2 py-1" onClick={() => setMovementItem(item)}>
                          + Move
                        </button>
                        <button className="btn-ghost text-xs px-2 py-1" onClick={() => setHistoryItem(historyItem === item.id ? null : item.id)}>
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Movement history panel */}
      {historyItem && history && (
        <div className="mt-4 card">
          <h3 className="font-display font-600 text-sm text-white mb-3">Movement History — {history.item.name}</h3>
          {history.movements.length === 0 ? (
            <p className="text-gray-500 text-xs">No movements recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {history.movements.map(m => (
                <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-surface-700 last:border-0">
                  <div className="flex items-center gap-2">
                    {movementIcon(m.type)}
                    <span className="text-xs text-gray-400 font-mono">{m.type}</span>
                    {m.referenceId && <span className="text-xs text-gray-600">ref:{m.referenceId}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-gray-500">{m.quantityBefore} → {m.quantityAfter}</span>
                    <span className={Number(m.quantity) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {Number(m.quantity) >= 0 ? '+' : ''}{m.quantity}
                    </span>
                    <span className="text-gray-600">{new Date(m.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {movementItem && <MovementModal item={movementItem} tenantId={activeTenantId} onClose={() => setMovementItem(null)} />}
      {addOpen && <AddItemModal tenantId={activeTenantId} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
