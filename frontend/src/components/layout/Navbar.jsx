import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Layers, 
  FileCode, 
  Cpu, 
  ShieldCheck, 
  BookOpen, 
  Menu, 
  X, 
  LogIn, 
  Sparkles, 
  ArrowRight, 
  LogOut, 
  LayoutDashboard, 
  Bell
} from 'lucide-react';

export const Navbar = ({ isLoggedIn, currentUser, onLogin, onSignUp, onLogout, activeTab, setActiveTab }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = isLoggedIn ? [
    { id: 'home', label: 'Home', icon: LayoutDashboard },
    { id: 'modular-workspace', label: 'Workspace', icon: FileCode },
    { id: 'execution-engine', label: 'Code Runner', icon: Cpu },
    { id: 'contribution-dossier', label: 'Telemetry', icon: ShieldCheck },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ] : [
    { id: 'modules-grid', label: 'Features', icon: Layers },
    { id: 'modular-workspace', label: 'Workspace', icon: FileCode },
    { id: 'execution-engine', label: 'Code Runner', icon: Cpu },
    { id: 'contribution-dossier', label: 'Telemetry', icon: ShieldCheck },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ];

  const handleNavClick = (id) => {
    if (setActiveTab) setActiveTab(id);
    if (onNavigate) onNavigate(id);
    if (id === 'docs') {
      const footer = document.querySelector('footer');
      if (footer) footer.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBrandClick = () => {
    if (setActiveTab) setActiveTab(isLoggedIn ? 'home' : 'modules-grid');
    if (onNavigate) onNavigate(isLoggedIn ? 'home' : 'landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className={`ct-navbar ${scrolled ? 'ct-navbar-scrolled' : ''}`}>
      <div className="ct-nav-container">
        
        {/* Brand / Logo */}
        <div className="ct-brand" onClick={handleBrandClick}>
          <div className="ct-logo-icon">
            <Terminal size={18} />
          </div>
          <div className="ct-brand-text">
            <span className="ct-brand-title">Code<span className="ct-purple-text">Trail</span></span>
            <span className="ct-brand-version">v1.0.0</span>
          </div>
        </div>

        {/* Center Navigation Links Menu */}
        <nav className="ct-nav-menu">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`ct-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={14} className="ct-nav-icon" />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Action Controls */}
        <div className="ct-nav-actions">
          {isLoggedIn ? (
            <div className="ct-user-logged-wrap">
              <div className="ct-nav-user-badge">
                <span className="ct-nav-avatar">
                  {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                </span>
                <span className="ct-nav-username">
                  {currentUser?.name || 'User'}
                </span>
              </div>
              <button 
                className="ct-btn-logout"
                onClick={onLogout}
                title="Logout"
              >
                <LogOut size={13} className="ct-logout-icon" />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <>
              <button 
                className="ct-btn-login"
                onClick={onLogin}
              >
                <LogIn size={13} className="ct-login-icon" />
                <span>Login</span>
              </button>

              <button 
                className="ct-btn-signup"
                onClick={onSignUp}
              >
                <Sparkles size={13} className="ct-sparkle-icon" />
                <span>Get Started</span>
                <ArrowRight size={13} className="ct-arrow-icon" />
              </button>
            </>
          )}

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
                  handleNavClick(link.id);
                  setMobileMenuOpen(false);
                }}
                className={`ct-mobile-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{link.label}</span>
              </button>
            );
          })}

          <div className="ct-mobile-actions">
            {isLoggedIn ? (
              <button 
                className="ct-btn-logout"
                onClick={() => {
                  if (onLogout) onLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            ) : (
              <>
                <button 
                  className="ct-btn-login"
                  onClick={() => {
                    if (onLogin) onLogin();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogIn size={14} />
                  <span>Login</span>
                </button>
                <button 
                  className="ct-btn-signup"
                  onClick={() => {
                    if (onSignUp) onSignUp();
                    setMobileMenuOpen(false);
                  }}
                >
                  <Sparkles size={14} />
                  <span>Get Started</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
