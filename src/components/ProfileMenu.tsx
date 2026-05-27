import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, UserCog } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWellness } from '@/context/WellnessContext';
import { supabase } from '@/lib/supabaseClient';

/**
 * ProfileMenu — shared avatar + logout dropdown.
 *
 * Mirrors the avatar pattern already used on the client HomeScreen: a circular
 * initial badge in a screen header that opens a small menu showing the user's
 * name, role and a "Log out" action. Drop `<ProfileMenu />` into the top-right
 * of any screen header that is missing it.
 *
 * Self-contained — reads userId / role / logout from WellnessContext and
 * resolves the display name from the profiles table (appState.full_name is not
 * repopulated on a fresh session restore, so we fetch it to be reliable).
 */
const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  trainer: 'Trainer',
  assessor: 'Assessor',
};

interface ProfileMenuProps {
  /** Render this image as the avatar instead of the text initial (e.g. trainer's uploaded photo). */
  avatarSrc?: string | null;
  /** Avatar trigger styling. 'light' (default) = green-bordered white circle for light headers;
   *  'dark' = translucent white circle for colored/gradient headers. */
  variant?: 'light' | 'dark';
  /** Where to navigate after logout. Defaults to '/'. */
  logoutRedirect?: string;
  /** Logout button label. Defaults to 'Log out'. */
  logoutLabel?: string;
  /** Number of initials to show when no avatarSrc is given. Defaults to 1. */
  initialsCount?: 1 | 2;
}

export default function ProfileMenu({
  avatarSrc,
  variant = 'light',
  logoutRedirect = '/',
  logoutLabel = 'Log out',
  initialsCount = 1,
}: ProfileMenuProps = {}) {
  const navigate = useNavigate();
  const { appState, userId, userRole, logout } = useWellness();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState<string>(appState.full_name ?? '');

  // Resolve the signed-in user's name from their profile so the menu shows the
  // right person even after a fresh login (when appState is at its defaults).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.full_name) setName(data.full_name);
      });
    return () => { cancelled = true; };
  }, [userId]);

  const displayName = name || appState.full_name || 'My Account';
  const baseName = name || appState.full_name || 'User';
  const initial = initialsCount === 2
    ? baseName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : baseName.charAt(0).toUpperCase();
  const roleLabel = userRole ? ROLE_LABELS[userRole] : 'Account';

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate(logoutRedirect, { replace: true });
  };

  // Assessors have no profile edit screen, so the row is hidden for them.
  // Unknown/unresolved roles fall back to the client profile screen so the
  // option still appears if userRole hasn't hydrated yet when the menu opens.
  const editProfilePath =
    userRole === 'trainer' ? '/trainer/onboarding'
    : userRole === 'client' ? '/onboarding/profile'
    : userRole === 'assessor' ? null
    : '/onboarding/profile';

  const handleEditProfile = () => {
    if (!editProfilePath) return;
    setOpen(false);
    navigate(editProfilePath);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className={
          variant === 'dark'
            ? 'w-[36px] h-[36px] rounded-full overflow-hidden bg-white/20 border border-white/30 backdrop-blur-sm flex items-center justify-center text-[14px] font-bold text-white active:opacity-80 transition-opacity'
            : 'w-[36px] h-[36px] rounded-full overflow-hidden bg-white border-[1.5px] border-[#1D9E75] flex items-center justify-center text-[14px] font-bold text-[#1D9E75] active:bg-[#F0F9FF] transition-colors'
        }
        aria-label="Profile menu"
      >
        {avatarSrc ? (
          <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop — closes the menu on an outside tap */}
            <div
              onClick={() => setOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 99, backgroundColor: 'transparent' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                top: '60px',
                right: '16px',
                zIndex: 100,
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                minWidth: '200px',
                overflow: 'hidden',
                border: '1px solid #E5E7EB',
              }}
            >
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[13px] font-semibold text-[#111827] truncate">{displayName}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{roleLabel}</p>
              </div>

              {editProfilePath && (
                <>
                  <button
                    onClick={handleEditProfile}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors"
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <UserCog size={15} style={{ color: '#374151', flexShrink: 0 }} />
                    <span style={{ color: '#374151', fontSize: 14, fontWeight: 600 }}>Edit Profile</span>
                  </button>
                  <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '4px 0' }} />
                </>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left active:bg-red-50 transition-colors"
              >
                <LogOut size={15} style={{ color: '#DC2626', flexShrink: 0 }} />
                <span style={{ color: '#DC2626', fontSize: 14, fontWeight: 600 }}>{logoutLabel}</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
