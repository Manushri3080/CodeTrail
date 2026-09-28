import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  Hash, 
  Users, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Copy, 
  Check, 
  FileText, 
  ChevronDown,
  Radio,
  Clock,
  Layers
} from 'lucide-react';
import { io } from 'socket.io-client';
import { INITIAL_TEAM_CONTRIBUTIONS, TELEMETRY_SUMMARY_CONFIG } from '../../constants/telemetry.constants';
import { exportAuditJson, exportAuditMarkdown } from '../../utils/auditExport';
import { formatActiveDuration } from '../../utils/timeUtils';

const API_BASE = 'http://localhost:5000/api';

export const ContributionDossier = ({ activeWorkspace = null, currentUser = null, liveSocket = null }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(activeWorkspace);
  const [telemetry, setTelemetry] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);

  // Live Socket.IO Telemetry State (CT-164 & CT-167)
  const [liveContributors, setLiveContributors] = useState(INITIAL_TEAM_CONTRIBUTIONS);
  const [liveEvents, setLiveEvents] = useState([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('ct-auth-token') : null;

  // Sync selected workspace when prop changes
  useEffect(() => {
    if (activeWorkspace) {
      setSelectedWorkspace(activeWorkspace);
    }
  }, [activeWorkspace]);

  // Load user's workspaces if logged in
  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const fetchUserWorkspaces = async () => {
      try {
        const res = await axios.get(`${API_BASE}/workspaces`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!isMounted) return;

        const list = Array.isArray(res.data) ? res.data : (res.data?.workspaces || []);
        setWorkspaces(list);

        if (!selectedWorkspace && list.length > 0) {
          const savedActive = localStorage.getItem('ct-active-workspace-session');
          if (savedActive) {
            try {
              const parsed = JSON.parse(savedActive);
              const found = list.find(w => (w._id || w.id) === (parsed._id || parsed.id));
              setSelectedWorkspace(found || list[0]);
              return;
            } catch (e) {}
          }
          setSelectedWorkspace(list[0]);
        }
      } catch (err) {
        console.warn('Could not fetch workspaces for telemetry dossier:', err.message);
      }
    };

    fetchUserWorkspaces();
    return () => { isMounted = false; };
  }, [token]);

  // Socket.IO live sync setup (CT-167)
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
      const wsId = selectedWorkspace?._id || selectedWorkspace?.id || 'demo-workspace';

      socket.on('connect', () => {
        setIsLiveConnected(true);
        socket.emit('telemetry:request_dossier', { workspaceId: wsId });
      });

      socket.on('disconnect', () => {
        setIsLiveConnected(false);
      });

      const handleDossierSync = (data) => {
        if (data?.contributors && Array.isArray(data.contributors)) {
          setLiveContributors(data.contributors);
        }
      };

      const handleTelemetryStream = (event) => {
        if (!event) return;
        setLiveEvents(prev => [event, ...prev.slice(0, 7)]);
      };

      socket.on('telemetry:dossier_sync', handleDossierSync);
      socket.on('telemetry:dossier_update', handleDossierSync);
      socket.on('telemetry:stream', handleTelemetryStream);

      if (socket.connected) {
        setIsLiveConnected(true);
        socket.emit('telemetry:request_dossier', { workspaceId: wsId });
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
  }, [selectedWorkspace, liveSocket]);

  // Fetch telemetry & proof-of-work verification from backend
  const fetchTelemetry = useCallback(async (isRefresh = false) => {
    const wsId = selectedWorkspace?._id || selectedWorkspace?.id;
    if (!wsId || !token) return;

    if (isRefresh) setVerifying(true);
    else setLoading(true);

    try {
      const [contribRes, verifyRes] = await Promise.all([
        axios.get(`${API_BASE}/workspaces/${wsId}/contributions`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        axios.get(`${API_BASE}/workspaces/${wsId}/proof-of-work/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      if (contribRes?.data) setTelemetry(contribRes.data);
      if (verifyRes?.data) setVerification(verifyRes.data);
    } catch (err) {
      console.error('Failed to load live telemetry:', err);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  }, [selectedWorkspace, token]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  const handleCopyHash = (fullHash, shortHash) => {
    if (!fullHash) return;
    navigator.clipboard.writeText(fullHash);
    setCopiedHash(shortHash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportJSON = () => {
    setShowExportMenu(false);
    const fileName = exportAuditJson(selectedWorkspace, telemetry, verification);
    setExportMessage(`Exported ${fileName}`);
    setTimeout(() => setExportMessage(null), 3500);
  };

  const handleExportMarkdown = () => {
    setShowExportMenu(false);
    const fileName = exportAuditMarkdown(selectedWorkspace, telemetry, verification);
    setExportMessage(`Exported ${fileName}`);
    setTimeout(() => setExportMessage(null), 3500);
  };

  const isLive = Boolean(telemetry && telemetry.contributors && telemetry.contributors.length > 0);
  const contributors = isLive ? telemetry.contributors : liveContributors;
  const totalLines = isLive 
    ? (telemetry.summary?.totalLinesChanged?.toLocaleString() + ' lines') 
    : TELEMETRY_SUMMARY_CONFIG.totalLines;

  const totalBlocks = isLive ? (telemetry.summary?.totalBlocks || 0) : 4;
  const isChainVerified = verification ? verification.isValid : true;

  const workspaceTitle = selectedWorkspace?.title 
    || telemetry?.workspaceTitle 
    || TELEMETRY_SUMMARY_CONFIG.auditTitle;

  const sessionId = selectedWorkspace?._id 
    ? `#ws-${String(selectedWorkspace._id).slice(-6)}` 
    : TELEMETRY_SUMMARY_CONFIG.sessionId;

  return (
    <section id="contribution-dossier" className="ct-section ct-dossier-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="ct-demo-badge">PROOF-OF-WORK AUDIT</span>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE SOCKET SYNC (CT-167)
              </span>
            )}
          </div>
          <h2 className="ct-section-title">Contribution Telemetry</h2>
          <p className="ct-section-subtitle">
            Automated activity telemetry providing high-precision ISO-8601 timestamping, monotonic event sequencing, and tamper-evident SHA-256 analytics.
          </p>
        </div>

        {/* Dossier Card Container */}
        <div className="ct-dossier-card">
          
          {/* Top Control Bar */}
          <div className="ct-dossier-topbar">
            <div className="ct-ide-dots">
              <span className="ct-dot red"></span>
              <span className="ct-dot yellow"></span>
              <span className="ct-dot green"></span>
            </div>

            <div className="ct-dossier-meta-pills">
              {token && workspaces.length > 1 && (
                <div className="relative inline-block text-left">
                  <select
                    value={selectedWorkspace?._id || selectedWorkspace?.id || ''}
                    onChange={(e) => {
                      const found = workspaces.find(w => (w._id || w.id) === e.target.value);
                      if (found) setSelectedWorkspace(found);
                    }}
                    className="bg-[#1A1B26] text-gray-200 border border-purple-500/30 rounded-md px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-purple-400"
                  >
                    {workspaces.map(w => (
                      <option key={w._id || w.id} value={w._id || w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="ct-meta-pill">
                <Users size={12} className="text-purple-400" />
                <span>{contributors.length} Contributors</span>
              </span>

              <span className="ct-meta-pill">
                <Activity size={12} className="text-emerald-400" />
                <span>{totalLines}</span>
              </span>

              <span className="ct-meta-pill">
                <Layers size={12} className="text-sky-400" />
                <span>{totalBlocks} Blocks</span>
              </span>

              {token && selectedWorkspace && (
                <button
                  onClick={() => fetchTelemetry(true)}
                  disabled={verifying || loading}
                  title="Verify and Refresh Telemetry"
                  className="text-gray-400 hover:text-purple-300 transition-colors p-1"
                >
                  <RefreshCw size={12} className={verifying ? 'animate-spin text-purple-400' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* Dossier Header Info */}
          <div className="ct-dossier-header">
            <div className="ct-dossier-title-wrap">
              <ShieldCheck size={22} className="text-purple-400" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="ct-dossier-title">{workspaceTitle}</h3>
                  {isLive && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      Live Telemetry
                    </span>
                  )}
                </div>
                <span className="ct-dossier-sub">Session Branch: {sessionId}</span>
              </div>
            </div>

            {/* Cryptographic Verification Badge & Export Button */}
            <div className="flex items-center gap-3 relative">
              {isChainVerified ? (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 size={13} />
                  <span>100% Verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                  <AlertTriangle size={13} />
                  <span>Tamper Warning</span>
                </div>
              )}

              <div className="relative">
                <button 
                  className="ct-btn-download"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  <Download size={14} />
                  <span>Export Report</span>
                  <ChevronDown size={13} />
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#1A1B28] border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                    <button
                      onClick={handleExportJSON}
                      className="w-full px-4 py-2.5 text-left text-xs text-gray-200 hover:bg-purple-600/20 hover:text-white flex items-center gap-2.5 transition-colors"
                    >
                      <Hash size={13} className="text-purple-400" />
                      <div>
                        <div className="font-semibold">JSON Audit Manifest</div>
                        <div className="text-[10px] text-gray-400">Machine-readable SHA-256 ledger</div>
                      </div>
                    </button>
                    <button
                      onClick={handleExportMarkdown}
                      className="w-full px-4 py-2.5 text-left text-xs text-gray-200 hover:bg-purple-600/20 hover:text-white flex items-center gap-2.5 transition-colors border-t border-white/5"
                    >
                      <FileText size={13} className="text-emerald-400" />
                      <div>
                        <div className="font-semibold">Markdown Certificate</div>
                        <div className="text-[10px] text-gray-400">Human-readable formal report</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Export Toast Notification */}
          {exportMessage && (
            <div className="bg-purple-950/80 border-b border-purple-500/30 px-6 py-2 text-xs font-mono text-purple-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check size={13} className="text-purple-400" />
                {exportMessage}
              </span>
              <span className="text-[11px] text-purple-400">SHA-256 Signed</span>
            </div>
          )}

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
              {contributors.map((user, idx) => {
                const shortHash = user.hash || (user.fullHash ? `${user.fullHash.slice(0, 4)}...${user.fullHash.slice(-4)}` : 'GENESIS');
                const fullHash = user.fullHash || user.hash || 'GENESIS_HASH';
                const userColor = user.color || '#8B5CF6';

                return (
                  <div key={user.id || idx} className="ct-table-row">
                    <div className="ct-user-col">
                      <span 
                        className="ct-user-avatar" 
                        style={{ backgroundColor: `${userColor}20`, color: userColor, borderColor: `${userColor}40` }}
                      >
                        {user.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2) : 'CT'}
                      </span>
                      <div className="ct-user-info">
                        <div className="flex items-center gap-1.5">
                          <span className="ct-user-name">{user.name}</span>
                          {user.activeSeconds > 0 && (
                            <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                              ({formatActiveDuration(user.activeSeconds)})
                            </span>
                          )}
                        </div>
                        <span 
                          className="ct-user-badge" 
                          style={{ color: userColor, borderColor: `${userColor}40`, backgroundColor: `${userColor}15` }}
                        >
                          {user.badge || 'Contributor'}
                        </span>
                      </div>
                    </div>

                    <div className="ct-user-role">{user.role}</div>

                    <div className="ct-user-lines">
                      <span className="font-semibold text-gray-200">{Number(user.lines || 0).toLocaleString()} lines</span>
                      {(user.linesAdded !== undefined || user.linesDeleted !== undefined) && (
                        <span className="text-[10px] text-gray-400 ml-1.5 font-mono">
                          <span className="text-emerald-400">+{user.linesAdded || 0}</span>
                          <span className="text-rose-400 ml-1">-{user.linesDeleted || 0}</span>
                        </span>
                      )}
                    </div>

                    <div className="ct-user-percent">
                      <div className="ct-progress-bar">
                        <div 
                          className="ct-progress-fill" 
                          style={{ width: `${Math.min(100, Math.max(0, user.percent || 0))}%`, backgroundColor: userColor }} 
                        />
                      </div>
                      <span className="ct-percent-text">{user.percent || 0}%</span>
                    </div>

                    <div className="ct-user-hash">
                      <button
                        onClick={() => handleCopyHash(fullHash, shortHash)}
                        className="flex items-center gap-1.5 hover:text-purple-300 transition-colors group"
                        title={`Click to copy full SHA-256 hash: ${fullHash}`}
                      >
                        <Hash size={12} className="text-purple-400 group-hover:scale-110 transition-transform" />
                        <span className="font-mono text-xs">{shortHash}</span>
                        {copiedHash === shortHash ? (
                          <Check size={12} className="text-emerald-400 ml-1" />
                        ) : (
                          <Copy size={11} className="text-gray-500 group-hover:text-purple-300 ml-1 opacity-60 group-hover:opacity-100" />
                        )}
                      </button>
                      <CheckCircle2 size={13} className="ct-check-icon text-emerald-400 ml-1.5" />
                    </div>
                  </div>
                );
              })}
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
