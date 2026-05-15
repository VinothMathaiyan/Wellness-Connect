import { useNavigate, useLocation } from 'react-router-dom';

const ROUTES = [
  { label: 'T05 Dashboard', path: '/trainer/dashboard' },
  { label: 'T06 Clients', path: '/trainer/clients' },
  { label: 'T07 Client Detail', path: '/trainer/client/2' },
  { label: 'T08 Accept/Decline', path: '/trainer/client-request/pending-001' },
  { label: 'T09 Session Log', path: '/trainer/session-log/1' },
  { label: 'T12 Check-in Review', path: '/trainer/checkin-review/2' },
  { label: 'T10 Program Builder', path: '/trainer/program-builder/2' },
  { label: 'T10A Schedule', path: '/trainer/schedule-session' },
  { label: 'T11 Weekly Plan', path: '/trainer/weekly-plan/2' },
  { label: 'T13 Risk Monitor', path: '/trainer/risk-monitor' },
  { label: 'T14 Risk Alert', path: '/trainer/risk-alert/2' },
  { label: 'T16 Notifications', path: '/trainer/notifications' },
  { label: 'C Home', path: '/client/dashboard' },
  { label: 'Sign Up', path: '/signup' }
];

export default function DevNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '36px',
        backgroundColor: '#1a1a1a',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        padding: '0',
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          color: '#00d4aa',
          fontSize: '10px',
          fontWeight: 'bold',
          paddingLeft: '12px',
          paddingRight: '12px'
        }}
      >
        DEV
      </div>

      {ROUTES.map((route, i) => {
        const isActive = location.pathname === route.path;
        return (
          <div key={route.path} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div
                style={{
                  width: '1px',
                  height: '12px',
                  backgroundColor: 'rgba(255,255,255,0.2)'
                }}
              />
            )}
            <button
              onClick={() => navigate(route.path)}
              style={{
                border: 'none',
                background: 'transparent',
                color: isActive ? '#00d4aa' : 'white',
                padding: '0 10px',
                fontSize: '11px',
                fontFamily: 'monospace',
                cursor: 'pointer'
              }}
            >
              {route.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
