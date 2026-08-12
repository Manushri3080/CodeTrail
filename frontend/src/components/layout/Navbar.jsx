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
  LayoutDashboard
} from 'lucide-react';

export const Navbar = ({ isLoggedIn, currentUser, onLogin, onSignUp, onLogout, activeTab, setActiveTab, onNavigate }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className={`ct-navbar ${scrolled ? 'ct-navbar-scrolled' : ''} ${mobileMenuOpen ? 'ct-mobile-nav-open' : ''}`}>
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
                <div 
                  className="ct-nav-user-badge cursor-pointer hover:border-purple-500/50 transition-all"
                  onClick={() => {
                    if (setActiveTab) setActiveTab('profile');
                  }}
                  title="View Developer Profile"
                >
                  <span className="ct-nav-avatar">
                    {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </span>
                  <span className="ct-nav-username">
                    {currentUser?.name || 'User'}
                  </span>
                </div>
                <button
                  className="ct-btn-logout"
                  onClick={() => setShowLogoutModal(true)}
                  title="Logout"
                >
                  <LogOut size={13} className="ct-logout-icon" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div className="ct-desktop-actions">
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
              </div>
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
                <div className="ct-mobile-user-row">
                  <div className="ct-mobile-profile-card">
                    <div className="ct-avatar-wrap">
                      <span className="ct-nav-avatar font-mono">
                        {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
                      </span>
                      <span className="ct-avatar-status-dot" />
                    </div>
                    <div className="ct-user-details">
                      <span className="ct-user-name font-semibold text-white">{currentUser?.name || 'User'}</span>
                      <span className="ct-user-role font-mono text-xs text-muted block">{currentUser?.role || 'Learner'}</span>
                    </div>
                  </div>

                  <button
                    className="ct-btn-logout"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                  >
                    <LogOut size={14} />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="ct-mobile-auth-grid">
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
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Logout Confirmation Modal Popup Card */}
      {showLogoutModal && (
        <div className="ct-modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div className="ct-modal-card ct-logout-modal-card max-w-[400px]" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header py-3 px-5 border-b border-[var(--ct-border)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                  <LogOut size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Confirm Logout</h3>
                  <p className="text-[11px] text-gray-400">End developer session</p>
                </div>
              </div>
              <button className="ct-btn-close" onClick={() => setShowLogoutModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="ct-modal-body p-5 flex flex-col gap-4 text-center">
              <p className="text-xs text-gray-300 leading-relaxed">
                Are you sure you want to log out of your <strong className="text-white">CodeTrail</strong> account?
              </p>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  className="ct-btn-secondary text-xs py-2 px-4"
                  onClick={() => setShowLogoutModal(false)}
                >
                  <X size={13} />
                  <span>Cancel</span>
                </button>
                
                <button
                  type="button"
                  className="ct-btn-logout-confirm"
                  onClick={() => {
                    setShowLogoutModal(false);
                    if (onLogout) onLogout();
                  }}
                >
                  <LogOut size={14} />
                  <span>Log Out</span>
                </button>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
