import React, { useState } from 'react';
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

function App() {
  // Set default initial view to Home Dashboard
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalLogs, setTerminalLogs] = useState(INITIAL_TERMINAL_LOGS);

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
    setIsLoggedIn(true);
    setActiveTab('home');
  };

  const handleSignUp = () => {
    setIsLoggedIn(true);
    setActiveTab('home');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setActiveTab('modules-grid');
  };

  const handleJumpToWorkspace = () => {
    setActiveTab('modular-workspace');
    const el = document.getElementById('modular-workspace');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="ct-app">
      {/* 1. TOP NAVIGATION */}
      <Navbar 
        isLoggedIn={isLoggedIn}
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
        onLogout={handleLogout}
        onNavigate={(tab) => setActiveTab(tab)}
      />

      {/* 2. DYNAMIC MAIN VIEW MODE: HOME DASHBOARD (When Logged In) vs LANDING PAGE */}
      {isLoggedIn && activeTab === 'home' ? (
        <HomePage onJumpToWorkspace={handleJumpToWorkspace} />
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
