import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { I18nProvider } from '@/i18n';
import { AuthProvider } from '@/context/AuthContext';
import { FarmProvider } from '@/context/FarmContext';
import { supabaseConfigError } from '@/services/supabase';
import ErrorBoundary from '@/components/ErrorBoundary';
import SetupNeeded from '@/components/SetupNeeded';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Config problems are caught before any provider runs, so a missing .env.local
// produces an explanation rather than a blank page.
if (supabaseConfigError) {
  root.render(
    <React.StrictMode>
      <SetupNeeded reason={supabaseConfigError} />
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <I18nProvider>
            <AuthProvider>
              <FarmProvider>
                <App />
              </FarmProvider>
            </AuthProvider>
          </I18nProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
