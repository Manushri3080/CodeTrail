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
  Layers,
  Bug,
  RotateCcw,
  Eye,
  X,
  Lock,
  ShieldAlert,
  Sparkles
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
  const [auditReport, setAuditReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [copiedHash, setCopiedHash] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  
  // CT-166 Integrity Auditor & Tamper Simulation State
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationType, setSimulationType] = useState('modify_payload_lines');
  const [simulationTargetIdx, setSimulationTargetIdx] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationActive, setSimulationActive] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

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
      const [contribRes, verifyRes, auditRes] = await Promise.all([
        axios.get(`${API_BASE}/workspaces/${wsId}/contributions`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        axios.get(`${API_BASE}/workspaces/${wsId}/proof-of-work/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null),
        axios.get(`${API_BASE}/workspaces/${wsId}/activities/audit`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null)
      ]);

      if (contribRes?.data) setTelemetry(contribRes.data);
      if (verifyRes?.data) {
        setVerification(verifyRes.data);
        setSimulationActive(false);
      }
      if (auditRes?.data) setAuditReport(auditRes.data);
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

  // Trigger simulated tampering attack (CT-166 QA & Verification)
  const handleSimulateTamper = async () => {
    const wsId = selectedWorkspace?._id || selectedWorkspace?.id;
    if (!wsId) return;

    setIsSimulating(true);
    try {
      if (token) {
        const res = await axios.post(
          `${API_BASE}/workspaces/${wsId}/activities/simulate-tamper`,
          {
            tamperType: simulationType,
            targetIndex: Number(simulationTargetIdx) || 1
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data?.tamperedAuditReport) {
          setVerification(res.data.tamperedAuditReport);
          setSimulationResult(res.data.simulation);
          setSimulationActive(true);
          setShowSimulationModal(false);
        }
      } else {
        // Local simulation fallback for demo mode
        const mockTamperedVerification = {
          isValid: false,
          status: 'Tamper Warning',
          statusColor: 'rose',
          totalBlocks: 4,
          verifiedBlocksCount: simulationTargetIdx,
          tamperedBlocksCount: 4 - simulationTargetIdx,
          integrityRatio: Math.round((simulationTargetIdx / 4) * 100),
          chainFingerprint: '9f82c481b7e12f9a0c71a39487b3281048b0a9c218491823901bce4710294871',
          auditDurationMs: 1,
          message: `Tamper detected at block #${Number(simulationTargetIdx) + 1}: Cryptographic signature mismatch. Payload content altered.`,
          tamperDiagnostics: {
            tamperedIndex: simulationTargetIdx,
            blockSequence: Number(simulationTargetIdx) + 1,
            blockId: `act-block-${Number(simulationTargetIdx) + 1}`,
            tamperType: simulationType === 'break_pointer' ? 'CHAIN_LINK_BROKEN' : (simulationType === 'alter_sequence' ? 'SEQUENCE_GAP' : 'PAYLOAD_ALTERED'),
            expected: '8f3b92a104c9...',
            actual: '492e817a99b1...',
            affectedUser: 'Monar Lead (Admin)',
            action: 'code_edit',
            details: 'Unauthorized modification of linesAdded parameter without re-signing the SHA-256 block digest.',
            severity: 'CRITICAL',
            remediation: 'Audit write logs in ActivityLog collection and revert corrupted sequence block.'
          }
        };
        setVerification(mockTamperedVerification);
        setSimulationActive(true);
        setShowSimulationModal(false);
      }
    } catch (err) {
      console.error('Tamper simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Restore Clean Verified Chain
  const handleRestoreChain = () => {
    fetchTelemetry(true);
    setSimulationActive(false);
    setSimulationResult(null);
  };

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
  const verificationStatusText = verification?.status || (isChainVerified ? '100% Cryptographically Verified' : 'Tamper Warning');
  const tamperDiag = verification?.tamperDiagnostics;

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
          <div className="inline-flex items-center gap-2 mb-2 flex-wrap">
            <span className="ct-demo-badge flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-purple-400" />
              PROOF-OF-WORK AUDIT (CT-166)
            </span>
            {isLiveConnected && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE SOCKET SYNC (CT-167)
              </span>
            )}
            {simulationActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                <Bug size={11} />
                ATTACK SIMULATION ACTIVE
              </span>
            )}
          </div>
          <h2 className="ct-section-title">Contribution Telemetry & Integrity Auditor</h2>
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

              {/* Integrity Audit Trigger Button */}
              <button
                onClick={() => fetchTelemetry(true)}
                disabled={verifying || loading}
                title="Perform Real-time Cryptographic Chain Integrity Audit"
                className="px-2.5 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw size={11} className={verifying ? 'animate-spin text-purple-400' : ''} />
                <span className="hidden sm:inline">Audit Chain</span>
              </button>

              {/* Tamper Simulation Modal Trigger */}
              <button
                onClick={() => setShowSimulationModal(true)}
                className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                title="Test Tamper Detection Engine (Simulation)"
              >
                <Bug size={11} className="text-rose-400" />
                <span className="hidden sm:inline">Simulate Tamper</span>
              </button>
            </div>
          </div>

          {/* Dossier Header Info */}
          <div className="ct-dossier-header">
            <div className="ct-dossier-title-wrap">
              <ShieldCheck size={24} className="text-purple-400 shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
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

            {/* Visual Verification Status Indicators (CT-166) & Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* STATUS INDICATOR 1: 100% Cryptographically Verified */}
              {isChainVerified ? (
                <div 
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  title="Chain Integrity Verified: SHA-256 signatures match all historical blocks"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                  <span className="font-bold tracking-tight">100% Cryptographically Verified</span>
                </div>
              ) : (
                /* STATUS INDICATOR 2: Tamper Warning */
                <div 
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/60 border border-rose-500/60 text-rose-300 text-xs font-mono shadow-[0_0_18px_rgba(244,63,94,0.3)] animate-pulse"
                  title="Tamper Detected: Payload or hash mismatch detected in activity ledger"
                >
                  <ShieldAlert size={14} className="text-rose-400 shrink-0" />
                  <span className="font-bold tracking-tight">Tamper Warning</span>
                </div>
              )}

              {/* View Ledger Modal Button */}
              <button
                onClick={() => setShowLedgerModal(true)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Inspect detailed block-by-block Proof-of-Work ledger"
              >
                <Eye size={13} className="text-cyan-400" />
                <span className="hidden md:inline">Inspect Ledger</span>
              </button>

              {/* Restore Button if simulated */}
              {simulationActive && (
                <button
                  onClick={handleRestoreChain}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer font-bold"
                  title="Revert simulation and restore 100% verified status"
                >
                  <RotateCcw size={13} />
                  <span>Restore Chain</span>
                </button>
              )}

              {/* Export Report Dropdown */}
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
                  <div className="absolute right-0 mt-2 w-56 bg-[#1A1B28] border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
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

          {/* CRITICAL TAMPER WARNING FORENSIC BANNER (CT-166) */}
          {!isChainVerified && (
            <div className="mx-6 my-3 p-4 rounded-xl bg-gradient-to-r from-rose-950/80 via-red-950/60 to-rose-900/40 border border-rose-500/50 text-rose-200 text-xs font-mono shadow-xl animate-fadeIn">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 shrink-0 text-rose-400">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                      <span>CRYPTOGRAPHIC INTEGRITY COMPROMISED</span>
                      <span className="px-2 py-0.2 rounded text-[10px] bg-rose-500/30 text-rose-200 uppercase font-sans">
                        {tamperDiag?.tamperType || 'TAMPER_DETECTED'}
                      </span>
                    </div>
                    <p className="text-gray-300 mt-1 text-[11px] leading-relaxed">
                      {tamperDiag?.details || verification?.message || 'A hash mismatch or broken chain pointer was detected in historical activity blocks.'}
                    </p>
                    
                    {tamperDiag && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-rose-500/20 text-[10px]">
                        <div>
                          <span className="text-rose-400 font-semibold">Compromised Block:</span> #{tamperDiag.blockSequence} ({tamperDiag.action})
                        </div>
                        <div>
                          <span className="text-rose-400 font-semibold">Affected Contributor:</span> {tamperDiag.affectedUser}
                        </div>
                        <div>
                          <span className="text-rose-400 font-semibold">Integrity Ratio:</span> {verification?.integrityRatio ?? 0}% Valid
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleRestoreChain}
                  className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/40 text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Restore</span>
                </button>
              </div>
            </div>
          )}

          {/* VERIFIED SUMMARY STRIP (When 100% Verified) */}
          {isChainVerified && (
            <div className="mx-6 my-2 px-4 py-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] font-mono text-emerald-300/90 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Check size={12} className="text-emerald-400 shrink-0" />
                <span>Genesis anchor verified • Monotonic sequential ordering • SHA-256 signatures intact</span>
              </div>
              {verification?.chainFingerprint && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span>Fingerprint:</span>
                  <span className="text-purple-300 font-bold">{verification.chainFingerprint.slice(0, 10)}...{verification.chainFingerprint.slice(-6)}</span>
                </div>
              )}
            </div>
          )}

          {/* Export Toast Notification */}
          {exportMessage && (
            <div className="bg-purple-950/80 border-b border-purple-500/30 px-6 py-2 text-xs font-mono text-purple-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check size={13} className="text-purple-400" />
                {exportMessage}
              </span>
              <span className="text-[11px] text-purple-400 font-bold">SHA-256 Digitally Signed</span>
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
                        className="flex items-center gap-1.5 hover:text-purple-300 transition-colors group cursor-pointer"
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
                      {isChainVerified ? (
                        <CheckCircle2 size={13} className="ct-check-icon text-emerald-400 ml-1.5" title="Cryptographically Validated" />
                      ) : (
                        <AlertTriangle size={13} className="text-rose-400 ml-1.5" title="Chain Discrepancy" />
                      )}
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

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Tamper Simulation Tool (CT-166 QA & Verification) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showSimulationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111322] border border-rose-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative font-sans">
            <button
              onClick={() => setShowSimulationModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Bug size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tamper Detection Simulator</h3>
                <p className="text-xs text-gray-400">Test CT-166 Chain Integrity Validator by injecting a controlled attack vector.</p>
              </div>
            </div>

            <div className="space-y-4 my-4 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">Select Attack Scenario:</label>
                <select
                  value={simulationType}
                  onChange={(e) => setSimulationType(e.target.value)}
                  className="w-full bg-[#181A2E] text-gray-200 border border-white/10 rounded-lg p-2.5 font-mono text-xs focus:outline-none focus:border-purple-400"
                >
                  <option value="modify_payload_lines">Scenario 1: Metric Forgery (Alter linesAdded count)</option>
                  <option value="modify_payload_details">Scenario 2: Content Modification (Alter commit details)</option>
                  <option value="break_pointer">Scenario 3: Broken Previous Hash Link (Corrupt chain link)</option>
                  <option value="alter_sequence">Scenario 4: Sequence Gap (Skip block numbering)</option>
                  <option value="modify_hash">Scenario 5: Direct Hash Injection (Corrupt stored SHA-256)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1.5">Target Block Index to Corrupt:</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={simulationTargetIdx}
                  onChange={(e) => setSimulationTargetIdx(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-[#181A2E] text-gray-200 border border-white/10 rounded-lg p-2.5 font-mono text-xs focus:outline-none focus:border-purple-400"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Target sequence #{Number(simulationTargetIdx) + 1}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                <strong>Expected Behavior:</strong> The Chain Integrity Auditor will recalculate all SHA-256 signatures, immediately catch the anomaly, transition the UI to <span className="underline font-bold">"Tamper Warning"</span>, and pinpoint the exact block.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowSimulationModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-300 hover:bg-white/5 border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateTamper}
                disabled={isSimulating}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <ShieldAlert size={14} />
                <span>{isSimulating ? 'Injecting Attack...' : 'Execute Tamper Test'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Block-by-Block Cryptographic Proof Ledger (CT-166) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0D0F1B] border border-purple-500/40 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[85vh] flex flex-col font-sans">
            <button
              onClick={() => setShowLedgerModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white p-1"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Cryptographic SHA-256 Proof-of-Work Ledger</h3>
                <p className="text-xs text-gray-400">Historical sequence of mathematical proofs and block hash pointers.</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2">
              {auditReport?.blocksLedger && auditReport.blocksLedger.length > 0 ? (
                auditReport.blocksLedger.map((block) => (
                  <div
                    key={block.sequenceNumber}
                    className={`p-3.5 rounded-xl border text-xs font-mono transition-all ${
                      block.isValid
                        ? 'bg-white/[0.02] border-white/10 hover:border-emerald-500/30'
                        : 'bg-rose-950/30 border-rose-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                          Block #{block.sequenceNumber}
                        </span>
                        <span className="text-gray-300 font-semibold uppercase text-[10px]">
                          {block.action}
                        </span>
                        <span className="text-gray-400 font-sans">by {block.userName}</span>
                      </div>

                      {block.isValid ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
                          <CheckCircle2 size={13} /> 100% Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 text-[11px] font-bold">
                          <AlertTriangle size={13} /> Tamper Detected
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-400">
                      <div className="flex items-center justify-between">
                        <span>Previous Hash:</span>
                        <span className="text-gray-300 truncate max-w-[280px]">{block.previousHash}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Stored Current Hash:</span>
                        <span className="text-purple-300 truncate max-w-[280px]">{block.currentHash}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Recomputed SHA-256:</span>
                        <span className={block.isValid ? 'text-emerald-300 truncate max-w-[280px]' : 'text-rose-300 truncate max-w-[280px]'}>
                          {block.computedHash}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-gray-500 italic">
                  No activity blocks recorded yet for deep ledger inspection.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 shrink-0 text-xs">
              <span className="text-gray-400 font-mono">
                Chain Fingerprint: <strong className="text-purple-300">{verification?.chainFingerprint ? `${verification.chainFingerprint.slice(0, 16)}...` : 'GENESIS'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowLedgerModal(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default ContributionDossier;
