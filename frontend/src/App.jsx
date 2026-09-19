import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HeroSection from './modules/landing/HeroSection';
import ModulesGrid from './modules/landing/ModulesGrid';
import ModularWorkspace from './modules/workspace/ModularWorkspace';
import WorkspacesPage from './modules/workspace/WorkspacesPage';
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
  
  const [activeTab, setActiveTabState] = useState(() => {
    if (defaultTab) return defaultTab;
    if (isLoggedIn) {
      try {
        const saved = localStorage.getItem('ct-active-tab');
        if (saved && saved !== 'modules-grid' && saved !== 'landing') return saved;
      } catch (e) {}
      return 'home';
    }
    return 'modules-grid';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('ct-active-tab', tab);
    } catch (e) {}
  };

  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    try {
      const saved = localStorage.getItem('ct-active-workspace-session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState(INITIAL_TERMINAL_LOGS);

  const handleJumpToWorkspace = (workspace = null) => {
    if (workspace) {
      setActiveWorkspace(workspace);
      try {
        localStorage.setItem('ct-active-workspace-session', JSON.stringify(workspace));
      } catch (e) {}
      setActiveTab('modular-workspace');
    } else {
      const el = document.getElementById('modular-workspace');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveTab('modular-workspace');
      }
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
    localStorage.removeItem('ct-active-workspace-session');
    localStorage.removeItem('ct-active-tab');
    setIsLoggedIn(false);
    setCurrentUser(null);
    setActiveWorkspace(null);
    setActiveTab('modules-grid');
    alert('Logged out successfully.');
  };

  return (
    <div className="ct-app">
      {/* 1. TOP NAVIGATION (HIDDEN ON LOGGED-IN WORKSPACE VIEW FOR FULL-SCREEN IDE) */}
      {!(isLoggedIn && activeTab === 'modular-workspace') && (
        <Navbar
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          activeWorkspace={activeWorkspace}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onLogout={handleLogout}
          onJumpToWorkspace={handleJumpToWorkspace}
          onNavigate={(tab) => setActiveTab(tab)}
        />
      )}

      {/* 2. DYNAMIC MAIN VIEW MODE: PROFILE vs ACTIVE WORKSPACE vs HOME DASHBOARD vs LANDING PAGE */}
      {activeTab === 'profile' ? (
        <ProfilePage
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          onLogout={handleLogout}
          onBackToHome={() => setActiveTab(isLoggedIn ? 'home' : 'modules-grid')}
        />
      ) : isLoggedIn ? (
        activeTab === 'modular-workspace' ? (
          <div className="ct-logged-workspace-wrap">
            <ModularWorkspace 
              activeWorkspace={activeWorkspace} 
              onBackToHome={() => setActiveTab('home')} 
            />
          </div>
        ) : activeTab === 'workspaces-directory' ? (
          <WorkspacesPage
            currentUser={currentUser}
            onJumpToWorkspace={handleJumpToWorkspace}
            onBackToHome={() => setActiveTab('home')}
          />
        ) : activeTab === 'execution-engine' ? (
          <div className="ct-logged-container-wrap pt-20 pb-12 px-4 max-w-7xl mx-auto">
            <ExecutionEngine />
          </div>
        ) : activeTab === 'contribution-dossier' ? (
          <div className="ct-logged-container-wrap pt-20 pb-12 px-4 max-w-7xl mx-auto">
            <ContributionDossier />
          </div>
        ) : (
          <HomePage
            currentUser={currentUser}
            onJumpToWorkspace={handleJumpToWorkspace}
            onOpenProfile={() => setActiveTab('profile')}
            onNavigateToAllWorkspaces={() => setActiveTab('workspaces-directory')}
          />
        )
      ) : (
        <>
          {/* LANDING PAGE HERO (ONLY SHOWN FOR LOGGED-OUT VISITORS) */}
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
      )}

      {/* INTERACTIVE TERMINAL MODAL */}
      <TerminalModal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        terminalLogs={terminalLogs}
        terminalInput={terminalInput}
        setTerminalInput={setTerminalInput}
        handleTerminalSubmit={handleTerminalSubmit}
      />
    </div>
  );
}

export default App;
