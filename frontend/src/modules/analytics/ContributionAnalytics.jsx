/**
 * ContributionAnalytics.jsx
 * CT-197 / CT-205: Display Contribution Statistics
 *
 * A dedicated analytics dashboard that surfaces:
 *   - Contributor leaderboard with scores & participation bars
 *   - Action-type breakdown (code edits, executions, file ops)
 *   - Coding activity metrics (success rates, file coverage, streaks)
 *   - Participation time metrics (session durations, last active)
 *   - Data validation status badge
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart2,
  Users,
  Activity,
  Code2,
  Play,
  FilePlus,
  FileX,
  Clock,
  TrendingUp,
  Award,
  Flame,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Target,
  Zap
} from 'lucide-react';
import { API_BASE } from '../../config/api';

/*
  Spacing system (Tailwind classes used below):
  - Page gutter:        px-8
  - Between sections:   gap-6 / gap-5
  - Card padding:       p-4 / p-5, rows px-6 py-4
  - Within a group:     gap-2 / gap-3 / gap-4
  - Buttons:            px-4 py-2   Pills: px-3 py-1
*/

// ─── Spacing safety net ──────────────────────────────────────────────────────
// If your app has an unlayered global reset such as `* { margin:0; padding:0 }`,
// it overrides Tailwind v4 padding/margin utilities (they live in a CSS layer),
// which makes everything look flush against its edges. These rules are scoped to
// this dashboard and beat the reset. Once your reset is moved into
// `@layer base { ... }` this block can be deleted.
const SPACING_SCALE = {
  '0.5': 0.125, '1': 0.25, '1.5': 0.375, '2': 0.5, '2.5': 0.625, '3': 0.75,
  '4': 1, '5': 1.25, '6': 1.5, '8': 2, '10': 2.5, '12': 3, '16': 4
};
const SPACING_SIDES = {
  p: ['padding'], px: ['padding-left', 'padding-right'], py: ['padding-top', 'padding-bottom'],
  pt: ['padding-top'], pb: ['padding-bottom'], pl: ['padding-left'], pr: ['padding-right'],
  m: ['margin'], mx: ['margin-left', 'margin-right'], my: ['margin-top', 'margin-bottom'],
  mt: ['margin-top'], mb: ['margin-bottom'], ml: ['margin-left'], mr: ['margin-right']
};
const SPACING_CSS = Object.entries(SPACING_SIDES)
  .flatMap(([key, props]) =>
    Object.entries(SPACING_SCALE).map(([n, rem]) =>
      `#analytics-dashboard .${key}-${n.replace('.', '\\.')}{${props.map(p => `${p}:${rem}rem`).join(';')}}`
    )
  )
  .join('\n');

// ─── Colour palette (matches ContributionDossier) ────────────────────────────
const COLOR_PALETTE = ['#8B5CF6', '#38BDF8', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];

// ─── Tiny helper: format milliseconds into "Xh Ym" ───────────────────────────
const fmtDuration = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = '#8B5CF6' }) => (
  <div
    className="rounded-xl border p-5 flex flex-col gap-3"
    style={{ borderColor: `${color}25`, backgroundColor: `${color}08` }}
  >
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, color }}
      >
        <Icon size={16} />
      </div>
      <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wide">{label}</span>
    </div>
    <div className="flex flex-col gap-1">
      <span className="text-2xl font-bold text-white font-mono">{value ?? '—'}</span>
      {sub && <span className="text-[11px] text-gray-500">{sub}</span>}
    </div>
  </div>
);

// ─── Progress bar cell ────────────────────────────────────────────────────────
const Bar = ({ value = 0, max = 100, color = '#8B5CF6' }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, (value / Math.max(max, 1)) * 100)}%`, backgroundColor: color }}
      />
    </div>
    <span className="text-[11px] font-mono text-gray-400 w-10 text-right">{value}</span>
  </div>
);

// ─── Action icon map ──────────────────────────────────────────────────────────
const ACTION_ICONS = {
  code_edit:      { icon: Code2,    color: '#8B5CF6', label: 'Code Edits' },
  code_execution: { icon: Play,     color: '#10B981', label: 'Executions' },
  file_create:    { icon: FilePlus, color: '#38BDF8', label: 'Files Created' },
  file_delete:    { icon: FileX,    color: '#EC4899', label: 'Files Deleted' },
  file_rename:    { icon: Layers,   color: '#F59E0B', label: 'Files Renamed' },
  member_join:    { icon: Users,    color: '#6366F1', label: 'Member Joins' },
  session_start:  { icon: Zap,      color: '#34D399', label: 'Session Starts' },
  session_end:    { icon: Clock,    color: '#94A3B8', label: 'Session Ends' },
  general:        { icon: Activity, color: '#64748B', label: 'General' }
};

// ─── Main component ───────────────────────────────────────────────────────────
const ContributionAnalytics = ({ activeWorkspace = null, currentUser = null }) => {
  const [workspaces, setWorkspaces]               = useState([]);
  const [selectedWs, setSelectedWs]               = useState(activeWorkspace);
  const [contributions, setContributions]         = useState(null);
  const [codingActivity, setCodingActivity]       = useState(null);
  const [participation, setParticipation]         = useState(null);
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState(null);
  const [expandedUser, setExpandedUser]           = useState(null);
  const [activeTab, setActiveTab]                 = useState('leaderboard'); // leaderboard | coding | participation

  const token = localStorage.getItem('ct-auth-token');

  // Load workspaces
  useEffect(() => {
    if (!token) return;
    axios.get(`${API_BASE}/workspaces`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.workspaces || []);
        setWorkspaces(list);
        if (!selectedWs && list.length > 0) {
          try {
            const saved = JSON.parse(localStorage.getItem('ct-active-workspace-session'));
            const found = saved ? list.find(w => (w._id || w.id) === (saved._id || saved.id)) : null;
            setSelectedWs(found || list[0]);
          } catch { setSelectedWs(list[0]); }
        }
      })
      .catch(() => {});
  }, [token]);

  // Sync selected workspace from prop
  useEffect(() => {
    if (activeWorkspace) setSelectedWs(activeWorkspace);
  }, [activeWorkspace]);

  // Fetch all analytics data for the selected workspace
  const fetchAll = useCallback(async () => {
    const wsId = selectedWs?._id || selectedWs?.id;
    if (!wsId || !token) return;

    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const base    = `${API_BASE}/workspaces/${wsId}/analytics`;

      const [contribRes, codingRes, partRes] = await Promise.allSettled([
        axios.get(`${base}/contributions`,  { headers }),
        axios.get(`${base}/coding-activity`, { headers }),
        axios.get(`${base}/participation`,  { headers })
      ]);

      if (contribRes.status === 'fulfilled') setContributions(contribRes.value.data);
      if (codingRes.status  === 'fulfilled') setCodingActivity(codingRes.value.data);
      if (partRes.status    === 'fulfilled') setParticipation(partRes.value.data);

      // Surface error only if all three fail
      if ([contribRes, codingRes, partRes].every(r => r.status === 'rejected')) {
        setError('Failed to load analytics. Please check your connection and try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedWs, token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const contributors    = contributions?.contributors        || [];
  const actionBreakdown = contributions?.actionBreakdown     || [];
  const dailyActivity   = contributions?.dailyActivity       || [];
  const summary         = contributions?.summary             || {};
  const codingMetrics   = codingActivity?.codingMetrics      || [];
  const partMetrics     = participation?.participationMetrics || [];
  const validation      = contributions?.validation;
  const wsTitle         = selectedWs?.title || contributions?.workspaceTitle || 'Workspace Analytics';
  const maxScore        = contributors.reduce((m, c) => Math.max(m, c.score || 0), 1);
  const maxLines        = contributors.reduce((m, c) => Math.max(m, c.lines || 0), 1);
  const maxPart         = partMetrics.reduce((m, p) => Math.max(m, p.totalDurationMin || 0), 1);

  // ── UI tabs config ──────────────────────────────────────────────────────────
  const TABS = [
    { id: 'leaderboard',   label: 'Leaderboard',   icon: Award },
    { id: 'coding',        label: 'Coding Activity', icon: Code2 },
    { id: 'participation', label: 'Participation',  icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-gray-200 font-sans" id="analytics-dashboard">
      <style>{SPACING_CSS}</style>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 bg-[#0F1020]/80 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-sm">
        <div className="flex items-center flex-wrap gap-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <BarChart2 size={18} />
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-bold text-white leading-tight">Contribution Analytics</h1>
            <p className="text-[11px] text-gray-400 font-mono">{wsTitle} · CT-197</p>
          </div>

          {/* Validation badge */}
          {validation && (
            <span
              className={`hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-semibold border ${
                validation.validationPassed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {validation.validationPassed
                ? <><CheckCircle2 size={10} /> Data Validated</>
                : <><AlertTriangle size={10} /> Validation Warning</>
              }
            </span>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-3">
          {/* Workspace selector */}
          {workspaces.length > 1 && (
            <select
              value={selectedWs?._id || selectedWs?.id || ''}
              onChange={e => {
                const found = workspaces.find(w => (w._id || w.id) === e.target.value);
                if (found) setSelectedWs(found);
              }}
              className="bg-[#1A1B2E] text-gray-200 border border-white/10 rounded-lg px-4 py-2 text-xs font-mono focus:outline-none focus:border-purple-500/50 cursor-pointer"
              id="analytics-workspace-selector"
            >
              {workspaces.map(w => (
                <option key={w._id || w.id} value={w._id || w.id}>{w.title}</option>
              ))}
            </select>
          )}

          <button
            id="analytics-refresh-btn"
            onClick={fetchAll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-mono transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error Banner ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-8 mt-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Summary Stat Cards ───────────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-3 grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={Users}
          label="Contributors"
          value={summary.activeContributors ?? contributors.length}
          sub="active members"
          color="#8B5CF6"
        />
        <StatCard
          icon={Activity}
          label="Total Events"
          value={(summary.totalActivities || 0).toLocaleString()}
          sub="logged activities"
          color="#38BDF8"
        />
        <StatCard
          icon={Code2}
          label="Lines Changed"
          value={(summary.totalLinesChanged || 0).toLocaleString()}
          sub="across all contributors"
          color="#10B981"
        />
        <StatCard
          icon={Award}
          label="Top Scorer"
          value={summary.topContributor?.name?.split(' ')[0] || '—'}
          sub={summary.topContributor ? `Score: ${summary.topContributor.score}` : 'No activity yet'}
          color="#F59E0B"
        />
      </div>

      <div className="px-8 py-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-5">
        {/* Coding activity summary */}
        <StatCard icon={Play}     label="Executions"     value={codingActivity?.summary?.totalExecutions ?? '—'}   color="#10B981" />
        <StatCard icon={Code2}    label="Code Edits"     value={codingActivity?.summary?.totalCodeEdits ?? '—'}    color="#8B5CF6" />
        <StatCard icon={Target}   label="Exec Success"   value={codingActivity?.summary?.avgSuccessRate != null ? `${codingActivity.summary.avgSuccessRate}%` : '—'} sub="avg success rate" color="#38BDF8" />
        <StatCard icon={Clock}    label="Session Time"   value={participation ? fmtDuration(participation.summary?.totalSessionTimeMin * 60000) : '—'} sub="total" color="#6366F1" />
        <StatCard icon={Zap}      label="Sessions"       value={participation?.summary?.totalSessions ?? '—'}      color="#F59E0B" />
        <StatCard icon={TrendingUp} label="Members"      value={participation?.summary?.totalParticipants ?? '—'}  color="#EC4899" />
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div className="px-8 mt-4 flex items-center flex-wrap gap-2 border-b border-white/5">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`analytics-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'text-purple-300 border-purple-500'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Leaderboard ─────────────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div className="px-8 py-8 flex flex-col gap-6">

          {/* Contributor leaderboard table */}
          <div className="rounded-xl border border-white/5 bg-[#0F1020] overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-3">
                <Award size={15} className="text-amber-400" />
                Contributor Leaderboard
              </h2>
              <span className="text-[11px] text-gray-500 font-mono">{contributors.length} contributors</span>
            </div>

            {contributors.length === 0 ? (
              <div className="px-6 py-16 text-center text-gray-500 text-sm leading-relaxed">
                {loading ? 'Loading analytics…' : 'No contribution data available. Start coding to see analytics here.'}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>Contributor</span>
                  <span>Score</span>
                  <span>Lines</span>
                  <span>Participation</span>
                  <span>Events</span>
                </div>

                {contributors.map((c, idx) => {
                  const color = c.color || COLOR_PALETTE[idx % COLOR_PALETTE.length];
                  const isExpanded = expandedUser === c.id;
                  return (
                    <div key={c.id || idx} className="transition-colors hover:bg-white/[0.02]">
                      {/* Main row */}
                      <div
                        className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr] gap-4 items-center px-6 py-4 cursor-pointer"
                        onClick={() => setExpandedUser(isExpanded ? null : c.id)}
                      >
                        {/* Contributor name */}
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="relative shrink-0">
                            <span
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border"
                              style={{ backgroundColor: `${color}18`, color, borderColor: `${color}35` }}
                            >
                              {(c.userName || c.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                            {idx === 0 && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[9px] text-black font-bold">1</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-100 truncate">{c.userName || c.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono capitalize">{c.role}</div>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold"
                            style={{ backgroundColor: `${color}18`, color }}
                          >
                            <Flame size={10} />
                            {c.score || 0}
                          </span>
                          <div className="w-full">
                            <Bar value={c.score || 0} max={maxScore} color={color} />
                          </div>
                        </div>

                        {/* Lines */}
                        <div className="flex flex-col gap-1">
                          <div className="text-sm font-semibold text-gray-200">{(c.lines || 0).toLocaleString()}</div>
                          <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2">
                            <span className="text-emerald-400">+{c.linesAdded || 0}</span>
                            <span className="text-rose-400">-{c.linesDeleted || 0}</span>
                          </div>
                        </div>

                        {/* Participation bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${Math.min(100, c.percent || 0)}%`, backgroundColor: color }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-gray-300 w-10 text-right">{c.percent || 0}%</span>
                        </div>

                        {/* Events + expand toggle */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                            <div className="text-sm font-semibold text-gray-200">{c.totalEvents || 0}</div>
                            <div className="text-[10px] text-gray-500 font-mono">{c.codeExecutions || 0} runs</div>
                          </div>
                          {isExpanded ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
                        </div>
                      </div>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <div
                          className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t"
                          style={{ borderColor: `${color}20`, backgroundColor: `${color}06` }}
                        >
                          {[
                            { label: 'Code Edits',   value: c.codeEdits || 0,      color: '#8B5CF6' },
                            { label: 'Executions',   value: c.codeExecutions || 0, color: '#10B981' },
                            { label: 'Files Created',value: c.filesCreated || 0,   color: '#38BDF8' },
                            { label: 'Files Deleted',value: c.filesDeleted || 0,   color: '#EC4899' }
                          ].map(item => (
                            <div key={item.label} className="flex flex-col gap-1.5 bg-white/[0.03] rounded-lg p-4 border border-white/5">
                              <span className="text-[10px] text-gray-500 uppercase tracking-wide">{item.label}</span>
                              <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
                            </div>
                          ))}
                          {c.lastActiveAt && (
                            <div className="col-span-2 sm:col-span-4 text-[10px] text-gray-500 font-mono flex items-center gap-2 pt-1">
                              <Clock size={10} />
                              Last active: {new Date(c.lastActiveAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action type breakdown */}
          {actionBreakdown.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-[#0F1020] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="text-sm font-bold text-white flex items-center gap-3">
                  <Activity size={15} className="text-cyan-400" />
                  Action Type Breakdown
                </h2>
              </div>
              <div className="px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {actionBreakdown.map(a => {
                  const cfg = ACTION_ICONS[a.action] || { icon: Activity, color: '#64748B', label: a.action };
                  const Icon = cfg.icon;
                  const maxCount = actionBreakdown.reduce((m, x) => Math.max(m, x.count), 1);
                  return (
                    <div key={a.action} className="rounded-lg bg-white/[0.03] border border-white/5 p-4 flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: cfg.color }} />
                        <span className="text-[11px] text-gray-400">{cfg.label}</span>
                      </div>
                      <span className="text-xl font-bold font-mono" style={{ color: cfg.color }}>{a.count}</span>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(a.count / maxCount) * 100}%`, backgroundColor: cfg.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Coding Activity ─────────────────────────────────────────────── */}
      {activeTab === 'coding' && (
        <div className="px-8 py-8 flex flex-col gap-6">
          {codingMetrics.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#0F1020] px-6 py-16 text-center text-gray-500 text-sm leading-relaxed">
              {loading ? 'Loading coding metrics…' : 'No coding activity data found.'}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#0F1020] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <Code2 size={15} className="text-purple-400" />
                <h2 className="text-sm font-bold text-white">Coding Activity Metrics</h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {/* Header */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>Developer</span>
                  <span>Code Edits</span>
                  <span>Exec Rate</span>
                  <span>Files Touched</span>
                  <span>Streak</span>
                  <span>Active Days</span>
                </div>

                {codingMetrics.map((m, idx) => {
                  const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                  const maxEdits = codingMetrics.reduce((x, c) => Math.max(x, c.codeEdits || 0), 1);
                  return (
                    <div key={m.userId || idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      {/* Name */}
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border shrink-0"
                          style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
                        >
                          {(m.userName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-100 truncate">{m.userName}</div>
                          <div className="text-[10px] text-gray-500">+{m.linesAdded} / -{m.linesDeleted}</div>
                        </div>
                      </div>

                      {/* Code edits with bar */}
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-semibold" style={{ color }}>{m.codeEdits}</div>
                        <Bar value={m.codeEdits} max={maxEdits} color={color} />
                      </div>

                      {/* Execution success rate */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-semibold text-gray-200">{m.executionSuccessRate}%</span>
                        <div className="text-[10px] text-gray-500">{m.codeExecutions} runs</div>
                        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${m.executionSuccessRate}%`,
                              backgroundColor: m.executionSuccessRate >= 75 ? '#10B981' : m.executionSuccessRate >= 50 ? '#F59E0B' : '#EC4899'
                            }}
                          />
                        </div>
                      </div>

                      {/* Distinct files */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-sm font-semibold text-gray-200">{m.distinctFilesTouched}</span>
                        {m.mostActiveFile && (
                          <div className="text-[10px] text-gray-500 truncate" title={m.mostActiveFile}>
                            {m.mostActiveFile}
                          </div>
                        )}
                      </div>

                      {/* Streak */}
                      <div className="flex items-center gap-2">
                        <Flame size={13} className={m.streak >= 3 ? 'text-amber-400' : 'text-gray-600'} />
                        <span className="text-sm font-semibold text-gray-200">{m.streak}d</span>
                      </div>

                      {/* Active days */}
                      <div className="text-sm font-semibold text-gray-200">{m.activeDaysCount}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Participation ───────────────────────────────────────────────── */}
      {activeTab === 'participation' && (
        <div className="px-8 py-8 flex flex-col gap-6">
          {partMetrics.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#0F1020] px-6 py-16 text-center text-gray-500 text-sm leading-relaxed">
              {loading ? 'Loading participation metrics…' : 'No session data available yet.'}
            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#0F1020] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <Clock size={15} className="text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Session Participation Metrics</h2>
              </div>
              <div className="divide-y divide-white/[0.04]">
                <div className="hidden sm:grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>Member</span>
                  <span>Sessions</span>
                  <span>Total Time</span>
                  <span>Avg/Session</span>
                  <span>Score</span>
                  <span>Last Active</span>
                </div>

                {partMetrics.map((p, idx) => {
                  const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
                  return (
                    <div key={p.userId || idx} className="grid grid-cols-[2fr_1fr_1.5fr_1fr_1fr_1fr] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      {/* Name */}
                      <div className="flex items-center gap-4 min-w-0">
                        <span
                          className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border shrink-0"
                          style={{ backgroundColor: `${color}18`, color, borderColor: `${color}30` }}
                        >
                          {(p.userName || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-100 truncate">{p.userName}</div>
                          <div className="text-[10px] text-gray-500 capitalize">{p.role}</div>
                        </div>
                      </div>

                      {/* Session count */}
                      <div className="text-sm font-semibold text-gray-200">{p.sessionCount}</div>

                      {/* Total time */}
                      <div className="flex flex-col gap-2">
                        <div className="text-sm font-semibold text-gray-200">{fmtDuration(p.totalDurationMs)}</div>
                        <Bar value={p.totalDurationMin || 0} max={maxPart} color={color} />
                      </div>

                      {/* Avg per session */}
                      <div className="text-sm text-gray-300">{p.avgSessionDurationMin}m</div>

                      {/* Participation score */}
                      <div>
                        <span
                          className="inline-block text-xs font-bold px-2.5 py-1 rounded"
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {p.participationScore}
                        </span>
                      </div>

                      {/* Last active */}
                      <div className="text-[11px] text-gray-500 font-mono">
                        {p.daysSinceActive != null
                          ? (p.daysSinceActive === 0 ? 'Today' : `${p.daysSinceActive}d ago`)
                          : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      <div className="px-8 pb-10 mt-4">
        <p className="text-[10px] text-gray-600 font-mono text-center leading-relaxed">
          CT-197 · Contribution Analytics Module · Data sourced from ActivityLog & WorkspaceSession chains
          {contributions?.generatedAt && ` · Generated ${new Date(contributions.generatedAt).toLocaleString()}`}
        </p>
      </div>
    </div>
  );
};

export default ContributionAnalytics;