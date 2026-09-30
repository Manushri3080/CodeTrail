import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Zap,
  Globe,
  Server,
  Terminal,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Code2,
  FileCode,
  Box,
  Layers,
  Check
} from 'lucide-react';

export const FRAMEWORK_TEMPLATES = [
  {
    id: 'react-vite',
    name: 'React 18 (Vite)',
    category: 'Frontend Web Application',
    badge: 'React 18 + Vite',
    badgeColor: 'text-cyan-300 bg-cyan-500/20 border-cyan-500/40',
    borderColor: 'hover:border-cyan-500/60 hover:bg-cyan-500/5',
    icon: Code2,
    iconColor: 'text-cyan-400',
    description: 'Modern single-page web app template with React 18, JSX components, hooks, Vite build tool, and modern CSS.',
    primaryFile: 'src/App.jsx',
    files: [
      {
        name: 'src/App.jsx',
        path: 'src/App.jsx',
        language: 'javascript',
        content: `import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2.5rem', fontFamily: 'Inter, sans-serif', color: '#f3f4f6', background: '#08090e', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid #1f2937', pb: '1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#06b6d4', margin: 0, fontSize: '2rem' }}>⚛️ React + CodeTrail Workspace</h1>
        <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>Real-time collaborative React application initialized with Vite.</p>
      </header>

      <main>
        <div style={{ padding: '2rem', border: '1px solid #374151', borderRadius: '16px', background: '#11131f', maxWidth: '600px' }}>
          <h2 style={{ marginTop: 0, color: '#e5e7eb' }}>Interactive Counter</h2>
          <p style={{ color: '#9ca3af' }}>Current count: <strong style={{ color: '#38bdf8', fontSize: '1.25rem' }}>{count}</strong></p>
          <button 
            onClick={() => setCount(count + 1)}
            style={{ 
              padding: '12px 28px', 
              borderRadius: '9999px', 
              background: '#06b6d4', 
              color: '#ffffff', 
              border: 'none', 
              cursor: 'pointer', 
              fontWeight: 'bold',
              fontSize: '0.9rem',
              transition: 'all 0.2s' 
            }}
          >
            Increment Counter
          </button>
        </div>
      </main>
    </div>
  );
}
`
      },
      {
        name: 'src/main.jsx',
        path: 'src/main.jsx',
        language: 'javascript',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
      },
      {
        name: 'src/index.css',
        path: 'src/index.css',
        language: 'css',
        content: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  background-color: #08090e;
  color: #f3f4f6;
}
`
      },
      {
        name: 'vite.config.js',
        path: 'vite.config.js',
        language: 'javascript',
        content: `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
});
`
      },
      {
        name: 'package.json',
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "codetrail-react-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^4.3.9"
  }
}
`
      },
      {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ⚛️ React + CodeTrail Workspace

This project was scaffolded using **CodeTrail Project Scaffolder**.

## 🚀 Available Commands
- Run \`npm run dev\` in Terminal to start local dev server.
- Run \`npm run build\` to build production bundle.
`
      }
    ]
  },
  {
    id: 'fastapi',
    name: 'FastAPI (Python)',
    category: 'Async Python REST API',
    badge: 'Python 3.12 + FastAPI',
    badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40',
    borderColor: 'hover:border-emerald-500/60 hover:bg-emerald-500/5',
    icon: Zap,
    iconColor: 'text-emerald-400',
    description: 'High performance, asynchronous Python web framework for building modern REST APIs with OpenAPI docs and Pydantic schemas.',
    primaryFile: 'main.py',
    files: [
      {
        name: 'main.py',
        path: 'main.py',
        language: 'python',
        content: `from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(
    title="CodeTrail FastAPI Microservice",
    description="High-performance asynchronous Python REST API",
    version="1.0.0"
)

class Item(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str = "active"

items_db: List[Item] = [
    Item(id=1, title="Collaborative Workspace", description="CodeTrail real-time editor engine"),
    Item(id=2, title="FastAPI Engine", description="Asynchronous REST microservice backend")
]

@app.get("/", tags=["Health"])
def read_root():
    return {
        "status": "online",
        "service": "CodeTrail FastAPI Service",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/api/items", response_model=List[Item], tags=["Items"])
def get_items():
    return items_db

@app.post("/api/items", response_model=Item, status_code=status.HTTP_201_CREATED, tags=["Items"])
def create_item(item: Item):
    items_db.append(item)
    return item

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
`
      },
      {
        name: 'schemas.py',
        path: 'schemas.py',
        language: 'python',
        content: `from pydantic import BaseModel, Field
from typing import Optional

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    role: Optional[str] = "developer"

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
`
      },
      {
        name: 'requirements.txt',
        path: 'requirements.txt',
        language: 'shell',
        content: `fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.6.0
requests==2.31.0
`
      },
      {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ⚡ FastAPI Backend Service

Initialized with **CodeTrail Project Generator**.

## 🚀 Execution Guide
- Run \`python main.py\` or \`uvicorn main:app --reload\` in Terminal.
- Access Swagger UI interactive docs at \`http://localhost:8000/docs\`.
`
      }
    ]
  },
  {
    id: 'django',
    name: 'Django Framework',
    category: 'Full-Stack Python Web App',
    badge: 'Python 3.12 + Django 5',
    badgeColor: 'text-purple-300 bg-purple-500/20 border-purple-500/40',
    borderColor: 'hover:border-purple-500/60 hover:bg-purple-500/5',
    icon: Globe,
    iconColor: 'text-purple-400',
    description: 'Batteries-included Python web framework featuring ORM database models, view functions, URL routes, and templates.',
    primaryFile: 'manage.py',
    files: [
      {
        name: 'manage.py',
        path: 'manage.py',
        language: 'python',
        content: `#!/usr/bin/env python
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError("Couldn't import Django. Are you sure it's installed?") from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
`
      },
      {
        name: 'core/settings.py',
        path: 'core/settings.py',
        language: 'python',
        content: `from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = 'codetrail-demo-secret-key-django'
DEBUG = True
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
]

ROOT_URLCONF = 'core.urls'
WSGI_APPLICATION = 'core.wsgi.application'
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
`
      },
      {
        name: 'core/urls.py',
        path: 'core/urls.py',
        language: 'python',
        content: `from django.contrib import admin
from django.urls import path
from app.views import home_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', home_view, name='home'),
]
`
      },
      {
        name: 'app/views.py',
        path: 'app/views.py',
        language: 'python',
        content: `from django.http import JsonResponse

def home_view(request):
    return JsonResponse({
        "status": "online",
        "app": "CodeTrail Django Web Application",
        "message": "Welcome to Django 5 in CodeTrail Collaborative Workspace!"
    })
`
      },
      {
        name: 'requirements.txt',
        path: 'requirements.txt',
        language: 'shell',
        content: `django==5.0.1
gunicorn==21.2.0
`
      },
      {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# 🎸 Django Web Application

Scaffolded with **CodeTrail Workspace Generator**.

## 🚀 Execution Guide
- Run \`python manage.py runserver\` in Terminal.
- Visit \`http://127.0.0.1:8000/\` to view JSON response.
`
      }
    ]
  },
  {
    id: 'express',
    name: 'Express (Node.js)',
    category: 'Node.js REST Microservice',
    badge: 'Node.js 20 + Express',
    badgeColor: 'text-yellow-300 bg-yellow-500/20 border-yellow-500/40',
    borderColor: 'hover:border-yellow-500/60 hover:bg-yellow-500/5',
    icon: Server,
    iconColor: 'text-yellow-400',
    description: 'Fast, unopinionated, minimalist REST API microservice structure for Node.js with routes, controllers, and CORS.',
    primaryFile: 'server.js',
    files: [
      {
        name: 'server.js',
        path: 'server.js',
        language: 'javascript',
        content: `const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: '🟢 CodeTrail Express API Engine is running live!' });
});

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(\`Server listening on http://localhost:\${PORT}\`);
});
`
      },
      {
        name: 'routes/api.js',
        path: 'routes/api.js',
        language: 'javascript',
        content: `const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.get('/users', (req, res) => {
  res.json([
    { id: 1, name: 'Alice Developer', role: 'FullStack' },
    { id: 2, name: 'Bob Architect', role: 'DevOps' }
  ]);
});

module.exports = router;
`
      },
      {
        name: 'package.json',
        path: 'package.json',
        language: 'json',
        content: `{
  "name": "codetrail-express-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
`
      },
      {
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# 🟢 Node.js Express REST API

Scaffolded with **CodeTrail Workspace Generator**.

## 🚀 Execution Guide
- Run \`node server.js\` or \`npm run dev\` in Terminal.
`
      }
    ]
  },
  {
    id: 'python-app',
    name: 'Python Analytics Starter',
    category: 'Data Processing & CLI App',
    badge: 'Python 3.12',
    badgeColor: 'text-sky-300 bg-sky-500/20 border-sky-500/40',
    borderColor: 'hover:border-sky-500/60 hover:bg-sky-500/5',
    icon: Terminal,
    iconColor: 'text-sky-400',
    description: 'Python script project with data processing helpers, utilities module, sample dataset, and CLI execution.',
    primaryFile: 'main.py',
    files: [
      {
        name: 'main.py',
        path: 'main.py',
        language: 'python',
        content: `import json
from utils import calculate_summary

def main():
    print("🐍 CodeTrail Python Analytics Starter initialized.")
    
    with open('data.json', 'r') as f:
        dataset = json.load(f)

    print(f"Loaded dataset: {dataset['project']}")
    summary = calculate_summary(dataset['records'])
    print(f"Calculated Total Score: {summary['total']}")
    print(f"Average Score: {summary['average']:.2f}")

if __name__ == '__main__':
    main()
`
      },
      {
        name: 'utils.py',
        path: 'utils.py',
        language: 'python',
        content: `def calculate_summary(records):
    values = [r['score'] for r in records if 'score' in r]
    if not values:
        return {'total': 0, 'average': 0.0}
    return {
        'total': sum(values),
        'average': sum(values) / len(values)
    }
`
      },
      {
        name: 'data.json',
        path: 'data.json',
        language: 'json',
        content: `{
  "project": "CodeTrail Analytics Engine",
  "records": [
    { "id": 1, "name": "Module A", "score": 95 },
    { "id": 2, "name": "Module B", "score": 88 },
    { "id": 3, "name": "Module C", "score": 92 }
  ]
}
`
      }
    ]
  },
  {
    id: 'java-app',
    name: 'Java Console App',
    category: 'Java OOP Console Project',
    badge: 'Java 21 + Maven',
    badgeColor: 'text-rose-300 bg-rose-500/20 border-rose-500/40',
    borderColor: 'hover:border-rose-500/60 hover:bg-rose-500/5',
    icon: Cpu,
    iconColor: 'text-rose-400',
    description: 'Standard Java console application structured with Object-Oriented best practices and Maven pom.xml configuration.',
    primaryFile: 'Main.java',
    files: [
      {
        name: 'Main.java',
        path: 'Main.java',
        language: 'java',
        content: `public class Main {
    public static void main(String[] args) {
        System.out.println("☕ CodeTrail Java Console Application");
        System.out.println("Object-Oriented Programming Structure Initialized.");
        
        Utils helper = new Utils();
        helper.printWelcomeBanner("CodeTrail Workspace");
    }
}
`
      },
      {
        name: 'Utils.java',
        path: 'Utils.java',
        language: 'java',
        content: `public class Utils {
    public void printWelcomeBanner(String workspaceName) {
        System.out.println("=========================================");
        System.out.println("  Welcome to " + workspaceName + "!");
        System.out.println("=========================================");
    }
}
`
      },
      {
        name: 'pom.xml',
        path: 'pom.xml',
        language: 'xml',
        content: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.codetrail</groupId>
    <artifactId>java-app</artifactId>
    <version>1.0.0</version>
</project>
`
      }
    ]
  }
];

export const ScaffoldProjectModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(FRAMEWORK_TEMPLATES[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#0f101b] border border-white/15 rounded-3xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
        
        {/* Modal Header Bar */}
        <div className="px-8 py-5 border-b border-white/10 flex items-center justify-between bg-[#141525]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Scaffold Project Framework</span>
                <span className="px-3 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-mono">CLI Scaffolder</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Initialize React, FastAPI, Django, Express, Python, or Java project files instantly in your workspace.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Framework Grid */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FRAMEWORK_TEMPLATES.map(template => {
              const IconComponent = template.icon;
              const isSelected = selectedTemplate.id === template.id;

              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400/80'
                      : `bg-[#131422] border-white/10 ${template.borderColor}`
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl bg-white/5 ${template.iconColor}`}>
                        <IconComponent size={22} />
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${template.badgeColor}`}>
                        {template.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white tracking-tight">{template.name}</h3>
                      <p className="text-[11px] font-mono text-gray-400 mt-0.5">{template.category}</p>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">
                      {template.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 font-mono">
                    <span className="flex items-center gap-1">
                      <FileCode size={13} className="text-gray-400" />
                      <span>{template.files.length} template files</span>
                    </span>

                    {isSelected ? (
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        <Check size={14} /> Selected
                      </span>
                    ) : (
                      <span className="text-gray-500 hover:text-gray-300 transition-colors">Click to select</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Template Details Box */}
          {selectedTemplate && (
            <div className="p-6 rounded-2xl bg-[#090a12] border border-cyan-500/30 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Selected Template: {selectedTemplate.name}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs border ${selectedTemplate.badgeColor}`}>
                    {selectedTemplate.badge}
                  </span>
                </div>
                <span className="text-gray-400 text-xs">Primary File: <strong className="text-cyan-300">{selectedTemplate.primaryFile}</strong></span>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-gray-400">Included Files:</span>
                {selectedTemplate.files.map(f => (
                  <span key={f.name} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-200 text-[11px]">
                    📄 {f.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-8 py-5 border-t border-white/10 bg-[#141525] flex items-center justify-between flex-wrap gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectTemplate(selectedTemplate);
              onClose();
            }}
            className="flex items-center rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs transition-all cursor-pointer"
            style={{ padding: '10px 24px', gap: '10px' }}
          >
            <Sparkles size={16} />
            <span>Initialize {selectedTemplate.name} Project</span>
            <ArrowRight size={15} />
          </button>
        </div>

      </div>
    </div>
  );
};
