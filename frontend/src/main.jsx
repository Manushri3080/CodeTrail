import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import LoginPage from './components/LoginPage.jsx'
import ForgotPassword from './components/ForgotPassword.jsx'
import ResetPassword from './components/ResetPassword.jsx'

function LoginRouteWrapper({ onLoginSuccess }) {
  const token = localStorage.getItem('ct-auth-token');
  return token ? (
    <Navigate to="/" replace />
  ) : (
    <LoginPage onLoginSuccess={onLoginSuccess} />
  );
}

function MainRouter() {
  const handleLoginSuccess = (newToken, user) => {
    localStorage.setItem('ct-auth-token', newToken);
    localStorage.setItem('ct-auth-user', JSON.stringify(user));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route 
          path="/login" 
          element={<LoginRouteWrapper onLoginSuccess={handleLoginSuccess} />} 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="384938790327-9is4krn800cbmsco1utj1aetqd2a9s5a.apps.googleusercontent.com">
      <MainRouter />
    </GoogleOAuthProvider>
  </StrictMode>,
)

