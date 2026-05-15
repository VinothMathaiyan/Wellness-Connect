const fs = require('fs');
const path = require('path');

const dirs = [
  'src/modules/client/screens',
  'src/modules/shared/screens'
];

dirs.forEach(dir => {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    if (!f.endsWith('.tsx')) return;
    const p = path.join(dir, f);
    let code = fs.readFileSync(p, 'utf8');
    let changed = false;

    // 1. SessionDetailScreen
    if (f === 'SessionDetailScreen.tsx') {
      if (code.includes('onClick={onBack}')) {
        code = code.replace(/onClick=\{onBack\}/g, "onClick={() => navigate(-1)}");
        changed = true;
      }
      // Wait, handleComplete already has navigate('/client/dashboard') here, but let's check it:
      // "handleSessionComplete({ ... }); navigate('/client/dashboard');" is there. 
      // Wait, there's another button: "Save session progress"
      if (code.includes('handleSessionProgressUpdate') && !code.includes('navigate(')) {
        code = code.replace(/onClick=\{\(\) => handleSessionProgressUpdate([^}]+)\}/, "onClick={() => { handleSessionProgressUpdate$1; navigate('/client/dashboard'); }}");
        changed = true;
      }
    }

    // 2. TrainerGoalApprovalScreen
    if (f === 'TrainerGoalApprovalScreen.tsx') {
      if (!code.includes("import { useNavigate }")) {
        code = code.replace("import React,", "import { useNavigate } from 'react-router-dom';\nimport React,");
        code = code.replace("export default function TrainingGoalApprovalScreen({ clientId, onBack, onDone, isFirstEntry = false }: TrainingGoalApprovalScreenProps) {", "export default function TrainingGoalApprovalScreen({ clientId, isFirstEntry = false }: any) {\n    const navigate = useNavigate();");
        changed = true;
      }
      if (code.includes('onClick={onBack}')) {
        code = code.replace(/onClick=\{onBack\}/g, "onClick={() => navigate(-1)}");
        changed = true;
      }
      if (code.includes('onDone(')) {
        code = code.replace(/onDone\([^)]+\)/g, "navigate('/client/dashboard')");
        changed = true;
      }
    }

    // 3. AssessmentBookingScreen
    if (f === 'AssessmentBookingScreen.tsx') {
      if (code.includes('handleAssessmentBookingConfirm') && !code.includes('navigate(')) {
        // Find handleSubmit
        if (code.includes('handleConfirm = () => {') && !code.includes('navigate(\'/onboarding/ready\')')) {
           code = code.replace(/handleAssessmentBookingConfirm\(\{([^}]+)\}\);/, "handleAssessmentBookingConfirm({$1}); navigate('/onboarding/ready');");
           changed = true;
        }
      }
    }

    if (changed) {
      fs.writeFileSync(p, code);
      console.log('Fixed', f);
    }
  });
});
