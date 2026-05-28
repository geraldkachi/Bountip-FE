import { NavLink, Outlet } from 'react-router-dom';
import { Layers, ShoppingCart, CreditCard, RefreshCw, BarChart3 } from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: BarChart3, exact: true },
  { to: '/inventory', label: 'Inventory', icon: Layers },
  { to: '/sync', label: 'Sync Engine', icon: RefreshCw },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-800 border-r border-surface-600 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-surface-600">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-display font-700 text-sm text-white leading-tight">Bountip</p>
              <p className="text-xs text-gray-500 font-body">Bake Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  isActive
                    ? 'bg-brand-500/15 text-brand-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-surface-600">
          {/* <p className="text-xs text-gray-600 font-mono">v1.0.0-assessment</p> */}
          <p className="text-xs text-gray-600 font-mono">v1.0.0</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
