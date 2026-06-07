import { MessageCircle } from 'lucide-react';
import { SUPPORT_WHATSAPP_NUMBER } from '@/config/support';

/**
 * WhatsAppSupportButton — single reusable "Contact Support on WhatsApp" action.
 *
 * Renders an anchor to wa.me pre-addressed to the support number with a
 * context-aware prefilled message. No backend, no DB.
 *
 * Safety: if SUPPORT_WHATSAPP_NUMBER is empty (env var unset) this renders
 * nothing, so a missing env var can never produce a broken link.
 *
 * Styled to sit inside the shared ProfileMenu dropdown as a full-width menu row,
 * matching the neighbouring "Edit Profile" / "Log out" rows, with a WhatsApp
 * green (#25D366) accent.
 */
type SupportRole = 'client' | 'trainer' | 'assessor' | null;

interface WhatsAppSupportButtonProps {
  /** Display name to embed in the prefilled message. Falls back to 'User'. */
  userName?: string | null;
  /** User role for the prefilled message label. Falls back to 'User'. */
  role?: SupportRole;
  /** Called when the link is tapped — e.g. to close the parent menu. */
  onClick?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  trainer: 'Trainer',
  assessor: 'Assessor',
};

export default function WhatsAppSupportButton({
  userName,
  role,
  onClick,
}: WhatsAppSupportButtonProps = {}) {
  // Env var unset/empty → render nothing (never a broken wa.me link).
  if (!SUPPORT_WHATSAPP_NUMBER) return null;

  const roleLabel = role ? ROLE_LABELS[role] ?? 'User' : 'User';
  const message = `Hi WellnessConnect support, I need help. (${userName || 'User'} – ${roleLabel})`;
  const href = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors"
      style={{ textDecoration: 'none' }}
    >
      <MessageCircle size={15} style={{ color: '#25D366', flexShrink: 0 }} />
      <span style={{ color: '#25D366', fontSize: 14, fontWeight: 600 }}>
        Contact Support on WhatsApp
      </span>
    </a>
  );
}
