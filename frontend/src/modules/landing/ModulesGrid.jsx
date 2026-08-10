import React from 'react';
import { CORE_MODULES } from '../../constants/modules.constants';

export const ModulesGrid = () => {
  return (
    <section id="modules-grid" className="ct-section ct-modules-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">PLATFORM CAPABILITIES</span>
          <h2 className="ct-section-title">Everything Your Team Needs to Build Faster</h2>
          <p className="ct-section-subtitle">
            CodeTrail powers real-time collaboration, instant cloud execution, and comprehensive activity analytics in one unified platform.
          </p>
        </div>

        {/* 6 Feature Card Grid (3 Columns) */}
        <div className="ct-modules-grid">
          {CORE_MODULES.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div key={idx} className="ct-module-card">
                <div className="ct-module-top">
                  <span className="ct-module-num">{mod.num}</span>
                  <span className="ct-team-pill team-a">
                    {mod.category}
                  </span>
                </div>
                <div className="ct-module-icon-wrap">
                  <Icon size={20} />
                </div>
                <h3 className="ct-module-title">{mod.title}</h3>
                <p className="ct-module-desc">{mod.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default ModulesGrid;
