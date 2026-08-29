const crypto = require('crypto');
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
      }
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
      workspaces: workspaces.map(ws => {
        const isOwner = ws.owner._id.toString() === userId.toString();
        const memberInfo = ws.members.find(m => m.user && m.user._id.toString() === userId.toString());
        const userRole = isOwner ? 'Lead' : (memberInfo ? (memberInfo.role.charAt(0).toUpperCase() + memberInfo.role.slice(1)) : 'Contributor');

        return {
          id: ws._id,
          title: ws.title,
          desc: ws.description,
          brandColor: ws.brandColor || 'purple',
          icon: ws.icon || 'Rocket',
          role: userRole,
          timeSpent: ws.timeSpent || '0h 0m',
          status: ws.status,
          language: ws.language,
          inviteCode: ws.inviteCode,
          updatedAt: ws.updatedAt,
          collaborators: ws.members.map(m => m.user ? m.user.name.charAt(0).toUpperCase() : 'U'),
          filesCount: ws.files.length
        };
      })
    });

  } catch (err) {
    console.error('Get Workspaces Error:', err);
    res.status(500).json({ message: 'Failed to fetch workspaces', error: err.message });
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
    const { title, description, brandColor, status, settings, files } = req.body;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found.' });
    }

    const isOwner = workspace.owner.toString() === userId.toString();
    const isMember = workspace.members.some(m => m.user.toString() === userId.toString() && ['owner', 'admin', 'editor'].includes(m.role));

    if (!isOwner && !isMember) {
      return res.status(403).json({ message: 'You do not have permission to modify this workspace.' });
    }

    if (title) workspace.title = title.trim();
    if (description !== undefined) workspace.description = description.trim();
    if (brandColor) workspace.brandColor = brandColor;
    if (status && isOwner) workspace.status = status;
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
    const { inviteCode } = req.body;
    const userId = req.user._id;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ message: 'Invite code is required.' });
    }

    const workspace = await Workspace.findOne({ inviteCode: inviteCode.trim().toUpperCase() });
    if (!workspace) {
      return res.status(404).json({ message: 'No workspace found with this invite code.' });
    }

    const alreadyMember = workspace.members.some(m => m.user.toString() === userId.toString());
    if (alreadyMember) {
      return res.json({
        message: 'You are already a member of this workspace.',
        workspaceId: workspace._id
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
      workspaceId: workspace._id
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
