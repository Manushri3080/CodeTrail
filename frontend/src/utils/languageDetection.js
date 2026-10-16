export const LANGUAGE_MAP = {
  '.js': { language: 'javascript', runtime: 'javascript', name: 'JavaScript' },
  '.ts': { language: 'typescript', runtime: 'typescript', name: 'TypeScript' },
  '.py': { language: 'python', runtime: 'python', name: 'Python' },
  '.cpp': { language: 'cpp', runtime: 'c++', name: 'C++' },
  '.c': { language: 'c', runtime: 'c', name: 'C' },
  '.java': { language: 'java', runtime: 'java', name: 'Java' },
  '.rs': { language: 'rust', runtime: 'rust', name: 'Rust' },
  '.go': { language: 'go', runtime: 'go', name: 'Go' },
  '.sh': { language: 'shell', runtime: 'bash', name: 'Shell / Bash' },
  '.sql': { language: 'sql', runtime: 'sqlite3', name: 'SQL' }
};

export const getFileExtension = (filename = '') => {
  const name = String(filename).trim();
  const lastDot = name.lastIndexOf('.');

  if (lastDot <= 0 || lastDot === name.length - 1) {
    return null;
  }

  return name.substring(lastDot).toLowerCase();
};

export const detectLanguage = (filename = '') => {
  const extension = getFileExtension(filename);
  const language = extension ? LANGUAGE_MAP[extension] : null;

  return language ? { extension, ...language } : null;
};
