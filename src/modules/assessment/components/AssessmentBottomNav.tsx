import { useLocation, useNavigate } from 'react-router-dom';
import { navConfig } from '../../../components/navConfig';

export interface AssessmentBottomNavProps {
  escalationCount?: number;
  alertCount?: number;
}

export default function AssessmentBottomNav({
  escalationCount = 0,
  alertCount = 0,
}: AssessmentBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = navConfig.assessment;

  const isActive = (tab: typeof tabs[0]): boolean => {
    if (tab.exact) {
      return location.pathname === tab.matchPrefix;
    }
    return location.pathname.startsWith(tab.matchPrefix);
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

                {/* Escalations red dot badge */}
                {tab.label === 'Escalations' && escalationCount > 0 && (
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
                {tab.label === 'Alerts' && alertCount > 0 && (
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
                    {alertCount > 99 ? '99+' : alertCount}
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
