import React from 'react';
import { Activity, CheckCircle2, Award, PlayCircle, UserCheck } from 'lucide-react';
import { getRelativeTime } from '../../utils/timeUtils';

export const RecentActivity = ({ activities = [], userUpdatedAt }) => {
  const defaultActivities = [
    { id: 1, title: 'Solved "Binary Tree Maximum Path Sum"', category: 'Problem Solving', time: '2 hours ago', icon: CheckCircle2, tagColor: 'emerald' },
    { id: 2, title: 'Completed "Async JavaScript & Event Loop" Module', category: 'Learning', time: 'Yesterday', icon: Award, tagColor: 'purple' },
    { id: 3, title: 'Started Practice Session in Code Runner', category: 'Sandbox', time: '3 days ago', icon: PlayCircle, tagColor: 'cyan' },
    { id: 4, title: 'Updated Profile & Account Details', category: 'Account', updatedAt: userUpdatedAt, time: 'dynamic', icon: UserCheck, tagColor: 'amber' }
  ];

  const list = activities.length > 0 ? activities : defaultActivities;

  return (
    <div className="ct-profile-card">
      <div className="ct-card-header-bar">
        <div className="ct-card-title-group">
          <Activity size={18} className="text-purple-400" />
          <h3 className="ct-card-heading">Recent Activity</h3>
        </div>
        <span className="ct-badge-subtle">Live Feed</span>
      </div>

      <div className="ct-card-body">
        <div className="ct-activity-timeline">
          {list.map((item, idx) => {
            const IconComp = item.icon || Activity;
            const tagColor = item.tagColor || 'purple';

            let displayTime = item.time;
            if (item.updatedAt || item.time === 'dynamic' || item.category === 'Account') {
              const targetTime = item.updatedAt || userUpdatedAt;
              displayTime = getRelativeTime(targetTime);
            }

            return (
              <div key={item.id || idx} className="ct-activity-item">
                <div className={`ct-activity-node ${tagColor}`}>
                  <IconComp size={14} />
                </div>

                <div className="ct-activity-content">
                  <div className="ct-activity-header">
                    <h4 className="ct-activity-title">{item.title}</h4>
                    <span className="ct-activity-time">{displayTime}</span>
                  </div>
                  <div className="ct-activity-meta">
                    <span className={`ct-activity-tag ${tagColor}`}>
                      {item.category}
                    </span>
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
