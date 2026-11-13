const crypto = require('crypto');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const workspaceContextService = require('../services/workspaceContextService');
const {
  validateWorkspaceTitle,
  validateWorkspaceDescription,
  validateWorkspaceLanguage,
  validateWorkspaceBrandColor,
  validateWorkspaceStatus,
  validateWorkspacePreferences,
  hasSettingsPermission,
  canModifyStatus,
  canModifyFiles,
  mergeWorkspaceSettings
} = require('../utils/workspaceSettingsValidator');
const {
  getRolePermissions,
  hasPermission,
  canAssignRole,
  canInviteMember,
  canRemoveMember,
  getAllRoleDefinitions
} = require('../utils/permissionValidator');

// Starter file templates based on language
const getStarterFiles = (language, title) => {
  const lang = (language || 'javascript').toLowerCase();
  switch (lang) {
    case 'typescript':
      return [
        {
          id: 'index.ts',
          name: 'index.ts',
          language: 'typescript',
          content: `// ${title} - CodeTrail Collaborative Workspace\n\nconst greeting: string = "Welcome to ${title}!";\nconsole.log(greeting);\nconsole.log("Ready for real-time TypeScript collaboration.");\n`
        }
      ];
    case 'python':
      return [
        {
          id: 'main.py',
          name: 'main.py',
          language: 'python',
          content: `# ${title} - CodeTrail Collaborative Workspace\n\ndef main():\n    print("Welcome to ${title}!")\n    print("Collaborating live with Python runtime.")\n\nif __name__ == "__main__":\n    main()\n`
        }
      ];
    case 'c':
      return [
        {
          id: 'main.c',
          name: 'main.c',
          language: 'cpp',
          content: `// ${title} - CodeTrail Collaborative Workspace\n#include <stdio.h>\n\nint main() {\n    printf("Welcome to ${title}!\\n");\n    return 0;\n}\n`
        }
      ];
    case 'cpp':
      return [
        {
          id: 'main.cpp',
          name: 'main.cpp',
          language: 'cpp',
          content: `// ${title} - CodeTrail Collaborative Workspace\n#include <iostream>\n\nint main() {\n    std::cout << "Welcome to ${title}!" << std::endl;\n    return 0;\n}\n`
        }
      ];
    case 'java':
      return [
        {
          id: 'Main.java',
          name: 'Main.java',
          language: 'java',
          content: `// ${title} - CodeTrail Collaborative Workspace\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Welcome to ${title}!");\n    }\n}\n`
        }
      ];
    case 'rust':
      return [
        {
          id: 'main.rs',
          name: 'main.rs',
          language: 'rust',
          content: `// ${title} - CodeTrail Collaborative Workspace\nfn main() {\n    println!("Welcome to ${title}!");\n}\n`
        }
      ];
    case 'go':
      return [
        {
          id: 'main.go',
          name: 'main.go',
          language: 'go',
          content: `// ${title} - CodeTrail Collaborative Workspace\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Welcome to ${title}!")\n}\n`
        }
      ];
    case 'html':
      return [
        {
          id: 'index.html',
          name: 'index.html',
          language: 'html',
          content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${title}</title>\n</head>\n<body>\n  <h1>Welcome to ${title}!</h1>\n</body>\n</html>\n`
        }
      ];
    case 'javascript':
    default:
      return [
        {
          id: 'index.js',
          name: 'index.js',
          language: 'javascript',
          content: `// ${title} - CodeTrail Collaborative Workspace\n\nconsole.log("Welcome to ${title}!");\nconsole.log("Ready for real-time collaboration.");\n`
        }
      ];
  }
};

/**
 * Generate a unique workspace invite code like CT-A8F2K
 */
const generateInviteCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CT-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const formatWorkspaceSummary = (workspace, userId) => {
  const targetUserId = userId ? String(userId._id || userId) : null;
  const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : null;
  const isOwner = Boolean(ownerId && targetUserId && ownerId === targetUserId);
  const memberInfo = (workspace.members || []).find(member => {
    const memberId = member.user ? String(member.user._id || member.user) : null;
    return Boolean(memberId && targetUserId && memberId === targetUserId);
  });

  return {
    id: workspace._id,
    _id: workspace._id,
    title: workspace.title,
    name: workspace.title,
    description: workspace.description || workspace.desc || '',
    desc: workspace.description || workspace.desc || '',
    brandColor: workspace.brandColor || 'purple',
    icon: workspace.icon || 'Rocket',
    role: isOwner ? 'owner' : (memberInfo?.role || 'viewer'),
    timeSpent: workspace.timeSpent || '0h 0m',
    status: workspace.status || 'active',
    language: workspace.language || 'javascript',
    inviteCode: workspace.inviteCode,
    roomCode: workspace.inviteCode,
    settings: workspace.settings,
    updatedAt: workspace.updatedAt,
    members: (workspace.members || []).map(member => ({
      id: member.user ? (member.user._id || member.user) : null,
      name: member.user?.name || 'Collaborator',
      email: member.user?.email,
      role: member.role || 'viewer'
    })),
    collaborators: (workspace.members && workspace.members.length > 0)
      ? workspace.members.map(m => {
          const name = m.user?.name;
          return name ? name[0].toUpperCase() : 'U';
        })
      : ['U'],
    files: workspace.files || [],
    filesCount: workspace.files?.length || 0
  };
};

const matchesMember = (member, targetId) => {
  if (!member || !targetId) return false;
  const targetStr = String(targetId);
  const userStr = member.user ? String(member.user._id || member.user) : null;
  const memberIdStr = member._id ? String(member._id) : null;
  return userStr === targetStr || memberIdStr === targetStr;
};

const requireWorkspaceOwner = (workspace, userId) => {
  if (!workspace || !workspace.owner || !userId) return false;
  const ownerId = String(workspace.owner._id || workspace.owner);
  const targetUserId = String(userId._id || userId);
  return ownerId === targetUserId;
};

const getWorkspaceRole = (workspace, userId) => {
  if (!workspace || !userId) return null;
  if (requireWorkspaceOwner(workspace, userId)) return 'owner';
  const targetUserId = String(userId._id || userId);
  const member = (workspace.members || []).find(item => {
    const itemUserId = item.user ? String(item.user._id || item.user) : null;
    return itemUserId === targetUserId;
  });
  return member?.role || null;
};

const hasWorkspaceRole = (workspace, userId, roles) => {
  const role = getWorkspaceRole(workspace, userId);
  return role && roles.includes(role);
};

/**
 * 1. Create a new Workspace
 * POST /api/workspaces
 */
exports.createWorkspace = async (req, res) => {
  try {
    const { title, description, language = 'javascript', brandColor = 'purple', icon = 'Rocket', isPublic = false } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Workspace title is required.' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required to create a workspace.' });
    }

    // Normalize language to match Workspace model enum
    const rawLang = (language || 'javascript').toLowerCase();
    const schemaLanguages = ['javascript', 'python', 'cpp', 'java', 'rust', 'go', 'typescript'];
    let normalizedLanguage = 'javascript';
    if (schemaLanguages.includes(rawLang)) {
      normalizedLanguage = rawLang;
    } else if (rawLang === 'c') {
      normalizedLanguage = 'cpp';
    }

    const starterFiles = getStarterFiles(rawLang, title.trim());
    const inviteCode = generateInviteCode();

    const workspace = new Workspace({
      title: title.trim(),
      description: description ? description.trim() : `Collaborative development workspace on CodeTrail`,
      owner: userId,
      members: [
        {
          user: userId,
          role: 'owner',
          joinedAt: new Date()
        }
      ],
      inviteCode,
      language: normalizedLanguage,
      files: starterFiles,
      brandColor: ['purple', 'cyan', 'emerald', 'rose', 'amber', 'blue'].includes(brandColor) ? brandColor : 'purple',
      icon: icon || 'Rocket',
      status: 'active',
      settings: {
        isPublic: !!isPublic,
        allowAnonymousExecution: false,
        autoSaveInterval: 3000
      },
      activityLogs: [
        {
          id: `h-${Date.now()}`,
          type: 'settings',
          title: 'Workspace Created',
          details: `Workspace "${title.trim()}" initialized with default configuration.`,
          user: req.user?.name || 'Developer',
          timestamp: new Date()
        }
      ]
    });

    await workspace.save();

    const populatedWorkspace = await Workspace.findById(workspace._id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    const summary = formatWorkspaceSummary(populatedWorkspace, userId);
    const responsePayload = {
      ...(populatedWorkspace.toObject ? populatedWorkspace.toObject() : populatedWorkspace),
      ...summary
    };

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: responsePayload
    });

  } catch (err) {
    console.error('Create Workspace Error:', err);
    res.status(500).json({ message: 'Failed to create workspace', error: err.message });
  }
};

/**
 * 2. Get all workspaces for the authenticated user
 * GET /api/workspaces
 */
exports.getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required to fetch workspaces.' });
    }
    const { status, search } = req.query;

    const query = {
      $or: [
        { owner: userId },
        { 'members.user': userId }
      ]
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search && search.trim()) {
      query.title = { $regex: search.trim(), $options: 'i' };
    }

    const workspaces = await Workspace.find(query)
      .sort({ updatedAt: -1 })
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({
      workspaces: workspaces.map(ws => formatWorkspaceSummary(ws, userId))
    });

  } catch (err) {
    console.error('Get Workspaces Error:', err);
    res.status(500).json({ message: 'Failed to fetch workspaces', error: err.message });
  }
};

/**
 * Get active public workspaces that the authenticated user can join.
 * GET /api/workspaces/discover
 */
exports.discoverPublicWorkspaces = async (req, res) => {
  try {
    const userId = req.user._id;
    const workspaces = await Workspace.find({
      status: 'active',
      'settings.isPublic': true,
      owner: { $ne: userId },
      'members.user': { $ne: userId }
    })
      .sort({ updatedAt: -1 })
      .limit(30)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    res.json({ workspaces: workspaces.map(workspace => formatWorkspaceSummary(workspace, userId)) });
  } catch (err) {
    console.error('Discover Public Workspaces Error:', err);
    res.status(500).json({ message: 'Failed to discover public workspaces', error: err.message });
  }
};

/**
 * 3. Get single workspace details by ID
 * GET /api/workspaces/:id
 */
exports.getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user || null;
    const userId = user ? (user._id || user.id) : null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const ownerId = workspace.owner ? (workspace.owner._id || workspace.owner) : null;
    const isMember = userId && workspace.members.some(m => m.user && (m.user._id || m.user).toString() === userId.toString());
    const isOwner = userId && ownerId && ownerId.toString() === userId.toString();

    if (!workspace.settings || !workspace.settings.isPublic) {
      if (!isMember && !isOwner) {
        return res.status(403).json({ message: 'Access denied to this workspace.' });
      }
    }

    res.json({ workspace });

  } catch (err) {
    console.error('Get Workspace Detail Error:', err);
    res.status(500).json({ message: 'Failed to fetch workspace details', error: err.message });
  }
};

/**
 * 4. Update workspace settings or files
 * PATCH /api/workspaces/:id
 */
exports.updateWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const { title, description, language, brandColor, icon, status, settings, files } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid workspace ID format.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const role = getWorkspaceRole(workspace, userId);
    if (!role) {
      return res.status(403).json({ message: 'You are not a member of this workspace.' });
    }

    const changingMetadata = title !== undefined || description !== undefined || language !== undefined || brandColor !== undefined || icon !== undefined || settings !== undefined;
    if (changingMetadata && !hasSettingsPermission(role)) {
      return res.status(403).json({ message: 'Only owners and admins can change workspace settings.' });
    }
    if (files !== undefined && !canModifyFiles(role)) {
      return res.status(403).json({ message: 'Viewers cannot modify workspace files.' });
    }
    if (status !== undefined && !canModifyStatus(role)) {
      return res.status(403).json({ message: 'Only the workspace owner can change workspace status.' });
    }
    if (!changingMetadata && files === undefined && status === undefined) {
      return res.status(403).json({ message: 'You do not have permission to modify this workspace.' });
    }

    // Input validations via workspaceSettingsValidator
    if (title !== undefined) {
      const titleRes = validateWorkspaceTitle(title);
      if (!titleRes.isValid) {
        return res.status(400).json({ message: titleRes.error });
      }
      workspace.title = titleRes.sanitizedTitle;
    }

    if (description !== undefined) {
      const descRes = validateWorkspaceDescription(description);
      if (!descRes.isValid) {
        return res.status(400).json({ message: descRes.error });
      }
      workspace.description = descRes.sanitizedDescription;
    }

    if (language !== undefined) {
      const langRes = validateWorkspaceLanguage(language);
      if (!langRes.isValid) {
        return res.status(400).json({ message: langRes.error });
      }
      workspace.language = langRes.language;
    }

    if (brandColor !== undefined) {
      const colorRes = validateWorkspaceBrandColor(brandColor);
      if (!colorRes.isValid) {
        return res.status(400).json({ message: colorRes.error });
      }
      workspace.brandColor = colorRes.color;
    }

    if (icon !== undefined) {
      workspace.icon = String(icon).trim() || 'Rocket';
    }

    if (status !== undefined && canModifyStatus(role)) {
      const statusRes = validateWorkspaceStatus(status);
      if (!statusRes.isValid) {
        return res.status(400).json({ message: statusRes.error });
      }
      workspace.status = statusRes.status;
    }

    if (settings !== undefined) {
      const prefRes = validateWorkspacePreferences(settings);
      if (!prefRes.isValid) {
        return res.status(400).json({ message: prefRes.error });
      }
      const existingSettings = workspace.settings?.toObject ? workspace.settings.toObject() : (workspace.settings || {});
      workspace.settings = mergeWorkspaceSettings(existingSettings, prefRes.sanitizedSettings);
    }

    if (files && Array.isArray(files)) {
      workspace.files = files;
      workspaceContextService.invalidateWorkspaceIndex(id);
      try {
        const { recordActivity } = require('./activityController');
        let totalLines = 0;
        files.forEach(f => {
          if (f && typeof f.content === 'string') {
            totalLines += f.content.split('\n').length;
          }
        });
        await recordActivity({
          workspaceId: id,
          user: req.user,
          action: 'code_edit',
          details: `Synchronized ${files.length} workspace file(s) (${totalLines} total lines)`,
          linesAdded: Math.max(1, files.length),
          timestamp: new Date()
        });
      } catch (actErr) {
        console.warn('Proof-of-work file sync warning:', actErr.message);
      }
    }

    // Record activity log for workspace settings updates
    const changeSummaries = [];
    if (changingMetadata) {
      if (title !== undefined) changeSummaries.push(`title to "${workspace.title}"`);
      if (language !== undefined) changeSummaries.push(`language to ${workspace.language}`);
      if (settings !== undefined) changeSummaries.push('preferences');
      if (brandColor !== undefined) changeSummaries.push(`theme to ${workspace.brandColor}`);

      try {
        const { recordActivity } = require('./activityController');

        await recordActivity({
          workspaceId: id,
          user: req.user,
          action: 'settings_update',
          details: `Updated workspace settings: ${changeSummaries.join(', ') || 'metadata updated'}`,
          linesAdded: 0,
          timestamp: new Date()
        });
      } catch (actErr) {
        console.warn('Proof-of-work settings update warning:', actErr.message);
      }
    }

    workspace.lastActiveAt = new Date();
    await workspace.save();
    workspaceContextService.invalidateWorkspaceIndex(id);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io && changingMetadata) {
      try {
        const { dispatchNotification } = require('../utils/notificationDeliveryService');
        io.to(`workspace:${id}`).to(`workspace_${id}`).emit('settings_updated', {
          workspaceId: id,
          title: workspace.title,
          description: workspace.description,
          language: workspace.language,
          brandColor: workspace.brandColor,
          icon: workspace.icon,
          settings: workspace.settings,
          updatedBy: req.user ? { id: req.user._id, name: req.user.name } : null
        });

        await dispatchNotification({
          io,
          notification: {
            type: 'settings_updated',
            title: 'Workspace settings updated',
            message: `${req.user?.name || 'A manager'} updated workspace settings (${changeSummaries.join(', ') || 'metadata updated'}).`,
            workspaceId: String(id),
            actorId: String(userId),
            createdAt: new Date().toISOString()
          },
          workspaceContext: workspace,
          includeSender: false
        });
      } catch (notifyErr) {
        console.warn('Settings update notification warning:', notifyErr.message);
      }
    }

    res.json({
      message: 'Workspace updated successfully',
      workspace
    });

  } catch (err) {
    console.error('Update Workspace Error:', err);
    res.status(500).json({ message: 'Failed to update workspace', error: err.message });
  }
};

/**
 * 5. Join workspace using invite code
 * POST /api/workspaces/join
 */
exports.joinWorkspaceByCode = async (req, res) => {
  try {
    const { inviteCode, workspaceId } = req.body;
    const userId = req.user._id;

    if ((!inviteCode || !inviteCode.trim()) && !workspaceId) {
      return res.status(400).json({ message: 'Invite code or public workspace is required.' });
    }

    const workspace = workspaceId
      ? await Workspace.findById(workspaceId)
      : await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!workspace) {
      return res.status(404).json({ message: 'No workspace found with this invite code.' });
    }

    if (workspace.status !== 'active') {
      return res.status(400).json({ message: 'Archived workspaces cannot be joined.' });
    }

    if (workspaceId && !workspace.settings?.isPublic) {
      return res.status(403).json({ message: 'This private workspace requires an invite code.' });
    }

    const alreadyMember = workspace.members.some(m => m.user.toString() === userId.toString());
    if (alreadyMember) {
      return res.json({
        message: 'You are already a member of this workspace.',
        workspaceId: workspace._id,
        workspace: formatWorkspaceSummary(workspace, userId)
      });
    }

    workspace.members.push({
      user: userId,
      role: 'editor',
      joinedAt: new Date()
    });

    await workspace.save();

    res.json({
      message: `Successfully joined ${workspace.title}!`,
      workspaceId: workspace._id,
      workspace: formatWorkspaceSummary(workspace, userId)
    });

  } catch (err) {
    console.error('Join Workspace Error:', err);
    res.status(500).json({ message: 'Failed to join workspace', error: err.message });
  }
};

/**
 * 6. Delete or Archive Workspace
 * DELETE /api/workspaces/:id
 */
exports.deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the workspace owner can delete this workspace.' });
    }

    await Workspace.findByIdAndDelete(id);
    workspaceContextService.invalidateWorkspaceIndex(id);

    res.json({ message: 'Workspace deleted successfully.' });

  } catch (err) {
    console.error('Delete Workspace Error:', err);
    res.status(500).json({ message: 'Failed to delete workspace', error: err.message });
  }
};

/**
 * 7. Update Workspace Session Activity & Time Spent
 * PATCH /api/workspaces/:id/session
 */
exports.updateWorkspaceSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { sessionMinutes = 0, files } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid workspace ID format.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace session not found.' });
    }

    if (!hasWorkspaceRole(workspace, userId, ['owner', 'admin', 'editor'])) {
      return res.status(403).json({ message: 'You do not have permission to update this workspace session.' });
    }

    workspace.lastActiveAt = new Date();

    if (sessionMinutes > 0) {
      const match = (workspace.timeSpent || '0h 0m').match(/(\d+)h\s*(\d+)m/);
      let currentMins = 0;
      if (match) {
        currentMins = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
      }
      const totalMins = currentMins + sessionMinutes;
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      workspace.timeSpent = `${hours}h ${mins}m`;
    }

    if (files && Array.isArray(files)) {
      workspace.files = files;
      workspaceContextService.invalidateWorkspaceIndex(id);
    }

    await workspace.save();

    res.json({
      message: 'Workspace session updated successfully',
      lastActiveAt: workspace.lastActiveAt,
      timeSpent: workspace.timeSpent
    });

  } catch (err) {
    console.error('Update Workspace Session Error:', err);
    res.status(500).json({ message: 'Failed to update workspace session', error: err.message });
  }
};

/**
 * 8. Get Workspace Activity History Logs from DB
 * GET /api/workspaces/:id/history
 */
exports.getWorkspaceHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ historyLogs: [] });
    }

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!hasWorkspaceRole(workspace, req.user._id, ['owner', 'admin', 'editor', 'viewer'])) {
      return res.status(403).json({ message: 'You do not have access to this workspace history.' });
    }

    return res.json({
      historyLogs: workspace.activityLogs || []
    });
  } catch (err) {
    console.error('Get Workspace History Error:', err);
    res.status(500).json({ message: 'Failed to fetch workspace history logs', error: err.message });
  }
};

/**
 * 9. Add Activity History Log entry in DB
 * POST /api/workspaces/:id/history
 */
exports.addWorkspaceHistoryLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'session', title, details, user, sessionDuration } = req.body;

    if (!title || !details) {
      return res.status(400).json({ message: 'Title and details are required for history log.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(201).json({
        message: 'History log recorded',
        historyLogs: []
      });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!hasWorkspaceRole(workspace, req.user._id, ['owner', 'admin', 'editor'])) {
      return res.status(403).json({ message: 'You do not have permission to add history logs.' });
    }

    const newLog = {
      id: `h-${Date.now()}`,
      type,
      title: title.trim(),
      details: details.trim(),
      user: req.user?.name || 'Developer',
      sessionDuration: sessionDuration || null,
      timestamp: new Date()
    };

    workspace.activityLogs = [newLog, ...(workspace.activityLogs || [])];
    await workspace.save();

    // Automatically record into the cryptographic Proof-of-Work activity chain
    try {
      const { recordActivity } = require('./activityController');
      const actionMap = {
        session: 'session_start',
        'session-end': 'session_end',
        file: 'code_edit',
        member: 'member_join',
        settings: 'settings_update',
        code: 'code_edit',
        execution: 'code_execution',
        language: 'settings_update'
      };
      await recordActivity({
        workspaceId: id,
        user: req.user,
        action: actionMap[type] || 'general',
        details: `${title.trim()}: ${details.trim()}`,
        timestamp: newLog.timestamp
      });
    } catch (actErr) {
      console.warn('Proof-of-work auto-record warning:', actErr.message);
    }

    res.status(201).json({
      message: 'History log recorded',
      historyLogs: workspace.activityLogs
    });

  } catch (err) {
    console.error('Add Workspace History Error:', err);
    res.status(500).json({ message: 'Failed to add workspace history log', error: err.message });
  }
};

/**
 * 10. Clear Workspace History in DB
 * DELETE /api/workspaces/:id/history
 */
exports.clearWorkspaceHistory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ message: 'Workspace history cleared successfully', historyLogs: [] });
    }

    const workspace = await Workspace.findById(id);

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!hasWorkspaceRole(workspace, req.user._id, ['owner', 'admin'])) {
      return res.status(403).json({ message: 'Only owners and admins can clear workspace history.' });
    }

    workspace.activityLogs = [];
    await workspace.save();

    res.json({ message: 'Workspace history cleared successfully', historyLogs: [] });

  } catch (err) {
    console.error('Clear Workspace History Error:', err);
    res.status(500).json({ message: 'Failed to clear workspace history', error: err.message });
  }
};

/**
 * 11. Get Workspace Members & Permissions from DB
 * GET /api/workspaces/:id/members
 */
exports.getWorkspaceMembers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ members: [] });
    }

    let query = Workspace.findById(id);
    if (query && typeof query.populate === 'function') {
      query = query.populate('owner', 'name email avatar status').populate('members.user', 'name email avatar status');
    }
    const workspace = await query;

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const userId = req.user ? (req.user._id || req.user.id) : null;
    const isPublic = Boolean(workspace.settings?.isPublic);

    if (!userId && !isPublic) {
      return res.status(401).json({ message: 'Authentication required to access workspace members.' });
    }

    const requesterRole = userId ? getWorkspaceRole(workspace, userId) : (isPublic ? 'viewer' : null);
    if (!requesterRole && !isPublic) {
      return res.status(403).json({ message: 'You do not have access to workspace members.' });
    }

    const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : null;
    const members = [];
    const seenUserIds = new Set();

    // 1. Always ensure workspace owner is present at the top of the roster
    if (workspace.owner && ownerId) {
      const oUser = workspace.owner;
      const ownerPerms = getRolePermissions('owner');
      members.push({
        id: ownerId,
        userId: ownerId,
        name: oUser.name || 'Workspace Owner',
        email: oUser.email || 'owner@codetrail.dev',
        role: 'owner',
        status: oUser.status || 'online',
        joinedAt: workspace.createdAt || new Date(),
        isOwner: true,
        permissions: ownerPerms.capabilities,
        permissionList: ownerPerms.permissionList,
        roleDetails: ownerPerms
      });
      seenUserIds.add(ownerId);
    }

    // 2. Format remaining members with their role capabilities and permissions
    (workspace.members || []).forEach(m => {
      const u = m.user;
      const uId = u?._id ? u._id.toString() : (m.user ? m.user.toString() : (m._id ? m._id.toString() : null));
      if (uId && seenUserIds.has(uId)) {
        return; // Avoid duplicating owner
      }
      if (uId) seenUserIds.add(uId);

      const mRole = m.role || 'editor';
      const rolePerms = getRolePermissions(mRole);

      members.push({
        id: uId || (m._id ? m._id.toString() : `mem-${members.length}`),
        userId: uId,
        name: u?.name || 'Collaborator',
        email: u?.email || 'member@codetrail.dev',
        role: mRole,
        status: u?.status || 'online',
        joinedAt: m.joinedAt,
        isOwner: false,
        permissions: rolePerms.capabilities,
        permissionList: rolePerms.permissionList,
        roleDetails: rolePerms
      });
    });

    res.json({
      workspaceId: id,
      members,
      currentUserRole: requesterRole || 'viewer',
      currentUserPermissions: getRolePermissions(requesterRole || 'viewer'),
      roleDefinitions: getAllRoleDefinitions()
    });
  } catch (err) {
    console.error('Get Workspace Members Error:', err);
    res.status(500).json({ message: 'Failed to fetch members from database', error: err.message });
  }
};

/**
 * 12. Add/Invite Workspace Member to DB
 * POST /api/workspaces/:id/members
 */
exports.addWorkspaceMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role = 'editor' } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required to invite member.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const requesterRole = getWorkspaceRole(workspace, req.user._id);
    const inviteCheck = canInviteMember({ requesterRole, inviteRole: role });
    if (!inviteCheck.allowed) {
      return res.status(inviteCheck.statusCode || 403).json({ message: inviteCheck.reason });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in database
    let targetUser = await User.findOne({ email: cleanEmail });
    if (!targetUser) {
      return res.status(404).json({ message: 'No CodeTrail account exists for this email yet.' });
    }

    const targetUserIdStr = targetUser._id.toString();
    const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : null;
    if (ownerId && ownerId === targetUserIdStr) {
      return res.status(400).json({ message: 'The workspace owner is already part of the workspace.' });
    }

    // Check if already in workspace
    const alreadyExists = (workspace.members || []).some(m => m.user && m.user.toString() === targetUserIdStr);
    if (alreadyExists) {
      return res.status(400).json({ message: 'User is already a member of this workspace.' });
    }

    const normalizedRole = role.toLowerCase().trim();

    // Add to members array in DB
    workspace.members.push({
      user: targetUser._id,
      role: normalizedRole,
      joinedAt: new Date()
    });

    // Add history log in DB
    workspace.activityLogs = [
      {
        id: `h-${Date.now()}`,
        type: 'member',
        title: 'Member Invited',
        details: `Invited ${targetUser.name} (${cleanEmail}) as ${normalizedRole.toUpperCase()}.`,
        user: req.user?.name || 'Developer',
        timestamp: new Date()
      },
      ...(workspace.activityLogs || [])
    ];

    await workspace.save();

    const rolePerms = getRolePermissions(normalizedRole);
    const newMember = {
      id: targetUser._id.toString(),
      userId: targetUser._id.toString(),
      name: targetUser.name || 'Collaborator',
      email: cleanEmail,
      role: normalizedRole,
      status: 'online',
      joinedAt: new Date(),
      isOwner: false,
      permissions: rolePerms.capabilities,
      permissionList: rolePerms.permissionList,
      roleDetails: rolePerms
    };

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      try {
        const { dispatchNotification } = require('../utils/notificationDeliveryService');
        await dispatchNotification({
          io,
          notification: {
            type: 'workspace_invitation',
            title: 'Workspace invitation',
            message: `${req.user?.name || 'A collaborator'} invited you to join ${workspace.title}.`,
            workspaceId: workspace._id.toString(),
            workspaceTitle: workspace.title,
            invitedBy: req.user?._id?.toString() || null,
            targetUserId: targetUserIdStr,
            createdAt: new Date().toISOString()
          },
          workspaceContext: workspace
        });
      } catch (notifyErr) {
        console.warn('Workspace invitation notification warning:', notifyErr.message);
      }
    }

    res.status(201).json({
      message: `Successfully invited ${targetUser.name}!`,
      member: newMember
    });

  } catch (err) {
    console.error('Add Workspace Member Error:', err);
    res.status(500).json({ message: 'Failed to invite workspace member', error: err.message });
  }
};

/**
 * 13. Update Member Role in DB
 * PATCH /api/workspaces/:id/members/:memberId
 */
exports.updateWorkspaceMemberRole = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const requesterRole = getWorkspaceRole(workspace, req.user._id);
    const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : '';
    const isOwnerTarget = ownerId && (ownerId === String(memberId));

    const memberItem = (workspace.members || []).find(m => matchesMember(m, memberId));
    if (!memberItem && !isOwnerTarget) {
      return res.status(404).json({ message: 'Member not found in workspace.' });
    }

    const targetCurrentRole = isOwnerTarget ? 'owner' : (memberItem?.role || 'editor');

    const authCheck = canAssignRole({
      requesterRole,
      targetCurrentRole,
      targetNewRole: role,
      isOwnerTarget
    });

    if (!authCheck.allowed) {
      return res.status(authCheck.statusCode || 403).json({ message: authCheck.reason });
    }

    const normalizedRole = role.toLowerCase().trim();
    memberItem.role = normalizedRole;

    // Fetch user name for history log
    const targetUserId = memberItem.user ? (memberItem.user._id || memberItem.user) : null;
    let userName = 'Collaborator';
    if (targetUserId) {
      try {
        const targetUser = await User.findById(targetUserId);
        if (targetUser) userName = targetUser.name;
      } catch (uErr) {
        // Non-blocking fallback
      }
    }

    workspace.activityLogs = [
      {
        id: `h-${Date.now()}`,
        type: 'member',
        title: 'Member Role Updated',
        details: `Updated ${userName}'s role to ${normalizedRole.toUpperCase()}.`,
        user: req.user?.name || 'Developer',
        timestamp: new Date()
      },
      ...(workspace.activityLogs || [])
    ];

    await workspace.save();

    const rolePerms = getRolePermissions(normalizedRole);
    const targetUserIdStr = targetUserId ? targetUserId.toString() : String(memberId);

    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      try {
        const { dispatchNotification } = require('../utils/notificationDeliveryService');

        // Broadcast member role update to workspace room for real-time collaborator UI updates
        io.to(`workspace:${id}`).to(`workspace_${id}`).emit('member_role_updated', {
          workspaceId: id,
          memberId: targetUserIdStr,
          newRole: normalizedRole,
          permissions: rolePerms.capabilities
        });

        // Personal role update event directly to target user
        io.to(`user:${targetUserIdStr}`).emit('role_updated', {
          workspaceId: id,
          newRole: normalizedRole,
          permissions: rolePerms.capabilities
        });

        // Personal security alert notification (gated by target user's securityAlerts preference)
        await dispatchNotification({
          io,
          notification: {
            type: 'security_alert',
            title: 'Role permissions updated',
            message: `Your role in "${workspace.title}" was updated to ${normalizedRole.toUpperCase()} by ${req.user?.name || 'an administrator'}.`,
            workspaceId: String(id),
            actorId: req.user?._id ? String(req.user._id) : null,
            targetUserId: targetUserIdStr,
            newRole: normalizedRole,
            createdAt: new Date().toISOString()
          },
          workspaceContext: workspace
        });
      } catch (notifyErr) {
        console.warn('Update member role notification warning:', notifyErr.message);
      }
    }

    res.json({
      message: 'Member role updated successfully.',
      member: {
        id: targetUserId ? targetUserId.toString() : memberId,
        userId: targetUserId ? targetUserId.toString() : memberId,
        name: userName,
        role: memberItem.role,
        permissions: rolePerms.capabilities,
        permissionList: rolePerms.permissionList,
        roleDetails: rolePerms
      }
    });

  } catch (err) {
    console.error('Update Workspace Member Role Error:', err);
    res.status(500).json({ message: 'Failed to update member role', error: err.message });
  }
};

/**
 * 14. Remove Member from DB Workspace
 * DELETE /api/workspaces/:id/members/:memberId
 */
exports.removeWorkspaceMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const requesterRole = getWorkspaceRole(workspace, req.user._id);
    const ownerId = workspace.owner ? String(workspace.owner._id || workspace.owner) : '';
    const isOwnerTarget = ownerId && (ownerId === String(memberId));

    const targetMember = (workspace.members || []).find(m => matchesMember(m, memberId));
    if (!targetMember && !isOwnerTarget) {
      return res.status(404).json({ message: 'Member not found in workspace.' });
    }

    const targetRole = isOwnerTarget ? 'owner' : (targetMember?.role || 'editor');

    const removeCheck = canRemoveMember({
      requesterRole,
      targetRole,
      isOwnerTarget
    });

    if (!removeCheck.allowed) {
      return res.status(removeCheck.statusCode || 403).json({ message: removeCheck.reason });
    }

    let userName = 'Collaborator';
    const targetUserId = targetMember.user ? (targetMember.user._id || targetMember.user) : null;
    if (targetUserId) {
      try {
        const targetUser = await User.findById(targetUserId);
        if (targetUser) userName = targetUser.name;
      } catch (uErr) {
        // Non-blocking fallback
      }
    }

    workspace.members = (workspace.members || []).filter(m => !matchesMember(m, memberId));

    workspace.activityLogs = [
      {
        id: `h-${Date.now()}`,
        type: 'member',
        title: 'Member Removed',
        details: `Removed ${userName} from workspace.`,
        user: req.user?.name || 'Developer',
        timestamp: new Date()
      },
      ...(workspace.activityLogs || [])
    ];

    await workspace.save();

    const targetUserIdStr = targetUserId ? targetUserId.toString() : String(memberId);
    const io = req.app?.get ? req.app.get('io') : null;
    if (io) {
      try {
        const { dispatchNotification } = require('../utils/notificationDeliveryService');

        io.to(`workspace:${id}`).to(`workspace_${id}`).emit('member_removed', {
          workspaceId: id,
          memberId: targetUserIdStr
        });

        if (targetUserId) {
          io.to(`user:${targetUserIdStr}`).emit('workspace_removed', {
            workspaceId: id,
            workspaceTitle: workspace.title
          });

          await dispatchNotification({
            io,
            notification: {
              type: 'security_alert',
              title: 'Removed from workspace',
              message: `You were removed from workspace "${workspace.title}" by ${req.user?.name || 'an administrator'}.`,
              workspaceId: String(id),
              actorId: req.user?._id ? String(req.user._id) : null,
              targetUserId: targetUserIdStr,
              createdAt: new Date().toISOString()
            },
            workspaceContext: workspace
          });
        }
      } catch (notifyErr) {
        console.warn('Remove member notification warning:', notifyErr.message);
      }
    }

    res.json({ message: 'Member removed successfully.', memberId });

  } catch (err) {
    console.error('Remove Workspace Member Error:', err);
    res.status(500).json({ message: 'Failed to remove member', error: err.message });
  }
};

/**
 * 15. Get Workspace Permissions & Capability Matrix
 * GET /api/workspaces/:id/permissions
 */
exports.getWorkspacePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user ? (req.user._id || req.user.id) : null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const isPublic = Boolean(workspace.settings?.isPublic);
    if (!userId && !isPublic) {
      return res.status(401).json({ message: 'Authentication required to view workspace permissions.' });
    }

    const role = userId ? (getWorkspaceRole(workspace, userId) || (isPublic ? 'viewer' : null)) : (isPublic ? 'viewer' : null);
    if (!role) {
      return res.status(403).json({ message: 'You do not have access to this workspace.' });
    }

    const userPerms = getRolePermissions(role);
    const definitions = getAllRoleDefinitions();

    res.json({
      workspaceId: id,
      userRole: role,
      permissions: userPerms.capabilities,
      permissionList: userPerms.permissionList,
      roleDetails: userPerms,
      roleDefinitions: definitions
    });
  } catch (err) {
    console.error('Get Workspace Permissions Error:', err);
    res.status(500).json({ message: 'Failed to fetch workspace permissions', error: err.message });
  }
};



/**
 * 14. Cross-Workspace History Aggregation (CT-233)
 * GET /api/workspaces/user/history
 * Aggregates user-scoped activity history across all authorized workspaces without requiring N round-trips.
 *
 * Query Parameters:
 *   - page (default 1)
 *   - limit (default 20, max 100)
 *   - workspaceId (optional: filter to a single authorized workspace)
 *   - category (all | workspace | code_execution | code | tasks)
 *   - action (specific activity action)
 *   - search / q (text search in details, fileName, actor name, or workspace title)
 *   - dateRange / timeRange (today | week | month | all)
 *   - startDate / endDate (ISO strings)
 *   - userOnly / scope=user (filter to events where userId == current user)
 */

const formatRelativeTime = (date) => {
  if (!date) return 'Just now';
  const now = Date.now();
  const timeMs = new Date(date).getTime();
  if (isNaN(timeMs)) return 'Recently';
  const diffSec = Math.floor((now - timeMs) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const mapActionToCategory = (action) => {
  if (!action) return 'workspace';
  if (action === 'code_execution') return 'code_execution';
  if (['code_edit', 'file_create', 'file_delete', 'file_rename'].includes(action)) return 'workspace';
  if (['session_start', 'session_end'].includes(action)) return 'tasks';
  return 'workspace';
};

exports.getUserCrossWorkspaceHistory = async (req, res) => {
  try {
    const userId = req.user ? (req.user._id || req.user.id) : null;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required to access workspace history.' });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const {
      workspaceId,
      category,
      action,
      search,
      q,
      dateRange,
      timeRange,
      startDate,
      endDate,
      userOnly,
      scope
    } = req.query;

    let authorizedWorkspaces = [];
    let authorizedWorkspaceIds = [];
    const workspaceRoleMap = {};
    const workspaceMetaMap = {};

    // 1. Role & Security Guards: Validate target workspace(s) and private workspace boundaries
    if (workspaceId) {
      if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
        return res.status(400).json({ message: 'Invalid workspace ID format.' });
      }

      const targetWorkspace = await Workspace.findById(workspaceId)
        .select('_id title language brandColor icon settings owner members activityLogs')
        .lean();

      if (!targetWorkspace) {
        return res.status(404).json({ message: 'Workspace not found.' });
      }

      const role = getWorkspaceRole(targetWorkspace, userId);
      const isPublic = targetWorkspace.settings?.isPublic === true;

      // Private workspace security guard: viewer/editor/admin/owner role required
      if (!role && !isPublic) {
        return res.status(403).json({ message: 'You do not have access to this workspace history.' });
      }

      authorizedWorkspaces = [targetWorkspace];
      authorizedWorkspaceIds = [targetWorkspace._id];
      workspaceRoleMap[targetWorkspace._id.toString()] = role || (isPublic ? 'viewer' : null);
      workspaceMetaMap[targetWorkspace._id.toString()] = targetWorkspace;
    } else {
      // Cross-workspace lookup: find all workspaces accessible to the user
      const userWorkspaces = await Workspace.find({
        $or: [
          { owner: userId },
          { 'members.user': userId },
          { 'settings.isPublic': true }
        ]
      })
        .select('_id title language brandColor icon settings owner members activityLogs')
        .lean();

      if (!userWorkspaces || userWorkspaces.length === 0) {
        return res.json({
          success: true,
          history: [],
          activities: [],
          pagination: {
            total: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          },
          summary: {
            totalWorkspaces: 0,
            totalEvents: 0,
            uniqueActorsCount: 0
          }
        });
      }

      authorizedWorkspaces = userWorkspaces;
      authorizedWorkspaceIds = userWorkspaces.map(w => w._id);
      userWorkspaces.forEach(w => {
        const role = getWorkspaceRole(w, userId) || (w.settings?.isPublic ? 'viewer' : null);
        workspaceRoleMap[w._id.toString()] = role;
        workspaceMetaMap[w._id.toString()] = w;
      });
    }

    // 2. Build Query Filters for ActivityLog collection
    const logQuery = {
      workspaceId: { $in: authorizedWorkspaceIds }
    };

    // User-scoped filter
    if (userOnly === 'true' || scope === 'user') {
      logQuery.userId = new mongoose.Types.ObjectId(userId);
    } else if (req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      logQuery.userId = new mongoose.Types.ObjectId(req.query.userId);
    }

    // Category / Action filter
    const activeCategory = (category || '').trim().toLowerCase();
    if (action && action !== 'all') {
      logQuery.action = action;
    } else if (activeCategory && activeCategory !== 'all') {
      if (activeCategory === 'code_execution' || activeCategory === 'execution' || activeCategory === 'runs') {
        logQuery.action = 'code_execution';
      } else if (activeCategory === 'code' || activeCategory === 'code_edit') {
        logQuery.action = { $in: ['code_edit', 'file_create', 'file_delete', 'file_rename'] };
      } else if (activeCategory === 'workspace') {
        logQuery.action = { $in: ['code_edit', 'file_create', 'file_delete', 'file_rename', 'role_change', 'member_join', 'member_leave', 'settings_update'] };
      } else if (activeCategory === 'tasks' || activeCategory === 'session') {
        logQuery.action = { $in: ['session_start', 'session_end'] };
      }
    }

    // Date Range filter
    const activeDateRange = (dateRange || timeRange || '').trim().toLowerCase();
    const now = new Date();
    if (startDate || endDate) {
      logQuery.timestamp = {};
      if (startDate) logQuery.timestamp.$gte = new Date(startDate);
      if (endDate) logQuery.timestamp.$lte = new Date(endDate);
    } else if (activeDateRange === 'today') {
      const startOfDay = new Date(Math.min(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(), now.getTime() - 24 * 60 * 60 * 1000));
      logQuery.timestamp = { $gte: startOfDay };
    } else if (activeDateRange === 'week' || activeDateRange === 'this_week') {
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      logQuery.timestamp = { $gte: startOfWeek };
    } else if (activeDateRange === 'month') {
      const startOfMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      logQuery.timestamp = { $gte: startOfMonth };
    }

    // Text Search filter (searches across event descriptions, file names, actor names, and workspace titles)
    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      const safeEscaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(safeEscaped, 'i');
      const matchingWorkspaceIds = authorizedWorkspaces
        .filter(ws => ws.title && searchRegex.test(ws.title))
        .map(ws => ws._id);

      const orConditions = [
        { details: { $regex: safeEscaped, $options: 'i' } },
        { fileName: { $regex: safeEscaped, $options: 'i' } },
        { userName: { $regex: safeEscaped, $options: 'i' } }
      ];

      if (matchingWorkspaceIds.length > 0) {
        orConditions.push({ workspaceId: { $in: matchingWorkspaceIds } });
      }

      logQuery.$or = orConditions;
    }

    // 3. Execute Primary Aggregation against ActivityLog Collection
    let [totalCount, logs] = await Promise.all([
      ActivityLog.countDocuments(logQuery),
      ActivityLog.find(logQuery)
        .populate('userId', 'name email avatar role username')
        .populate('workspaceId', 'title language brandColor icon settings owner')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // 4. Fallback: If ActivityLog collection has 0 items, check embedded workspace.activityLogs
    if (totalCount === 0 && (!logs || logs.length === 0)) {
      let embeddedList = [];
      authorizedWorkspaces.forEach(ws => {
        const userRole = workspaceRoleMap[ws._id.toString()] || 'viewer';
        if (Array.isArray(ws.activityLogs)) {
          ws.activityLogs.forEach((entry, idx) => {
            const entryTime = entry.timestamp ? new Date(entry.timestamp) : new Date();
            embeddedList.push({
              _id: entry.id || `emb-${ws._id}-${idx}`,
              id: entry.id || `emb-${ws._id}-${idx}`,
              workspaceId: ws,
              userId: ws.owner,
              userName: entry.user || 'Developer',
              userEmail: '',
              userRole: userRole,
              action: entry.type === 'execution'
                ? 'code_execution'
                : (entry.type === 'session'
                    ? 'session_start'
                    : (entry.type === 'session-end'
                        ? 'session_end'
                        : (entry.type === 'file'
                            ? 'file_create'
                            : (entry.type === 'code'
                                ? 'code_edit'
                                : (entry.type === 'member'
                                    ? 'member_join'
                                    : (entry.type === 'settings'
                                        ? 'settings_update'
                                        : 'general')))))),
              details: entry.details ? `${entry.title ? entry.title + ': ' : ''}${entry.details}` : (entry.title || 'Workspace action'),
              fileName: entry.fileName || null,
              linesAdded: 0,
              linesDeleted: 0,
              totalLinesChanged: 0,
              executionId: null,
              executionStatus: null,
              sequenceNumber: idx + 1,
              currentHash: null,
              timestamp: entryTime
            });
          });
        }
      });

      // Apply in-memory search and category filtering for embedded fallback
      if (searchTerm) {
        const reg = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        embeddedList = embeddedList.filter(item => 
          reg.test(item.details || '') || 
          reg.test(item.userName || '') || 
          reg.test(item.fileName || '') ||
          (item.workspaceId && reg.test(item.workspaceId.title || ''))
        );
      }
      if (activeCategory && activeCategory !== 'all') {
        if (activeCategory === 'code_execution' || activeCategory === 'runs' || activeCategory === 'execution') {
          embeddedList = embeddedList.filter(item => item.action === 'code_execution');
        } else if (activeCategory === 'code' || activeCategory === 'workspace') {
          embeddedList = embeddedList.filter(item => ['code_edit', 'file_create', 'file_delete', 'file_rename', 'role_change', 'member_join', 'member_leave', 'settings_update'].includes(item.action));
        } else if (activeCategory === 'tasks' || activeCategory === 'session') {
          embeddedList = embeddedList.filter(item => ['session_start', 'session_end'].includes(item.action));
        }
      }
      if (activeDateRange === 'today') {
        const startOfDay = Math.min(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(), now.getTime() - 24 * 60 * 60 * 1000);
        embeddedList = embeddedList.filter(item => new Date(item.timestamp).getTime() >= startOfDay);
      } else if (activeDateRange === 'week' || activeDateRange === 'this_week') {
        const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        embeddedList = embeddedList.filter(item => new Date(item.timestamp).getTime() >= startOfWeek);
      }

      embeddedList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      totalCount = embeddedList.length;
      logs = embeddedList.slice(skip, skip + limit);
    }

    // 5. Canonical formatting & transformation for consumer components
    const actorIdSet = new Set();
    const workspaceIdSet = new Set();

    const formattedHistory = logs.map(item => {
      const wsDoc = item.workspaceId && typeof item.workspaceId === 'object' 
        ? item.workspaceId 
        : (workspaceMetaMap[String(item.workspaceId)] || null);
      
      const wsIdStr = wsDoc?._id ? wsDoc._id.toString() : String(item.workspaceId || '');
      if (wsIdStr) workspaceIdSet.add(wsIdStr);

      const userRole = wsIdStr ? (workspaceRoleMap[wsIdStr] || 'viewer') : (item.userRole || 'editor');

      const actorUser = item.userId && typeof item.userId === 'object' ? item.userId : null;
      const actorId = actorUser?._id ? actorUser._id.toString() : (item.userId ? item.userId.toString() : null);
      if (actorId) actorIdSet.add(actorId);

      const actorName = actorUser?.name || item.userName || 'Developer';
      const actorEmail = actorUser?.email || item.userEmail || '';
      const actorAvatar = actorUser?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(actorName)}`;

      return {
        id: item._id ? item._id.toString() : item.id,
        _id: item._id ? item._id.toString() : item.id,
        workspace: {
          id: wsIdStr,
          _id: wsIdStr,
          title: wsDoc?.title || 'Collaborative Workspace',
          language: wsDoc?.language || 'javascript',
          brandColor: wsDoc?.brandColor || 'purple',
          icon: wsDoc?.icon || 'Rocket',
          isPublic: wsDoc?.settings?.isPublic ?? false,
          userRole
        },
        actor: {
          id: actorId,
          _id: actorId,
          name: actorName,
          email: actorEmail,
          avatar: actorAvatar,
          role: item.userRole || userRole || 'editor'
        },
        action: item.action || 'general',
        category: mapActionToCategory(item.action),
        fileName: item.fileName || null,
        fileId: item.fileId || null,
        details: item.details || '',
        linesAdded: item.linesAdded || 0,
        linesDeleted: item.linesDeleted || 0,
        totalLinesChanged: item.totalLinesChanged || ((item.linesAdded || 0) + (item.linesDeleted || 0)),
        executionId: item.executionId ? (item.executionId._id ? item.executionId._id.toString() : item.executionId.toString()) : null,
        executionStatus: item.executionStatus || null,
        sequenceNumber: item.sequenceNumber || 1,
        currentHash: item.currentHash || null,
        timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : new Date().toISOString(),
        relativeTime: formatRelativeTime(item.timestamp)
      };
    });

    const totalPages = Math.ceil(totalCount / limit) || 0;

    res.json({
      success: true,
      history: formattedHistory,
      activities: formattedHistory,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      summary: {
        totalWorkspaces: workspaceIdSet.size || authorizedWorkspaceIds.length,
        totalEvents: totalCount,
        uniqueActorsCount: actorIdSet.size
      }
    });

  } catch (err) {
    console.error('Cross-Workspace User History Error:', err);
    res.status(500).json({ message: 'Failed to fetch cross-workspace user history', error: err.message });
  }
};
