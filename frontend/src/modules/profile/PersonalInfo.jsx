import React from 'react';
import { User, Mail, AtSign, Briefcase, FileText, Calendar, ShieldCheck, Edit3, Clock } from 'lucide-react';
import { getRelativeTime, formatFullDateTime } from '../../utils/timeUtils';

export const PersonalInfo = ({ profile, onOpenEditModal }) => {
  const joinedDate = profile?.createdAt 
    ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : 'August 11, 2026';

  const updatedAtRel = getRelativeTime(profile?.updatedAt);
  const updatedAtFull = formatFullDateTime(profile?.updatedAt);

  return (
    <div className="ct-profile-card">
      <div className="ct-card-header-bar">
        <div className="ct-card-title-group">
          <User size={18} className="text-purple-400" />
          <h3 className="ct-card-heading">Personal Information</h3>
        </div>

        <button 
          className="ct-btn-edit-card"
          onClick={onOpenEditModal}
          title="Edit Personal Information"
        >
          <Edit3 size={14} />
          <span>Edit Profile</span>
        </button>
      </div>

      <div className="ct-card-body">
        <div className="ct-info-grid">
          <div className="ct-info-item">
            <span className="ct-info-label">
              <User size={13} /> Full Name
            </span>
            <span className="ct-info-value">{profile?.name || 'MAHI KANSARA'}</span>
          </div>

          <div className="ct-info-item">
            <span className="ct-info-label">
              <AtSign size={13} /> Username
            </span>
            <span className="ct-info-value font-mono">
              @{profile?.username || (profile?.email ? profile.email.split('@')[0] : 'mahi.kansara1904')}
            </span>
          </div>

          <div className="ct-info-item">
            <span className="ct-info-label">
              <Mail size={13} /> Email Address
            </span>
            <span className="ct-info-value font-mono">{profile?.email || 'mahi.kansara1904@gmail.com'}</span>
          </div>

          <div className="ct-info-item">
            <span className="ct-info-label">
              <Briefcase size={13} /> Role / Title
            </span>
            <span className="ct-info-value">{profile?.role || 'learner'}</span>
          </div>

          <div className="ct-info-item">
            <span className="ct-info-label">
              <ShieldCheck size={13} /> Auth Provider
            </span>
            <span className="ct-info-value capitalize">{profile?.authProvider || 'Local'}</span>
          </div>

          <div className="ct-info-item">
            <span className="ct-info-label">
              <Clock size={13} className="text-purple-400" /> Last Updated
            </span>
            <span className="ct-info-value text-purple-300 font-medium" title={updatedAtFull ? `Exact time: ${updatedAtFull}` : ''}>
              {updatedAtRel}
            </span>
          </div>

          <div className="ct-info-item">
            <span className="ct-info-label">
              <Calendar size={13} /> Account Created
            </span>
            <span className="ct-info-value">{joinedDate}</span>
          </div>

          <div className="ct-info-item full-width">
            <span className="ct-info-label">
              <FileText size={13} /> Bio
            </span>
            <p className="ct-info-bio">
              {profile?.bio || 'Hey there!!!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInfo;
