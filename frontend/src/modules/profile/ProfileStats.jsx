import React from 'react';
import { CheckSquare, Flame, BookOpen, Clock } from 'lucide-react';

export const ProfileStats = ({ stats }) => {
  const statItems = [
    {
      id: 'problems',
      label: 'Problems Solved',
      value: stats?.problemsSolved ?? 42,
      subtitle: 'Verified Exercises',
      icon: CheckSquare,
      color: 'emerald'
    },
    {
      id: 'streak',
      label: 'Coding Streak',
      value: `${stats?.codingStreak ?? 7} Days`,
      subtitle: 'Active Consecutive Days',
      icon: Flame,
      color: 'amber'
    },
    {
      id: 'modules',
      label: 'Modules Completed',
      value: stats?.modulesCompleted ?? 8,
      subtitle: 'Curriculum Paths',
      icon: BookOpen,
      color: 'purple'
    },
    {
      id: 'time',
      label: 'Total Practice Time',
      value: stats?.totalPracticeTime ?? '34.5 hrs',
      subtitle: 'In Code Runner & Workspace',
      icon: Clock,
      color: 'cyan'
    }
  ];

  return (
    <div className="ct-profile-stats-grid">
      {statItems.map(item => {
        const IconComponent = item.icon;
        return (
          <div key={item.id} className={`ct-stat-card ${item.color}`}>
            <div className="ct-stat-header">
              <span className="ct-stat-label">{item.label}</span>
              <div className={`ct-stat-icon-wrapper ${item.color}`}>
                <IconComponent size={18} />
              </div>
            </div>

            <div className="ct-stat-body">
              <span className="ct-stat-value">{item.value}</span>
              <span className="ct-stat-subtitle">{item.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProfileStats;
