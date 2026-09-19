const crypto = require('crypto');
const mongoose = require('mongoose');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

// Starter file templates based on language
const getStarterFiles = (language, title) => {
  switch (language) {
    case 'python':
      return [
        {
          id: 'main.py',
          name: 'main.py',
          language: 'python',
          content: `# ${title} - CodeTrail Collaborative Workspace\n\ndef main():\n    print("Welcome to ${title}!")\n    print("Collaborating live with Python runtime.")\n\nif __name__ == "__main__":\n    main()\n`
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
  const ownerId = workspace.owner?._id || workspace.owner;
  const isOwner = ownerId && ownerId.toString() === userId.toString();
  const memberInfo = workspace.members?.find(member => {
    const memberId = member.user?._id || member.user;
    return memberId && memberId.toString() === userId.toString();
  });

  return {
    id: workspace._id,
    _id: workspace._id,
    title: workspace.title,
    name: workspace.title,
    description: workspace.description,
    desc: workspace.description,
    brandColor: workspace.brandColor || 'purple',
    icon: workspace.icon || 'Rocket',
    role: isOwner ? 'owner' : (memberInfo?.role || 'viewer'),
    timeSpent: workspace.timeSpent || '0h 0m',
    status: workspace.status,
    language: workspace.language,
    inviteCode: workspace.inviteCode,
    roomCode: workspace.inviteCode,
    settings: workspace.settings,
    updatedAt: workspace.updatedAt,
    members: (workspace.members || []).map(member => ({
      id: member.user?._id || member.user,
      name: member.user?.name || 'Collaborator',
      email: member.user?.email,
      role: member.role
    })),
    files: workspace.files || [],
    filesCount: workspace.files?.length || 0
  };
};

const requireWorkspaceOwner = (workspace, userId) => {
  return workspace.owner.toString() === userId.toString();
};

const getWorkspaceRole = (workspace, userId) => {
  if (requireWorkspaceOwner(workspace, userId)) return 'owner';
  const member = workspace.members?.find(item => item.user.toString() === userId.toString());
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

    const userId = req.user._id;
    const starterFiles = getStarterFiles(language, title.trim());
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
      language,
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

    res.status(201).json({
      message: 'Workspace created successfully',
      workspace: populatedWorkspace
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
    const userId = req.user._id;
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
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id)
      .populate('owner', 'name email avatar')
      .populate('members.user', 'name email avatar');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const isMember = workspace.members.some(m => m.user && m.user._id.toString() === userId.toString());
    const isOwner = workspace.owner._id.toString() === userId.toString();

    if (!workspace.settings.isPublic && !isMember && !isOwner) {
      return res.status(403).json({ message: 'Access denied to this workspace.' });
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
    if (changingMetadata && !['owner', 'admin'].includes(role)) {
      return res.status(403).json({ message: 'Only owners and admins can change workspace settings.' });
    }
    if (files !== undefined && !['owner', 'admin', 'editor'].includes(role)) {
      return res.status(403).json({ message: 'Viewers cannot modify workspace files.' });
    }
    if (status !== undefined && role !== 'owner') {
      return res.status(403).json({ message: 'Only the workspace owner can change workspace status.' });
    }
    if (!changingMetadata && files === undefined && status === undefined) {
      return res.status(403).json({ message: 'You do not have permission to modify this workspace.' });
    }

    if (title) workspace.title = title.trim();
    if (description !== undefined) workspace.description = description.trim();
    if (language) workspace.language = language;
    if (brandColor) workspace.brandColor = brandColor;
    if (icon) workspace.icon = icon;
    if (status && role === 'owner') workspace.status = status;
    if (settings) workspace.settings = { ...workspace.settings, ...settings };
    if (files && Array.isArray(files)) workspace.files = files;

    workspace.lastActiveAt = new Date();
    await workspace.save();

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
 * 11. Get Workspace Members from DB
 * GET /api/workspaces/:id/members
 */
exports.getWorkspaceMembers = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json({ members: [] });
    }

    const workspace = await Workspace.findById(id).populate('members.user', 'name email avatar status');

    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    if (!hasWorkspaceRole(workspace, req.user._id, ['owner', 'admin', 'editor', 'viewer'])) {
      return res.status(403).json({ message: 'You do not have access to workspace members.' });
    }

    const members = (workspace.members || []).map(m => {
      const u = m.user;
      return {
        id: u?._id ? u._id.toString() : m._id,
        name: u?.name || 'Collaborator',
        email: u?.email || 'member@codetrail.dev',
        role: m.role || 'editor',
        status: u?.status || 'online',
        joinedAt: m.joinedAt
      };
    });

    res.json({ members });
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

    if (!hasWorkspaceRole(workspace, req.user._id, ['owner', 'admin'])) {
      return res.status(403).json({ message: 'Only owners and admins can invite members.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if user exists in database
    let targetUser = await User.findOne({ email: cleanEmail });
    if (!targetUser) {
      return res.status(404).json({ message: 'No CodeTrail account exists for this email yet.' });
    }

    // Check if already in workspace
    const alreadyExists = workspace.members.some(m => m.user && m.user.toString() === targetUser._id.toString());
    if (alreadyExists) {
      return res.status(400).json({ message: 'User is already a member of this workspace.' });
    }

    // Add to members array in DB
    workspace.members.push({
      user: targetUser._id,
      role: ['admin', 'editor', 'viewer'].includes(role) ? role : 'editor',
      joinedAt: new Date()
    });

    // Add history log in DB
    workspace.activityLogs = [
      {
        id: `h-${Date.now()}`,
        type: 'member',
        title: 'Member Invited',
        details: `Invited ${targetUser.name} (${cleanEmail}) as ${role.toUpperCase()}.`,
        user: req.user?.name || 'Developer',
        timestamp: new Date()
      },
      ...(workspace.activityLogs || [])
    ];

    await workspace.save();

    const updatedWorkspace = await Workspace.findById(id).populate('members.user', 'name email avatar status');

    const formattedMembers = (updatedWorkspace.members || []).map(m => ({
      id: m.user?._id ? m.user._id.toString() : m._id,
      name: m.user?.name || 'Collaborator',
      email: m.user?.email || cleanEmail,
      role: m.role || 'editor',
      status: 'online',
      joinedAt: m.joinedAt
    }));

    res.status(201).json({
      message: `Successfully invited ${targetUser.name}!`,
      members: formattedMembers
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

    if (!role || !['owner', 'admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ message: 'Valid role required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const requesterRole = getWorkspaceRole(workspace, req.user._id);
    if (!['owner', 'admin'].includes(requesterRole)) {
      return res.status(403).json({ message: 'Only owners and admins can manage member roles.' });
    }

    if (role === 'owner') {
      return res.status(400).json({ message: 'The workspace owner role cannot be reassigned.' });
    }

    const memberItem = workspace.members.find(m => m.user.toString() === memberId || m._id.toString() === memberId);
    if (!memberItem) {
      return res.status(404).json({ message: 'Member not found in workspace.' });
    }

    if (memberItem.role === 'owner' || (requesterRole === 'admin' && memberItem.role === 'admin')) {
      return res.status(403).json({ message: 'You cannot change this member role.' });
    }
    if (requesterRole === 'admin' && role === 'admin') {
      return res.status(403).json({ message: 'Only the workspace owner can assign admin role.' });
    }

    memberItem.role = role;

    // Add history log in DB
    const targetUser = await User.findById(memberItem.user);
    const userName = targetUser ? targetUser.name : 'Collaborator';

    workspace.activityLogs = [
      {
        id: `h-${Date.now()}`,
        type: 'member',
        title: 'Member Role Updated',
        details: `Updated ${userName}'s role to ${role.toUpperCase()}.`,
        user: req.user?.name || 'Developer',
        timestamp: new Date()
      },
      ...(workspace.activityLogs || [])
    ];

    await workspace.save();

    res.json({ message: 'Member role updated successfully.' });

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
    if (!['owner', 'admin'].includes(requesterRole)) {
      return res.status(403).json({ message: 'Only owners and admins can remove members.' });
    }

    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({ message: 'The workspace owner cannot be removed.' });
    }

    const targetMember = workspace.members.find(m => m.user.toString() === memberId || m._id.toString() === memberId);
    if (targetMember?.role === 'owner' || (requesterRole === 'admin' && targetMember?.role === 'admin')) {
      return res.status(403).json({ message: 'You cannot remove this member.' });
    }
    let userName = 'Collaborator';
    if (targetMember) {
      const targetUser = await User.findById(targetMember.user);
      if (targetUser) userName = targetUser.name;
    }

    workspace.members = workspace.members.filter(m => m.user.toString() !== memberId && m._id.toString() !== memberId);

    // Add history log entry in DB
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

    res.json({ message: 'Member removed successfully.' });

  } catch (err) {
    console.error('Remove Workspace Member Error:', err);
    res.status(500).json({ message: 'Failed to remove member', error: err.message });
  }
};

