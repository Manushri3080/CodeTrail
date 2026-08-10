export const INITIAL_TERMINAL_LOGS = [
  'CodeTrail Terminal Workspace v1.0.4',
  'Collaborative Session: Connected',
  'Activity Verification: Active',
  'Type "help" or "status" to begin.'
];

export const processKernelCommand = (rawInput) => {
  const cmd = rawInput.trim().toLowerCase();
  
  switch (cmd) {
    case 'help':
      return {
        action: 'append',
        output: 'Available commands: help, status, connect, modules, clear'
      };
    case 'status':
      return {
        action: 'append',
        output: 'System: ALL SERVICES OPERATIONAL | Latency: 14ms | Sync: Active'
      };
    case 'connect':
      return {
        action: 'append',
        output: 'Connecting to workspace [ws-alpha-9]... Connected!'
      };
    case 'modules':
      return {
        action: 'append',
        output: 'Loaded 8 Platform Modules: Authentication, Workspace, Collaborative Editor, Code Runner, Activity Logging, Analytics, Dashboard, Settings'
      };
    case 'clear':
      return {
        action: 'clear',
        output: null
      };
    default:
      return {
        action: 'append',
        output: `Command executed: ${cmd}`
      };
  }
};
