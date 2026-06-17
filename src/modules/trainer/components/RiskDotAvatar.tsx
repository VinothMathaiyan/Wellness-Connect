import UserAvatar from '../../../components/UserAvatar';

interface RiskDotAvatarProps {
  clientId: string | undefined;
  clientName?: string;
  hasOpenAlerts: boolean;
}

export default function RiskDotAvatar({
  clientId,
  clientName,
  hasOpenAlerts,
}: RiskDotAvatarProps) {
  const displayName = clientName?.trim() || clientId || 'Client';

  return (
    <div className="relative shrink-0" aria-label={`${displayName} risk status`}>
      <UserAvatar name={displayName} size="sm" variant="outlined" roleOverride="client" />
      {hasOpenAlerts && (
        <span
          className="absolute rounded-full"
          style={{
            width: 10,
            height: 10,
            right: -1,
            bottom: -1,
            backgroundColor: '#EF4444',
            border: '2px solid #ffffff',
          }}
        />
      )}
    </div>
  );
}
