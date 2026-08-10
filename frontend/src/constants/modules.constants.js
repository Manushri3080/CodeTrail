import { 
  Users, 
  Cpu, 
  BarChart3, 
  ShieldCheck, 
  History, 
  Sliders 
} from 'lucide-react';

export const CORE_MODULES = [
  {
    num: '01',
    title: 'Live Multiplayer IDE',
    category: 'Collaboration',
    icon: Users,
    desc: 'Work together in real-time with zero-latency cursor tracking, shared line editing, and instant state synchronization.'
  },
  {
    num: '02',
    title: 'Instant Cloud Execution',
    category: 'Performance',
    icon: Cpu,
    desc: 'Compile and run source code directly in the browser across multiple runtimes with isolated sandbox security.'
  },
  {
    num: '03',
    title: 'Smart Activity Insights',
    category: 'Analytics',
    icon: BarChart3,
    desc: 'Gain full visibility into team contributions with automated activity tracking and exportable summary reports.'
  },
  {
    num: '04',
    title: 'Enterprise Security',
    category: 'Security',
    icon: ShieldCheck,
    desc: 'Keep your source code safe with end-to-end encryption, role-based access control, and environment isolation.'
  },
  {
    num: '05',
    title: 'Session History & Replay',
    category: 'Workflow',
    icon: History,
    desc: 'Review development timelines, trace code evolution, and restore previous session snapshots effortlessly.'
  },
  {
    num: '06',
    title: 'Custom Workspace Envs',
    category: 'Platform',
    icon: Sliders,
    desc: 'Tailor your engineering team environment with custom language runtimes, extensions, and integration hooks.'
  }
];
