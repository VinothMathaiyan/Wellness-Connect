import { useLocation, useNavigate } from 'react-router-dom';
import { navConfig } from './navConfig';

interface SideNavProps {
  role: 'client' | 'trainer' | 'assessment';
  badges?: Record<string, number>;
}

export default function SideNav({ role, badges = {} }: SideNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const tabs = navConfig[role];

  const isActive = (tab: typeof tabs[0]): boolean => {
    if (tab.exact) {
      return location.pathname === tab.matchPrefix;
    }
    if (location.pathname.startsWith(tab.matchPrefix)) return true;
    if (tab.extraPrefixes?.some(p => location.pathname.startsWith(p))) return true;
    return false;
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 bottom-0 bg-white border-r border-[#E5E7EB] z-[60]">
      <div className="p-6">
        <h1 className="text-xl font-bold text-[#111827]">WellnessConnect</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const badgeCount = tab.badgeKey ? badges[tab.badgeKey] || 0 : 0;

          return (
            <button
              key={tab.route}
              onClick={() => navigate(tab.route)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active ? 'bg-[#E1F5EE] text-[#1D9E75]' : 'text-[#6B7280] hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 2} style={{ color: active ? '#1D9E75' : '#6B7280' }} />
                {badgeCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-[#E24B4A] rounded-full flex items-center justify-center px-1">
                    <span className="text-[9px] font-bold text-white leading-none">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold" style={{ color: active ? '#1D9E75' : 'inherit' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
