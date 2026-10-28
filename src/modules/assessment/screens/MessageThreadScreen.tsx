import { useNavigate, useParams, useLocation } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import ProfileMenu from '@/components/ProfileMenu';
import AssessmentBottomNav from '../components/AssessmentBottomNav';
import MessageThreadView from '../components/MessageThreadView';

/**
 * Mobile push-navigation route for a message thread (/assessment/messages/:userId).
 * The actual thread UI lives in MessageThreadView, which is also rendered
 * inline by MessagesScreen at lg: (master-detail).
 */
export default function MessageThreadScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId: otherUserId } = useParams<{ userId: string }>();

  // Recipient name passed from the picker so a brand-new thread (no reply yet)
  // shows the right header immediately instead of "Conversation".
  const navState =
    (location.state as { recipientName?: string; recipientRole?: string } | null) ?? null;

  if (!otherUserId) return null;

  return (
    <MobileShell className="bg-[#F2F8F7]">
      <MessageThreadView
        otherUserId={otherUserId}
        initialName={navState?.recipientName}
        onBack={() => navigate('/assessment/messages')}
        avatar={<ProfileMenu />}
        reserveBottomNavSpace
        bottomNav={<AssessmentBottomNav />}
      />
    </MobileShell>
  );
}
