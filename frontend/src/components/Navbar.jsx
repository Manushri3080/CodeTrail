import React, { useState, useEffect } from 'react';
import { Terminal, ShieldCheck, Activity, Cpu, Layers, BookOpen, Menu, X, ChevronRight } from 'lucide-react';

const Navbar = ({ onOpenTerminal, activeTab, setActiveTab }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { id: 'command-center', label: 'Command Center', icon: Cpu },
    { id: 'modular-workspace', label: 'Modular Workspace', icon: Layers },
    { id: 'performance-intel', label: 'Performance Intel', icon: Activity },
    { id: 'mission-control', label: 'Mission Control', icon: ShieldCheck },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ];

  return (
    <header className={`ct-navbar ${scrolled ? 'ct-navbar-scrolled' : ''}`}>
      <div className="ct-nav-container">
        
        {/* Brand / Logo */}
        <div className="ct-brand" onClick={() => setActiveTab && setActiveTab('command-center')}>
          <div className="ct-logo-icon">
            <Terminal size={18} />
          </div>
          <div className="ct-brand-text">
            <span className="ct-brand-title">Code<span className="ct-purple-text">Trail</span></span>
            <span className="ct-brand-version">v1.0.0</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="ct-nav-menu">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab && setActiveTab(link.id)}
                className={`ct-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={14} className="ct-nav-icon" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Terminal Access CTA */}
        <div className="ct-nav-actions">
          {/* Terminal Access Button */}
          <button 
            className="ct-btn-terminal"
            onClick={onOpenTerminal}
          >
            <Terminal size={15} />
            <span>TERMINAL ACCESS</span>
            <ChevronRight size={14} />
          </button>

          {/* Mobile Menu Toggle */}
          <button 
            className="ct-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="ct-mobile-menu">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  if (setActiveTab) setActiveTab(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`ct-mobile-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </button>
            );
          })}
          <button 
            className="ct-mobile-terminal-btn"
            onClick={() => {
              if (onOpenTerminal) onOpenTerminal();
              setMobileMenuOpen(false);
            }}
          >
            <Terminal size={16} />
            <span>TERMINAL ACCESS</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;
