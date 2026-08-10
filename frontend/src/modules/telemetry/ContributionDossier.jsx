import React, { useState } from 'react';
import { ShieldCheck, Download, CheckCircle2, Hash, Users, Activity } from 'lucide-react';
import { INITIAL_TEAM_CONTRIBUTIONS, TELEMETRY_SUMMARY_CONFIG } from '../../constants/telemetry.constants';

export const ContributionDossier = () => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('CodeTrail Activity Summary Report generated!');
    }, 1200);
  };

  return (
    <section id="contribution-dossier" className="ct-section ct-dossier-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">ACTIVITY TRACKING</span>
          <h2 className="ct-section-title">Contribution Telemetry</h2>
          <p className="ct-section-subtitle">
            Automated activity telemetry providing clear insights into project collaboration in real time.
          </p>
        </div>

        {/* Dossier Card Container */}
        <div className="ct-dossier-card">
          
          {/* Mac IDE Header Control Bar */}
          <div className="ct-dossier-topbar">
            <div className="ct-ide-dots">
              <span className="ct-dot red"></span>
              <span className="ct-dot yellow"></span>
              <span className="ct-dot green"></span>
            </div>

            <div className="ct-dossier-meta-pills">
              <span className="ct-meta-pill">
                <Users size={12} className="text-purple-400" />
                <span>4 Active Contributors</span>
              </span>
              <span className="ct-meta-pill">
                <Activity size={12} className="text-emerald-400" />
                <span>{TELEMETRY_SUMMARY_CONFIG.totalLines}</span>
              </span>
            </div>
          </div>

          <div className="ct-dossier-header">
            <div className="ct-dossier-title-wrap">
              <ShieldCheck size={20} className="text-purple-400" />
              <div>
                <h3 className="ct-dossier-title">{TELEMETRY_SUMMARY_CONFIG.auditTitle}</h3>
                <span className="ct-dossier-sub">Session Branch: {TELEMETRY_SUMMARY_CONFIG.sessionId}</span>
              </div>
            </div>

            <button 
              className="ct-btn-download"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              <Download size={14} />
              <span>{downloading ? 'Generating Report...' : 'Export Report'}</span>
            </button>
          </div>

          {/* Team Contribution Table */}
          <div className="ct-dossier-table">
            <div className="ct-table-head">
              <span>CONTRIBUTOR</span>
              <span>RESPONSIBILITY</span>
              <span>LINES SYNCED</span>
              <span>PARTICIPATION</span>
              <span>VERIFICATION HASH</span>
            </div>

            <div className="ct-table-body">
              {INITIAL_TEAM_CONTRIBUTIONS.map((user, idx) => (
                <div key={idx} className="ct-table-row">
                  <div className="ct-user-col">
                    <span 
                      className="ct-user-avatar" 
                      style={{ backgroundColor: `${user.color}20`, color: user.color, borderColor: `${user.color}40` }}
                    >
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </span>
                    <div className="ct-user-info">
                      <span className="ct-user-name">{user.name}</span>
                      <span className="ct-user-badge" style={{ color: user.color, borderColor: `${user.color}40`, backgroundColor: `${user.color}15` }}>
                        {user.badge}
                      </span>
                    </div>
                  </div>

                  <div className="ct-user-role">{user.role}</div>

                  <div className="ct-user-lines">{user.lines.toLocaleString()} lines</div>

                  <div className="ct-user-percent">
                    <div className="ct-progress-bar">
                      <div 
                        className="ct-progress-fill" 
                        style={{ width: `${user.percent}%`, backgroundColor: user.color }} 
                      />
                    </div>
                    <span className="ct-percent-text">{user.percent}%</span>
                  </div>

                  <div className="ct-user-hash">
                    <Hash size={12} className="text-purple-400" />
                    <span>{user.hash}</span>
                    <CheckCircle2 size={13} className="ct-check-icon" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ContributionDossier;
