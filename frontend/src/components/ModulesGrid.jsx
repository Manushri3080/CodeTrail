import React from 'react';
import { 
  Key, 
  Layers, 
  Code2, 
  Cpu, 
  FileCheck2, 
  BarChart3, 
  LayoutDashboard, 
  Sliders 
} from 'lucide-react';

export function ModulesGrid() {
  const modules = [
    {
      num: '01',
      title: 'User Authentication & Security',
      category: 'Security',
      icon: Key,
      desc: 'Secure account access, token authentication, and role-based session control.'
    },
    {
      num: '02',
      title: 'Workspace Management',
      category: 'Workspace',
      icon: Layers,
      desc: 'Create, join, and organize collaborative workspaces with team permission controls.'
    },
    {
      num: '03',
      title: 'Real-Time Code Editor',
      category: 'Real-Time',
      icon: Code2,
      desc: 'Shared coding editor with live multi-user cursor visualization and instant operational synchronization.'
    },
    {
      num: '04',
      title: 'Code Execution Sandbox',
      category: 'Execution',
      icon: Cpu,
      desc: 'Cloud-based multi-language code runner delivering instant execution output.'
    },
    {
      num: '05',
      title: 'Activity Telemetry & Hashing',
      category: 'Telemetry',
      icon: FileCheck2,
      desc: 'Automatic tamper-evident event logging maintaining a secure, verifiable contribution history.'
    },
    {
      num: '06',
      title: 'Contribution Analytics',
      category: 'Analytics',
      icon: BarChart3,
      desc: 'Detailed participation insights, coding activity metrics, and downloadable summary reports.'
    },
    {
      num: '07',
      title: 'Dashboard & Session History',
      category: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Centralized workspace dashboard to review active sessions, history timelines, and project stats.'
    },
    {
      num: '08',
      title: 'Workspace Settings & Alerts',
      category: 'Settings',
      icon: Sliders,
      desc: 'Configurable environment preferences, member roles, and real-time activity notifications.'
    }
  ];

  return (
    <section id="modules-grid" className="ct-section ct-modules-section">
      <div className="ct-container">
        
        {/* Section Header */}
        <div className="ct-section-header">
          <span className="ct-demo-badge">PLATFORM CAPABILITIES</span>
          <h2 className="ct-section-title">Core Features & Architecture</h2>
          <p className="ct-section-subtitle">
            An integrated suite of real-time development tools built for seamless collaboration and transparent telemetry.
          </p>
        </div>

        {/* 8 Card Grid */}
        <div className="ct-modules-grid">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <div key={idx} className="ct-module-card">
                <div className="ct-module-top">
                  <span className="ct-module-num">{mod.num}</span>
                  <span className="ct-team-pill team-a">
                    {mod.category}
                  </span>
                </div>
                <div className="ct-module-icon-wrap">
                  <Icon size={20} />
                </div>
                <h3 className="ct-module-title">{mod.title}</h3>
                <p className="ct-module-desc">{mod.desc}</p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}

export default ModulesGrid;
