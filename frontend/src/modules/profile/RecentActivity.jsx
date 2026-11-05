import React, { useState } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Award, 
  Play, 
  PlayCircle, 
  GitCommit, 
  UserCheck, 
  Zap, 
  Clock, 
  FileCode,
  Check
} from 'lucide-react';
import { getRelativeTime } from '../../utils/timeUtils';

/**
 * Maps raw activity actions, categories, or types to standard Lucide icons,
 * semantic color tags, and polished badge labels (CT-234).
 */
export const mapActivityVisuals = (item = {}) => {
  const cat = String(item.category || item.action || item.type || '').toLowerCase();
  const title = String(item.title || '').toLowerCase();

  // 1. Runs / Execution -> Play icon
  if (cat.includes('run') || cat.includes('exec') || title.includes('execution') || title.includes('runner') || cat.includes('sandbox')) {
    return {
      Icon: Play,
      tagColor: 'emerald',
      badgeLabel: item.category || 'Code Run'
    };
  }

  // 2. Saves / Commits / Edits -> GitCommit icon
  if (cat.includes('save') || cat.includes('commit') || cat.includes('edit') || cat.includes('code') || title.includes('save') || title.includes('edit') || cat.includes('file')) {
    return {
      Icon: GitCommit,
      tagColor: 'purple',
      badgeLabel: item.category || 'Save'
    };
  }

  // 3. Joins / Collaborator additions / Account -> UserCheck icon
  if (cat.includes('join') || cat.includes('member') || cat.includes('account') || title.includes('joined') || title.includes('profile')) {
    return {
      Icon: UserCheck,
      tagColor: cat.includes('account') ? 'amber' : 'cyan',
      badgeLabel: item.category || 'Member Join'
    };
  }

  // 4. Solved Problems -> CheckCircle2 icon
  if (cat.includes('solve') || cat.includes('problem') || title.includes('solved')) {
    return {
      Icon: CheckCircle2,
      tagColor: 'emerald',
      badgeLabel: item.category || 'Solved'
    };
  }

  // 5. Learning / Certification -> Award icon
  if (cat.includes('learning') || cat.includes('award') || title.includes('completed')) {
    return {
      Icon: Award,
      tagColor: 'purple',
      badgeLabel: item.category || 'Learning'
    };
  }

  // 6. Session events -> Zap icon
  if (cat.includes('session')) {
    return {
      Icon: Zap,
      tagColor: 'amber',
      badgeLabel: item.category || 'Session'
    };
  }

  // Default Fallback
  return {
    Icon: item.icon || Activity,
    tagColor: item.tagColor || 'purple',
    badgeLabel: item.category || 'Activity'
  };
};

export const RecentActivity = ({ activities = [], userUpdatedAt, onSelectActivity }) => {
  const [selectedId, setSelectedId] = useState(null);
  const [verificationFeedback, setVerificationFeedback] = useState(null);

  const defaultActivities = [
    { id: 'act-1', title: 'Solved "Binary Tree Maximum Path Sum"', category: 'Problem Solving', time: 'Yesterday', icon: CheckCircle2, tagColor: 'emerald' },
    { id: 'act-2', title: 'Saved "Async JavaScript & Event Loop" Workspace', category: 'Save', time: '10m ago', icon: GitCommit, tagColor: 'purple' },
    { id: 'act-3', title: 'Ran Code Execution in Python Sandbox', category: 'Code Run', time: 'just now', icon: Play, tagColor: 'emerald' },
    { id: 'act-4', title: 'Joined "Distributed Systems" Workspace', category: 'Member Join', time: '2h ago', icon: UserCheck, tagColor: 'cyan' },
    { id: 'act-5', title: 'Updated Profile & Account Details', category: 'Account', updatedAt: userUpdatedAt, time: 'dynamic', icon: UserCheck, tagColor: 'amber' }
  ];

  const list = activities.length > 0 ? activities : defaultActivities;

  const handleItemClick = (item, idx) => {
    const itemId = item.id || `act-${idx}`;
    setSelectedId(itemId);
    const { badgeLabel } = mapActivityVisuals(item);
    setVerificationFeedback({
      id: itemId,
      title: item.title,
      badge: badgeLabel
    });

    if (onSelectActivity) {
      onSelectActivity(item);
    }
  };

  const handleKeyDown = (e, item, idx) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item, idx);
    }
  };

  return (
    <div className="ct-profile-card">
      <div className="ct-card-header-bar">
        <div className="ct-card-title-group">
          <Activity size={18} className="text-purple-400" />
          <h3 className="ct-card-heading">Recent Activity</h3>
        </div>
        <div className="flex items-center gap-2">
          {verificationFeedback && (
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Check size={12} />
              <span>Event Clicked</span>
            </span>
          )}
          <span className="ct-badge-subtle">Live Feed</span>
        </div>
      </div>

      <div className="ct-card-body">
        <div className="ct-activity-timeline" role="feed" aria-label="Recent activity timeline">
          {list.map((item, idx) => {
            const itemId = item.id || `act-${idx}`;
            const { Icon, tagColor, badgeLabel } = mapActivityVisuals(item);

            // Format relative time using CT-234 timeUtils ("just now", "10m ago", "Yesterday")
            let displayTime = 'just now';
            const rawTime = item.updatedAt || item.timestamp || item.createdAt || item.time;
            if (rawTime === 'dynamic' || item.category === 'Account') {
              const targetTime = item.updatedAt || userUpdatedAt || new Date();
              displayTime = getRelativeTime(targetTime);
            } else if (rawTime) {
              displayTime = getRelativeTime(rawTime);
            }

            const isSelected = selectedId === itemId;

            return (
              <div 
                key={itemId} 
                className={`ct-activity-item cursor-pointer transition-all duration-200 select-none rounded-lg p-1.5 -mx-1.5 ${
                  isSelected ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : 'hover:bg-white/[0.03]'
                }`}
                onClick={() => handleItemClick(item, idx)}
                onKeyDown={(e) => handleKeyDown(e, item, idx)}
                tabIndex={0}
                role="button"
                aria-pressed={isSelected}
                title={`Click to inspect activity: ${item.title}`}
              >
                <div className={`ct-activity-node ${tagColor}`}>
                  <Icon size={14} />
                </div>

                <div className="ct-activity-content">
                  <div className="ct-activity-header">
                    <h4 className="ct-activity-title font-medium text-gray-200 hover:text-white transition-colors">
                      {item.title}
                    </h4>
                    <span className="ct-activity-time font-mono text-xs text-gray-400" title={item.timestamp || displayTime}>
                      {displayTime}
                    </span>
                  </div>
                  <div className="ct-activity-meta flex items-center justify-between gap-2 mt-0.5">
                    <span className={`ct-activity-tag ${tagColor}`}>
                      {badgeLabel}
                    </span>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-purple-300">
                        Selected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;
