import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { useAuth } from "@/hooks/useAuth";
// import { useRealTimeSync } from "@/hooks/useRealTimeSync";
// import { usePWA } from "@/hooks/usePWA";
import { useEffect, useState } from "react";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import BrowserCompatibleSignIn from "@/components/auth/BrowserCompatibleSignIn";
import Dashboard from "@/pages/Dashboard";
import OnboardingPage from "@/pages/OnboardingPage";

// Core functionality pages
import Record from "@/pages/Record";
import Rights from "@/pages/Rights";
import Attorneys from "@/pages/Attorneys";
import Messages from "@/pages/Messages";
import Settings from "@/pages/Settings";
import AccountSecurity from "@/pages/AccountSecurity";
import Pricing from "@/pages/Pricing";
import Payment from "@/pages/Payment";
import Help from "@/pages/Help";
import InteractiveTutorial from "@/pages/InteractiveTutorial";
import PoliceMonitor from "@/pages/PoliceMonitor";
import EmergencyPullover from "@/pages/EmergencyPullover";
import PoliceReportForm from "@/pages/PoliceReportForm";
import DeEscalationGuide from "@/pages/DeEscalationGuide";
import CloudSync from "@/pages/CloudSync";
import AILearningDashboard from "@/pages/AILearningDashboard";
import LegalRightsMap from "@/pages/LegalRightsMap";
import VoicePrintAuth from "@/pages/VoicePrintAuth";
import BluetoothEarpiece from "@/pages/BluetoothEarpiece";
import MediaTest from "@/pages/MediaTest";
import LivestreamToAttorneys from "@/pages/LivestreamToAttorneys";
import RoadsideAssistance from "@/pages/RoadsideAssistance";
import Complaints from "@/pages/Complaints";
import EmergencySharing from "@/pages/EmergencySharing";
import EvidenceCatalog from "@/pages/EvidenceCatalog";
import AccessibilityEnhancer from "@/pages/AccessibilityEnhancer";
import UnifiedVoiceHub from "@/pages/UnifiedVoiceHub";
import UnifiedDeviceSetup from "@/pages/UnifiedDeviceSetup";
import SimpleAdminDashboard from "@/pages/SimpleAdminDashboard";
import LoadTestDashboard from "@/pages/LoadTestDashboard";
import N8NTestDashboard from "@/pages/N8NTestDashboard";
import VoiceCommandOptimizationDashboard from "@/components/VoiceCommandOptimizationDashboard";
import AdaptiveLearningDashboard from "@/components/AdaptiveLearningDashboard";

// Temporarily disabled to fix loading issues
// import { GlobalVoiceCommands } from "@/components/GlobalVoiceCommands";
// import { ContextualHelpManager } from "@/components/ContextualHelpManager";
// import { MobileVoiceCommandPreview } from "@/components/MobileVoiceCommandPreview";
import MobilePerformance from "@/pages/MobilePerformance";
import NativeMobileFeatures from "@/pages/NativeMobileFeatures";
import SmartAutoMutePage from "@/pages/SmartAutoMutePage";
import VehicleReadability from "@/pages/VehicleReadability";
import AudioFeedbackSettings from "@/pages/AudioFeedbackSettings";
import BluetoothDevices from "@/pages/BluetoothDevices";
import VoiceCommands from "@/pages/VoiceCommands";
import Community from "@/pages/Community";
import CategoryPage from "@/pages/CategoryPage";
import CreatePost from "@/pages/CreatePost";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Initialize real-time synchronization for authenticated users - DISABLED to prevent loading issues
  // const { isConnected, getConnectionStatus } = useRealTimeSync();

  // Check if user is new and needs onboarding
  const hasSeenOnboarding = localStorage.getItem('caren_onboarding_state') ? 
    JSON.parse(localStorage.getItem('caren_onboarding_state') || '{}').hasSeenOnboarding : false;

  // Clean up old session tokens on app startup to prevent authentication issues
  useEffect(() => {
    // Add global error handler to prevent unhandled promise rejections from causing alerts
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.log('[GLOBAL] Handled unhandled promise rejection:', event.reason);
      // Prevent the default browser behavior (alert popup)
      event.preventDefault();
    };

    // Add the global error handler
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const cleanupOldTokens = () => {
      const sessionToken = localStorage.getItem('sessionToken');
      const customDomainToken = localStorage.getItem('customDomainToken');
      const demoSessionKey = localStorage.getItem('demoSessionKey');
      const regularSessionToken = localStorage.getItem('regularSessionToken');
      
      // Check if any tokens exist and verify them
      if (sessionToken || customDomainToken || demoSessionKey || regularSessionToken) {
        console.log('[STARTUP_CLEANUP] Found existing tokens, verifying authentication status...');
      }
    };
    
    cleanupOldTokens();
    
    // Cleanup function to remove the global error handler
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <>
      {/* Global voice commands work across all pages - DISABLED for testing */}
      {/* {isAuthenticated && <GlobalVoiceCommands />} */}
      
      {isLoading ? (
        <Route path="/" component={() => <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>} />
      ) : !isAuthenticated ? (
        <Switch>
          {/* Always start at signin page for unauthenticated users */}
          <Route path="/" component={BrowserCompatibleSignIn} />
          <Route path="/onboarding" component={OnboardingPage} />
          <Route path="/signin" component={BrowserCompatibleSignIn} />
          <Route path="/terms" component={Login} />
          <Route path="/about" component={Landing} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/help" component={Help} />
          <Route path="/rights" component={() => {
            console.log('🔥 RIGHTS ROUTE MATCHED! - UNIVERSAL ACCESS');
            return <Rights />;
          }} />
          <Route path="/admin" component={SimpleAdminDashboard} />
          <Route path="/load-test" component={LoadTestDashboard} />

          {/* Catch-all route - redirect all other routes to sign in for unauthenticated users */}
          <Route path="*" component={() => {
            const currentPath = window.location.pathname;
            console.log('Unauthenticated catch-all route triggered for path:', currentPath);
            
            // Store the intended destination only for specific pages that make sense to redirect to
            const allowedRedirects = ['/help', '/rights', '/attorneys', '/messages', '/settings'];
            
            if (allowedRedirects.includes(currentPath)) {
              sessionStorage.setItem('redirectAfterAuth', currentPath);
            }
            // Don't redirect to /record or other sensitive pages - let users go to dashboard first
            return <BrowserCompatibleSignIn />;
          }} />
        </Switch>
      ) : (
        <>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/record" component={Record} />
            <Route path="/emergency-pullover" component={EmergencyPullover} />
            <Route path="/police-monitor" component={PoliceMonitor} />
            <Route path="/file-complaint" component={Complaints} />
            <Route path="/complaints" component={Complaints} />
            <Route path="/emergency-sharing" component={EmergencySharing} />
            <Route path="/police-report" component={PoliceReportForm} />
            <Route path="/de-escalation-guide" component={DeEscalationGuide} />
            <Route path="/rights-test" component={Rights} />
            <Route path="/legal-rights-map" component={LegalRightsMap} />
            <Route path="/roadside-assistance" component={RoadsideAssistance} />
            <Route path="/attorneys" component={Attorneys} />
            <Route path="/messages" component={Messages} />
            <Route path="/community" component={Community} />
            <Route path="/community/category/:id" component={CategoryPage} />
            <Route path="/community/create-post" component={CreatePost} />
            <Route path="/cloud-sync" component={CloudSync} />
            <Route path="/voice-hub" component={UnifiedVoiceHub} />
            <Route path="/voice-commands" component={VoiceCommands} />
            <Route path="/voice-optimization" component={VoiceCommandOptimizationDashboard} />
        <Route path="/adaptive-learning" component={AdaptiveLearningDashboard} />
            {/* <Route path="/mobile-voice-preview" component={MobileVoiceCommandPreview} /> */}
            <Route path="/mobile-performance" component={MobilePerformance} />
            <Route path="/native-mobile-features" component={NativeMobileFeatures} />
            <Route path="/smart-auto-mute" component={SmartAutoMutePage} />
            <Route path="/vehicle-readability" component={VehicleReadability} />
            <Route path="/audio-feedback" component={AudioFeedbackSettings} />
            <Route path="/bluetooth-devices" component={BluetoothDevices} />
            <Route path="/device-setup" component={UnifiedDeviceSetup} />
            <Route path="/voice-auth" component={VoicePrintAuth} />
            <Route path="/bluetooth-earpiece" component={BluetoothEarpiece} />
            <Route path="/media-test" component={MediaTest} />
            <Route path="/livestream-attorneys" component={LivestreamToAttorneys} />
            <Route path="/ai-learning" component={AILearningDashboard} />
            <Route path="/evidence-catalog" component={EvidenceCatalog} />
            <Route path="/accessibility" component={AccessibilityEnhancer} />
            <Route path="/payment" component={Payment} />
            <Route path="/admin" component={SimpleAdminDashboard} />
            <Route path="/load-test" component={LoadTestDashboard} />
            <Route path="/n8n-test" component={N8NTestDashboard} />
            <Route path="/settings" component={Settings} />
            <Route path="/account-security" component={AccountSecurity} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/help" component={Help} />
            <Route path="/tutorial" component={InteractiveTutorial} />
            <Route path="/rights" component={() => {
              console.log('🔥 RIGHTS ROUTE MATCHED! - AUTHENTICATED ACCESS');
              return <Rights />;
            }} />
            
            {/* IMPORTANT: Catch-all route MUST be last - it captures all unmatched routes */}
            <Route path="*" component={() => {
              console.log('CATCH-ALL route matched for path:', window.location.pathname);
              return <NotFound />;
            }} />
          </Switch>
          
          {/* Contextual Help Bubble - Available on all authenticated pages */}
          {/* <ContextualHelpManager /> */}
        </>
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router />

        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
