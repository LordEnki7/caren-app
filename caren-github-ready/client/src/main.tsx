import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeLanguage } from "@/lib/i18n";
import CrashlyticsService from "@/services/crashlytics";
import ErrorBoundary from "@/components/ErrorBoundary";

// Initialize language from localStorage
initializeLanguage();

// Handle screenshot mode auth token from URL
const urlParams = new URLSearchParams(window.location.search);
const authToken = urlParams.get('authToken');
if (authToken && import.meta.env.MODE === 'development') {
  localStorage.setItem('regularSessionToken', authToken);
  console.log('[SCREENSHOT_MODE] Auth token set from URL:', authToken);
}

// Initialize Crashlytics
CrashlyticsService.initialize().then(() => {
  CrashlyticsService.logBreadcrumb('App starting up');
});

// Enhanced error handling with Crashlytics
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  
  // Record in Crashlytics
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  CrashlyticsService.recordError(error, {
    type: 'unhandledrejection',
    timestamp: Date.now(),
    component: 'main.tsx'
  });
  
  event.preventDefault(); // Prevent default browser handling
});

// Handle JavaScript errors
window.addEventListener('error', (event) => {
  console.error('JavaScript error:', event.error);
  
  // Record in Crashlytics
  const error = event.error || new Error(event.message);
  CrashlyticsService.recordError(error, {
    type: 'javascript_error',
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    timestamp: Date.now(),
    component: 'main.tsx'
  });
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
