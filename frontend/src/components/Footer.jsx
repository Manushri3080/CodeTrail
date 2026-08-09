import React from 'react';
import { Terminal, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="ct-footer">
      <div className="ct-container ct-footer-container">
        
        {/* Top Split */}
        <div className="ct-footer-top">
          {/* Brand */}
          <div className="ct-footer-brand">
            <div className="ct-brand-text">
              <div className="ct-logo-icon">
                <Terminal size={18} />
              </div>
              <span className="ct-brand-title">Code<span className="ct-purple-text">Trail</span></span>
            </div>
            <p className="ct-footer-tagline">
              Build Together. Prove Every Contribution.
            </p>
            <div className="ct-footer-tech-stack">
              <span className="ct-tech-tag">Real-Time Sync</span>
              <span className="ct-tech-tag">Cloud Execution</span>
              <span className="ct-tech-tag">Telemetry</span>
              <span className="ct-tech-tag">Audit Proof</span>
            </div>
          </div>

          {/* User-Facing Public Links */}
          <div className="ct-footer-links-group">
            <div className="ct-footer-col">
              <h4>Product</h4>
              <a href="#modular-workspace">Collaborative IDE</a>
              <a href="#execution-engine">Code Execution</a>
              <a href="#contribution-dossier">Activity Telemetry</a>
              <a href="#modules-grid">Platform Overview</a>
            </div>

            <div className="ct-footer-col">
              <h4>Resources</h4>
              <a href="#docs">Documentation</a>
              <a href="#api">API Reference</a>
              <a href="#guides">User Guides</a>
              <a href="#status">System Status</a>
            </div>

            <div className="ct-footer-col">
              <h4>Company</h4>
              <a href="#about">About CodeTrail</a>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#contact">Support</a>
            </div>
          </div>
        </div>

        <div className="ct-footer-divider" />

        {/* Bottom Split */}
        <div className="ct-footer-bottom">
          <div className="ct-copyright">
            © 2026 CodeTrail Platform. All rights reserved.
          </div>

          <div className="ct-footer-meta">
            <div className="ct-meta-pill">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>Tamper-Evident Audit Verification</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;
