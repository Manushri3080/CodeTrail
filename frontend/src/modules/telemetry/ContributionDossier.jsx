import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, CheckCircle2, Hash, Users, Activity, Radio, Clock, ArrowUpRight } from 'lucide-react';
import { io } from 'socket.io-client';
import { INITIAL_TEAM_CONTRIBUTIONS, TELEMETRY_SUMMARY_CONFIG } from '../../constants/telemetry.constants';
import { formatActiveDuration, getRelativeTime } from '../../utils/timeUtils';

export const ContributionDossier = ({ workspaceId = 'demo-workspace', liveSocket = null }) => {
  const [downloading, setDownloading] = useState(false);
  const [contributors, setContributors] = useState(INITIAL_TEAM_CONTRIBUTIONS);
  const [summary, setSummary] = useState(TELEMETRY_SUMMARY_CONFIG);
  const [liveEvents, setLiveEvents] = useState([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastActionTime, setLastActionTime] = useState(null);

  useEffect(() => {
    let socket = liveSocket;
    let localSocketCreated = false;

    if (!socket) {
      try {
        socket = io('http://localhost:5000', {
          transports: ['websocket', 'polling'],
          reconnection: true
        });
        localSocketCreated = true;
      } catch (e) {
        console.warn('Socket connection unavailable for dossier:', e);
      }
    }

    if (socket) {
      socket.on('connect', () => {
        setIsLiveConnected(true);
        socket.emit('telemetry:request_dossier', { workspaceId });
      });

      socket.on('disconnect', () => {
        setIsLiveConnected(false);
      });

      // CT-167: Listen for live dossier sync over Socket.IO
      const handleDossierSync = (data) => {
        if (data?.contributors && Array.isArray(data.contributors)) {
          setContributors(data.contributors);
        }
        if (data?.summary) {
          setSummary(prev => ({ ...prev, ...data.summary }));
        }
      };

      // CT-164: Listen for live intercepted activity stream with high-precision timestamps & monotonic counters
      const handleTelemetryStream = (event) => {
        if (!event) return;
        setLastActionTime(Date.now());
        setLiveEvents(prev => [event, ...prev.slice(0, 7)]);
      };

      socket.on('telemetry:dossier_sync', handleDossierSync);
      socket.on('telemetry:dossier_update', handleDossierSync);
      socket.on('telemetry:stream', handleTelemetryStream);

      // Initial request
      if (socket.connected) {
        setIsLiveConnected(true);
        socket.emit('telemetry:request_dossier', { workspaceId });
      }

      return () => {
        socket.off('telemetry:dossier_sync', handleDossierSync);
        socket.off('telemetry:dossier_update', handleDossierSync);
        socket.off('telemetry:stream', handleTelemetryStream);
        if (localSocketCreated) {
          socket.disconnect();
        }
      };
    }
  }, [workspaceId, liveSocket]);

  const handleDownloadPDF = () => {
    setDownloading(true);
    setTimeout(() => {
      setDownloading(false);
      alert('CodeTrail Activity Telemetry Summary Report generated successfully!');
    }, 1200);
  };

  return (
    <section id="contribution-dossier" className="ct-section ct-dossier-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="ct-demo-badge">ACTIVITY TRACKING</span>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE SOCKET SYNC (CT-167)
              </span>
            )}
          </div>
          <h2 className="ct-section-title">Contribution Telemetry</h2>
          <p className="ct-section-subtitle">
            Automated activity telemetry providing high-precision ISO-8601 timestamping, monotonic event sequencing, and live collaborative sync.
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
                <span>{contributors.length} Active Contributors</span>
              </span>
              <span className="ct-meta-pill">
                <Activity size={12} className="text-emerald-400" />
                <span>{summary.totalLines || `${contributors.reduce((a, b) => a + (b.lines || 0), 0).toLocaleString()} lines`}</span>
              </span>
              {summary.currentSequence && (
                <span className="ct-meta-pill hidden sm:inline-flex">
                  <Hash size={12} className="text-cyan-400" />
                  <span className="font-mono text-cyan-300">Seq #{summary.currentSequence}</span>
                </span>
              )}
            </div>
          </div>

          <div className="ct-dossier-header">
            <div className="ct-dossier-title-wrap">
              <ShieldCheck size={20} className="text-purple-400" />
              <div>
                <h3 className="ct-dossier-title">{summary.auditTitle}</h3>
                <span className="ct-dossier-sub">Session Branch: {summary.sessionId}</span>
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
              {contributors.map((user, idx) => (
                <div key={user.id || idx} className="ct-table-row group hover:bg-white/[0.02] transition-colors">
                  <div className="ct-user-col">
                    <span 
                      className="ct-user-avatar" 
                      style={{ backgroundColor: `${user.color || '#EC4899'}20`, color: user.color || '#EC4899', borderColor: `${user.color || '#EC4899'}40` }}
                    >
                      {(user.name || 'Dev').split(' ').map(n => n[0]).join('')}
                    </span>
                    <div className="ct-user-info">
                      <div className="flex items-center gap-1.5">
                        <span className="ct-user-name">{user.name}</span>
                        {user.activeSeconds > 0 && (
                          <span className="text-[10px] text-gray-400 font-mono hidden md:inline" title="Active Contribution Duration">
                            ({formatActiveDuration(user.activeSeconds)})
                          </span>
                        )}
                      </div>
                      <span className="ct-user-badge" style={{ color: user.color || '#EC4899', borderColor: `${user.color || '#EC4899'}40`, backgroundColor: `${user.color || '#EC4899'}15` }}>
                        {user.badge || 'Contributor'}
                      </span>
                    </div>
                  </div>

                  <div className="ct-user-role">{user.role}</div>

                  <div className="ct-user-lines">
                    <span className="font-mono text-purple-300">{(user.lines || 0).toLocaleString()}</span> lines
                  </div>

                  <div className="ct-user-percent">
                    <div className="ct-progress-bar">
                      <div 
                        className="ct-progress-fill transition-all duration-500 ease-out" 
                        style={{ width: `${user.percent || 0}%`, backgroundColor: user.color || '#EC4899' }} 
                      />
                    </div>
                    <span className="ct-percent-text">{user.percent || 0}%</span>
                  </div>

                  <div className="ct-user-hash">
                    <Hash size={12} className="text-purple-400" />
                    <span className="font-mono">{user.hash || '8a9f...c4e1'}</span>
                    <CheckCircle2 size={13} className="ct-check-icon" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Action Stream Ticker (CT-164: Timestamp Recording & Monotonic Sequencing) */}
          {liveEvents.length > 0 && (
            <div className="border-t border-purple-500/10 bg-black/40 px-5 py-3 rounded-b-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                  <Radio size={13} className="text-emerald-400 animate-pulse" />
                  <span>Real-time Intercepted Action Telemetry</span>
                  <span className="text-[10px] text-gray-500 font-mono">ISO-8601 High-Precision Stream</span>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">
                  {liveEvents.length} events buffered
                </span>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {liveEvents.map((evt, eIdx) => (
                  <div key={evt.eventId || eIdx} className="flex items-center justify-between text-[11px] font-mono bg-white/[0.02] border border-white/5 rounded px-2.5 py-1 text-gray-300">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-bold">Seq #{evt.seq}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-500/20 text-purple-300 uppercase font-sans font-semibold">
                        {evt.actionType}
                      </span>
                      <span className="text-gray-200 font-sans">{evt.user?.name || 'Developer'}</span>
                      {evt.fileId && <span className="text-gray-400">[{evt.fileId}]</span>}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <Clock size={10} className="text-gray-500" />
                      <span>{evt.timestamp}</span>
                      <span className="text-purple-400 text-[9px]">#{evt.verificationHash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};

export default ContributionDossier;
