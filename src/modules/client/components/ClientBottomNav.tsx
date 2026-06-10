import { useLocation, useNavigate } from 'react-router-dom';
import { navConfig } from '../../../components/navConfig';

interface ClientBottomNavProps {
  unreadAlertsCount?: number;
  unreadMessagesCount?: number;
}

/**
 * Shared client bottom navigation. Uses the fixed + centered layout pattern
 * (like TrainerBottomNav) so it aligns to the mobile shell width. Existing
 * client screens still render their own inline nav; new screens use this.
 */
export default function ClientBottomNav({
  unreadAlertsCount = 0,
  unreadMessagesCount = 0,
}: ClientBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = navConfig.client;

  const isActive = (tab: typeof tabs[0]): boolean =>
    tab.exact
      ? location.pathname === tab.matchPrefix
      : location.pathname.startsWith(tab.matchPrefix);

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'center' }}>
      <nav
        className="w-full bg-white border-t border-[#E5E7EB] px-[10px]"
        style={{ maxWidth: '448px', height: '60px', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex h-full items-center justify-around">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            const badge =
              tab.label === 'Alerts'
                ? unreadAlertsCount
                : tab.label === 'Messages'
                  ? unreadMessagesCount
                  : 0;

            return (
              <button
                key={tab.route}
                onClick={() => navigate(tab.route)}
                className="flex flex-col items-center justify-center gap-[2px] min-w-[56px] transition-all"
                type="button"
              >
                <div style={{ position: 'relative' }}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} color={active ? '#1D9E75' : '#6B7280'} />
                  {badge > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-1.5px',
                        right: '-1.5px',
                        width: '6px',
                        height: '6px',
                        backgroundColor: '#E24B4A',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium" style={{ color: active ? '#1D9E75' : '#6B7280' }}>
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
