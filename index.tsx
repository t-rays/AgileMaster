
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  User, 
  Bot, 
  Send, 
  Layout, 
  Code, 
  Palette, 
  Database, 
  PlusCircle, 
  MessageSquare, 
  Box, 
  ChevronRight,
  Terminal,
  Activity,
  Layers,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  Menu,
  X,
  RotateCcw,
  Share2,
  AlertCircle,
  Copy,
  Eye,
  Check,
  Shield,
  Calendar,
  Lock,
  Clock,
  Megaphone,
  Zap,
  History,
  FileText,
  MousePointer2,
  Loader2,
  Trash2,
  Briefcase,
  Building2,
  Users,
  ChevronDown,
  Cpu,
  Globe,
  Leaf
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import mermaid from 'mermaid';

// --- Global Initialization ---

mermaid.initialize({ 
  startOnLoad: false, 
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  themeVariables: {
    primaryColor: '#6366f1',
    primaryTextColor: '#fff',
    primaryBorderColor: '#4f46e5',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    mainBkg: '#0f172a',
    nodeBorder: '#334155',
    clusterBkg: '#1e293b',
    titleColor: '#cbd5e1',
    edgeLabelBackground: '#020617',
  }
});

// --- Constants & Types ---

const MODEL_NAME = 'gemini-3-pro-preview';

interface Artifact {
  id: string;
  type: 'mermaid' | 'html' | 'text';
  content: string;
  title: string;
  timestamp: number;
}

interface Suggestion {
  title: string;
  type: string;
}

interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  expertise: string;
  icon: React.ReactNode;
  color: string;
  systemInstruction: string;
  orgName?: string;
}

interface Organization {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  members: Persona[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: Suggestion[];
  isGeneratingArtifact?: boolean;
}

interface Thread {
  messages: Message[];
  artifacts: Artifact[];
  activeArtifactId?: string;
}

const MERMAID_STRICT_RULES = `
CRITICAL MERMAID SYNTAX RULES:
1. ALWAYS wrap node labels in double quotes and square brackets: NodeID["Label Text"].
2. NEVER use parentheses () for node definitions or labels.
3. Use simple alphanumeric IDs (e.g., A, B, C1).
4. NO emojis, non-ASCII characters, or special symbols in labels.
5. NO custom CSS or style tags inside the mermaid block.
6. For Organization charts, use 'graph TD' (Top-Down).
`;

const SUGGESTION_PROTOCOL = `
ARTIFACT PROTOCOL:
You are an expert. You DO NOT output code blocks (mermaid or html) in your initial response unless explicitly asked to generate it.
Instead, you MUST offer to create specific artifacts using this exact syntax: [SUGGEST: type | title]
Types allowed: 'mermaid' (for diagrams), 'html' (for visual mockups).

ONLY suggest artifacts strictly relevant to your field of expertise.
- If you suggest 'mermaid', it must be a technical or strategic diagram.
- If you suggest 'html', it must be a relevant UI/UX mockup or data visualization component using Tailwind CSS.
`;

const GLOBAL_EXPERTS: Persona[] = [
  {
    id: 'corp',
    name: 'Viktor Draken',
    role: 'Organizational Strategist',
    description: 'Expert in corporate governance, board structures, and org design.',
    expertise: 'Corporate Hierarchy & Governance',
    icon: <Briefcase className="w-5 h-5" />,
    color: 'emerald',
    systemInstruction: `You are Viktor Draken, the primary authority on corporate architecture. You specialize in designing high-level company structures.
    STRICT EXPERTISE LIMIT: ONLY suggest organizational or corporate governance artifacts.
    APPROVED ARTIFACTS:
    - [SUGGEST: mermaid | Corporate Hierarchy Chart]
    - [SUGGEST: mermaid | Executive Board & C-Suite Structure]
    - [SUGGEST: html | Executive Leadership Dashboard]
    ${MERMAID_STRICT_RULES} ${SUGGESTION_PROTOCOL}`,
  },
  {
    id: 'arch',
    name: 'Evelyn Vane',
    role: 'Software Architect',
    description: 'Expert in distributed systems and cloud infrastructure.',
    expertise: 'System Design',
    icon: <Layers className="w-5 h-5" />,
    color: 'blue',
    systemInstruction: `You are Evelyn Vane, a high-level Software Architect. Your domain is infrastructure and system topology.
    STRICT EXPERTISE LIMIT: ONLY suggest architectural diagrams.
    APPROVED ARTIFACTS:
    - [SUGGEST: mermaid | Infrastructure Topology]
    - [SUGGEST: mermaid | Sequence Diagram]
    ${MERMAID_STRICT_RULES} ${SUGGESTION_PROTOCOL}`,
  },
  {
    id: 'mkt',
    name: 'Seraphina Quinn',
    role: 'Marketing Strategist',
    description: 'Specializes in brand growth and conversion funnels.',
    expertise: 'Growth Marketing',
    icon: <Megaphone className="w-5 h-5" />,
    color: 'pink',
    systemInstruction: `You are Seraphina Quinn, a Growth Marketing Strategist. Your domain is conversion optimization and brand positioning.
    STRICT EXPERTISE LIMIT: ONLY suggest marketing-specific artifacts.
    APPROVED ARTIFACTS:
    - [SUGGEST: mermaid | Conversion Funnel]
    - [SUGGEST: html | Landing Page Hero Section]
    ${MERMAID_STRICT_RULES} ${SUGGESTION_PROTOCOL}`,
  },
  {
    id: 'sec',
    name: 'Sloane Vance',
    role: 'Cybersecurity Expert',
    description: 'Specialist in threat modeling and zero-trust security.',
    expertise: 'Security & Compliance',
    icon: <Shield className="w-5 h-5" />,
    color: 'red',
    systemInstruction: `You are Sloane Vance, a Cybersecurity Consultant. Your domain is risk mitigation and network defense.
    STRICT EXPERTISE LIMIT: ONLY suggest security-related artifacts.
    APPROVED ARTIFACTS:
    - [SUGGEST: mermaid | Threat Model Map]
    - [SUGGEST: html | Security Compliance Dashboard]
    ${MERMAID_STRICT_RULES} ${SUGGESTION_PROTOCOL}`,
  },
  {
    id: 'pm',
    name: 'Marcus Sterling',
    role: 'Senior Project Manager',
    description: 'Agile lead and risk management expert.',
    expertise: 'Agile Strategy',
    icon: <Calendar className="w-5 h-5" />,
    color: 'amber',
    systemInstruction: `You are Marcus Sterling, a Project Management Lead. Your domain is operational efficiency and resource allocation.
    STRICT EXPERTISE LIMIT: ONLY suggest management artifacts.
    APPROVED ARTIFACTS:
    - [SUGGEST: mermaid | Project Gantt Chart]
    - [SUGGEST: html | Project Kanban Board Mockup]
    ${MERMAID_STRICT_RULES} ${SUGGESTION_PROTOCOL}`,
  },
  {
    id: 'uxui',
    name: 'Kaelen Rivera',
    role: 'UX/UI Designer',
    description: 'Expert in design systems and interfaces.',
    expertise: 'Product Design',
    icon: <Palette className="w-5 h-5" />,
    color: 'purple',
    systemInstruction: `You are Kaelen Rivera, a visionary UX/UI Designer. Your domain is interface aesthetics and user flows.
    STRICT EXPERTISE LIMIT: ONLY suggest design or UI artifacts.
    APPROVED ARTIFACTS:
    - [SUGGEST: html | High-Fidelity UI Prototype]
    - [SUGGEST: mermaid | App Navigation User Flow]
    ${SUGGESTION_PROTOCOL}`,
  }
];

const ORGANIZATIONS: Organization[] = [
  {
    id: 'nexus',
    name: 'Nexus Frontier',
    description: 'A global tech conglomerate focusing on AI and robotics.',
    icon: <Globe className="w-5 h-5" />,
    members: [
      {
        id: 'nexus-ceo',
        name: 'Aria Sterling',
        role: 'CEO & Visionary',
        description: 'Former deep-tech founder, now steering Nexus towards AGI.',
        expertise: 'Strategic Growth & Venture',
        icon: <Zap className="w-4 h-4" />,
        color: 'indigo',
        orgName: 'Nexus Frontier',
        systemInstruction: `You are Aria Sterling, CEO of Nexus Frontier. You speak with high-level authority about market trends and roadmaps.
        ${SUGGESTION_PROTOCOL}`,
      },
      {
        id: 'nexus-cto',
        name: 'Dr. Elias Thorne',
        role: 'Chief Technology Officer',
        description: 'Pioneer in neural architectures and distributed robotics.',
        expertise: 'AI Systems & Deep Tech',
        icon: <Cpu className="w-4 h-4" />,
        color: 'cyan',
        orgName: 'Nexus Frontier',
        systemInstruction: `You are Dr. Elias Thorne, CTO of Nexus Frontier. You focus on the bleeding edge of AI.
        ${SUGGESTION_PROTOCOL}`,
      }
    ]
  },
  {
    id: 'veridian',
    name: 'Veridian Systems',
    description: 'Leading the charge in renewable energy and smart city infra.',
    icon: <Leaf className="w-5 h-5" />,
    members: [
      {
        id: 'veridian-cso',
        name: 'Silas Vane',
        role: 'Sustainability Lead',
        description: 'Expert in carbon credits and renewable grid integration.',
        expertise: 'ESG & Clean Energy',
        icon: <Shield className="w-4 h-4" />,
        color: 'emerald',
        orgName: 'Veridian Systems',
        systemInstruction: `You are Silas Vane, Sustainability Lead at Veridian.
        ${SUGGESTION_PROTOCOL}`,
      },
      {
        id: 'veridian-pm',
        name: 'Marcus Reed',
        role: 'Ops Director',
        description: 'Specialist in scaling physical infrastructure and logistics.',
        expertise: 'Operations & Scaling',
        icon: <Layout className="w-4 h-4" />,
        color: 'amber',
        orgName: 'Veridian Systems',
        systemInstruction: `You are Marcus Reed, Operations Director at Veridian.
        ${SUGGESTION_PROTOCOL}`,
      }
    ]
  }
];

const ALL_PERSONAS: Persona[] = [
  ...GLOBAL_EXPERTS,
  ...ORGANIZATIONS.flatMap(org => org.members)
];

// --- Subcomponents ---

const MermaidChart = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;
      try {
        const cleanChart = chart.replace(/```mermaid\n?|```/g, '').trim();
        const { svg: renderedSvg } = await mermaid.render(`m-${Math.random().toString(36).substr(2, 9)}`, cleanChart);
        setSvg(renderedSvg);
        setError(null);
      } catch (e: any) {
        setError(e.message || "Parse Error: Invalid Mermaid syntax generated.");
      }
    };
    renderChart();
  }, [chart]);

  if (error) return (
    <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-red-400 text-xs">
      <AlertCircle className="w-4 h-4 mb-2" />
      <p className="font-bold mb-1">Visualization Error</p>
      <pre className="whitespace-pre-wrap font-mono text-[10px] opacity-70">{error}</pre>
    </div>
  );

  return (
    <div className="bg-slate-900/30 rounded-xl p-4 flex justify-center items-start overflow-auto min-h-[400px]" 
         dangerouslySetInnerHTML={{ __html: svg }} />
  );
};

const ArtifactViewer = ({ artifacts, activeId, onSelect, onDelete }: { artifacts: Artifact[], activeId?: string, onSelect: (id: string) => void, onDelete: (id: string) => void }) => {
  const [viewMode, setViewMode] = useState<'visual' | 'source'>('visual');
  const [copied, setCopied] = useState(false);

  const active = artifacts.find(a => a.id === activeId);

  useEffect(() => { setViewMode('visual'); }, [activeId]);

  const handleCopy = () => {
    if (!active) return;
    navigator.clipboard.writeText(active.content.replace(/```(mermaid|html)\n?|```/g, '').trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (artifacts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-600 p-12 text-center">
        <div className="relative mb-6">
          <MousePointer2 className="w-16 h-16 opacity-10" />
          <div className="absolute inset-0 bg-indigo-500/10 blur-2xl rounded-full" />
        </div>
        <h3 className="text-slate-300 font-bold text-sm uppercase tracking-[0.2em] mb-3">Project Workspace</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          The Board and Strategy workspace is currently empty. Start a conversation with an expert or org member to begin generating artifacts.
        </p>
      </div>
    );
  }

  const isHtml = active?.type === 'html';
  const isMermaid = active?.type === 'mermaid';

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      <div className="flex bg-slate-900/50 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
        {artifacts.map(a => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest border-r border-slate-800 whitespace-nowrap transition-all flex items-center gap-2.5 ${activeId === a.id ? 'bg-indigo-600/20 text-indigo-400 border-b-2 border-b-indigo-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
          >
            {a.type === 'mermaid' ? <Layers className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5" />}
            {a.title}
          </button>
        ))}
      </div>

      {active && (
        <>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/30 shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter flex items-center gap-2">
                <FileText className="w-3 h-3 text-indigo-500" /> {active.title}
              </span>
              <span className="text-[9px] text-slate-600 font-medium mt-0.5">Updated {new Date(active.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center gap-4">
              {(isMermaid || isHtml) && (
                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 shadow-inner">
                  <button onClick={() => setViewMode('visual')} className={`px-3 py-1 rounded-md text-[9px] uppercase font-bold transition-all ${viewMode === 'visual' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Visual</button>
                  <button onClick={() => setViewMode('source')} className={`px-3 py-1 rounded-md text-[9px] uppercase font-bold transition-all ${viewMode === 'source' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}>Source</button>
                </div>
              )}
              <div className="w-px h-4 bg-slate-800 mx-1" />
              <button onClick={handleCopy} title="Copy Source" className={`p-2 rounded-lg hover:bg-slate-800 transition-all ${copied ? 'text-green-400' : 'text-slate-400 hover:text-slate-200'}`}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
              <button onClick={() => onDelete(active.id)} title="Delete Artifact" className="p-2 rounded-lg hover:bg-red-950/30 text-slate-500 hover:text-red-400 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 bg-slate-900/20">
            <AnimatePresence mode="wait">
              {viewMode === 'visual' ? (
                <motion.div key="vis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  {isMermaid && <MermaidChart chart={active.content} />}
                  {isHtml && (
                    <div className="h-full min-h-[500px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200/20">
                       <iframe title="Preview" srcDoc={`<script src="https://cdn.tailwindcss.com"></script><style>body { font-family: sans-serif; padding: 0; margin: 0; min-height: 100vh; }</style>${active.content.replace(/```html\n?|```/g, '')}`} className="w-full h-full border-none" />
                    </div>
                  )}
                  {!isMermaid && !isHtml && (
                    <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                      <ReactMarkdown>{active.content}</ReactMarkdown>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="src" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <pre className="text-[11px] font-mono text-indigo-200 bg-slate-900/80 p-6 rounded-2xl border border-slate-800 leading-relaxed overflow-x-auto shadow-inner">
                    {active.content.replace(/```(mermaid|html)\n?|```/g, '').trim()}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [activePersona, setActivePersona] = useState<Persona>(ALL_PERSONAS[0]);
  const [threads, setThreads] = useState<Record<string, Thread>>(() => {
    const initial: Record<string, Thread> = {};
    ALL_PERSONAS.forEach(p => {
      initial[p.id] = {
        messages: [{ role: 'assistant', content: `Expert Consultation initialized: **${p.name}**${p.orgName ? ` from **${p.orgName}**` : ''}. I'm ready to provide high-level ${p.expertise} insights. How can I assist you in achieving your project goals today?` }],
        artifacts: []
      };
    });
    return initial;
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'artifact'>('chat');
  const [isSplitView, setIsSplitView] = useState(window.innerWidth >= 1200);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentThread = threads[activePersona.id];
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentThread.messages, isLoading]);

  const parseSuggestions = (text: string): Suggestion[] => {
    const matches = Array.from(text.matchAll(/\[SUGGEST:\s*(mermaid|html)\s*\|\s*(.*?)\]/gi));
    return matches.map(m => ({
      type: m[1].toLowerCase(),
      title: m[2].trim()
    }));
  };

  const handleSend = async (customPrompt?: string, suggestion?: Suggestion) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || isLoading) return;
    
    const pid = activePersona.id;
    const userMsg: Message = { role: 'user', content: textToSend };
    
    setThreads(prev => ({
      ...prev, [pid]: { ...prev[pid], messages: [...prev[pid].messages, userMsg] }
    }));
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = customPrompt 
        ? `TASK: Generate the following artifact based on our previous discussion: [${suggestion?.title}]. 
           The artifact type is ${suggestion?.type}.
           STRICT RULE: Only generate content relevant to the expert's field (${activePersona.expertise}).
           Respond ONLY with the requested artifact wrapped in a code block.
           Ensure high professional quality. For Mermaid, use valid syntax: NO PARENTHESES, ASCII ONLY.`
        : `Expert Persona: ${activePersona.name} (${activePersona.role})${activePersona.orgName ? ` at ${activePersona.orgName}` : ''}\n
           Domain: ${activePersona.expertise}\n
           System Instruction: ${activePersona.systemInstruction}\n
           Conversation History:\n${currentThread.messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n')}\n
           User: ${textToSend}`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: { temperature: 0.7 }
      });

      const responseText = response.text || "Consultation timed out.";
      
      const artifactBlocks = Array.from(responseText.matchAll(/```(mermaid|html)([\s\S]*?)```/gi));
      const newArtifacts: Artifact[] = artifactBlocks.map(block => ({
        id: Math.random().toString(36).substr(2, 9),
        type: block[1].toLowerCase() as any,
        content: block[0],
        title: suggestion?.title || "Project Artifact",
        timestamp: Date.now()
      }));

      const suggestions = parseSuggestions(responseText);

      const assistantMsg: Message = { 
        role: 'assistant', 
        content: responseText.replace(/\[SUGGEST:.*?\]/gi, '').replace(/```(mermaid|html)[\s\S]*?```/gi, '').trim() || (newArtifacts.length > 0 ? "I've generated the requested artifact for your workspace." : ""),
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

      setThreads(prev => {
        const updatedArtifacts = [...prev[pid].artifacts, ...newArtifacts];
        return {
          ...prev, 
          [pid]: { 
            messages: [...prev[pid].messages, assistantMsg],
            artifacts: updatedArtifacts,
            activeArtifactId: newArtifacts.length > 0 ? newArtifacts[newArtifacts.length - 1].id : prev[pid].activeArtifactId
          }
        };
      });

      if (newArtifacts.length > 0 && !isSplitView) setActiveTab('artifact');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteArtifact = (id: string) => {
    setThreads(prev => {
      const pid = activePersona.id;
      const updatedArtifacts = prev[pid].artifacts.filter(a => a.id !== id);
      return {
        ...prev,
        [pid]: {
          ...prev[pid],
          artifacts: updatedArtifacts,
          activeArtifactId: prev[pid].activeArtifactId === id ? updatedArtifacts[0]?.id : prev[pid].activeArtifactId
        }
      };
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden selection:bg-indigo-500/30">
      <Sidebar activeId={activePersona.id} onSelect={setActivePersona} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 z-20 shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"><Menu className="w-5 h-5" /></button>
            <div className={`w-10 h-10 rounded-xl bg-${activePersona.color}-500/10 border border-${activePersona.color}-500/30 flex items-center justify-center text-${activePersona.color}-400 shadow-inner`}>
              {activePersona.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold leading-none">{activePersona.name}</h2>
                {activePersona.orgName && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[9px] font-bold text-slate-400 uppercase tracking-tighter border border-slate-700">
                    {activePersona.orgName}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-medium">{activePersona.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isSplitView && (
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button onClick={() => setActiveTab('chat')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Chat</button>
                <button onClick={() => setActiveTab('artifact')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'artifact' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}>Artifacts ({currentThread.artifacts.length})</button>
              </div>
            )}
            <button onClick={() => setIsSplitView(!isSplitView)} className="hidden lg:flex p-2 text-slate-400 hover:text-white transition-all"><Maximize2 className="w-4 h-4" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {isSplitView ? (
            <div className="flex w-full divide-x divide-slate-800">
              <div className="w-1/2 overflow-y-auto p-8 space-y-8 bg-slate-950/50">
                {currentThread.messages.map((m, i) => (
                  <MessageItem key={i} m={m} onTriggerSuggestion={(s) => handleSend(`Please generate the [${s.title}] you suggested as ${s.type}.`, s)} />
                ))}
                {isLoading && <LoadingMessage personaName={activePersona.name} />}
                <div ref={chatEndRef} />
              </div>
              <div className="w-1/2 bg-slate-900/10">
                <ArtifactViewer 
                  artifacts={currentThread.artifacts} 
                  activeId={currentThread.activeArtifactId} 
                  onSelect={(id) => setThreads(prev => ({ ...prev, [activePersona.id]: { ...prev[activePersona.id], activeArtifactId: id }}))} 
                  onDelete={deleteArtifact}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'chat' ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {currentThread.messages.map((m, i) => (
                    <MessageItem key={i} m={m} onTriggerSuggestion={(s) => handleSend(`Please generate the [${s.title}] you suggested as ${s.type}.`, s)} />
                  ))}
                  {isLoading && <LoadingMessage personaName={activePersona.name} />}
                  <div ref={chatEndRef} />
                </div>
              ) : (
                <ArtifactViewer 
                  artifacts={currentThread.artifacts} 
                  activeId={currentThread.activeArtifactId} 
                  onSelect={(id) => setThreads(prev => ({ ...prev, [activePersona.id]: { ...prev[activePersona.id], activeArtifactId: id }}))} 
                  onDelete={deleteArtifact}
                />
              )}
            </div>
          )}
        </div>

        <div className="p-5 bg-slate-900/60 backdrop-blur-md border-t border-slate-800 shrink-0">
          <div className="max-w-4xl mx-auto relative group">
            <input 
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={`Consult with ${activePersona.name}...`} 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 pl-6 pr-14 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500 shadow-2xl"
            />
            <button onClick={() => handleSend()} disabled={isLoading || !input.trim()} className="absolute right-2 top-2 p-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-20 active:scale-95 shadow-lg"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </main>
    </div>
  );
}

const MessageItem: React.FC<{ m: Message, onTriggerSuggestion: (s: Suggestion) => void }> = ({ m, onTriggerSuggestion }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${m.role === 'user' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
      {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
    </div>
    <div className={`max-w-[85%] p-5 rounded-3xl shadow-lg border ${m.role === 'user' ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-50' : 'bg-slate-900 border-slate-800 text-slate-200'}`}>
      <div className="prose prose-sm prose-invert max-w-none prose-p:leading-relaxed prose-code:bg-slate-800 prose-code:px-1.5 prose-code:rounded prose-code:text-indigo-400">
        <ReactMarkdown>
          {m.content}
        </ReactMarkdown>
      </div>
      
      {m.suggestions && m.suggestions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-800">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
             <PlusCircle className="w-3 h-3 text-indigo-500" /> Proposed Domain Artifacts
           </p>
           <div className="flex flex-wrap gap-2">
             {m.suggestions.map((s, idx) => (
               <button 
                 key={idx} 
                 onClick={() => onTriggerSuggestion(s)} 
                 className="group flex items-center gap-2 px-3 py-2 bg-slate-800/80 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-xl text-[10px] font-bold uppercase text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
               >
                 {s.type === 'mermaid' ? <Layers className="w-3.5 h-3.5" /> : <Layout className="w-3.5 h-3.5" />}
                 <span>Generate {s.title}</span>
                 <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
               </button>
             ))}
           </div>
        </div>
      )}
    </div>
  </motion.div>
);

const LoadingMessage: React.FC<{ personaName: string }> = ({ personaName }) => (
  <div className="flex gap-4">
    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
      <Bot className="w-4 h-4 text-slate-600 animate-bounce" />
    </div>
    <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl text-slate-500 italic text-xs flex items-center gap-3 shadow-inner">
      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
      {personaName} is analyzing the request...
    </div>
  </div>
);

const Sidebar = ({ activeId, onSelect, isOpen, onClose }: { activeId: string, onSelect: (p: Persona) => void, isOpen: boolean, onClose: () => void }) => {
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set(['nexus']));

  const toggleOrg = (id: string) => {
    const next = new Set(expandedOrgs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedOrgs(next);
  };

  return (
    <motion.div className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-full overflow-hidden shrink-0 lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} transition-transform duration-300`}>
      <div className="p-8 flex items-center gap-3">
        <Box className="text-indigo-500 w-6 h-6" />
        <h1 className="text-lg font-bold tracking-tight">PersonaCore</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-6">
        {/* Global Experts Section */}
        <section>
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Users className="w-3 h-3" /> Expert Directory
          </p>
          <div className="space-y-1">
            {GLOBAL_EXPERTS.map(p => (
              <PersonaButton 
                key={p.id} 
                p={p} 
                isActive={activeId === p.id} 
                onClick={() => { onSelect(p); onClose(); }} 
              />
            ))}
          </div>
        </section>

        {/* Organizations Section */}
        <section>
          <p className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Building2 className="w-3 h-3" /> Organization Directory
          </p>
          <div className="space-y-4">
            {ORGANIZATIONS.map(org => (
              <div key={org.id} className="space-y-1">
                <button 
                  onClick={() => toggleOrg(org.id)}
                  className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 transition-all text-xs font-bold"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-slate-800 border border-slate-700">{org.icon}</div>
                    <span>{org.name}</span>
                  </div>
                  <ChevronDown className={`w-3 h-3 transition-transform ${expandedOrgs.has(org.id) ? '' : '-rotate-90'}`} />
                </button>
                
                <AnimatePresence>
                  {expandedOrgs.has(org.id) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden space-y-1 ml-4 border-l border-slate-800 pl-2"
                    >
                      {org.members.map(p => (
                        <PersonaButton 
                          key={p.id} 
                          p={p} 
                          isActive={activeId === p.id} 
                          onClick={() => { onSelect(p); onClose(); }} 
                          isCompact
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="p-6 border-t border-slate-800 text-[10px] text-slate-600 flex items-center gap-3">
        <div className="relative">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <div className="absolute inset-0 bg-indigo-500 blur-sm opacity-20" />
        </div>
        Professional Intelligence Active
      </div>
    </motion.div>
  );
};

const PersonaButton = ({ p, isActive, onClick, isCompact = false }: { p: Persona, isActive: boolean, onClick: () => void, isCompact?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full text-left rounded-2xl transition-all group relative overflow-hidden ${isCompact ? 'p-3' : 'p-4'} ${isActive ? 'bg-slate-900 border border-slate-800 shadow-xl shadow-indigo-500/5' : 'hover:bg-slate-900/40 grayscale hover:grayscale-0 opacity-60 hover:opacity-100'}`}
  >
    <div className="flex items-start gap-3">
      <div className={`${isCompact ? 'p-1.5' : 'p-2.5'} rounded-xl bg-${p.color}-500/10 text-${p.color}-400 group-hover:scale-110 transition-all border border-${p.color}-500/20 shadow-inner`}>{p.icon}</div>
      <div className="min-w-0">
        <h3 className={`font-bold text-slate-100 truncate ${isCompact ? 'text-[11px]' : 'text-xs'}`}>{p.name}</h3>
        <p className={`text-slate-500 uppercase font-medium mt-0.5 tracking-tighter truncate ${isCompact ? 'text-[8px]' : 'text-[10px]'}`}>{p.role}</p>
      </div>
    </div>
    {isActive && <motion.div layoutId="nav-pill" className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />}
  </button>
);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
