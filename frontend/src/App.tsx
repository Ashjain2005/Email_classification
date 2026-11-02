import React, { useState, useEffect } from 'react';
import { NavigationTab, HealthStatus, BatchPredictionResponse } from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { BulkAnalysisPage } from './pages/BulkAnalysisPage';
import { InboxPage } from './pages/InboxPage';
import { SingleTestPage } from './pages/SingleTestPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [demoBulkData, setDemoBulkData] = useState<BatchPredictionResponse | null>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch((err) => console.warn('Could not connect to MailGuard backend:', err));
  }, []);

  const handleRunSampleDemo = () => {
    setCurrentTab('bulk');
  };

  return (
    <div className={`relative flex h-screen overflow-hidden font-sans transition-colors duration-300
      ${isDark ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>

      {/* Subtle Background Surface Gradient (Linear / Stripe SaaS Style) */}
      <div className={`fixed inset-0 pointer-events-none transition-opacity duration-500 ${
        isDark 
          ? 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.08),rgba(255,255,255,0))]'
          : 'bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.05),rgba(255,255,255,0))]'
      }`} />

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        health={health}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
        {/* Top Header */}
        <Header currentTab={currentTab} health={health} onSelectTab={setCurrentTab} />

        {/* Scrollable View */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200">
          <div className="max-w-7xl mx-auto pb-12">
            {currentTab === 'dashboard' && (
              <DashboardPage
                onNavigate={setCurrentTab}
                onRunSampleDemo={handleRunSampleDemo}
              />
            )}
            {currentTab === 'bulk' && (
              <BulkAnalysisPage initialData={demoBulkData} />
            )}
            {currentTab === 'inbox' && (
              <InboxPage />
            )}
            {currentTab === 'single' && (
              <SingleTestPage />
            )}
            {currentTab === 'performance' && (
              <ModelPerformancePage />
            )}
            {currentTab === 'history' && (
              <HistoryPage />
            )}
            {currentTab === 'settings' && (
              <SettingsPage />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
