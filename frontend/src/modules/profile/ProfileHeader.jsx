import React from 'react';
import { User, Edit3, ShieldCheck, Calendar, Sparkles, Clock } from 'lucide-react';
import { getRelativeTime, formatFullDateTime } from '../../utils/timeUtils';

export const ProfileHeader = ({ profile, onOpenEditModal }) => {
  const name = profile?.name || 'MAHI KANSARA';
  const email = profile?.email || 'mahi.kansara1904@gmail.com';
  const role = profile?.role || 'learner';
  const avatar = profile?.avatar;
  const initial = name ? name[0].toUpperCase() : 'M';

  const joinedDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Aug 2026';

  const updatedAtRel = getRelativeTime(profile?.updatedAt);
  const updatedAtFull = formatFullDateTime(profile?.updatedAt);

  return (
    <div className="ct-profile-header-card">
      <div className="ct-profile-banner" />
      
      <div className="ct-profile-header-content">
        <div 
          className="ct-profile-avatar-wrapper group cursor-pointer"
          onClick={onOpenEditModal}
          title="Click to edit profile"
        >
          {avatar ? (
            <img 
              src={avatar} 
              alt={name} 
              className="ct-profile-avatar-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="ct-profile-avatar-fallback"
            style={{ display: avatar ? 'none' : 'flex' }}
          >
            <span>{initial}</span>
          </div>
          <div className="ct-profile-avatar-status" title="Active Account" />
        </div>

        <div className="ct-profile-header-info">
          <div className="ct-profile-title-row">
            <h1 className="ct-profile-name">{name}</h1>
            <span className="ct-profile-badge">
              <ShieldCheck size={12} className="ct-badge-icon" />
              <span>{role}</span>
            </span>
          </div>

          <p className="ct-profile-email">{email}</p>

          <div className="ct-profile-meta-chips">
            <span className="ct-meta-chip">
              <Calendar size={13} />
              <span>Member since {joinedDate}</span>
            </span>
            <span className="ct-meta-chip cyan" title={updatedAtFull ? `Last profile update: ${updatedAtFull}` : 'Last updated time'}>
              <Clock size={13} className="text-cyan-400" />
              <span>Updated {updatedAtRel}</span>
            </span>
            <span className="ct-meta-chip purple">
              <Sparkles size={13} />
              <span>Pro Plan</span>
            </span>
          </div>
        </div>

        <div className="ct-profile-header-actions">
          <button 
            className="ct-btn-edit-profile"
            onClick={onOpenEditModal}
          >
            <Edit3 size={15} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
