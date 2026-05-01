import { useState } from 'react';
import SignUpScreen from '../SignUpScreen';
import HealthProfileScreen from '../HealthProfileScreen';
import AssessmentBookingScreen from '../AssessmentBookingScreen';
import type { WellnessAppState } from './types';

function App() {
  const [currentStep, setCurrentStep] = useState(3);
  const [appState, setAppState] = useState<WellnessAppState>({});

  const handleSignUpSuccess = (data: Partial<WellnessAppState>) => {
    setAppState(prev => ({ ...prev, ...data }));
    setCurrentStep(2);
  };

  const handleHealthProfileBack = () => {
    console.log('Navigating back to step:', 1);
    setCurrentStep(1);
  };

  const handleHealthProfileContinue = (data: Partial<WellnessAppState>) => {
    setAppState(prev => ({ ...prev, ...data }));
    setCurrentStep(3);
  };

  const handleAssessmentBookingBack = () => {
    console.log('Navigating back to step:', 2);
    setCurrentStep(2);
  };

  const handleAssessmentBookingConfirm = (data: { preferred_time: string; status: 'confirmed' }) => {
    setAppState(prev => {
      const finalState = { ...prev, ...data };
      const formattedState = JSON.stringify(finalState, null, 2);
      console.log('Final Global State:\n' + formattedState);
      alert('Onboarding Complete! Final State:\n' + formattedState);
      return finalState;
    });
  };

  return (
    <>
      {currentStep === 1 && (
        <SignUpScreen onSuccess={handleSignUpSuccess} initialData={appState} />
      )}
      {currentStep === 2 && (
        <HealthProfileScreen 
          onBack={handleHealthProfileBack} 
          onContinue={handleHealthProfileContinue} 
          initialData={appState}
        />
      )}
      {currentStep === 3 && (
        <AssessmentBookingScreen
          onBack={handleAssessmentBookingBack}
          onConfirm={handleAssessmentBookingConfirm}
          initialData={appState}
        />
      )}
    </>
  );
}

export default App;
