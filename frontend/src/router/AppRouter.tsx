import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from '@/components/layout/Layout';

// 頁面組件
import HomePage from '@/pages/HomePage';
import VocabularyPage from '@/pages/VocabularyPage';
import AddWordPage from '@/pages/AddWordPage';
import StudyPage from '@/pages/StudyPage';
import ProgressPage from '@/pages/ProgressPage';
import AIAnalysisPage from '@/pages/AIAnalysisPage';
import WordDetailPage from '@/pages/WordDetailPage';
import SettingsPage from '@/pages/SettingsPage';
import SettingsTestPage from '@/pages/SettingsTestPage';
import DebugClickablePage from '@/pages/DebugClickablePage';
import GlobalQuickWordPopup from '@/components/GlobalQuickWordPopup';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vocabulary" element={<VocabularyPage />} />
            <Route path="/vocabulary/:wordId" element={<WordDetailPage />} />
            <Route path="/add-word" element={<AddWordPage />} />
            <Route path="/study" element={<StudyPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/ai-analysis" element={<AIAnalysisPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings-test" element={<SettingsTestPage />} />
            <Route path="/debug-clickable" element={<DebugClickablePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
        <GlobalQuickWordPopup />
      </Layout>
    </Router>
  );
};

export default AppRouter;