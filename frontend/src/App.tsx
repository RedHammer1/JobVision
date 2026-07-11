import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import VacanciesPage from './pages/VacanciesPage';
import MessengerPage from './pages/MessengerPage';
import TestsPage from './pages/TestsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="page-loading">Загрузка...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/vacancies" replace />} />
            <Route path="vacancies" element={<VacanciesPage />} />
            <Route path="messenger" element={<MessengerPage />} />
          </Route>

          <Route path="/tests" element={
            <ProtectedRoute>
              <TestsPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/vacancies" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;