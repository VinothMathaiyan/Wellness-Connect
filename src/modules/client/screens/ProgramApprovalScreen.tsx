import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquare,
  X,
} from 'lucide-react';
import MobileShell from '../../../components/MobileShell';
import { useWellness } from '../../../context/WellnessContext';
import {
  approveProgram,
  getClientProgramDetail,
  getExercisesForPlan,
  requestProgramChanges,
} from '../../../services/supabaseService';
import type { ClientProgramDetail, SessionExercise } from '../../../types';

function getStatusDisplay(status: string): {
  label: string;
  backgroundColor: string;
  borderColor: string;
  color: string;
} {
  if (status === 'active') {
    return {
      label: 'Active',
      backgroundColor: '#DCFCE7',
      borderColor: '#BBF7D0',
      color: '#166534',
    };
  }

  if (status === 'changes_requested') {
    return {
      label: 'Changes requested',
      backgroundColor: '#DBEAFE',
      borderColor: '#BFDBFE',
      color: '#1D4ED8',
    };
  }

  return {
    label: 'Awaiting your approval',
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    color: '#92400E',
  };
}

function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {[1, 2, 3].map(item => (
        <div
          key={item}
          className="animate-pulse"
          style={{
            height: item === 1 ? 150 : 88,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 12,
          }}
        />
      ))}
    </div>
  );
}

export default function ProgramApprovalScreen() {
  const { planId } = useParams<{ planId: string }>();
  const { userId } = useWellness();
  const navigate = useNavigate();

  const [program, setProgram] = useState<ClientProgramDetail | null>(null);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [requestingChanges, setRequestingChanges] = useState(false);
  const [showChangesModal, setShowChangesModal] = useState(false);
  const [changesFeedback, setChangesFeedback] = useState('');
  const [error, setError] = useState('');

  const loadProgram = useCallback(async () => {
    if (!planId || !userId) {
      setLoading(false);
      setError('Could not load program.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [programDetail, planExercises] = await Promise.all([
        getClientProgramDetail(planId, userId),
        getExercisesForPlan(planId, userId),
      ]);

      if (!programDetail) {
        setError('Could not load program.');
        setProgram(null);
        setExercises([]);
        return;
      }

      setProgram(programDetail);
      setExercises(planExercises);
    } catch {
      setError('Could not load program.');
    } finally {
      setLoading(false);
    }
  }, [planId, userId]);

  useEffect(() => {
    loadProgram();
  }, [loadProgram]);

  const handleApprove = async () => {
    if (!planId || !userId || approving) return;

    setApproving(true);
    setError('');

    try {
      await approveProgram(planId, userId);
      navigate('/client/dashboard', { replace: true });
    } catch {
      setError('Could not approve. Try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!planId || !userId || requestingChanges || changesFeedback.trim().length === 0) return;

    setRequestingChanges(true);
    setError('');

    try {
      await requestProgramChanges(planId, userId, changesFeedback);
      setShowChangesModal(false);
      navigate(-1);
    } catch {
      setError('Could not send changes. Try again.');
    } finally {
      setRequestingChanges(false);
    }
  };

  const statusDisplay = program ? getStatusDisplay(program.status) : null;
  const goals = program?.goals ?? [];

  return (
    <MobileShell>
      <div
        className="flex flex-col min-h-full"
        style={{ backgroundColor: '#F9FAFB', color: '#111827' }}
      >
        <header
          className="px-4 pt-6 pb-4 flex items-center gap-3 sticky top-0 z-20"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-[8px]"
            style={{ color: '#4B5563' }}
            aria-label="Go back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-[18px] font-bold leading-tight">Review Program</h1>
        </header>

        <main className="flex-1 overflow-y-auto pb-8">
          {loading && <LoadingSkeleton />}

          {!loading && error && !program && (
            <div className="px-6 py-20 text-center space-y-4">
              <div
                className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
              >
                <ClipboardList size={26} />
              </div>
              <div className="space-y-2">
                <h2 className="text-[16px] font-bold">Could not load program.</h2>
                <p className="text-[13px] leading-relaxed" style={{ color: '#6B7280' }}>
                  Check your connection and try again.
                </p>
              </div>
              <button
                onClick={loadProgram}
                className="w-full py-3 rounded-[10px] text-[14px] font-semibold"
                style={{ backgroundColor: '#166534', color: '#FFFFFF' }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && program && (
            <div className="p-4 space-y-4">
              <section
                className="p-4 space-y-3"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                }}
              >
                <p className="text-[13px] font-medium" style={{ color: '#6B7280' }}>
                  From {program.trainer_name}
                </p>
                <div className="space-y-2">
                  <h2 className="text-[22px] font-bold leading-tight">{program.name}</h2>
                  <p className="text-[13px]" style={{ color: '#4B5563' }}>
                    {program.duration_weeks ?? '-'} weeks - {program.sessions_per_week ?? '-'}x/week
                  </p>
                </div>
                {statusDisplay && (
                  <span
                    className="inline-flex px-3 py-1 rounded-full text-[12px] font-bold"
                    style={{
                      backgroundColor: statusDisplay.backgroundColor,
                      border: `1px solid ${statusDisplay.borderColor}`,
                      color: statusDisplay.color,
                    }}
                  >
                    {statusDisplay.label}
                  </span>
                )}
              </section>

              {program.status === 'active' && (
                <div
                  className="p-4 flex items-start gap-3"
                  style={{
                    backgroundColor: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 12,
                    color: '#166534',
                  }}
                >
                  <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-bold">Program Active</p>
                    <p className="text-[13px] leading-relaxed">
                      This program is active and exercises will appear in your sessions.
                    </p>
                  </div>
                </div>
              )}

              {program.status === 'changes_requested' && (
                <div
                  className="p-4 flex items-start gap-3"
                  style={{
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 12,
                    color: '#1D4ED8',
                  }}
                >
                  <MessageSquare size={20} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[14px] font-bold">Changes requested</p>
                    <p className="text-[13px] leading-relaxed">
                      Your trainer will update the program based on your feedback.
                    </p>
                  </div>
                </div>
              )}

              {goals.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[11px] uppercase font-bold tracking-[0.07em]" style={{ color: '#6B7280' }}>
                    Program Goals
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {goals.map(goal => (
                      <span
                        key={goal}
                        className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                        style={{
                          backgroundColor: '#DCFCE7',
                          color: '#166534',
                          border: '1px solid #BBF7D0',
                        }}
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="text-[11px] uppercase font-bold tracking-[0.07em]" style={{ color: '#6B7280' }}>
                  Exercises ({exercises.length})
                </h3>
                {exercises.length === 0 ? (
                  <div
                    className="text-center px-4 py-6"
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      color: '#6B7280',
                    }}
                  >
                    <p className="text-[14px]">No exercises assigned yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exercises.map((exercise, index) => (
                      <div
                        key={exercise.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: '#F9FAFB',
                          borderRadius: 12,
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[14px] font-semibold" style={{ color: '#111827' }}>
                            {index + 1}. {exercise.name}
                          </span>
                          <span
                            className="text-[12px] shrink-0 px-2 py-0.5 rounded-full"
                            style={{ color: '#6B7280', backgroundColor: '#F3F4F6' }}
                          >
                            {exercise.sets} x {exercise.reps}
                          </span>
                        </div>
                        {exercise.instructions && (
                          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#6B7280' }}>
                            {exercise.instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {program.trainer_note && (
                <section className="space-y-3">
                  <h3 className="text-[11px] uppercase font-bold tracking-[0.07em]" style={{ color: '#6B7280' }}>
                    Note from Trainer
                  </h3>
                  <div
                    className="p-4 text-[13px] leading-relaxed"
                    style={{
                      backgroundColor: '#F3F4F6',
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      color: '#374151',
                    }}
                  >
                    {program.trainer_note}
                  </div>
                </section>
              )}

              {error && (
                <p className="text-[13px] text-center font-medium" style={{ color: '#DC2626' }}>
                  {error}
                </p>
              )}

              {program.status === 'pending_review' && (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="w-full h-12 rounded-[12px] text-[15px] font-bold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: approving ? '#9CA3AF' : '#166534',
                      color: '#FFFFFF',
                    }}
                  >
                    {approving && <Loader2 size={17} className="animate-spin" />}
                    Approve Program
                  </button>
                  <button
                    onClick={() => setShowChangesModal(true)}
                    disabled={approving}
                    className="w-full h-12 rounded-[12px] text-[15px] font-bold"
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#166534',
                      border: '1px solid #166534',
                    }}
                  >
                    Request Changes
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {showChangesModal && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(17, 24, 39, 0.45)' }}
        >
          <div
            className="w-full p-4 space-y-4"
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold">Request Changes</h2>
              <button
                onClick={() => setShowChangesModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full"
                style={{ color: '#6B7280', backgroundColor: '#F3F4F6' }}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <textarea
              value={changesFeedback}
              onChange={event => setChangesFeedback(event.target.value)}
              maxLength={500}
              rows={5}
              placeholder="What would you like changed?"
              className="w-full resize-none rounded-[12px] p-3 text-[14px] outline-none"
              style={{
                border: '1px solid #D1D5DB',
                color: '#111827',
                backgroundColor: '#FFFFFF',
              }}
            />
            <p className="text-[12px] text-right" style={{ color: '#6B7280' }}>
              {changesFeedback.length} / 500
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowChangesModal(false)}
                className="h-11 rounded-[12px] text-[14px] font-bold"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestChanges}
                disabled={requestingChanges || changesFeedback.trim().length === 0}
                className="h-11 rounded-[12px] text-[14px] font-bold flex items-center justify-center gap-2"
                style={{
                  backgroundColor:
                    requestingChanges || changesFeedback.trim().length === 0 ? '#9CA3AF' : '#166534',
                  color: '#FFFFFF',
                }}
              >
                {requestingChanges && <Loader2 size={16} className="animate-spin" />}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
