import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import ProfileMenu from '../../../components/ProfileMenu';
import TrainerMessageThreadView from '../components/TrainerMessageThreadView';

/**
 * Mobile push-navigation route for a message thread (/trainer/messages/:userId).
 * The actual thread UI lives in TrainerMessageThreadView, which is also rendered
 * inline by TrainerMessagesScreen at lg: (master-detail).
 */
export default function TrainerMessageThreadScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: otherUserId } = useParams<{ userId: string }>();

  // Route state from the list/picker: clientId being discussed, plus the
  // recipient's name/role so a brand-new thread shows the header immediately.
  const navState =
    (location.state as {
      clientId?: string | null;
      recipientName?: string;
      recipientRole?: string;
    } | null) ?? null;

  if (!otherUserId) return null;

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <TrainerMessageThreadView
        otherUserId={otherUserId}
        initialClientId={navState?.clientId ?? null}
        initialName={navState?.recipientName}
        initialRole={navState?.recipientRole}
        onBack={() => navigate('/trainer/messages')}
        avatar={<ProfileMenu />}
        reserveBottomNavSpace
        bottomNav={<TrainerBottomNav />}
      />
    </MobileShell>
  );
}
