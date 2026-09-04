import React, { useRef } from 'react';
import { User, Mail, AtSign, Briefcase, FileText, Upload, Save, X, Camera } from 'lucide-react';

export const EditProfileModal = ({
  isOpen,
  onClose,
  profile,
  formData,
  setFormData,
  onSave,
  saving
}) => {
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Image = uploadEvent.target?.result;
        if (base64Image) {
          setFormData(prev => ({ ...prev, avatar: base64Image }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarPreset = (seed) => {
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setFormData(prev => ({ ...prev, avatar: avatarUrl }));
  };

  return (
    <div className="ct-modal-backdrop" onClick={onClose}>
      <div className="ct-modal-card ct-edit-profile-modal" onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="ct-modal-header py-3 px-5">
          <div className="flex items-center gap-2.5">
            <div className="ct-modal-icon-badge w-8 h-8">
              <User size={16} className="text-purple-400" />
            </div>
            <div>
              <h3 className="ct-modal-title text-sm font-bold">Edit Personal Information</h3>
              <p className="ct-modal-subtitle text-[11px]">Update your profile info & photo</p>
            </div>
          </div>
          <button className="ct-btn-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={onSave} className="ct-modal-body p-5 flex flex-col gap-3">

          {/* Centered Profile Photo Section */}
          <div className="ct-avatar-picker-centered flex flex-col items-center justify-center gap-2 py-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            {/* Centered Clickable Circular Avatar Box */}
            <div 
              className="ct-avatar-preview-box w-16 h-16 rounded-full overflow-hidden group cursor-pointer relative shadow-lg mb-1"
              onClick={() => fileInputRef.current?.click()}
              title="Click to change profile picture"
            >
              {formData.avatar ? (
                <img 
                  src={formData.avatar} 
                  alt="Avatar Preview" 
                  className="ct-avatar-preview-img rounded-full object-cover w-full h-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="ct-avatar-preview-fallback text-xl font-bold rounded-full">
                  {formData.name ? formData.name[0].toUpperCase() : 'M'}
                </div>
              )}
            </div>


            {/* Upload Photo Button directly below Centered Avatar */}
            <button
              type="button"
              className="ct-btn-upload-photo inline-flex flex-row items-center justify-center gap-1.5 text-xs py-1.5 px-3"
              style={{ cursor: "pointer" }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} className="shrink-0 text-purple-400" />
              <span>Upload Photo</span>
            </button>


            {/* Preset Avatars Row */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center mt-0.5">

            </div>
          </div>

          {/* Form Fields Grid */}
          <div className="ct-form-grid">
            <div className="ct-form-group">
              <label className="ct-form-label text-[11px]">
                <User size={12} /> Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="Enter full name"
                className="ct-form-input py-1.5 px-3 text-xs"
                required
              />
            </div>

            <div className="ct-form-group">
              <label className="ct-form-label text-[11px]">
                <AtSign size={12} /> Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username || ''}
                onChange={handleChange}
                placeholder="e.g. mahi.kansara1904"
                className="ct-form-input font-mono py-1.5 px-3 text-xs"
              />
            </div>

            <div className="ct-form-group">
              <label className="ct-form-label text-[11px]">
                <Mail size={12} /> Email Address (Read Only)
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="ct-form-input disabled font-mono py-1.5 px-3 text-xs"
              />
            </div>

            <div className="ct-form-group">
              <label className="ct-form-label text-[11px]">
                <Briefcase size={12} /> Role / Title
              </label>
              <input
                type="text"
                name="role"
                value={formData.role || ''}
                onChange={handleChange}
                placeholder="e.g. learner"
                className="ct-form-input py-1.5 px-3 text-xs"
              />
            </div>
          </div>

          <div className="ct-form-group full-width">
            <label className="ct-form-label text-[11px]">
              <FileText size={12} /> Developer Bio / Status
            </label>
            <textarea
              name="bio"
              rows="2"
              value={formData.bio || ''}
              onChange={handleChange}
              placeholder="e.g. Hey there!!!"
              className="ct-form-textarea py-1.5 px-3 text-xs"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="ct-modal-actions pt-1">
            <button
              type="button"
              className="ct-btn-secondary py-1.5 px-3 text-xs"
              onClick={onClose}
              disabled={saving}
            >
              <X size={13} />
              <span>Cancel</span>
            </button>

            <button
              type="submit"
              className="ct-btn-primary py-1.5 px-4 text-xs"
              disabled={saving}
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
