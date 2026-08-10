import React from 'react';
import { Terminal, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer id="docs" className="ct-footer">
      <div className="ct-container ct-footer-container">
        
        {/* Sleek Minimal Top Split */}
        <div className="ct-footer-top">
          
          {/* Left Column: Brand & Tagline */}
          <div className="ct-footer-brand">
            <div className="ct-brand-text">
              <div className="ct-logo-icon">
                <Terminal size={18} />
              </div>
              <span className="ct-brand-title">Code<span className="ct-purple-text">Trail</span></span>
            </div>
            <p className="ct-footer-tagline">
              Real-time collaborative editing and cloud code execution platform.
            </p>
          </div>

          {/* Right Columns: 3 Minimal Links Columns */}
          <div className="ct-footer-links-group">
            <div className="ct-footer-col">
              <h4>Product</h4>
              <a href="#modular-workspace">Workspace</a>
              <a href="#execution-engine">Code Runner</a>
              <a href="#contribution-dossier">Telemetry</a>
            </div>

            <div className="ct-footer-col">
              <h4>Resources</h4>
              <a href="#docs">Documentation</a>
              <a href="#api">API Reference</a>
              <a href="#status">System Status</a>
            </div>

            <div className="ct-footer-col">
              <h4>Legal</h4>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#contact">Contact</a>
            </div>
          </div>

        </div>

        <div className="ct-footer-divider" />

        {/* Ultra-Minimal Bottom Bar */}
        <div className="ct-footer-bottom">
          <div className="ct-copyright">
            © 2026 CodeTrail. All rights reserved.
          </div>

          <div className="ct-made-with">
            <span>Crafted with</span>
            <Heart size={13} className="ct-heart-icon text-rose-500 fill-rose-500" />
            <span>for engineering teams</span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
