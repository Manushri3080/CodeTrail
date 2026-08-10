import React, { useState } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HeroSection from './modules/landing/HeroSection';
import ModulesGrid from './modules/landing/ModulesGrid';
import ModularWorkspace from './modules/workspace/ModularWorkspace';
import ExecutionEngine from './modules/execution/ExecutionEngine';
import ContributionDossier from './modules/telemetry/ContributionDossier';
import TerminalModal from './modules/terminal/TerminalModal';
import { INITIAL_TERMINAL_LOGS, processKernelCommand } from './modules/terminal/terminalKernel';

function App() {
  const [activeTab, setActiveTab] = useState('modules-grid');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
    alert('Logged in as Alex Rivers! Active session created.');
  };

  const handleSignUp = () => {
    setIsLoggedIn(true);
    alert('Account created! Welcome to CodeTrail.');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    alert('Logged out successfully.');
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
      />

      {/* 2. HERO LANDING BANNER WITH EMBEDDED TERMINAL */}
      <HeroSection 
        onOpenTerminal={() => setTerminalOpen(true)} 
      />

      {/* 3. COLLABORATIVE WORKSPACE DOMAIN MODULE */}
      <ModularWorkspace />

      {/* 4. CODE EXECUTION SANDBOX DOMAIN MODULE */}
      <ExecutionEngine />

      {/* 5. CONTRIBUTION TELEMETRY DOMAIN MODULE */}
      <ContributionDossier />

      {/* 6. CORE PLATFORM MODULES BREAKDOWN */}
      <ModulesGrid />

      {/* 7. FOOTER */}
      <Footer />

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
