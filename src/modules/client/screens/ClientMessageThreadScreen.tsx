import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import ClientBottomNav from '../components/ClientBottomNav';
import ProfileMenu from '../../../components/ProfileMenu';
import ClientMessageThreadView from '../components/ClientMessageThreadView';

/**
 * Mobile push-navigation route for a message thread (/client/messages/:userId).
 * The actual thread UI lives in ClientMessageThreadView, which is also rendered
 * inline by ClientMessagesScreen at lg: (master-detail).
 */
export default function ClientMessageThreadScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: otherUserId } = useParams<{ userId: string }>();

  // Recipient name/role passed from the picker so a brand-new thread (no reply
  // yet) shows the right header immediately instead of "Conversation".
  const navState =
    (location.state as { recipientName?: string; recipientRole?: string } | null) ?? null;

  if (!otherUserId) return null;

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <ClientMessageThreadView
        otherUserId={otherUserId}
        initialName={navState?.recipientName}
        initialRole={navState?.recipientRole}
        onBack={() => navigate('/client/messages')}
        avatar={<ProfileMenu />}
        reserveBottomNavSpace
        bottomNav={<ClientBottomNav />}
      />
    </MobileShell>
  );
}
