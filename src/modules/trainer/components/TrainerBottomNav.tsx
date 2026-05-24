import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  MessageSquare,
  Bell,
} from 'lucide-react';

interface TrainerBottomNavProps {
  riskAlertCount?: number;
  notifCount?: number;
}

interface TabConfig {
  label: string;
  icon: typeof LayoutDashboard;
  route: string;
  matchPrefix: string;
  exact?: boolean;
  extraPrefixes?: string[];
}

const tabs: TabConfig[] = [
  {
    label: 'Home',
    icon: LayoutDashboard,
    route: '/trainer/dashboard',
    matchPrefix: '/trainer/dashboard',
    exact: true,
  },
  {
    label: 'Clients',
    icon: Users,
    route: '/trainer/clients',
    matchPrefix: '/trainer/client',
    extraPrefixes: ['/trainer/daily-summary'],
  },
  {
    label: 'Risk',
    icon: ShieldAlert,
    route: '/trainer/risk-monitor',
    matchPrefix: '/trainer/risk',
  },
  {
    label: 'Messages',
    icon: MessageSquare,
    route: '/trainer/messages',
    matchPrefix: '/trainer/messages',
  },
  {
    label: 'Alerts',
    icon: Bell,
    route: '/trainer/notifications',
    matchPrefix: '/trainer/notifications',
  },
];

export default function TrainerBottomNav({
  riskAlertCount = 0,
  notifCount = 0,
}: TrainerBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: TabConfig): boolean => {
    if (tab.exact) {
      return location.pathname === tab.matchPrefix;
    }
    if (location.pathname.startsWith(tab.matchPrefix)) return true;
    if (tab.extraPrefixes?.some(p => location.pathname.startsWith(p))) return true;
    return false;
  };

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
      <nav
        className="w-full bg-white border-t border-gray-100 px-2"
        style={{ maxWidth: '448px', height: '64px', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-full">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;

          return (
            <button
              key={tab.route}
              onClick={() => navigate(tab.route)}
              className="flex flex-col items-center justify-center flex-1 py-2 gap-1 cursor-pointer"
              type="button"
            >
              <div style={{ position: 'relative' }}>
                <div
                  className={
                    active
                      ? 'text-indigo-600 bg-indigo-50 rounded-xl p-2'
                      : 'text-gray-400 p-2'
                  }
                >
                  <Icon size={20} />
                </div>

                {/* Risk red dot badge */}
                {tab.label === 'Risk' && riskAlertCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#ef4444',
                      borderRadius: '50%',
                    }}
                  />
                )}

                {/* Alerts numeric badge */}
                {tab.label === 'Alerts' && notifCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      right: '2px',
                      minWidth: '16px',
                      height: '16px',
                      backgroundColor: '#ef4444',
                      borderRadius: '8px',
                      fontSize: '9px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    {notifCount}
                  </span>
                )}
              </div>

              <span
                className={
                  active
                    ? 'text-xs text-indigo-600 font-medium'
                    : 'text-xs text-gray-400'
                }
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      </nav>
    </div>
  );
}
