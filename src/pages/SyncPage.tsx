import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { syncApi, inventoryApi } from '../api/client';
import { RefreshCw, Plus, Trash2, Send, CheckCircle, XCircle, GitMerge, Copy } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

type OpType = 'ITEM_SOLD' | 'STOCK_ADJUSTED' | 'ORDER_PLACED';

interface QueuedOp {
  id: string;
  idempotencyKey: string;
  sequenceNumber: number;
  operationType: OpType;
  payload: Record<string, any>;
  clientTimestamp: string;
}

const statusIcon = (status: string) => {
  if (status === 'accepted') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
  if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === 'merged') return <GitMerge className="w-4 h-4 text-amber-400" />;
  return <Copy className="w-4 h-4 text-blue-400" />;
};

const statusBadge = (status: string) => {
  if (status === 'accepted') return 'badge-green';
  if (status === 'rejected') return 'badge-red';
  if (status === 'merged') return 'badge-yellow';
  return 'badge-blue';
};

export function SyncPage() {
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('pos_client_01');
  const [queue, setQueue] = useState<QueuedOp[]>([]);
  const [syncResult, setSyncResult] = useState<any>(null);

  const { data: tenants = [] } = useQuery({ queryKey: ['tenants'], queryFn: inventoryApi.getTenants });
  const activeTenant = tenantId || tenants[0]?.id || '';

  const { data: serverOps = [] } = useQuery({
    queryKey: ['sync-ops', activeTenant],
    queryFn: () => syncApi.getOperations(activeTenant),
    enabled: !!activeTenant,
  });

  const addOp = (type: OpType) => {
    const seq = queue.length + 1;
    setQueue(q => [...q, {
      id: uuidv4(),
      idempotencyKey: `${clientId}_${Date.now()}_${seq}`,
      sequenceNumber: seq,
      operationType: type,
      payload: type === 'ORDER_PLACED'
        ? { orderId: `ord_${Date.now()}`, total: Math.floor(Math.random() * 10000) + 500 }
        : { itemId: `item_${Math.floor(Math.random() * 3) + 1}`, quantity: Math.floor(Math.random() * 5) + 1 },
      clientTimestamp: new Date().toISOString(),
    }]);
  };

  const syncMut = useMutation({
    mutationFn: () => syncApi.syncBatch({
      tenantId: activeTenant,
      clientId,
      operations: queue,
    }),
    onSuccess: (data) => {
      setSyncResult(data);
      setQueue([]);
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-800 text-3xl text-white">Sync Engine</h1>
          <p className="text-gray-400 text-sm mt-1">Offline-first conflict resolution — Task 1</p>
        </div>
        <select className="input w-48" value={activeTenant} onChange={e => setTenantId(e.target.value)}>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Queue builder */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-600 text-sm text-white mb-4">Client Configuration</h3>
            <div>
              <label className="label">Client ID</label>
              <input type="text" className="input" value={clientId} onChange={e => setClientId(e.target.value)} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-600 text-sm text-white">Offline Queue</h3>
              <span className="badge-blue">{queue.length} pending</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => addOp('ITEM_SOLD')}>
                <Plus className="w-3 h-3" /> Item Sold
              </button>
              <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => addOp('STOCK_ADJUSTED')}>
                <Plus className="w-3 h-3" /> Stock Adjust
              </button>
              <button className="btn-ghost text-xs flex items-center gap-1" onClick={() => addOp('ORDER_PLACED')}>
                <Plus className="w-3 h-3" /> Order Placed
              </button>
            </div>

            {queue.length === 0 ? (
              <p className="text-gray-600 text-xs text-center py-4">Queue is empty. Add operations above.</p>
            ) : (
              <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
                {queue.map((op, i) => (
                  <div key={op.id} className="bg-surface-700 rounded-lg px-3 py-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono text-brand-400">#{op.sequenceNumber}</span>
                      <span className="text-xs text-gray-300 ml-2">{op.operationType}</span>
                      <span className="text-xs text-gray-600 ml-2 font-mono">
                        {JSON.stringify(op.payload).slice(0, 40)}...
                      </span>
                    </div>
                    <button onClick={() => setQueue(q => q.filter((_, j) => j !== i))}>
                      <Trash2 className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              disabled={queue.length === 0 || !activeTenant || syncMut.isPending}
              onClick={() => syncMut.mutate()}
            >
              <Send className="w-4 h-4" />
              {syncMut.isPending ? 'Syncing...' : `Sync ${queue.length} Operations`}
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {syncResult && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-600 text-sm text-white">Sync Result</h3>
                <span className="text-xs text-gray-500 font-mono">{syncResult.batchId?.slice(0, 8)}...</span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {[
                  { label: 'Accepted', val: syncResult.summary.accepted, cls: 'text-emerald-400' },
                  { label: 'Rejected', val: syncResult.summary.rejected, cls: 'text-red-400' },
                  { label: 'Merged', val: syncResult.summary.merged, cls: 'text-amber-400' },
                  { label: 'Duplicates', val: syncResult.summary.duplicates, cls: 'text-blue-400' },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="bg-surface-700 rounded-lg p-2 text-center">
                    <p className={`font-display font-700 text-lg ${cls}`}>{val}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                {syncResult.results.map((r: any) => (
                  <div key={r.idempotencyKey} className="flex items-start gap-2 bg-surface-700 rounded-lg px-3 py-2">
                    {statusIcon(r.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={statusBadge(r.status)}>{r.status}</span>
                        <span className="text-xs text-gray-600 font-mono truncate">{r.idempotencyKey}</span>
                      </div>
                      {r.message && <p className="text-xs text-gray-500 mt-0.5">{r.message}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-600 text-sm text-white">Server Operations Log</h3>
              <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {serverOps.length === 0 ? (
                <p className="text-gray-600 text-xs">No operations synced yet.</p>
              ) : serverOps.map((op: any) => (
                <div key={op.id} className="flex items-center justify-between py-1 border-b border-surface-700 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      op.status === 'ACCEPTED' ? 'bg-emerald-400' :
                      op.status === 'MERGED' ? 'bg-amber-400' : 'bg-red-400'
                    }`}></span>
                    <span className="text-xs text-gray-400 font-mono">{op.operationType}</span>
                    <span className="text-xs text-gray-600">{op.clientId}</span>
                  </div>
                  <span className="text-xs text-gray-600">{new Date(op.serverTimestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
