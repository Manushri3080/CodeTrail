import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HeroSection from './modules/landing/HeroSection';
import ModulesGrid from './modules/landing/ModulesGrid';
import ModularWorkspace from './modules/workspace/ModularWorkspace';
import ExecutionEngine from './modules/execution/ExecutionEngine';
import ContributionDossier from './modules/telemetry/ContributionDossier';
import HomePage from './modules/home/HomePage';
import TerminalModal from './modules/terminal/TerminalModal';
import { INITIAL_TERMINAL_LOGS, processKernelCommand } from './modules/terminal/terminalKernel';
import ProfilePage from './modules/profile/ProfilePage';


function App({ defaultTab }) {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('ct-auth-token'));
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('ct-auth-user')) || null);
  const [activeTab, setActiveTab] = useState(defaultTab || (isLoggedIn ? 'home' : 'modules-grid'));
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState(INITIAL_TERMINAL_LOGS);

  const handleJumpToWorkspace = () => {
    const el = document.getElementById('modular-workspace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setActiveTab('modular-workspace');
    }
  };

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    const result = processKernelCommand(terminalInput);

    if (result.action === 'clear') {
      setTerminalLogs([]);
    } else if (result.output) {
      setTerminalLogs(prev => [...prev, `> ${terminalInput}`, result.output]);
    }
    setTerminalInput('');
  };

  const handleLogin = () => {
    navigate('/login', { state: { signUp: false } });
  };

  const handleSignUp = () => {
    navigate('/login', { state: { signUp: true } });
  };

  const handleLogout = () => {
    localStorage.removeItem('ct-auth-token');
    localStorage.removeItem('ct-auth-user');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveTab('modules-grid');
    alert('Logged out successfully.');
  };

  return (
    <div className="ct-app">
      {/* 1. TOP NAVIGATION */}
      <Navbar
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onLogout={handleLogout}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* 2. DYNAMIC MAIN VIEW MODE: PROFILE vs HOME DASHBOARD vs LANDING PAGE */}
      {activeTab === 'profile' ? (
        <ProfilePage
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onLogout={handleLogout}
          onBackToHome={() => setActiveTab(isLoggedIn ? 'home' : 'modules-grid')}
        />
      ) : isLoggedIn && activeTab === 'home' ? (
        <HomePage
          onJumpToWorkspace={handleJumpToWorkspace}
          onOpenProfile={() => setActiveTab('profile')}
        />
      ) : (
        <>
          {/* LANDING PAGE HERO */}
          <HeroSection onOpenTerminal={() => setTerminalOpen(true)} />

          {/* COLLABORATIVE WORKSPACE MODULE */}
          <ModularWorkspace />

          {/* CODE EXECUTION SANDBOX MODULE */}
          <ExecutionEngine />

          {/* CONTRIBUTION TELEMETRY MODULE */}
          <ContributionDossier />

          {/* CORE PLATFORM MODULES BREAKDOWN */}
          <ModulesGrid />

          {/* FOOTER (ONLY RENDERED ON LANDING PAGE) */}
          <Footer />
        </>
      )
      }


      {/* INTERACTIVE TERMINAL MODAL */}
      <TerminalModal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        terminalLogs={terminalLogs}
        terminalInput={terminalInput}
        setTerminalInput={setTerminalInput}
        handleTerminalSubmit={handleTerminalSubmit}
      />
    </div >
  );
}

export default App;
