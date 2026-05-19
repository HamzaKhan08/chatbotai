/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Paperclip, 
  Plus, 
  Trash2, 
  Sparkles, 
  Search, 
  Volume2, 
  VolumeX, 
  Smile, 
  X, 
  MessageSquare, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Copy, 
  Check, 
  Settings, 
  Maximize2, 
  Minimize2, 
  Code, 
  PenTool, 
  HelpCircle, 
  Compass, 
  Compass as Laptop,
  Cpu,
  BookOpen,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Types
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  image?: {
    data: string; // Base64
    mimeType: string;
  };
  groundingSources?: Array<{ title: string; uri: string }>;
  isError?: boolean;
}

interface ChatSession {
  id: string;
  name: string;
  timestamp: string;
  personaId: string;
  enableSearch: boolean;
  messages: Message[];
}

interface Persona {
  id: string;
  name: string;
  avatar: string;
  shortDesc: string;
  description: string;
  systemInstruction: string;
  themeColor: string; // Tailwind colors
  bannerColor: string;
}

// Prebuilt AI Agent Personas
const PERSONAS: Persona[] = [
  {
    id: "helpful_assistant",
    name: "Aether Gen AI",
    avatar: "🤖",
    shortDesc: "All-purpose general assistant",
    description: "Multi-talented assistant configured for broad, highly clear reasoning across any topic.",
    systemInstruction: "You are Aether Gen AI, a highly intuitive, polite, and advanced general artificial intelligence companion. You answer everything with maximum clarity, structuring complex text with paragraphs, bullet points, and codeblocks where helpful.",
    themeColor: "from-indigo-500 to-purple-600",
    bannerColor: "bg-indigo-50"
  },
  {
    id: "code_companion",
    name: "Architect Codegen",
    avatar: "💻",
    shortDesc: "Senior software engineer companion",
    description: "Expert developer and program debugging coach specializing in clean, optimal code blocks.",
    systemInstruction: "You are Architect Codegen, an elite full-stack software engineer and cloud system architect. You provide highly efficient, secure, and production-grade software code blocks (TypeScript, Python, Go, etc.). You always review edge-cases, explain bug root causes simply, and output comments in generated blocks to explain your logic.",
    themeColor: "from-emerald-500 to-teal-600",
    bannerColor: "bg-emerald-50"
  },
  {
    id: "creative_weaver",
    name: "Aether Weaver",
    avatar: "🎨",
    shortDesc: "Professional story & content writer",
    description: "Warm-hearted creative copywriter and storyteller specializing in engaging narratives.",
    systemInstruction: "You are Aether Weaver, a celebrated author, poetic storyteller, and creative advertising writer. You speak with warm charisma, using beautiful descriptive elements, expressive syntax, and creative structure. You craft engaging articles, story completions, and copy designs.",
    themeColor: "from-pink-500 to-rose-600",
    bannerColor: "bg-rose-50"
  },
  {
    id: "socratic_scholar",
    name: "scholar Socratic",
    avatar: "🎓",
    shortDesc: "Academic tutor and science teacher",
    description: "Exposes clear analogies to teach complex science, STEM, and history theories.",
    systemInstruction: "You are scholar Socratic, an exceptionally patient and intelligent world-class academic tutor. Rather than just giving dry answers, you break complex scientific, engineering, and philosophical theories down step-by-step using highly relatable analogies, real-world examples, and Socratic questioning.",
    themeColor: "from-amber-500 to-orange-600",
    bannerColor: "bg-amber-50"
  }
];

// Presets for the emoji picker
const POPULAR_EMOJIS = [
  "😀", "😂", "😍", "😎", "🤔", "😴", "😭", "👏", "👍", "🙌", "🔥", "✨", 
  "🌟", "🎉", "❤️", "🚀", "🤖", "💻", "💡", "📝", "🎨", "📚", "🍀", "🛠️"
];

// Prompt suggestions shown on new chats
const PROMPT_ACCELERATORS = [
  {
    icon: <Code className="w-5 h-5 text-emerald-500" />,
    label: "Debug a React effect",
    text: "Explain how to fix memory leaks and clean up subscriptions inside a React useEffect call with an code example."
  },
  {
    icon: <PenTool className="w-5 h-5 text-pink-500" />,
    label: "Draft high-converting copy",
    text: "Write 3 captivating marketing headline options for a local sustainable clothing brand using a warm tone."
  },
  {
    icon: <Compass className="w-5 h-5 text-indigo-500" />,
    label: "Explain Quantum Physics",
    text: "Explain what Quantum Entanglement is to someone who has absolute zero background in science, using a soccer analogy."
  },
  {
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    label: "Brainstorm app ideas",
    text: "Provide 5 creative and practical micro-SaaS application concepts that utilize geolocation features to save people time."
  }
];

export default function App() {
  // Navigation tabs: 'landing' (Sleek Product Presentation with Widget available) or 'workspace' (Full visual Dashboard)
  const [activeTab, setActiveTab] = useState<"landing" | "workspace">("landing");

  // Floating Widget states (for corner chatbot testing)
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [widgetMessages, setWidgetMessages] = useState<Message[]>([
    {
      id: "w-init",
      role: "assistant",
      content: "Hello! 👋 I am the floating chatbot. You can upload images 🖼️, turn on live Google search, or switch to the full screen Workspace to save multiple conversations. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [widgetDraft, setWidgetDraft] = useState("");
  const [widgetImage, setWidgetImage] = useState<{ data: string; mimeType: string; fileName: string } | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const [widgetSearch, setWidgetSearch] = useState(false);
  const [widgetEmojiOpen, setWidgetEmojiOpen] = useState(false);

  // Dedicated Workspace states (Dashboard core state)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Custom draft input details for Active Session
  const [workspaceDraft, setWorkspaceDraft] = useState("");
  const [workspaceImage, setWorkspaceImage] = useState<{ data: string; mimeType: string; fileName: string } | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceEmojiOpen, setWorkspaceEmojiOpen] = useState(false);

  // Settings & configuration for New Sessions (can edit live in settings panel)
  const [activeSearch, setActiveSearch] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState("helpful_assistant");
  const [selectedVoice, setSelectedVoice] = useState("Kore"); // Prebuilt voices 'Kore', 'Puck', 'Zephyr', 'Charon'

  // Global visual overlay utilities
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [audioLoadingId, setAudioLoadingId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [sessionRenameId, setSessionRenameId] = useState<string | null>(null);
  const [sessionRenameValue, setSessionRenameValue] = useState("");

  // DOM references for auto-scrolling
  const workspaceScrollRef = useRef<HTMLDivElement>(null);
  const widgetScrollRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Loading chat logs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("aetherchat_sessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          // Sync configs
          setActivePersonaId(parsed[0].personaId || "helpful_assistant");
          setActiveSearch(parsed[0].enableSearch || false);
        } else {
          // Initialize a default first session
          createNewSession();
        }
      } else {
        createNewSession();
      }
    } catch (e) {
      console.error("Localstorage recovery failed", e);
      createNewSession();
    }
  }, []);

  // Sync to localStorage
  const saveSessions = (updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem("aetherchat_sessions", JSON.stringify(updated));
  };

  // Create a new session
  const createNewSession = (personaId = "helpful_assistant") => {
    const p = PERSONAS.find(x => x.id === personaId) || PERSONAS[0];
    const newSession: ChatSession = {
      id: "session-" + Date.now(),
      name: `Chat with ${p.name}`,
      timestamp: new Date().toLocaleDateString([], { month: "short", day: "numeric" }),
      personaId: personaId,
      enableSearch: false,
      messages: [
        {
          id: "m-welcome-" + Date.now(),
          role: "assistant",
          content: `Welcome! 🔮 I am ${p.name}, your ${p.shortDesc}.\n\nHow can I help you brainstorm, code, write, or clarify ideas today? Feel free to attach images for visual inquiry!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
    setActivePersonaId(personaId);
    setActiveSearch(false);
    
    // Auto collapse sidebar on mobile creation
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  };

  // Change active session
  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const ses = sessions.find(s => s.id === id);
    if (ses) {
      setActivePersonaId(ses.personaId || "helpful_assistant");
      setActiveSearch(ses.enableSearch || false);
    }
    
    // Auto collapse sidebar on mobile select
    if (window.innerWidth < 768) {
      setIsSidebarCollapsed(true);
    }
  };

  // Delete session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    if (updated.length === 0) {
      // Re-create one empty if deletion leaves zero
      localStorage.removeItem("aetherchat_sessions");
      createNewSession();
    } else {
      saveSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated[0].id);
        setActivePersonaId(updated[0].personaId || "helpful_assistant");
        setActiveSearch(updated[0].enableSearch || false);
      }
    }
  };

  // Inline rename logic
  const startRenameSession = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionRenameId(id);
    setSessionRenameValue(name);
  };

  const confirmRenameSession = (id: string) => {
    if (!sessionRenameValue.trim()) return;
    const updated = sessions.map(s => {
      if (s.id === id) {
        return { ...s, name: sessionRenameValue.trim() };
      }
      return s;
    });
    saveSessions(updated);
    setSessionRenameId(null);
  };

  // Smooth scroll assistants
  useEffect(() => {
    if (workspaceScrollRef.current) {
      workspaceScrollRef.current.scrollTop = workspaceScrollRef.current.scrollHeight;
    }
  }, [sessions, workspaceLoading, activeSessionId]);

  useEffect(() => {
    if (widgetScrollRef.current) {
      widgetScrollRef.current.scrollTop = widgetScrollRef.current.scrollHeight;
    }
  }, [widgetMessages, widgetLoading, isWidgetOpen]);

  // Audio utility handling
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setSpeakingMessageId(null);
    setAudioLoadingId(null);
  };

  // Play audio triggers
  const playSpeech = async (textToSpeak: string, msgId: string) => {
    if (speakingMessageId === msgId) {
      stopAudio();
      return;
    }

    // Clean text strings (strip markdown codeblocks to make TTS sound clean)
    const cleanText = textToSpeak
      .replace(/```[\s\S]*?```/g, "[Codeblock skipped]") // skip vocalizing code blocks
      .replace(/[-*#*_`[\]()]/g, ""); // clear markdown syntaxes

    stopAudio();
    setAudioLoadingId(msgId);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText.substring(0, 500), // TTS limit to keep response efficient
          voiceName: selectedVoice
        })
      });

      if (!res.ok) throw new Error("TTS conversion failed");
      const data = await res.json();

      if (data.audio) {
        const audioUrl = `data:audio/wav;base64,${data.audio}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.play();

        audio.onplay = () => {
          setAudioLoadingId(null);
          setSpeakingMessageId(msgId);
        };

        audio.onended = () => {
          setSpeakingMessageId(null);
        };

        audio.onerror = () => {
          setAudioLoadingId(null);
          setSpeakingMessageId(null);
        };
      }
    } catch (e) {
      console.error(e);
      setAudioLoadingId(null);
    }
  };

  // Image Upload Encoder
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, target: "workspace" | "widget") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a standard image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result?.toString().split(",")[1];
      if (base64String) {
        const payload = {
          data: base64String,
          mimeType: file.type,
          fileName: file.name
        };
        if (target === "workspace") {
          setWorkspaceImage(payload);
        } else {
          setWidgetImage(payload);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Clear file selector input
  };

  // Text submit handler for Floating Widget
  const handleSendWidgetMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const promptText = widgetDraft.trim();
    if (!promptText && !widgetImage) return;

    // Reset prompt box
    setWidgetDraft("");
    setWidgetEmojiOpen(false);

    const userMsgId = "w-usr-" + Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: widgetImage ? { data: widgetImage.data, mimeType: widgetImage.mimeType } : undefined
    };

    setWidgetMessages(prev => [...prev, userMsg]);
    setWidgetImage(null);
    setWidgetLoading(true);

    const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];

    // Build chat context for stateless multiround inquiry
    const serverPayloadHistory = [...widgetMessages, userMsg].slice(-8); // send context limit to keep fast

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: serverPayloadHistory,
          systemInstruction: activePersona.systemInstruction,
          enableSearch: widgetSearch
        })
      });

      if (!res.ok) throw new Error("Connection failed");
      const data = await res.json();

      setWidgetMessages(prev => [
        ...prev,
        {
          id: "w-bot-" + Date.now(),
          role: "assistant",
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          groundingSources: data.sources
        }
      ]);
    } catch (error: any) {
      setWidgetMessages(prev => [
        ...prev,
        {
          id: "w-err-" + Date.now(),
          role: "assistant",
          content: `I hit a compilation anomaly. Please ensure your Gemini secret API key is set in Settings > Secrets. Details: ${error.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setWidgetLoading(false);
    }
  };

  // Text submit handler for Dedicated Workspace (Dashboard)
  const handleSendWorkspaceMessage = async (alternativePrompt?: string) => {
    const promptText = alternativePrompt !== undefined ? alternativePrompt : workspaceDraft.trim();
    if (!promptText && !workspaceImage) return;

    // Reset draft fields
    if (alternativePrompt === undefined) {
      setWorkspaceDraft("");
    }
    setWorkspaceEmojiOpen(false);

    const activeSession = sessions.find(s => s.id === activeSessionId);
    if (!activeSession) return;

    const userMsgId = "m-usr-" + Date.now();
    const userMsg: Message = {
      id: userMsgId,
      role: "user",
      content: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: workspaceImage ? { data: workspaceImage.data, mimeType: workspaceImage.mimeType } : undefined
    };

    // Update session locally with optimistic user message
    const updatedMessages = [...activeSession.messages, userMsg];
    let updatedSession = { ...activeSession, messages: updatedMessages };

    // Auto-rename chat if it was default name
    if (activeSession.messages.length === 1 && activeSession.name.startsWith("Chat with")) {
      const excerpt = promptText.length > 22 ? promptText.substring(0, 22) + "..." : promptText;
      updatedSession.name = excerpt;
    }

    const nextSessions = sessions.map(s => s.id === activeSessionId ? updatedSession : s);
    saveSessions(nextSessions);
    setWorkspaceImage(null);
    setWorkspaceLoading(true);

    const activePersona = PERSONAS.find(p => p.id === activePersonaId) || PERSONAS[0];

    try {
      // Map global session to match format
      const historyToSend = updatedMessages.map(m => ({
        role: m.role,
        content: m.content,
        image: m.image
      })).slice(-12); // Send recent 12 context rounds

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: historyToSend,
          systemInstruction: activePersona.systemInstruction,
          enableSearch: activeSearch
        })
      });

      if (!res.ok) throw new Error("Could not fetch generation answer");
      const data = await res.json();

      const botMsgId = "m-bot-" + Date.now();
      const botMsg: Message = {
        id: botMsgId,
        role: "assistant",
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingSources: data.sources
      };

      const finalMessages = [...updatedMessages, botMsg];
      const finalSession = { 
        ...updatedSession, 
        messages: finalMessages,
        personaId: activePersonaId,
        enableSearch: activeSearch
      };
      
      saveSessions(sessions.map(s => s.id === activeSessionId ? finalSession : s));

    } catch (error: any) {
      const errMsgId = "m-err-" + Date.now();
      const errMsg: Message = {
        id: errMsgId,
        role: "assistant",
        content: `Connect anomaly occurred. Please confirm your GEMINI_API_KEY is configured inside the AI Studio Secrets tab:\n\n${error.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      };
      const errorSession = { ...updatedSession, messages: [...updatedMessages, errMsg] };
      saveSessions(sessions.map(s => s.id === activeSessionId ? errorSession : s));
    } finally {
      setWorkspaceLoading(false);
    }
  };

  // Render chatbot answers parsing bolding, lists and nicely highlighting codeblocks beautifully
  const renderMessageContent = (text: string) => {
    if (!text) return null;

    // Detect code blocks split
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      // Match code blocks
      if (part.startsWith("```") && part.endsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const language = match ? match[1] : "code";
        const codeContent = match ? match[2].trim() : part.slice(3, -3).trim();
        const blockId = `code-${index}-${language}`;

        return (
          <div key={index} className="my-4 rounded-xl border border-gray-800 bg-gray-900 overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-950 border-b border-gray-800">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{language || "source"}</span>
              <button
                type="button"
                id={blockId}
                onClick={() => {
                  navigator.clipboard.writeText(codeContent);
                  setCopiedCodeId(blockId);
                  setTimeout(() => setCopiedCodeId(null), 2000);
                }}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                {copiedCodeId === blockId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-gray-100 leading-relaxed max-h-[400px]">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Format paragraph rows, bold phrases (**text**), and inline code tags
      const paragraphs = part.split("\n").filter(p => p !== "");
      return paragraphs.map((par, pIdx) => {
        // Bullet list item formatting
        const isBullet = par.trim().startsWith("- ") || par.trim().startsWith("* ");
        const cleanPara = isBullet ? par.trim().substring(2) : par;

        // Map bold strings (**phrase**) and inline backticks
        const formattedText = [];
        let tempText = cleanPara;
        let boldCodeRegex = /(\*\*.*?\*\*|`.*?`)/;
        let pKey = 0;

        while (tempText) {
          const matchResult = tempText.match(boldCodeRegex);
          if (!matchResult) {
            formattedText.push(<React.Fragment key={pKey++}>{tempText}</React.Fragment>);
            break;
          }

          const matchStr = matchResult[0];
          const matchIndex = tempText.indexOf(matchStr);

          // Add prior text, if any
          if (matchIndex > 0) {
            formattedText.push(<React.Fragment key={pKey++}>{tempText.substring(0, matchIndex)}</React.Fragment>);
          }

          // Format matched block
          if (matchStr.startsWith("**") && matchStr.endsWith("**")) {
            formattedText.push(
              <strong key={pKey++} className="font-semibold text-gray-900 dark:text-white">
                {matchStr.substring(2, matchStr.length - 2)}
              </strong>
            );
          } else if (matchStr.startsWith("`") && matchStr.endsWith("`")) {
            formattedText.push(
              <code key={pKey++} className="px-1.5 py-0.5 mx-0.5 rounded bg-gray-100 text-rose-600 font-mono text-xs border border-gray-200">
                {matchStr.substring(1, matchStr.length - 1)}
              </code>
            );
          }

          tempText = tempText.substring(matchIndex + matchStr.length);
        }

        if (isBullet) {
          return (
            <li key={`${pIdx}-${pKey}`} className="ml-5 list-disc text-sm text-gray-700 leading-relaxed mb-1 pl-1">
              <span>{formattedText}</span>
            </li>
          );
        }

        return (
          <p key={`${pIdx}-${pKey}`} className="text-sm text-gray-700 leading-relaxed mb-3">
            {formattedText}
          </p>
        );
      });
    });
  };

  // Target current active session object
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  return (
    <div id="aether-app-root" className="min-h-screen flex flex-col bg-gray-50/40 relative selection:bg-indigo-100 transition-colors">
      
      {/* 1. Header Navigation */}
      <header id="main-header" className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/85 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 flex-shrink-0">
            <Sparkles className="w-5 sm:w-5.5 h-5 sm:h-5.5 animate-pulse" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-bold text-gray-900 tracking-tight flex items-center gap-1">
              AetherChat
              <span className="px-1 py-0.5 rounded bg-indigo-50 border border-indigo-250 text-[9px] text-indigo-600 font-semibold tracking-wider uppercase font-mono hidden xs:inline-block">
                Stable
              </span>
            </span>
            <p className="text-[10px] text-gray-500 font-medium hidden sm:block">Sleek Multi-Turn Gemini Assistant</p>
          </div>
        </div>

        {/* Global Action Selector Tabs */}
        <div id="view-mode-tabs" className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 shadow-inner">
          <button
            type="button"
            id="tab-btn-landing"
            onClick={() => {
              setActiveTab("landing");
              stopAudio();
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer ${
              activeTab === "landing"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Product Landing
          </button>
          <button
            type="button"
            id="tab-btn-workspace"
            onClick={() => {
              setActiveTab("workspace");
              stopAudio();
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
              activeTab === "workspace"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-100"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            AI Workspace
          </button>
        </div>
      </header>

      {/* 2. Main Switchboard content */}
      <main id="main-content-pane" className="flex-1 flex overflow-hidden relative">
        
        {/* ==================== SCREEN 1: LANDING PRESENTATION ==================== */}
        {activeTab === "landing" && (
          <section id="aether-landing-page" className="w-full flex flex-col items-center justify-start py-12 px-6 max-w-5xl mx-auto z-10">
            
            {/* Visual background lights */}
            <div className="absolute top-[15%] left-[20%] w-[320px] h-[320px] rounded-full bg-indigo-300/20 blur-[90px] -z-10 pointer-events-none" />
            <div className="absolute bottom-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-pink-300/10 blur-[120px] -z-10 pointer-events-none" />

            {/* Intro Header */}
            <div className="text-center max-w-2xl mt-4 mb-12">
              <span className="px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs text-indigo-600 font-semibold tracking-wider uppercase mb-4 inline-block">
                Polished UI/UX & Native Compatibility
              </span>
              <h1 className="text-4.5xl sm:text-5.5xl font-black text-gray-950 tracking-tight leading-1 font-sans">
                The ultimate conversational accomplice for <span className="text-indigo-600 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Gemini AI</span>
              </h1>
              <p className="mt-4 text-base text-gray-600 leading-relaxed font-sans max-w-lg mx-auto">
                Discover a feature-rich, beautiful chat environment with dual support for a dedicated workspace with memory backlog, or a convenient corner widget.
              </p>
            </div>

            {/* Feature Bento Grid */}
            <div id="landing-bento-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs flex flex-col justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Stateful Sessions</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Saves multiple historical sessions locally. Return to draft, rename channels, or delete past threads anytime.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs flex flex-col justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Google Search Grounding</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    With a single click, toggle real-time internet indexing. The bot citations will link live web sources.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-xs flex flex-col justify-between">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 mb-1">Narrative TTS Voice</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Hear answers read aloud using advanced neural voices including Zephyr, Kore, and Puck. Fully play/pause ready.
                  </p>
                </div>
              </div>
            </div>

            {/* Interface launch trigger cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              
              {/* Card 1: Dedicated Dashboard */}
              <div id="launch-dash-card" className="relative group overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-3xl p-8 shadow-xl shadow-indigo-900/10 border border-indigo-950 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
                <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 font-semibold mb-2 block">POWERFUL INTERFACE</span>
                  <h2 className="text-2.5xl font-extrabold tracking-tight mb-2">Full Screen AI Dashboard</h2>
                  <p className="text-sm text-indigo-100/70 leading-relaxed mb-6">
                    A beautiful workspace layout designed for writing, deep debugging, and file parsing. Fits widescreen displays perfectly with prompt templates, settings adjustment details, and character roles.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("workspace")}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-indigo-900 font-bold text-sm tracking-wide shadow-sm hover:bg-indigo-50 transition-colors uppercase cursor-pointer"
                  >
                    Launch Workspace
                  </button>
                </div>
              </div>

              {/* Card 2: Interactive Floating Widget explain */}
              <div id="try-widget-card" className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400 font-semibold mb-2 block">DOCKABLE CO-PILOT</span>
                  <h2 className="text-2.5xl font-extrabold text-gray-900 tracking-tight mb-2">Floating Chatbot Widget</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    Perfect for light, unobtrusive querying of your custom Gemini bot. Experience responsive positioning, gorgeous transitions, custom avatar themes, and responsive design for all screen resolutions.
                  </p>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setIsWidgetOpen(true)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-900 text-white font-bold text-sm tracking-wide shadow-sm hover:bg-gray-800 transition-colors uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageSquare className="w-4.5 h-4.5" />
                    Open Chatbot
                  </button>
                  <span className="text-xs text-indigo-600 font-semibold animate-pulse">
                    ← Try floating trigger at bottom-right corner!
                  </span>
                </div>
              </div>

            </div>

            {/* Quick credentials informational alert */}
            <div className="mt-12 p-4 rounded-xl bg-amber-50/50 border border-amber-200/50 text-amber-800 text-xs max-w-xl text-center leading-relaxed">
              <span className="font-semibold text-amber-900 inline-block mr-1">💡 Host Instruction:</span>
              Your Gemini API key is securely retrieved server-side. Ensure you have registered your key in the **Settings &gt; Secrets** panel on the AI Studio control interface to prevent connection timeout! No local secrets are exposed to client-side code.
            </div>

          </section>
        )}

        {/* ==================== SCREEN 2: DEDICATED WORKSPACE WORKBENCH ==================== */}
        {activeTab === "workspace" && (
          <section id="aether-workspace-module" className="flex-1 flex overflow-hidden w-full relative">
            
            {/* Mobile Workspace threads sidebar backdrop, clicking dismisses sidebar */}
            {!isSidebarCollapsed && (
              <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-35 md:hidden transition-opacity"
                onClick={() => setIsSidebarCollapsed(true)}
              />
            )}

            {/* 2.1 Workspace Sidebar: Past Threads management */}
            <aside
              id="workspace-threads-sidebar"
              className={`border-r border-gray-200 bg-white flex flex-col justify-between transition-all duration-300 h-full
                fixed md:relative inset-y-0 left-0 z-40 md:z-20
                ${isSidebarCollapsed ? "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden" : "translate-x-0 w-72"}
              `}
            >
              {/* Upper sidebar content */}
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Conversations</span>
                  
                  {/* New Session button */}
                  <button
                    type="button"
                    id="new-chat-sidebar-btn"
                    onClick={() => createNewSession(activePersonaId)}
                    title="Start new conversation"
                    className="p-1 px-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-xs text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>

                {/* List dynamic sessions */}
                <div className="p-2 space-y-1 divide-y divide-gray-50 max-h-[80%] overflow-y-auto">
                  {sessions.map((ses) => {
                    const isSelected = ses.id === activeSessionId;
                    const sessionPersona = PERSONAS.find(p => p.id === ses.personaId) || PERSONAS[0];

                    return (
                      <div
                        key={ses.id}
                        onClick={() => handleSelectSession(ses.id)}
                        className={`group relative p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? "bg-slate-100 border border-slate-200/50" 
                            : "bg-transparent hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        {/* Persona indicator avatar bubble */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-xs bg-slate-50 border border-slate-200`}>
                          {sessionPersona.avatar}
                        </div>

                        {/* Title text */}
                        <div className="flex-1 min-w-0 pr-6">
                          {sessionRenameId === ses.id ? (
                            <input
                              type="text"
                              value={sessionRenameValue}
                              onChange={(e) => setSessionRenameValue(e.target.value)}
                              onBlur={() => confirmRenameSession(ses.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") confirmRenameSession(ses.id);
                                if (e.key === "Escape") setSessionRenameId(null);
                              }}
                              autoFocus
                              className="w-full text-sm font-semibold text-gray-900 bg-white border border-indigo-400 p-0.5 rounded outline-none"
                            />
                          ) : (
                            <>
                              <span className="block text-xs font-semibold text-gray-900 truncate group-hover:text-indigo-600">
                                {ses.name}
                              </span>
                              <span className="block text-[10px] text-gray-400 font-medium">
                                {ses.timestamp} • {sessionPersona.name}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Thread management actions */}
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-gradient-to-l from-gray-50 via-gray-50 pl-2 transition-opacity">
                          
                          {/* Rename check */}
                          {sessionRenameId !== ses.id && (
                            <button
                              type="button"
                              onClick={(e) => startRenameSession(ses.id, ses.name, e)}
                              title="Rename Thread"
                              className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <PenTool className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(ses.id, e)}
                            title="Delete Conversation"
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lower sidebar configurations / voice selectors */}
              <div className="p-4 border-t border-gray-100 bg-slate-50/70">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-bold text-gray-900 uppercase">Aether settings</span>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                  <label className="block text-[11px] text-gray-500 font-semibold">Narrator voice (TTS):</label>
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-200 outline-none p-2 rounded-lg font-medium text-gray-800 focus:border-indigo-400 transition-colors"
                  >
                    <option value="Kore">Kore (Warm Professional)</option>
                    <option value="Puck">Puck (Cheerful & Friendly)</option>
                    <option value="Zephyr">Zephyr (Bright Speaker)</option>
                    <option value="Charon">Charon (Deep Academic)</option>
                  </select>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Session ID: {activeSessionId.substring(0,10)}...</span>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Personas panel
                  </button>
                </div>
              </div>
            </aside>

            {/* 2.2 Workspace Chat Panel (Main chat column) */}
            <div id="main-workspace-dialog" className="flex-1 flex flex-col justify-between bg-white relative">
              
              {/* Active Conversation details banner header */}
              <div id="workspace-ban-header" className="p-4 border-b border-gray-100 bg-white flex items-center justify-between gap-4 shadow-3xs">
                <div className="flex items-center gap-3">
                  {/* Collapsable panel toggle */}
                  <button
                    type="button"
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    title={isSidebarCollapsed ? "Expand conversations list" : "Collapse conversations list"}
                    className="p-1 px-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {isSidebarCollapsed ? <PanelLeftOpen className="w-4.5 h-4.5" /> : <PanelLeftClose className="w-4.5 h-4.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 truncate max-w-[120px] sm:max-w-[200px]">
                      {activeSession?.name || "Active Chat"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                      {PERSONAS.find(p => p.id === activePersonaId)?.name}
                    </span>
                  </div>
                </div>

                {/* Hot control bar */}
                <div className="flex items-center gap-3.5">
                  {/* Web search toggle button */}
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={activeSearch}
                        onChange={(e) => setActiveSearch(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-8 h-4 rounded-full transition-colors duration-200 ${activeSearch ? "bg-emerald-500" : "bg-gray-200"}`} />
                      <div className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform duration-200 shadow-sm ${activeSearch ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                      <Search className={`w-3.5 h-3.5 ${activeSearch ? "text-emerald-500" : "text-gray-400"}`} />
                      Web Search
                    </span>
                  </label>

                  {/* Open settings trigger */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    title="Switch AI Role Personality"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-medium text-gray-600 hidden sm:inline">Role</span>
                  </button>
                </div>
              </div>

              {/* Chat messages layout zone */}
              <div 
                id="workspace-chat-container"
                ref={workspaceScrollRef}
                className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 scroll-smooth bg-slate-50/30"
              >
                {activeSession?.messages?.length === 1 && (
                  <div className="max-w-xl mx-auto py-8">
                    {/* Welcome box detailing selected agent */}
                    <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100/30 mb-8">
                      <h4 className="text-sm font-extrabold text-indigo-900 mb-2 flex items-center gap-2">
                        <span>🔮</span>
                        Character Role: {PERSONAS.find(p => p.id === activePersonaId)?.name}
                      </h4>
                      <p className="text-xs text-indigo-950/80 leading-relaxed">
                        {PERSONAS.find(p => p.id === activePersonaId)?.description} (System prompt automatically injected: "{PERSONAS.find(p => p.id === activePersonaId)?.systemInstruction.substring(0, 75)}...")
                      </p>
                    </div>

                    {/* Quick message templates / accelerator cards */}
                    <h5 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest text-center mb-4">
                      Prompt Accelerators
                    </h5>
                    <div id="quick-prompt-tiles" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {PROMPT_ACCELERATORS.map((acc, aIdx) => (
                        <div
                          key={aIdx}
                          onClick={() => handleSendWorkspaceMessage(acc.text)}
                          className="p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-200 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                        >
                          <div className="mb-3">{acc.icon}</div>
                          <div>
                            <span className="block text-sm font-bold text-gray-900 mb-1">{acc.label}</span>
                            <span className="block text-xs text-gray-400 line-clamp-2 leading-normal">
                              {acc.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* List all session chat bubbles */}
                {activeSession?.messages?.map((msg) => {
                  const isAssistant = msg.role === "assistant";
                  const agentPersona = PERSONAS.find(p => p.id === activeSession.personaId) || PERSONAS[0];

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-4 max-w-3xl mx-auto ${
                        isAssistant ? "justify-start" : "justify-end"
                      }`}
                    >
                      {/* Avatar Bubble */}
                      {isAssistant && (
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base shadow-xs flex-shrink-0">
                          {agentPersona.avatar}
                        </div>
                      )}

                      {/* Content column */}
                      <div className="flex flex-col space-y-1.5 max-w-[85%]">
                        
                        {/* Bubble itself */}
                        <div
                          className={`p-4 rounded-2xl shadow-xs relative ${
                            isAssistant 
                              ? msg.isError
                                ? "bg-rose-50 border border-rose-200 text-rose-800"
                                : "bg-white border border-gray-100 text-gray-800" 
                              : "bg-indigo-600 text-white"
                          }`}
                        >
                          {/* Render attached thumbnail in user bubble */}
                          {msg.image && (
                            <div className="mb-3 rounded-lg overflow-hidden max-w-sm max-h-[220px] shadow relative border border-white/20">
                              <img
                                src={`data:${msg.image.mimeType};base64,${msg.image.data}`}
                                alt="User Attachment"
                                onClick={() => setLightboxImage(`data:${msg.image.mimeType};base64,${msg.image.data}`)}
                                className="w-full h-auto object-cover max-h-[220px] cursor-zoom-in hover:scale-102 transition-transform duration-200"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          {/* Message content text logic parsing */}
                          <div id={`msg-${msg.id}`}>
                            {isAssistant ? (
                              renderMessageContent(msg.content)
                            ) : (
                              <p className="text-sm font-medium whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            )}
                          </div>

                          {/* Render search grounding credentials inside Bot bubble */}
                          {isAssistant && msg.groundingSources && msg.groundingSources.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <span className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase block mb-1">
                                Sources grounded from Google Search
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {msg.groundingSources.map((src, sIdx) => (
                                  <a
                                    key={sIdx}
                                    href={src.uri}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2 py-1 rounded bg-emerald-50 border border-emerald-100 text-[10px] text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
                                  >
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                    {src.title ? (src.title.length > 25 ? src.title.substring(0, 25) + "..." : src.title) : "Web Page"}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Extra controls and metadata row */}
                        <div className={`flex items-center gap-2 px-1 text-[10px] text-gray-400 font-semibold ${
                          isAssistant ? "justify-start" : "justify-end text-right"
                        }`}>
                          <span>{msg.timestamp}</span>

                          {/* Voice speaking buttons available on Bot messages */}
                          {isAssistant && (
                            <button
                              type="button"
                              onClick={() => playSpeech(msg.content, msg.id)}
                              className="p-1 rounded text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {audioLoadingId === msg.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                              ) : speakingMessageId === msg.id ? (
                                <>
                                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                                  <span className="text-rose-500">Stop Voice</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  <span>Speak Answer</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                      </div>

                      {/* User Avatar */}
                      {!isAssistant && (
                        <div className="w-9 h-9 rounded-xl bg-gray-200 flex items-center justify-center text-gray-700 text-sm font-bold flex-shrink-0 shadow-xs border border-gray-300">
                          <User className="w-4.5 h-4.5" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Optimistic Thinking block visual state */}
                {workspaceLoading && (
                  <div className="flex gap-4 max-w-3xl mx-auto justify-start">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base shadow-xs flex-shrink-0 animate-bounce">
                      🔮
                    </div>
                    <div className="flex flex-col space-y-1 max-w-[85%]">
                      <div className="p-4 rounded-2xl bg-white border border-gray-100 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" />
                        </div>
                        <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider font-mono">
                          {activeSearch ? "Indexing Google Search Grounding..." : "Formulating Response..."}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Box 2.2.3 bottom text input controls flow */}
              <div id="workspace-input-drawer" className="p-4 border-t border-gray-100 bg-white">
                
                {/* Embedded thumbnail preview block staged ready to be sent */}
                <AnimatePresence>
                  {workspaceImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="mb-3 p-2 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center justify-between gap-4 max-w-xs shadow-sm relative group"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={`data:${workspaceImage.mimeType};base64,${workspaceImage.data}`}
                          alt="Attachment Staged"
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left">
                          <span className="block text-xs font-bold text-gray-700 truncate max-w-[120px]">
                            {workspaceImage.fileName}
                          </span>
                          <span className="block text-[10px] text-gray-400 font-semibold uppercase font-mono">
                            {workspaceImage.mimeType.split("/")[1]} image
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWorkspaceImage(null)}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Text prompt box container */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendWorkspaceMessage();
                  }}
                  id="workspace-draft-form"
                  className="flex items-end gap-3"
                >
                  
                  {/* Left accessories */}
                  <div className="flex items-center gap-1 pr-1 border-r border-gray-100 mb-1.5">
                    
                    {/* Paperclip attachment triggers */}
                    <label className="p-2.5 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer select-none">
                      <Paperclip className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageSelect(e, "workspace")}
                        className="sr-only"
                      />
                    </label>

                    {/* Emoji Panel launcher */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setWorkspaceEmojiOpen(!workspaceEmojiOpen)}
                        className="p-2.5 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      {/* Mini Emoji Picker Menu popover block */}
                      {workspaceEmojiOpen && (
                        <div className="absolute bottom-14 left-0 bg-white border border-gray-250 rounded-2xl shadow-xl p-3 z-30 w-[240px]">
                          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-150">
                            <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Select Emoji</span>
                            <button onClick={() => setWorkspaceEmojiOpen(false)} className="text-gray-400 hover:text-gray-600">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="grid grid-cols-6 gap-1.5">
                            {POPULAR_EMOJIS.map((em, emIdx) => (
                              <button
                                key={emIdx}
                                type="button"
                                onClick={() => {
                                  setWorkspaceDraft(prev => prev + em);
                                  setWorkspaceEmojiOpen(false);
                                }}
                                className="w-8 h-8 rounded-lg hover:bg-indigo-50 flex items-center justify-center text-sm cursor-pointer"
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Main auto expanding texting inputs */}
                  <div className="flex-1">
                    <textarea
                      value={workspaceDraft}
                      onChange={(e) => setWorkspaceDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendWorkspaceMessage();
                        }
                      }}
                      placeholder="Type your message, ask code, analyze images..."
                      className="w-full text-sm outline-none border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-2xl p-3 sm:p-3.5 max-h-[140px] resize-none leading-relaxed transition bg-gray-50/20"
                      rows={1}
                    />
                  </div>

                  {/* glowing send button bubble */}
                  <button
                    type="submit"
                    disabled={(!workspaceDraft.trim() && !workspaceImage) || workspaceLoading}
                    className={`p-4 rounded-xl text-white shadow-md flex items-center justify-center transition cursor-pointer mb-1 ${
                      (!workspaceDraft.trim() && !workspaceImage) || workspaceLoading
                        ? "bg-gray-200 shadow-none cursor-not-allowed"
                        : "bg-indigo-600 shadow-indigo-100 hover:bg-indigo-700 animate-pulse hover:animate-none"
                    }`}
                  >
                    <Send className="w-5 h-5" />
                  </button>

                </form>

                {/* Footnote information disclaimer */}
                <p className="text-[10px] text-gray-400 text-center mt-3 font-semibold uppercase tracking-wider">
                  AI responses can be incomplete. Ground search if verifying real-time facts.
                </p>

              </div>

            </div>

          </section>
        )}

      </main>

      {/* ==================== PANEL 3: COLLAPSIBLE AI ROLES DRAWER OVERLAY ==================== */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5.5 h-5.5 text-indigo-600" />
                    <span className="text-lg font-extrabold text-gray-900 tracking-tight">AI Agent Persona Config</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1.5 rounded-full hover:bg-gray-150 transition cursor-pointer"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="mt-6 space-y-6">
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Select Character Role</label>
                    <p className="text-xs text-gray-500">Alters the core system instructions mapped behind the chats.</p>
                  </div>

                  {/* Loop prebuilt persona grids */}
                  <div className="space-y-3.5">
                    {PERSONAS.map((p) => {
                      const isActive = p.id === activePersonaId;

                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setActivePersonaId(p.id);
                            // Also adjust current session persona if appropriate
                            if (activeSession) {
                              const updated = sessions.map(s => {
                                if (s.id === activeSessionId) {
                                  return { 
                                    ...s, 
                                    personaId: p.id,
                                    name: s.name.startsWith("Chat with") ? `Chat with ${p.name}` : s.name
                                  };
                                }
                                return s;
                              });
                              saveSessions(updated);
                            }
                          }}
                          className={`p-4 border rounded-2xl cursor-pointer transition-all flex items-start gap-3.5 relative overflow-hidden ${
                            isActive
                              ? "border-indigo-600 bg-indigo-50/20 shadow-sm"
                              : "border-gray-200 hover:border-gray-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-2xl w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                            {p.avatar}
                          </div>
                          <div className="text-left">
                            <span className="block text-sm font-bold text-gray-900">{p.name}</span>
                            <span className="block text-xs text-gray-500 font-medium leading-normal mt-1">{p.description}</span>
                          </div>
                          {isActive && (
                            <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>

              <div className="pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition uppercase shadow-lg shadow-indigo-100 cursor-pointer"
                >
                  Confirm role settings
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== CORE DECK 4: INTERACTIVE VISUAL DOCKED CHATBOT POPFLOW ==================== */}
      
      {/* 4.1 floating toggle anchor button */}
      <button
        type="button"
        id="chatbot-toggler-button"
        onClick={() => setIsWidgetOpen(!isWidgetOpen)}
        title="Trigger AI Floating Copilot"
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl text-white hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-transform duration-200 z-50 cursor-pointer"
      >
        {isWidgetOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6 animate-pulse" />}
      </button>

      {/* 4.2 overlay miniature floating window popover */}
      <AnimatePresence>
        {isWidgetOpen && (
          <div 
            id="aether-floating-widget"
            className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-32px)] h-[520px] bg-white rounded-2xl flex flex-col justify-between shadow-2xl overflow-hidden border border-gray-100 z-50"
          >
            {/* Widget header bar */}
            <div className="p-4 bg-indigo-600 text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm shadow-inner">
                  {PERSONAS.find(p => p.id === activePersonaId)?.avatar || "🤖"}
                </div>
                <div className="text-left">
                  <span className="block text-sm font-extrabold tracking-tight">Aether assistant</span>
                  <p className="text-[10px] text-indigo-200 font-semibold uppercase tracking-wider">
                    {PERSONAS.find(p => p.id === activePersonaId)?.name} • Ground: {widgetSearch ? "On" : "Off"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsWidgetOpen(false)}
                  className="p-1 rounded hover:bg-white/10 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Widget active messages box */}
            <div 
              id="widget-chat-scroller"
              ref={widgetScrollRef}
              className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4 scroll-smooth bg-slate-50/50"
            >
              {widgetMessages.map((msg, mIdx) => {
                const isAssistant = msg.role === "assistant";
                return (
                  <div key={msg.id || mIdx} className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}>
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs flex-shrink-0">
                        {PERSONAS.find(p => p.id === activePersonaId)?.avatar || "🤖"}
                      </div>
                    )}
                    <div className="flex flex-col space-y-1 max-w-[80%]">
                      <div className={`p-3 rounded-2xl text-xs relative ${
                        isAssistant
                          ? msg.isError
                            ? "bg-rose-50 border border-rose-100 text-rose-800"
                            : "bg-white border border-gray-100 text-gray-800 shadow-3xs"
                          : "bg-indigo-600 text-white"
                      }`}>
                        {msg.image && (
                          <div className="mb-2 rounded-lg overflow-hidden max-h-[140px] border border-white/15">
                            <img
                              src={`data:${msg.image.mimeType};base64,${msg.image.data}`}
                              alt=""
                              onClick={() => setLightboxImage(`data:${msg.image.mimeType};base64,${msg.image.data}`)}
                              className="w-full h-auto object-cover max-h-[140px] cursor-zoom-in"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-normal font-medium">{msg.content}</p>

                        {/* citations */}
                        {isAssistant && msg.groundingSources && msg.groundingSources.length > 0 && (
                          <div className="mt-2.5 pt-1.5 border-t border-gray-100 text-[9px]">
                            <span className="font-bold text-emerald-600 uppercase tracking-widest block mb-0.5">web sources:</span>
                            <div className="flex flex-col gap-0.5">
                              {msg.groundingSources.slice(0, 2).map((s, idx) => (
                                <a key={idx} href={s.uri} target="_blank" rel="noreferrer" className="text-emerald-700 underline truncate">
                                  {s.title || "Source link"}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 px-1 font-semibold">{msg.timestamp}</span>
                    </div>
                  </div>
                );
              })}

              {widgetLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs animate-bounce">
                    🔮
                  </div>
                  <div className="p-3 bg-white border border-gray-100 rounded-2xl flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
            </div>

            {/* Widget control and form input dock */}
            <div className="p-3 border-t border-gray-100 bg-white">
              
              {/* Image thumbnail staged */}
              {widgetImage && (
                <div className="mb-2 p-1 bg-slate-50 border rounded-lg flex items-center justify-between gap-2 max-w-[150px]">
                  <img src={`data:${widgetImage.mimeType};base64,${widgetImage.data}`} alt="" className="w-8 h-8 rounded object-cover" referrerPolicy="no-referrer" />
                  <span className="text-[8px] text-gray-400 truncate flex-1 font-mono">{widgetImage.fileName}</span>
                  <button onClick={() => setWidgetImage(null)} className="p-0.5 text-gray-500 hover:text-black">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Form trigger */}
              <form onSubmit={handleSendWidgetMessage} className="flex items-center gap-2">
                
                {/* Image selection */}
                <label className="p-2 border border-gray-200 hover:border-indigo-400 rounded-xl text-gray-500 hover:text-indigo-600 transition flex items-center justify-center cursor-pointer select-none">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e, "widget")} className="sr-only" />
                </label>

                {/* Ground togglers */}
                <button
                  type="button"
                  onClick={() => setWidgetSearch(!widgetSearch)}
                  title="Toggle Web Search Grounding"
                  className={`p-2 border rounded-xl flex items-center justify-center transition cursor-pointer ${
                    widgetSearch 
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600" 
                      : "border-gray-200 hover:border-indigo-400 text-gray-500"
                  }`}
                >
                  <Search className="w-4 h-4" />
                </button>

                {/* Text prompts */}
                <input
                  type="text"
                  value={widgetDraft}
                  onChange={(e) => setWidgetDraft(e.target.value)}
                  placeholder="Message Aether..."
                  className="flex-1 text-xs border border-gray-200 hover:border-gray-300 focus:border-indigo-500 rounded-xl p-2.5 outline-none font-medium leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={!widgetDraft.trim() && !widgetImage}
                  className={`p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center transition cursor-pointer ${
                    !widgetDraft.trim() && !widgetImage
                      ? "bg-gray-100 text-gray-400 shadow-none cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>

              </form>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* ==================== SCREEN 5: GLOBAL LIGHTBOX PHOTO ZOOM METRIC OVERLAY ==================== */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            id="lightbox-overlay-scrappy"
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 bg-black/90 backdrop-blur-xs flex items-center justify-center z-50 p-4 cursor-zoom-out"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden"
            >
              <img
                src={lightboxImage}
                alt="Lightbox high resolution"
                className="w-full h-auto object-contain max-h-[85vh] rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white rounded-full p-2.5 border border-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
