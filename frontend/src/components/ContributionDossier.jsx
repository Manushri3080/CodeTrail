import React, { useState } from 'react';
import { ShieldCheck, Download, CheckCircle2, Hash } from 'lucide-react';

export function ContributionDossier() {
  const [downloading, setDownloading] = useState(false);

  const teamContributions = [
    { name: 'Lead Developer', role: 'Architecture & Core Engine', lines: 1420, percent: 32, hash: '8a9f...c4e1' },
    { name: 'Collaborator Alpha', role: 'Real-Time Synchronization', lines: 1180, percent: 26, hash: '3b2c...a9d0' },
    { name: 'Collaborator Beta', role: 'Execution & Telemetry', lines: 980, percent: 22, hash: '5e7f...b1a2' },
    { name: 'Developer Gamma', role: 'Analytics & Reporting', lines: 890, percent: 20, hash: '9c4d...e8f3' }
  ];

  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('CodeTrail Contribution Audit Report generated!');
    }, 1200);
  };

  return (
    <section id="contribution-dossier" className="ct-section ct-dossier-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">PROOF-OF-WORK TRACKING</span>
          <h2 className="ct-section-title">Contribution Telemetry</h2>
          <p className="ct-section-subtitle">
            Automated tamper-evident activity history proving every participant's contribution in real time.
          </p>
        </div>

        {/* Dossier Card Container */}
        <div className="ct-dossier-card">
          
          <div className="ct-dossier-header">
            <div className="ct-dossier-title-wrap">
              <ShieldCheck size={20} className="text-purple-400" />
              <div>
                <h3 className="ct-dossier-title">Session Audit Summary</h3>
                <span className="ct-dossier-sub">Workspace Session: #ws-active-dev</span>
              </div>
            </div>

            <button 
              className="ct-btn-download"
              onClick={handleDownloadPDF}
              disabled={downloading}
            >
              <Download size={14} />
              <span>{downloading ? 'GENERATING PDF...' : 'EXPORT REPORT'}</span>
            </button>
          </div>

          {/* Team Contribution Table */}
          <div className="ct-dossier-table">
            <div className="ct-table-head">
              <span>CONTRIBUTOR</span>
              <span>ROLE</span>
              <span>LINES SYNCED</span>
              <span>PARTICIPATION %</span>
              <span>VERIFIED HASH</span>
            </div>

            <div className="ct-table-body">
              {teamContributions.map((user, idx) => (
                <div key={idx} className="ct-table-row">
                  <div className="ct-user-col">
                    <span className="ct-user-avatar">{user.name.charAt(0)}</span>
                    <span className="ct-user-name">{user.name}</span>
                  </div>
                  <div className="ct-user-role">{user.role}</div>
                  <div className="ct-user-lines">{user.lines.toLocaleString()} lines</div>
                  <div className="ct-user-percent">
                    <div className="ct-progress-bar">
                      <div className="ct-progress-fill" style={{ width: `${user.percent}%` }} />
                    </div>
                    <span className="ct-percent-text">{user.percent}%</span>
                  </div>
                  <div className="ct-user-hash">
                    <Hash size={12} className="text-emerald-400" />
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
}

export default ContributionDossier;
