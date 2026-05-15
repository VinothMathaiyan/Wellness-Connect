const fs = require('fs');
const path = require('path');

const clientScreensPath = path.join(__dirname, 'src', 'modules', 'client', 'screens');
const sharedScreensPath = path.join(__dirname, 'src', 'modules', 'shared', 'screens');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const { search, replace } of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content, 'utf8');
}

// SignUpScreen
replaceInFile(path.join(sharedScreensPath, 'SignUpScreen.tsx'), [
    { search: /import type \{ WellnessAppState \} from '\.\.\/\.\.\/\.\.\/types';\r?\n/, replace: '' },
    { search: /interface SignUpScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function SignUpScreen\(\{ onSuccess, initialData \}: SignUpScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function SignUpScreen() {\n  const navigate = useNavigate();\n  const { appState, handleSignUpSuccess } = useWellness();\n  const initialData = appState;` }
]);

// HealthProfileScreen
replaceInFile(path.join(clientScreensPath, 'HealthProfileScreen.tsx'), [
    { search: /interface HealthProfileScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function HealthProfileScreen\(\{ onBack, onContinue, initialData \}: HealthProfileScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function HealthProfileScreen() {\n  const navigate = useNavigate();\n  const { appState, handleHealthProfileContinue } = useWellness();\n  const initialData = appState;` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onContinue\(/g, replace: 'handleHealthProfileContinue(' },
    { search: /handleHealthProfileContinue\(data\);/g, replace: 'handleHealthProfileContinue(data);\n        navigate(\'/onboarding/assessment\');' }
]);

// AssessmentBookingScreen
replaceInFile(path.join(clientScreensPath, 'AssessmentBookingScreen.tsx'), [
    { search: /interface AssessmentBookingScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function AssessmentBookingScreen\(\{ onBack, onConfirm, initialData \}: AssessmentBookingScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function AssessmentBookingScreen() {\n  const navigate = useNavigate();\n  const { appState, handleAssessmentBookingConfirm } = useWellness();\n  const initialData = appState;` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onConfirm\(\{/g, replace: 'handleAssessmentBookingConfirm({\n      status: \'scheduled\',\n      trainer_id: \'mock-trainer\',\n      scheduled_at: new Date().toISOString(),\n      notes: \'\'\n    }); navigate(\'/onboarding/ready\'); // ' },
    { search: /onConfirm\(bookingData\)/g, replace: 'handleAssessmentBookingConfirm(bookingData);\n    navigate(\'/onboarding/ready\')' }
]);

// AccountReadyScreen
replaceInFile(path.join(clientScreensPath, 'AccountReadyScreen.tsx'), [
    { search: /interface AccountReadyScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function AccountReadyScreen\(\{ userData, onGoToDashboard \}: AccountReadyScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function AccountReadyScreen() {\n  const navigate = useNavigate();\n  const { appState } = useWellness();\n  const userData = {\n    full_name: appState.full_name ?? '',\n    goals_json: appState.goals ?? [],\n    fitness_level: appState.fitness_level ?? '',\n  };` },
    { search: /onGoToDashboard\('mock-client-id'\)/g, replace: 'navigate(\'/client/dashboard\')' }
]);

// HomeScreen
replaceInFile(path.join(clientScreensPath, 'HomeScreen.tsx'), [
    { search: /interface HomeScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function HomeScreen\(\{[\s\S]*?\}\s*:\s*HomeScreenProps\)\s*\{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function HomeScreen() {\n  const navigate = useNavigate();\n  const { appState, dailyNutrition, workoutProgress, setActiveSession } = useWellness();\n\n  const userData = {\n    full_name: appState.full_name ?? '',\n    readinessScore: appState.readinessScore ?? 84,\n    currentWeek: 4,\n    assessmentStatus: appState.assessmentStatus ?? 'pending',\n    habitProgress: appState.habitProgress ?? { done: 1, total: 5 },\n    mealsLogged: appState.dailyNutrition?.mealsLogged ?? (appState.mealLogs ?? []).length,\n    weeklyReportStatus: 'ready' as any,\n    weeklyReportTeaser: { sleep: '6.5h', mood: '4.2', energy: '7.5' },\n    unReadAlertsCount: (appState.notifications ?? []).filter(n => !n.isRead).length,\n    sessions: [] as any[]\n  };\n` },
    { search: /onViewSession\(/g, replace: '((s) => { setActiveSession(s); navigate(\'/client/session/\' + s.session_id); })(' },
    { search: /onStartCheckIn\(\)/g, replace: 'navigate(\'/client/check-in\')' },
    { search: /onFindTrainer\(\)/g, replace: 'navigate(\'/client/trainers\')' },
    { search: /onTrackToday\(\)/g, replace: 'navigate(\'/client/check-in\')' },
    { search: /onTrackNutrition\(\)/g, replace: 'navigate(\'/client/nutrition\')' },
    { search: /onViewWeeklyReport\(\)/g, replace: 'navigate(\'/client/report/current\')' },
    { search: /onViewAlerts\(\)/g, replace: 'navigate(\'/client/alerts\')' },
    { search: /onViewProgress\(\)/g, replace: 'navigate(\'/client/progress\')' },
    { search: /onReviewGoals\(\)/g, replace: 'navigate(\'/client/dashboard\')' },
    { search: /onProfileClick\(\)/g, replace: 'navigate(\'/client/dashboard\')' }
]);

// DailyCheckInScreen
replaceInFile(path.join(clientScreensPath, 'DailyCheckInScreen.tsx'), [
    { search: /interface DailyCheckInScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function DailyCheckInScreen\(\{ onBack, onComplete, existingLog \}: DailyCheckInScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function DailyCheckInScreen() {\n  const navigate = useNavigate();\n  const { appState, handleDailyCheckInComplete } = useWellness();\n  const existingLog = appState.dailyLog;` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onComplete\(/g, replace: 'handleDailyCheckInComplete(' },
    { search: /handleDailyCheckInComplete\(mockLog\);/g, replace: 'handleDailyCheckInComplete(mockLog);\n    navigate(\'/client/dashboard\');' }
]);

// NutritionLogFlow
replaceInFile(path.join(clientScreensPath, 'NutritionLogFlow.tsx'), [
    { search: /interface NutritionLogFlowProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function NutritionLogFlow\(\{ onBack, onComplete \}: NutritionLogFlowProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function NutritionLogFlow() {\n  const navigate = useNavigate();\n  const { handleNutritionLogComplete } = useWellness();` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onComplete\(\{/g, replace: 'handleNutritionLogComplete({\n        meals: loggedMeals,\n        totalCalories: totalLoggedCalories\n      });\n      navigate(\'/client/dashboard\');\n      // ' },
    { search: /onComplete\(payload\)/g, replace: 'handleNutritionLogComplete(payload); navigate(\'/client/dashboard\')' }
]);

// SessionDetailScreen
replaceInFile(path.join(clientScreensPath, 'SessionDetailScreen.tsx'), [
    { search: /interface SessionDetailScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function SessionDetailScreen\(\{ session, onBack, onCompleteSession, completedExercises, onToggleExercise, userInitials \}: SessionDetailScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function SessionDetailScreen() {\n  const navigate = useNavigate();\n  const { appState, activeSession: session, completedExercises, handleToggleExercise: onToggleExercise, handleSessionComplete } = useWellness();\n  const userInitials = (appState.full_name ?? 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);\n  if (!session) return null;` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onCompleteSession\(\{/g, replace: 'handleSessionComplete({\n      completedCount,\n      totalCount,\n      adherenceScore: score,\n      clientNotes: notes\n    }); navigate(\'/client/dashboard\'); // ' }
]);

// TrainersScreen
replaceInFile(path.join(clientScreensPath, 'TrainersScreen.tsx'), [
    { search: /interface TrainersScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function TrainersScreen\(\{[\s\S]*?\}\s*:\s*TrainersScreenProps\)\s*\{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function TrainersScreen() {\n  const navigate = useNavigate();\n  const { appState } = useWellness();\n  const trainers = appState.trainers;\n  const connections = appState.connections;\n  const unreadAlertsCount = (appState.notifications ?? []).filter(n => !n.isRead).length;` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onGoHome\(\)/g, replace: 'navigate(\'/client/dashboard\')' },
    { search: /onFindTrainer\(\)/g, replace: 'navigate(\'/client/trainers\')' },
    { search: /onViewProgress\(\)/g, replace: 'navigate(\'/client/progress\')' },
    { search: /onViewAlerts\(\)/g, replace: 'navigate(\'/client/alerts\')' },
    { search: /onViewProfile\(/g, replace: '((t) => console.log(t))(' }
]);

// AlertsScreen
replaceInFile(path.join(sharedScreensPath, 'AlertsScreen.tsx'), [
    { search: /interface AlertsScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function AlertsScreen\(\{[\s\S]*?\}\s*:\s*AlertsScreenProps\)\s*\{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function AlertsScreen() {\n  const navigate = useNavigate();\n  const { appState, handleMarkAlertRead: onMarkRead, handleMarkAllAlertsRead: onMarkAllRead } = useWellness();\n  const notifications = appState.notifications ?? [];\n  const onAction = (n: any) => {\n    if (n.actionType === 'view_report') navigate('/client/report/current');\n    else if (n.actionType === 'view_tracking') navigate('/client/check-in');\n  };` },
    { search: /onGoHome\(\)/g, replace: 'navigate(\'/client/dashboard\')' },
    { search: /onFindTrainer\(\)/g, replace: 'navigate(\'/client/trainers\')' },
    { search: /onViewProgress\(\)/g, replace: 'navigate(\'/client/progress\')' },
    { search: /onProfileClick\(\)/g, replace: 'navigate(\'/client/dashboard\')' }
]);

// ProgressScreen
replaceInFile(path.join(clientScreensPath, 'ProgressScreen.tsx'), [
    { search: /interface ProgressScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function ProgressScreen\(\{[\s\S]*?\}\s*:\s*ProgressScreenProps\)\s*\{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function ProgressScreen() {\n  const navigate = useNavigate();\n  const { appState } = useWellness();\n  const unreadAlertsCount = (appState.notifications ?? []).filter(n => !n.isRead).length;` },
    { search: /onGoHome\(\)/g, replace: 'navigate(\'/client/dashboard\')' },
    { search: /onFindTrainer\(\)/g, replace: 'navigate(\'/client/trainers\')' },
    { search: /onViewAlerts\(\)/g, replace: 'navigate(\'/client/alerts\')' },
    { search: /onProfileClick\(\)/g, replace: 'navigate(\'/client/dashboard\')' }
]);

// WeeklyReportScreen
replaceInFile(path.join(clientScreensPath, 'WeeklyReportScreen.tsx'), [
    { search: /interface WeeklyReportScreenProps \{[\s\S]*?\}/, replace: '' },
    { search: /export default function WeeklyReportScreen\(\{ report, onBack, onSave \}: WeeklyReportScreenProps\) \{/, replace: `import { useNavigate } from 'react-router-dom';\nimport { useWellness } from '../../context/WellnessContext';\n\nexport default function WeeklyReportScreen() {\n  const navigate = useNavigate();\n  const { handleWeeklyReportSave } = useWellness();\n  const report = {\n    week_number: 4,\n    start_date: "Oct 16",\n    end_date: "Oct 22",\n    averages: { readiness: 84, sleep_hours: 6.5, water_litres: 2.1, mood_score: 4.2, energy_level: 7.5, pain_score: 1.2, mobility_score: 8.5, steps: 8450 },\n    trends: {\n      best_day: "Wed", consistent_metric: "Sleep",\n      sleep: [{day_offset:0, value:6}, {day_offset:1, value:6.5}, {day_offset:2, value:7.5}, {day_offset:3, value:7}, {day_offset:4, value:6.5}, {day_offset:5, value:8}, {day_offset:6, value:7}],\n      water: [{day_offset:0, value:2}, {day_offset:1, value:1.5}, {day_offset:2, value:2.5}, {day_offset:3, value:2.2}, {day_offset:4, value:1.8}, {day_offset:5, value:2.6}, {day_offset:6, value:2.1}],\n      mood: [{day_offset:0, value:3}, {day_offset:1, value:4}, {day_offset:2, value:5}, {day_offset:3, value:4}, {day_offset:4, value:4}, {day_offset:5, value:5}, {day_offset:6, value:4}],\n      energy: [{day_offset:0, value:6}, {day_offset:1, value:7}, {day_offset:2, value:8}, {day_offset:3, value:6}, {day_offset:4, value:7}, {day_offset:5, value:9}, {day_offset:6, value:8}],\n      pain: [{day_offset:0, value:2}, {day_offset:1, value:1}, {day_offset:2, value:0}, {day_offset:3, value:1}, {day_offset:4, value:2}, {day_offset:5, value:0}, {day_offset:6, value:1}],\n      mobility: [{day_offset:0, value:7}, {day_offset:1, value:8}, {day_offset:2, value:9}, {day_offset:3, value:8}, {day_offset:4, value:8}, {day_offset:5, value:9}, {day_offset:6, value:9}],\n      steps: [{day_offset:0, value:7000}, {day_offset:1, value:8500}, {day_offset:2, value:10000}, {day_offset:3, value:8000}, {day_offset:4, value:7500}, {day_offset:5, value:12000}, {day_offset:6, value:9000}]\n    },\n    daily_readiness: [{score: 75}, {score: 82}, {score: 90}, {score: 85}, {score: 78}, {score: 92}, {score: 86}],\n    trainer_week_note: "Great consistency this week! Your mobility is improving well."\n  };` },
    { search: /onBack\(\)/g, replace: 'navigate(-1)' },
    { search: /onSave\(/g, replace: 'handleWeeklyReportSave(' },
    { search: /handleWeeklyReportSave\(reflection\);/g, replace: 'handleWeeklyReportSave(reflection);\n      navigate(\'/client/dashboard\');' }
]);

console.log("Replacements complete.");
