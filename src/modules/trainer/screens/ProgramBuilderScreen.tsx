import { useState, useEffect } from 'react';
import { Plus, Trash2, Send, CheckCircle, ChevronLeft, Minus, AlertTriangle, Target, Layers } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import MobileShell from '../../../components/MobileShell';
import TrainerBottomNav from '../components/TrainerBottomNav';
import { useWellness } from '../../../context/WellnessContext';
import { getClientDetail, createWorkoutProgram, saveExercisesToTemplate } from '../../../services/supabaseService';
import { supabase } from '../../../lib/supabaseClient';

// ─── Constants ────────────────────────────────────────────────────────────────

const FOCUS_AREA_OPTIONS = [
  'Strength', 'Mobility', 'Knee-safe', 'Low-impact',
  'Core', 'Cardiovascular', 'Flexibility', 'Balance',
  'Rehabilitation', 'Weight Loss', 'Endurance', 'Posture',
];

const GOAL_PRESETS = [
  'Improve strength', 'Lose weight', 'Build endurance', 'Reduce pain',
  'Improve flexibility', 'Rehabilitation', 'Build muscle', 'Improve posture'
];

const EXERCISE_TEMPLATES = [
  {
    id: 'strength',
    label: 'Strength Foundation',
    icon: '🏋️',
    description: 'Squat, Deadlift, Press, Row, Core',
    exercises: [
      { name: 'Squat', sets: 3, reps: 12, rest_seconds: 60, instructions: 'Keep chest up, knees tracking over toes' },
      { name: 'Deadlift', sets: 3, reps: 8, rest_seconds: 90, instructions: 'Hinge at hips, neutral spine' },
      { name: 'Bench Press', sets: 3, reps: 10, rest_seconds: 60, instructions: 'Lower to chest, drive up' },
      { name: 'Bent-Over Row', sets: 3, reps: 10, rest_seconds: 60, instructions: 'Keep back flat, pull elbows back' },
      { name: 'Plank', sets: 3, reps: 1, rest_seconds: 30, instructions: 'Hold 30 seconds, brace core' },
    ]
  },
  {
    id: 'mobility',
    label: 'Mobility & Recovery',
    icon: '🧘',
    description: 'Hip flexor, hamstring, thoracic, shoulder',
    exercises: [
      { name: 'Hip Flexor Stretch', sets: 2, reps: 1, rest_seconds: 30, instructions: 'Hold 30 seconds each side' },
      { name: 'Hamstring Stretch', sets: 2, reps: 1, rest_seconds: 30, instructions: 'Hold 30 seconds, no bouncing' },
      { name: 'Cat-Cow', sets: 3, reps: 10, rest_seconds: 0, instructions: 'Slow controlled movement' },
      { name: 'Thoracic Rotation', sets: 2, reps: 10, rest_seconds: 30, instructions: 'Rotate through upper back' },
    ]
  },
  {
    id: 'rehab',
    label: 'Rehabilitation',
    icon: '🩺',
    description: 'Low impact, joint-friendly movements',
    exercises: [
      { name: 'Clamshell', sets: 3, reps: 15, rest_seconds: 30, instructions: 'Keep hips stacked, controlled' },
      { name: 'Glute Bridge', sets: 3, reps: 12, rest_seconds: 30, instructions: 'Drive through heels' },
      { name: 'Wall Sit', sets: 3, reps: 1, rest_seconds: 60, instructions: 'Hold 30 seconds' },
      { name: 'Side-Lying Leg Raise', sets: 3, reps: 12, rest_seconds: 30, instructions: 'Keep core engaged' },
    ]
  },
  {
    id: 'cardio',
    label: 'Cardio Circuit',
    icon: '🫀',
    description: 'HIIT-style intervals, no equipment',
    exercises: [
      { name: 'Jump Squats', sets: 4, reps: 15, rest_seconds: 30, instructions: 'Land softly, full depth' },
      { name: 'Mountain Climbers', sets: 4, reps: 20, rest_seconds: 20, instructions: 'Keep hips level' },
      { name: 'Burpees', sets: 3, reps: 10, rest_seconds: 45, instructions: 'Full extension at top' },
      { name: 'High Knees', sets: 4, reps: 30, rest_seconds: 20, instructions: 'Drive knees to hip height' },
    ]
  },
];

const MAX_GOALS = 8;

interface ExerciseEntry {
  id: string; // local only for key/delete
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number | null;
  instructions: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProgramBuilderScreen() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useWellness();

  const isRegressMode = searchParams.get('mode') === 'regress';

  // ── Remote data ─────────────────────────────────────────────────────────────
  const [clientName, setClientName] = useState('Client');
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [programName, setProgramName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState('12');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');

  const [focusAreas, setFocusAreas] = useState<string[]>(
    isRegressMode ? ['Low-impact', 'Rehabilitation'] : [],
  );
  const [clientNotes, setClientNotes] = useState('');

  const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [expandedInstructions, setExpandedInstructions] = useState<Record<string, boolean>>({});

  // ── Submit state ────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // ── Fetch client + existing program on mount ─────────────────────────────────
  useEffect(() => {
    if (!userId || !clientId) { setIsLoadingProgram(false); return; }
    getClientDetail(clientId, userId).then(async ({ profile, currentPlan }) => {
      if (profile?.full_name) setClientName(profile.full_name);
      if (currentPlan) {
        const tpl = currentPlan.template as unknown as {
          id?: string;
          name?: string;
          duration_weeks?: number;
          sessions_per_week?: number;
          goals?: string[];
          focus_areas?: string[];
        } | null;
        if (tpl?.name) setProgramName(tpl.name);
        if (tpl?.duration_weeks) setDurationWeeks(String(tpl.duration_weeks));
        if (tpl?.sessions_per_week) setSessionsPerWeek(tpl.sessions_per_week);
        if (currentPlan.trainer_note) setClientNotes(currentPlan.trainer_note);
        if (tpl?.goals && Array.isArray(tpl.goals)) setSelectedGoals(tpl.goals);
        if (tpl?.focus_areas && Array.isArray(tpl.focus_areas)) setFocusAreas(tpl.focus_areas);

        // Fetch existing exercises if editing
        if (tpl?.id) {
          const targetTemplateId = tpl.id;
          if (targetTemplateId) {
             const { data } = await supabase
              .from('planned_exercises')
              .select('id, name, sets, reps, rest_seconds, instructions, order_index')
              .eq('template_id', targetTemplateId)
              .order('order_index', { ascending: true });
  
            if (data && data.length > 0) {
              setExercises(data.map(ex => ({
                id: ex.id || Date.now().toString() + Math.random(),
                name: ex.name,
                sets: ex.sets,
                reps: ex.reps,
                rest_seconds: ex.rest_seconds,
                instructions: ex.instructions || ''
              })));
              setShowTemplates(false);
            }
          }
        }
      }
      setIsLoadingProgram(false);
    });
  }, [userId, clientId]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(prev => prev.filter(g => g !== goal));
    } else {
      if (selectedGoals.length < MAX_GOALS) {
        setSelectedGoals(prev => [...prev, goal]);
      }
    }
  };

  const handleCustomGoalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = customGoal.trim();
      if (val && !selectedGoals.includes(val) && selectedGoals.length < MAX_GOALS) {
        setSelectedGoals(prev => [...prev, val]);
        setCustomGoal('');
      }
    }
  };

  const removeGoal = (goal: string) => {
    setSelectedGoals(prev => prev.filter(g => g !== goal));
  };

  const toggleFocusArea = (area: string) =>
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area],
    );

  const addExercise = () => {
    setExercises(prev => [...prev, {
      id: Date.now().toString(),
      name: '',
      sets: 3,
      reps: 10,
      rest_seconds: 60,
      instructions: ''
    }]);
  };

  const removeExercise = (id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  };

  const updateExercise = (
    id: string,
    field: keyof ExerciseEntry,
    value: string | number | null
  ) => {
    setExercises(prev => prev.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const toggleInstructions = (id: string) => {
    setExpandedInstructions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = async () => {
    if (!programName.trim() || !durationWeeks.trim() || isSubmitting) return;
    if (!userId || !clientId) {
      setSubmitError('Session expired — please log in again.');
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const { success, templateId } = await createWorkoutProgram(userId, clientId, {
        name: programName.trim(),
        duration_weeks: Math.max(1, parseInt(durationWeeks, 10) || 1),
        sessions_per_week: sessionsPerWeek,
        trainer_note: clientNotes.trim() || null,
        goals: selectedGoals,
        focus_areas: focusAreas,
      });

      if (success && templateId) {
        const validExercises = exercises.filter(e => e.name.trim() !== '');
        if (validExercises.length > 0) {
          await saveExercisesToTemplate(templateId, validExercises);
        }
        showToast('Program sent for client approval');
        setTimeout(() => navigate(-1), 2000);
      } else {
        setSubmitError('Failed to send program. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSend = programName.trim().length > 0 && durationWeeks.trim().length > 0 && !isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <MobileShell>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium pointer-events-none">
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      <div className="flex flex-col min-h-full bg-gray-50">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white px-4 pt-6 pb-4 flex items-start gap-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="mt-0.5 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Program Builder</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isLoadingProgram ? '...' : clientName}
            </p>
          </div>
        </div>

        {/* ── Regress Mode Banner ─────────────────────────────────────────────── */}
        {isRegressMode && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 lg:max-w-5xl lg:mx-auto lg:w-full">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Regress Mode — reducing load based on risk alert
            </p>
          </div>
        )}

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        {/* Desktop (lg:+): two columns — program settings left, exercise plan right.
            Below lg: single column, unchanged. */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3 lg:max-w-5xl lg:mx-auto lg:w-full lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:items-start">

          {/* Column 1 (lg:+) — program settings */}
          <div className="space-y-3">

          {/* ── Program Name ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Program Name
            </label>
            <input
              type="text"
              value={programName}
              onChange={e => setProgramName(e.target.value)}
              placeholder="e.g. 12-Week Rehabilitation Foundation"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              This name will be visible to the client
            </p>
          </div>

          {/* ── Duration ──────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Duration (weeks)
            </label>
            <input
              type="number"
              min={1}
              max={52}
              value={durationWeeks}
              onChange={e => setDurationWeeks(e.target.value)}
              placeholder="12"
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Used to calculate program end date
            </p>
          </div>

          {/* ── Sessions per Week ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Sessions per Week
            </label>
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={() => setSessionsPerWeek(s => Math.max(1, s - 1))}
                disabled={sessionsPerWeek <= 1}
                aria-label="Decrease sessions per week"
                className="w-9 h-9 rounded-full border border-teal-600 text-teal-600 flex items-center justify-center disabled:opacity-40 active:bg-teal-50 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-bold text-gray-900 w-6 text-center tabular-nums">
                {sessionsPerWeek}
              </span>
              <button
                type="button"
                onClick={() => setSessionsPerWeek(s => Math.min(7, s + 1))}
                disabled={sessionsPerWeek >= 7}
                aria-label="Increase sessions per week"
                className="w-9 h-9 rounded-full border border-teal-600 text-teal-600 flex items-center justify-center disabled:opacity-40 active:bg-teal-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Used to calculate adherence score
            </p>
          </div>

          {/* ── Program Goals ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Target size={16} style={{ color: '#1D9E75' }} />
              Program Goals
            </label>
            <p className="text-xs text-gray-400 mb-3">
              Select all that apply or add custom
            </p>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {GOAL_PRESETS.map(goal => {
                const isSelected = selectedGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    style={{
                      backgroundColor: isSelected ? '#1D9E75' : '#F3F4F6',
                      color: isSelected ? '#ffffff' : '#374151',
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 13,
                      cursor: 'pointer',
                      margin: '4px',
                      border: 'none'
                    }}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>

            {selectedGoals.filter(g => !GOAL_PRESETS.includes(g)).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedGoals.filter(g => !GOAL_PRESETS.includes(g)).map(goal => (
                  <div
                    key={goal}
                    style={{
                      backgroundColor: '#1D9E75',
                      color: '#ffffff',
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      margin: '4px'
                    }}
                  >
                    <span>{goal}</span>
                    <button
                      type="button"
                      onClick={() => removeGoal(goal)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="text"
              value={customGoal}
              onChange={e => setCustomGoal(e.target.value)}
              onKeyDown={handleCustomGoalKeyDown}
              placeholder="Add custom goal..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />

            <p className="text-xs text-gray-400 mt-3">
              Goals are shown to the client for approval
            </p>
          </div>

          {/* ── Focus Areas ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Layers size={16} style={{ color: '#534AB7' }} />
              Focus Areas
            </label>
            <div className="flex flex-wrap gap-2">
              {FOCUS_AREA_OPTIONS.map(area => {
                const isSelected = focusAreas.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleFocusArea(area)}
                    style={{
                      backgroundColor: isSelected ? '#534AB7' : '#F3F4F6',
                      color: isSelected ? '#ffffff' : '#374151',
                      borderRadius: 999,
                      padding: '6px 14px',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Helps match client to the right program type
            </p>
          </div>

          </div>

          {/* Column 2 (lg:+) — exercise plan, notes, send */}
          <div className="space-y-3">

          {/* ── Exercise Plan ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 block">
              Exercise Plan
            </label>
            <p className="text-xs text-gray-400 mb-4">
              Add exercises for each session
            </p>

            {/* Mode A — Template Picker */}
            {(exercises.length === 0 || showTemplates) && (
              <div>
                {EXERCISE_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setExercises(template.exercises.map((ex, i) => ({
                        ...ex,
                        id: `${Date.now()}-${i}`
                      })));
                      setShowTemplates(false);
                    }}
                    style={{
                      border: '1px solid #E5E7EB',
                      borderRadius: 12,
                      padding: '14px 16px',
                      marginBottom: 8,
                      cursor: 'pointer',
                      backgroundColor: '#FAFAFA'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '20px' }}>{template.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                        {template.label}
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                      {template.description}
                    </p>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplates(false);
                    setExercises([{
                      id: Date.now().toString(),
                      name: '', sets: 3, reps: 10,
                      rest_seconds: 60, instructions: ''
                    }]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0D9488',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '8px 0',
                    cursor: 'pointer',
                    marginTop: '4px'
                  }}
                >
                  Start from scratch
                </button>
              </div>
            )}

            {/* Mode B — Exercise Editor */}
            {(!showTemplates && exercises.length > 0) && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplates(true);
                    setExercises([]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0D9488',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '0 0 12px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  ← Choose different template
                </button>

                {exercises.map((ex, index) => (
                  <div key={ex.id} style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 8,
                    backgroundColor: '#FAFAFA'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8
                    }}>
                      <span style={{
                        fontSize: 12,
                        color: '#6B7280',
                        fontWeight: 600
                      }}>
                        Exercise {index + 1}
                      </span>
                      <button
                        onClick={() => removeExercise(ex.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#DC2626',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <input
                      value={ex.name}
                      placeholder="Exercise name"
                      onChange={e => updateExercise(ex.id, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        padding: '10px',
                        fontSize: '14px',
                        marginBottom: '10px'
                      }}
                    />

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ width: '50%' }}>
                        <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Sets</label>
                        <input
                          type="number"
                          min={1} max={10}
                          value={ex.sets}
                          onChange={e => updateExercise(ex.id, 'sets', parseInt(e.target.value) || 1)}
                          style={{
                            width: '100%',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            padding: '10px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                      <div style={{ width: '50%' }}>
                        <label style={{ fontSize: '11px', color: '#6B7280', display: 'block', marginBottom: '4px' }}>Reps</label>
                        <input
                          type="number"
                          min={1} max={100}
                          value={ex.reps}
                          onChange={e => updateExercise(ex.id, 'reps', parseInt(e.target.value) || 1)}
                          style={{
                            width: '100%',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            padding: '10px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>

                    {!expandedInstructions[ex.id] ? (
                      <button
                        type="button"
                        onClick={() => toggleInstructions(ex.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0D9488',
                          fontSize: '12px',
                          padding: '4px 0',
                          cursor: 'pointer'
                        }}
                      >
                        Add notes
                      </button>
                    ) : (
                      <textarea
                        value={ex.instructions}
                        placeholder="Form cues, tempo, modifications..."
                        onChange={e => updateExercise(ex.id, 'instructions', e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          padding: '10px',
                          fontSize: '13px',
                          resize: 'none'
                        }}
                      />
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addExercise}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0D9488',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '8px 0',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px'
                  }}
                >
                  <Plus size={16} /> Add Exercise
                </button>
              </div>
            )}
          </div>

          {/* ── Notes for Client ──────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Notes for Client
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Only visible to the client — not shared with the Assessment Team
            </p>
            <textarea
              rows={4}
              value={clientNotes}
              onChange={e => setClientNotes(e.target.value)}
              placeholder="Add any instructions, encouragement, or context the client should know about this program..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 text-right mt-1.5">
              {clientNotes.length} characters
            </p>
          </div>

          {/* ── Send for Approval ─────────────────────────────────────────────── */}
          <div className="pt-1">
            {submitError && (
              <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{submitError}</p>
              </div>
            )}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="w-full bg-teal-600 text-white text-sm font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Send for Client Approval
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2 leading-relaxed px-4">
              The client will be notified and must approve before the program becomes active
            </p>
          </div>

          </div>

        </div>
      </div>
      <TrainerBottomNav />
    </MobileShell>
  );
}
