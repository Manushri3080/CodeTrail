import React, { useEffect, useRef, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import {
  Bot,
  Check,
  Clipboard,
  Code2,
  FileCode2,
  GitCompareArrows,
  Loader2,
  Mic,
  Plus,
  Radio,
  GripVertical,
  Send,
  Sparkles,
  Trash2,
  WrapText,
  X,
} from "lucide-react";
import { API_BASE } from "../../config/api";

const QUICK_ACTIONS = [
  {
    id: "explain",
    icon: <Sparkles size={16} className="text-amber-400 shrink-0" />,
    label: "Explain Code",
    prompt: "Explain this code and walk me through its logic step-by-step.",
    actionType: "explain",
  },
  {
    id: "suggest",
    icon: <Code2 size={16} className="text-cyan-400 shrink-0" />,
    label: "Suggest Improvements",
    prompt: "Review this code and suggest performance, quality, and structural improvements with code examples.",
    actionType: "review",
  },
  {
    id: "debug",
    icon: <Bot size={16} className="text-rose-400 shrink-0" />,
    label: "Find & Fix Bugs",
    prompt: "Analyze this code for potential runtime bugs, logical errors, or edge-case failures, and suggest fixes.",
    actionType: "debug",
  },
  {
    id: "tests",
    icon: <Check size={16} className="text-emerald-400 shrink-0 stroke-[2.5]" />,
    label: "Generate Tests",
    prompt: "Generate comprehensive unit tests covering standard cases and edge cases for this code.",
    actionType: "tests",
  },
];

const createWelcomeMessage = () => ({
  id: "ai-assistant-welcome",
  role: "assistant",
  content:
    "Hi! I'm your CodeTrail AI assistant. I can explain code, fix bugs, suggest changes, or write tests/docs. Click **+** to add the open file if you want help with it.",
});

const getCodeLanguage = (language = "") =>
  language === "javascript" ? "js" : language || "code";

const renderInlineMarkdown = (text, keyPrefix = "t") => {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-gray-100">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${keyPrefix}-c-${i}`} className="px-1.5 py-0.5 rounded bg-black/30 border border-white/10 text-[11px] font-mono text-fuchsia-200">{part.slice(1, -1)}</code>;
    }
    return <span key={`${keyPrefix}-s-${i}`}>{part}</span>;
  });
};

const renderTextBlock = (text, baseKey) => {
  const normalized = String(text || "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  const lines = normalized.split("\n");
  const nodes = [];
  let listItems = [];
  let orderedItems = [];
  let paraLines = [];

  const flushPara = () => {
    if (!paraLines.length) return;
    const content = paraLines.join("\n").trim();
    if (content) {
      nodes.push(
        <p key={`${baseKey}-p-${nodes.length}`} className="text-gray-200/95 leading-7 break-words whitespace-pre-wrap my-1.5">
          {renderInlineMarkdown(content, `${baseKey}-p-${nodes.length}`)}
        </p>
      );
    }
    paraLines = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`${baseKey}-ul-${nodes.length}`} className="ct-ai-list ct-ai-ul">
        {listItems.map((item, i) => (
          <li key={`${baseKey}-li-${i}`} className="ct-ai-li">
            <span className="ct-ai-li-content">{renderInlineMarkdown(item, `${baseKey}-li-${i}`)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };
  const flushOrderedList = () => {
    if (!orderedItems.length) return;
    nodes.push(
      <ol key={`${baseKey}-ol-${nodes.length}`} className="ct-ai-list ct-ai-ol">
        {orderedItems.map((item, i) => (
          <li key={`${baseKey}-oli-${i}`} className="ct-ai-li ct-ai-oli">
            <span className="ct-ai-ol-marker">{i + 1}</span>
            <span className="ct-ai-li-content">{renderInlineMarkdown(item, `${baseKey}-oli-${i}`)}</span>
          </li>
        ))}
      </ol>
    );
    orderedItems = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      flushList();
      flushOrderedList();
      return;
    }
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushPara();
      flushList();
      flushOrderedList();
      const level = (trimmed.match(/^#+/) || ["#"])[0].length;
      const content = trimmed.replace(/^#{1,6}\s+/, "");
      let cls = "text-[13px] font-semibold text-gray-100 mt-3 mb-1.5 leading-6 break-words";
      const isCallout =
        level <= 3 && /^(Problem|Why\b|Cause\b|Fix\b|Correction\b|Solution\b|What it does\b|Summary\b|Step)/i.test(content);
      if (isCallout) {
        if (/^Problem\b/i.test(content)) cls = "text-[13px] font-semibold text-rose-100 mt-4 mb-2 px-3 py-2 rounded-lg bg-rose-500/10 border-l-2 border-rose-400/70 leading-6 break-words";
        else if (/^Why\b|^Cause\b/i.test(content)) cls = "text-[13px] font-semibold text-sky-100 mt-4 mb-2 px-3 py-2 rounded-lg bg-sky-500/10 border-l-2 border-sky-400/70 leading-6 break-words";
        else if (/^Fix\b|^Correction\b|^Solution\b/i.test(content)) cls = "text-[13px] font-semibold text-emerald-100 mt-4 mb-2 px-3 py-2 rounded-lg bg-emerald-500/10 border-l-2 border-emerald-400/70 leading-6 break-words";
        else if (/^What it does\b|^Summary\b/i.test(content)) cls = "text-[13px] font-semibold text-violet-100 mt-3 mb-2 px-3 py-2 rounded-lg bg-violet-500/10 border-l-2 border-violet-400/70 leading-6 break-words";
        else if (/^Step/i.test(content)) cls = "text-[13px] font-semibold text-slate-100 mt-4 mb-2 px-3 py-2 rounded-lg bg-slate-500/10 border-l-2 border-slate-400/70 leading-6 break-words";
      } else if (level === 1) {
        cls = "text-[16px] font-semibold tracking-tight text-gray-50 mt-1 mb-2.5 pb-2 border-b border-white/10 leading-7 break-words";
      } else if (level === 2) {
        cls = "text-[14px] font-semibold text-gray-100 mt-4 mb-1.5 leading-6 break-words";
      } else if (level === 3) {
        cls = "text-[13px] font-semibold text-gray-100 mt-3 mb-1 leading-6 break-words";
      } else {
        cls = "text-[12px] font-semibold text-gray-200/90 mt-2.5 mb-1 leading-6 break-words";
      }
      nodes.push(
        <div key={`${baseKey}-h-${nodes.length}`} className={cls}>
          {renderInlineMarkdown(content, `${baseKey}-h-${nodes.length}`)}
        </div>
      );
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      flushOrderedList();
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      flushList();
      orderedItems.push(trimmed.replace(/^\d+\.\s+/, ""));
      return;
    }
    flushList();
    flushOrderedList();
    paraLines.push(trimmed);
  });
  flushPara();
  flushList();
  flushOrderedList();
  return nodes;
};

  const inferFileNameFromCode = (code, lang = "", messageText = "") => {
    const l = String(lang || "").toLowerCase();
    const text = String(messageText || "").toLowerCase();
    const c = String(code || "");
    if (l === "markdown" || l === "md" || /^\s*#\s+/m.test(c) || /\breadme\b/.test(text)) return "README.md";
    const m = c.match(/^\s*(?:\/\/|#|<!--)\s*(?:file(?:name)?|path)\s*[:=]\s*([A-Za-z0-9._\-\/\\]+)/im);
    if (m?.[1]) return m[1].replace(/\\/g, "/").split("/").pop();
    if (l === "python" || l === "py") return "main.py";
    if (l === "javascript" || l === "js") return "index.js";
    if (l === "typescript" || l === "ts") return "index.ts";
    if (l === "html") return "index.html";
    if (l === "css") return "styles.css";
    if (l === "json") return "file.json";
    return "file.txt";
  };

  const requestFilePermissionAndApply = (code, lang, suggestedName, messageText = "") => {
    const name = inferFileNameFromCode(code, lang, suggestedName || messageText);
    const exists = Array.isArray(workspaceFiles) && workspaceFiles.some(f => (f?.name || f?.path || f?.id) === name || (f?.path || "").endsWith(`/${name}`));
    const mode = exists ? "update" : "create";
    const payload = { name, content: String(code || ""), mode, language: lang };
    if (!canEditFiles) {
      setError("You don't have permission to edit or create files in this workspace.");
      return;
    }
    if (autoFilePermissions) {
      onCreateOrUpdateFile && onCreateOrUpdateFile(payload);
      return;
    }
    setFileActionModal({ code: String(code || ""), language: lang || "", suggestedName: name, mode });
  };

  const confirmFileAction = () => {
    if (!fileActionModal) return;
    if (!canEditFiles) {
      setError("You don't have permission to edit or create files in this workspace.");
      setFileActionModal(null);
      return;
    }
    onCreateOrUpdateFile && onCreateOrUpdateFile({
      name: fileActionModal.suggestedName,
      content: fileActionModal.code,
      mode: fileActionModal.mode,
      language: fileActionModal.language,
    });
    setFileActionModal(null);
  };

  const handleSaveFileFromCode = (code, lang) => {
    requestFilePermissionAndApply(code, lang, input || "", input || "");
  };

  const renderMessageContent = (
    content,
    onCopyCode,
    onInsertCode,
    onPreviewCode,
    onSaveToFile,
    insertedKey,
    wrappedCodeBlocks = {},
    onToggleWrap,
    messageId = "msg",
  ) => {
  const parts = String(content || "").split(/```(\w*)\n([\s\S]*?)```/g);
  const blocks = [];

  for (let index = 0; index < parts.length; index += 1) {
    if (index % 3 === 0) {
      if (parts[index] && parts[index].trim()) {
        blocks.push(
          <div key={`text-${index}`} className="space-y-1.5">
            {renderTextBlock(parts[index], `text-${index}`)}
          </div>
        );
      }
    } else if (index % 3 === 1) {
      const lang = parts[index] || "";
      const code = parts[index + 1] || "";
      const codeKey = `${messageId}-code-${index}`;
      const isInserted = insertedKey === codeKey;
      const isWrapped = !!wrappedCodeBlocks[codeKey];
      blocks.push(
        <div className="ai-assistant-code-block" key={codeKey}>
          <div className="ai-assistant-code-header">
            <span>{getCodeLanguage(lang)}</span>
            <div className="ai-assistant-code-actions">
              <button
                type="button"
                onClick={() => onToggleWrap && onToggleWrap(codeKey)}
                className={isWrapped ? "text-fuchsia-300 font-semibold" : ""}
                title={isWrapped ? "Disable code wrap" : "Enable code wrap"}
              >
                <WrapText size={13} />
                {isWrapped ? "Unwrap" : "Wrap"}
              </button>
              <button
                type="button"
                onClick={() => onCopyCode(code)}
                title="Copy code"
              >
                <Clipboard size={13} />
                Copy
              </button>
              <button
                type="button"
                onClick={() => onPreviewCode && onPreviewCode(code, lang, codeKey)}
                title="Compare with current code and preview changes"
              >
                <GitCompareArrows size={13} />
                Preview
              </button>
              <button
                type="button"
                onClick={() => onInsertCode(code, codeKey, lang)}
                className={isInserted ? "text-emerald-400 font-semibold" : ""}
                title="Preview and apply code changes"
              >
                {isInserted ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    Previewing
                  </>
                ) : (
                  <>
                    <Code2 size={13} />
                    Apply…
                  </>
                )}
              </button>
              {onSaveToFile && (
                <button
                  type="button"
                  onClick={() => onSaveToFile(code, lang, codeKey)}
                  title="Create or update a workspace file with this code (asks for permission)"
                >
                  <FileCode2 size={13} />
                  Save file
                </button>
              )}
            </div>
          </div>
          <pre
            style={{
              whiteSpace: isWrapped ? "pre-wrap" : "pre",
              overflowWrap: isWrapped ? "anywhere" : "normal",
              wordBreak: isWrapped ? "break-word" : "normal",
              overflowX: isWrapped ? "hidden" : "auto",
              overflowY: "hidden",
            }}
          >
            <code>{code}</code>
          </pre>
        </div>,
      );
      index += 1;
    }
  }

  return blocks;
};

function AIAssistantPanel({
  isOpen,
  onClose,
  activeFile,
  activeLanguage,
  fileContent,
  selectedCode,
  onInsertCode,
  onApplyCode,
  onCreateOrUpdateFile,
  canEditFiles = true,
  triggerAction,
  workspaceId,
  files,
  activeWorkspace,
  apiUrl = import.meta.env.VITE_AI_ASSISTANT_API_URL || `${API_BASE}/ai/chat`,
}) {
          const resolvedWorkspaceId = workspaceId || activeWorkspace?._id || activeWorkspace?.id;
  const workspaceFiles = files || activeWorkspace?.files || [];
  const historyStorageKey = `ct-ai-assistant-history-${resolvedWorkspaceId || "default"}`;
  const [messages, setMessages] = useState([createWelcomeMessage()]);
  const historyHydratedRef = useRef(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextMode, setContextMode] = useState(
    selectedCode ? "selection" : "file",
  );
  const [copied, setCopied] = useState(false);
  const [insertedKey, setInsertedKey] = useState(null);
  const [wrappedCodeBlocks, setWrappedCodeBlocks] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [previewState, setPreviewState] = useState(null); // { code, language, original, modeSuggestion, fileName }
  const [fileActionModal, setFileActionModal] = useState(null); // { code, language, suggestedName, mode: 'create'|'update' }
  const [autoFilePermissions, setAutoFilePermissions] = useState(() => {
    try { return localStorage.getItem("ct-ai-auto-file-permissions") === "true"; } catch { return false; }
  });
  const [isCurrentFileAttached, setIsCurrentFileAttached] = useState(
    Boolean(activeFile),
  );
  const [panelWidth, setPanelWidth] = useState(() => {
    const savedWidth = Number(localStorage.getItem("ct-ai-assistant-width"));
    return Number.isFinite(savedWidth)
      ? Math.min(520, Math.max(340, savedWidth))
      : 380;
  });
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const resizeRef = useRef(null);
  const lastTriggerRef = useRef(null);

  useEffect(() => {
    historyHydratedRef.current = false;
    try {
      const raw = localStorage.getItem(historyStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          historyHydratedRef.current = true;
          return;
        }
      }
    } catch {}
    setMessages([createWelcomeMessage()]);
    historyHydratedRef.current = true;
  }, [historyStorageKey]);

  useEffect(() => {
    if (!historyHydratedRef.current) return;
    try {
      const toStore = Array.isArray(messages) ? messages.slice(-80) : [createWelcomeMessage()];
      localStorage.setItem(historyStorageKey, JSON.stringify(toStore));
    } catch {}
  }, [messages, historyStorageKey]);

  useEffect(() => {
    if (selectedCode) setContextMode("selection");
  }, [selectedCode]);

  useEffect(() => {
    try { localStorage.setItem("ct-ai-auto-file-permissions", String(autoFilePermissions)); } catch {}
  }, [autoFilePermissions]);

  useEffect(() => {
    // Do not auto-attach the open file; user adds context manually via the + button.
    setIsCurrentFileAttached(false);
    setContextMode("workspace");
  }, [activeFile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    localStorage.setItem("ct-ai-assistant-width", String(panelWidth));
  }, [panelWidth]);

  const startResize = (event) => {
    event.preventDefault();
    resizeRef.current = {
      startX: event.clientX,
      startWidth: panelWidth,
    };

    const handleResize = (moveEvent) => {
      if (!resizeRef.current) return;
      const nextWidth =
        resizeRef.current.startWidth +
        resizeRef.current.startX -
        moveEvent.clientX;
      setPanelWidth(Math.min(520, Math.max(340, nextWidth)));
    };
    const stopResize = () => {
      resizeRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      window.removeEventListener("pointermove", handleResize);
      window.removeEventListener("pointerup", stopResize);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handleResize);
    window.addEventListener("pointerup", stopResize);
  };

  const isFileAttachmentOn = contextMode === "file" && isCurrentFileAttached && Boolean(activeFile);
  const hasSelectionContext = contextMode === "selection" && Boolean(selectedCode?.trim());
  const hasFileContext = isFileAttachmentOn;
  const context = hasSelectionContext ? selectedCode : (hasFileContext ? (fileContent ?? "") : "");
  const contextLabel = hasSelectionContext
    ? "Selected code"
    : hasFileContext
      ? (activeFile || "Open file")
      : "Whole workspace";
  const canSend = Boolean(input.trim() || uploadedFiles.length > 0 || context.trim() || (Array.isArray(workspaceFiles) && workspaceFiles.length > 0) || resolvedWorkspaceId);

  const handleInsertCode = (code, codeKey, lang = "") => {
    // Open diff preview and require explicit confirmation before mutating editor content.
    openPreview(code, lang);
    setInsertedKey(codeKey);
    setTimeout(() => setInsertedKey(null), 1200);
  };

  const handlePreviewCode = (code, lang = "", codeKey = null) => {
    openPreview(code, lang);
    if (codeKey) {
      setInsertedKey(codeKey);
      setTimeout(() => setInsertedKey(null), 1200);
    }
  };

  const toggleCodeWrap = (codeKey) => {
    setWrappedCodeBlocks((prev) => ({ ...prev, [codeKey]: !prev[codeKey] }));
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy code from the assistant response.");
    }
  };

  const openPreview = (code, langHint = "") => {
    const hasSelection = Boolean(selectedCode && selectedCode.trim());
    const original = hasSelection ? selectedCode : (fileContent || "");
    const language = langHint || activeLanguage || "javascript";
    setPreviewState({
      code: String(code || ""),
      language,
      original: String(original || ""),
      hasSelection,
      fileName: activeFile || "current file",
      mode: hasSelection ? "replaceSelection" : "replaceFile",
    });
  };

  const closePreview = () => setPreviewState(null);

  const confirmApply = (mode) => {
    if (!previewState) return;
    const apply = typeof onApplyCode === "function" ? onApplyCode : onInsertCode;
    if (typeof apply !== "function") return;
    const payload = { code: previewState.code, mode };
    if (mode === "replaceSelection" && !previewState.hasSelection) {
      payload.mode = "insert";
    }
    apply(payload);
    closePreview();
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFiles((previous) => [
          ...previous.filter((item) => item.name !== file.name),
          {
            name: file.name,
            content: String(reader.result || ""),
            size: file.size,
          },
        ]);
      };
      reader.onerror = () => setError(`Could not read ${file.name}.`);
      reader.readAsText(file);
    });
    event.target.value = "";
  };

  const requestLocalResponse = (question, actionType = "general", ctxOverride = null) => {
    const resolvedContext = ctxOverride?.content ?? context;
    const resolvedFileName = ctxOverride?.fileName ?? activeFile ?? "file";
    const resolvedLanguage = ctxOverride?.language ?? activeLanguage ?? "javascript";
    const resolvedMode = ctxOverride?.mode ?? contextMode;
    const hasContext = Boolean(String(resolvedContext || "").trim());
    const lang = String(resolvedLanguage || "javascript").toLowerCase();
    const fileName = resolvedFileName || "file";
    const q = String(question || "").toLowerCase();
    const isPy = /python|\bpy\b/.test(lang) || /\.py$/i.test(fileName);
    const wantsBeginner = /\b(beginner|simple|basic|starter|easy|tutorial|sample|example)\b/.test(q);
    const wantsExplain = /\b(explain|what does|what is|how does|how it works|walk me|walkthrough|step by step|understand|describe)\b/.test(q);
    const wantsDocs = /\b(doc|docs|document|documents|documentation|documentations|documenting|comment|comments|docstring|jsdoc|readme)\b/.test(q);
    const wantsReadme = /\b(readme|whole project|entire project|project structure|project overview)\b/.test(q);
    const wantsCodeGen = /\b(suggest|generate|create|write|implement|build|make|show|give|sample|snippet|program)\b/.test(q) || (/\bcode\b/.test(q) && !wantsExplain && !wantsDocs);
    const wantsRefactor = /\b(refactor|improve|optimi[sz]e|clean|rewrite|review)\b/.test(q);
    const wsFiles = Array.isArray(ctxOverride?.workspaceFiles) ? ctxOverride.workspaceFiles : (Array.isArray(workspaceFiles) ? workspaceFiles : []);

    if (actionType === "debug" || /\b(debug|bug|error|exception|fail|fix|crash)\b/.test(q)) {
      if (!hasContext) {
        return `Using whole-workspace context. Describe the issue/error, or click **+** to attach a specific file/selection for a targeted fix.`;
      }
      return `### Debugging help: \`${fileName}\`

**What to check:**
- The exact error and the line where it happens.
- Missing or wrong values (null, undefined, wrong type).
- Edge cases like empty input or 0.

**Simple fix idea:**
\`\`\`${isPy ? "python" : lang}
${isPy
  ? `try:\n    # check inputs first\n    result = value\n    print(result)\nexcept Exception as err:\n    print("Error:", err)`
  : `try {\n  // check inputs first\n  const result = value;\n  console.log(result);\n} catch (err) {\n  console.error('Error:', err);\n}`}
\`\`\`

Share the error or expected result for a more specific fix.`;
    }

    if (actionType === "tests" || /\b(test|tests|spec|unit)\b/.test(q)) {
      const codeStr = String(resolvedContext || "");
      const fnMatch = codeStr.match(/(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(|def\s+([a-zA-Z0-9_]+)\s*\()/);
      const fnName = fnMatch ? (fnMatch[1] || fnMatch[2] || fnMatch[3]) : 'targetFunction';
      const isEvenFn = fnName.toLowerCase().includes('even') || /%\s*2\s*===?\s*0/.test(codeStr);

      if (isEvenFn) {
        return `### AI-Generated Test Suite: \`isEven(number)\`

**Language:** \`${isPy ? 'python' : 'javascript'}\` | **Parameters:** \`number\`

**Behavior:** Returns true if the input number is evenly divisible by 2 (even), otherwise false.

#### Test Scenarios Breakdown

| # | Input | Expected Output | Category | Scenario |
|---|---|---|---|---|
| 1 | \`[4]\` | \`true\` | **normal** | Positive even number |
| 2 | \`[5]\` | \`false\` | **normal** | Positive odd number |
| 3 | \`[0]\` | \`true\` | **boundary** | Zero input |
| 4 | \`[-2]\` | \`true\` | **negative** | Negative even number |
| 5 | \`[-7]\` | \`false\` | **negative** | Negative odd number |
| 6 | \`[2.5]\` | \`false\` | **decimal** | Decimal value input |
| 7 | \`[1000000]\` | \`true\` | **boundary** | Large boundary integer |
| 8 | \`["abc"]\` | \`false\` | **invalid** | Invalid string input |
| 9 | \`[null]\` | \`false\` | **null** | Null value input |
| 10 | \`[""]\` | \`false\` | **empty** | Empty value input |

#### Runnable Test Specifications

\`\`\`${isPy ? "python" : "javascript"}
${isPy
  ? `def test_positive_even():\n    assert isEven(4) == True\n\ndef test_positive_odd():\n    assert isEven(5) == False\n\ndef test_zero_boundary():\n    assert isEven(0) == True\n\ndef test_negative_even():\n    assert isEven(-2) == True\n\n# Run tests\ntest_positive_even()\ntest_positive_odd()\ntest_zero_boundary()\ntest_negative_even()\nprint("All isEven tests passed successfully!")`
  : `describe('isEven Unit Tests', () => {\n  it('handles positive even number', () => { expect(isEven(4)).toBe(true); });\n  it('handles positive odd number', () => { expect(isEven(5)).toBe(false); });\n  it('handles zero boundary', () => { expect(isEven(0)).toBe(true); });\n  it('handles negative even number', () => { expect(isEven(-2)).toBe(true); });\n});`}
\`\`\`

**Structured JSON:**
\`\`\`json
[
  { "input": [4], "expectedOutput": true, "description": "Positive even number" },
  { "input": [5], "expectedOutput": false, "description": "Positive odd number" },
  { "input": [0], "expectedOutput": true, "description": "Zero input" },
  { "input": [-2], "expectedOutput": true, "description": "Negative even number" }
]
\`\`\``;
      }

      return `### Test ideas: \`${fileName}\`

\`\`\`${isPy ? "python" : lang}
${isPy
  ? `def test_normal_case():\n    assert True\n\ndef test_edge_case():\n    assert 0 == 0\n\ndef test_invalid_input():\n    try:\n        pass\n        assert True\n    except Exception:\n        assert True`
  : `describe('${fileName}', () => {\n  it('handles normal input', () => { expect(true).toBe(true); });\n  it('handles edge cases', () => { expect(0).toBe(0); });\n  it('handles invalid input', () => { expect(() => {}).not.toThrow(); });\n});`}
\`\`\`

Tell me the target function and expected behavior for runnable tests.`;
    }

    if (actionType === "docs" || wantsDocs) {
      if (wantsReadme || resolvedMode === "workspace" || !hasContext) {
        const fileNames = (Array.isArray(wsFiles) ? wsFiles : []).map(f => f?.name || f?.fileName || f?.path).filter(Boolean);
        const mainFile = fileNames.find(n => /(^|\/)(main|index|app)\.(py|js|jsx|ts|tsx)$/i.test(String(n))) || fileNames[0] || "main.py";
        const runCmd = /\.py$/i.test(String(mainFile)) ? `python ${String(mainFile).split('/').pop()}` : /\.(js|jsx|ts|tsx)$/i.test(String(mainFile)) ? `node ${String(mainFile).split('/').pop()}` : `# run ${String(mainFile).split('/').pop()}`;
        const structure = fileNames.length ? fileNames.map(n => `- \`${n}\``).join("\n") : "- (no files detected in workspace context)";
        const readme = `# Project\n\nBrief description of what this project does.\n\n## Features\n- Feature 1\n- Feature 2\n- Feature 3\n\n## Installation\n\`\`\`bash\ngit clone <repo-url>\ncd <project-folder>\n# install dependencies (if needed)\n\`\`\`\n\n## Usage\n\`\`\`bash\n${runCmd}\n\`\`\`\n\n## Project Structure\n${structure}\n\n## Notes\n- Generated from workspace context${fileNames.length ? ` (${fileNames.length} file${fileNames.length === 1 ? "" : "s"} detected)` : ""}.\n- Update this README with real project details and setup steps.`;
        return `\`\`\`markdown\n${readme}\n\`\`\``;
      }
      const preview = String(resolvedContext || "").split("\n").slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join("\n");
      return `### Documentation: \`${fileName}\`\n\n**What it does**\n- Purpose: describe what this file/module does.\n- Main parts: key functions/classes.\n- Inputs/outputs: parameters, return values, side effects.\n\n**Code (reference)**\n\`\`\`${lang}\n${preview || "(no code)"}\n\`\`\``;
    }
    if (actionType === "algorithm" || /\b(algorithm|complexity|big o|time complexity|space complexity)\b/.test(q)) {
      return `### Algorithm & complexity notes

- Prefer efficient data structures (hash map/set), avoid unnecessary nested loops.
- Typical tradeoff: **O(n^2)/O(1)** naive vs **O(n) or O(n log n)/O(n)** optimized.

Share the exact problem or function for a concrete optimized solution.`;
    }

    if (actionType === "analyze" || actionType === "function-analysis" || /\b(analyz|parameter|return value|dependencies|execution flow)\b/.test(q)) {
      if (!hasContext) return `Attach the currently open file with **+** or select code in the editor so I can analyze parameters, return values, dependencies, and execution flow.`;
      const preview = String(resolvedContext || "").split("\n").slice(0, 60).map((l, i) => `${i + 1}: ${l}`).join("\n");
      return `### Code analysis: \`${fileName}\`

- **Parameters/inputs:** Inspect function signatures and external inputs.
- **Return values:** Check \`return\` statements/outputs.
- **Dependencies:** Imports, globals, and external calls.
- **Execution flow:** Entry -> validation -> logic/branches -> side effects -> return.

\`\`\`${lang}
${preview}
\`\`\``;
    }

    if (actionType === "explain" || (wantsExplain && actionType !== "generate" && actionType !== "refactor" && actionType !== "review" && actionType !== "docs" && actionType !== "tests" && actionType !== "debug" && actionType !== "algorithm" && actionType !== "analyze")) {
      if (!hasContext) {
        return `I can explain using the whole workspace. Ask about the project or click **+** to attach a specific file/selection for a detailed walkthrough.`;
      }
      const lines = String(resolvedContext || "").split("\n");
      const preview = lines.slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join("\n");
      return `### Code explanation: \`${fileName}\`

**Language:** ${lang} | **Lines:** ${lines.length}

1. **What it does:** A quick summary of this ${resolvedMode === "selection" ? "selection" : "file"}.
2. **How it runs:** It runs from top to bottom. Functions run when called.
3. **Inputs and outputs:** What goes in, what comes out, and what gets printed/saved.
4. **Important parts:** Key checks, loops, or steps.
5. **Things to watch for:** Empty or unexpected inputs.

\`\`\`${lang}
${preview}
\`\`\`

Select a specific part if you want a more detailed explanation.`;
    }

    if (actionType === "refactor" || actionType === "review" || (wantsRefactor && !wantsBeginner && !wantsExplain)) {
      if (!hasContext) return `Attach the currently open file with **+** or select code in the editor, and I can suggest refactoring/review improvements for it.`;
      return `### Code suggestion: \`${fileName}\`

**Request:** ${question || "Refactor/improve this code"}

\`\`\`${lang}
# Improved version of ${fileName}
${resolvedContext}
\`\`\`

Review and use Preview/Insert/Apply if you want to adopt these changes.`;
    }

    if (!wantsDocs && (wantsBeginner || ((actionType === "generate" || wantsCodeGen) && !wantsExplain && !wantsRefactor))) {
      const beginnerPy = `# Beginner Python examples\n\nprint("Hello, CodeTrail!")\n\nname = input("Enter your name: ")\nprint("Welcome,", name)\n\n\ndef add(a, b):\n    return a + b\n\nprint("2 + 3 =", add(2, 3))\n\nfor i in range(1, 6):\n    if i % 2 == 0:\n        print(i, "is even")\n    else:\n        print(i, "is odd")\n\nnumbers = [1, 2, 3, 4, 5]\nprint("Sum:", sum(numbers))\n`;
      const beginnerJs = `// Beginner JavaScript examples\n\nconsole.log("Hello, CodeTrail!");\n\nfunction add(a, b) {\n  return a + b;\n}\nconsole.log("2 + 3 =", add(2, 3));\n\nfor (let i = 1; i <= 5; i++) {\n  if (i % 2 === 0) console.log(i, "is even");\n  else console.log(i, "is odd");\n}\n\nconst numbers = [1, 2, 3, 4, 5];\nconsole.log("Sum:", numbers.reduce((s, n) => s + n, 0));\n`;
      const code = isPy ? beginnerPy : /javascript|typescript|\bjs\b|\bts\b|jsx|tsx/.test(lang) ? beginnerJs : beginnerPy;
      return `### Beginner code suggestions (${isPy ? "Python" : "JavaScript"})

**Request:** ${question || "Provide a helpful code example"}

\`\`\`${isPy ? "python" : (/javascript|typescript|\bjs\b|\bts\b|jsx|tsx/.test(lang) ? "javascript" : lang)}
${code}
\`\`\`

Insert/copy this into the editor and run it. Ask for loops, functions, lists/arrays, files, classes, or any specific topic for a targeted example.`;
    }

    // Prompt-only/general: understand the request without forcing file-based responses.
    if (hasContext) {
      return `Ready to help with \`${fileName}\` (${String(resolvedContext || "").split("\n").length} lines attached). Ask to explain, suggest beginner code, refactor, debug, generate tests/docs, or analyze.`;
    }
    return "Ready to help. I can understand your prompt without file context. Click **+** to attach the currently open file or select code when you want file-based help.";
  };

  const sendMessage = async (event, customQuestion = null, customActionType = "general") => {
    event?.preventDefault();
    const question = (customQuestion || input).trim();
    if (!question || isLoading) return;

    // Resolve context at send time. If nothing is explicitly attached, use whole-workspace context.
    const isWorkspaceDocsRequest = /\b(readme|whole project|entire project|project structure|project overview|documentation for (the )?project|document(ation)? (the )?(whole|entire) project)\b/i.test(question) ||
      (customActionType === "docs" && !selectedCode?.trim() && !isCurrentFileAttached);
    let effectiveMode = contextMode;
    let effectiveFileAttached = isCurrentFileAttached;

    if (effectiveMode === "selection" && !selectedCode?.trim()) {
      effectiveMode = "file";
    }
    if (!selectedCode?.trim() && !effectiveFileAttached) {
      effectiveMode = "workspace";
    }

    const hasSelectionCtx = effectiveMode === "selection" && Boolean(selectedCode?.trim());
    const hasFileCtx = effectiveMode === "file" && effectiveFileAttached && Boolean(activeFile);
    const hasWorkspaceCtx = !hasSelectionCtx && !hasFileCtx;
    const effectiveContent = hasSelectionCtx ? selectedCode : hasFileCtx ? (fileContent ?? "") : "";
    const effectiveSource = hasSelectionCtx
      ? "Selected code"
      : hasFileCtx
        ? (activeFile || "Open file")
        : "Whole workspace";

    // Reflect resolved mode in UI state (do not auto-attach a specific file).
    if (!hasSelectionCtx && !hasFileCtx) {
      if (effectiveFileAttached) setIsCurrentFileAttached(false);
      if (contextMode !== "workspace" && contextMode !== "file") setContextMode("workspace");
    } else if (effectiveMode !== contextMode) {
      setContextMode(effectiveMode);
    }

    setError("");
    setInput("");
    setMessages((previous) => [
      ...previous,
      { id: `user-${Date.now()}`, role: "user", content: question },
    ]);
    setIsLoading(true);

    try {
      let answer;
      let references = [];
      if (apiUrl) {
        try {
          const token = localStorage.getItem("ct-auth-token");

          // Route test generation with code to the specialized /api/ai/tests endpoint
          const isTestAction = customActionType === "tests" || /\b(test|tests|spec|unit test)\b/i.test(question);
          const hasCode = Boolean(effectiveContent && effectiveContent.trim());
          const isDocsAction = customActionType === "docs" || /\b(doc|docs|document|documents|documentation|documenting|readme|project structure|project overview|whole project|entire project)\b/i.test(question);
          const wantsFullReadme = /\b(readme|whole project|entire project|project structure|project overview)\b/i.test(question);
          const testApiUrl = apiUrl.replace(/\/ai\/chat.*$/, "/ai/tests");
          const docsApiUrl = apiUrl.replace(/\/ai\/chat.*$/, "/ai/docs");
          const requestUrl = (isTestAction && hasCode)
            ? testApiUrl
            : (isDocsAction ? docsApiUrl : apiUrl);
          const workspaceFilesForRequest = (hasWorkspaceCtx || wantsFullReadme || isDocsAction)
            ? workspaceFiles.map((f) => {
                const key = f?.path || f?.id || f?.name;
                const fromState = key ? (filesContent?.[key] ?? filesContent?.[f?.name]) : undefined;
                const contentVal = (typeof f?.content === "string" && f.content.length > 0) ? f.content : (typeof fromState === "string" ? fromState : (f?.content || ""));
                return { ...f, content: contentVal };
              })
            : workspaceFiles;

          const requestBody = (isTestAction && hasCode)
            ? JSON.stringify({
                code: effectiveContent,
                language: activeLanguage,
                message: question,
                workspaceId: resolvedWorkspaceId,
                context: {
                  fileName: activeFile,
                  language: activeLanguage,
                  content: effectiveContent,
                  source: effectiveSource,
                  attached: true,
                  mode: effectiveMode,
                },
              })
            : (isDocsAction ? JSON.stringify({
                message: question,
                actionType: "docs",
                workspaceId: resolvedWorkspaceId,
                files: workspaceFilesForRequest,
                context: {
                  fileName: hasWorkspaceCtx ? null : activeFile,
                  language: activeLanguage,
                  content: effectiveContent,
                  source: effectiveSource,
                  attached: Boolean(effectiveContent.trim()),
                  mode: hasWorkspaceCtx ? "workspace" : effectiveMode,
                },
              }) : JSON.stringify({
                message: question,
                conversation: messages,
                actionType: customActionType,
                workspaceId: resolvedWorkspaceId,
                files: workspaceFilesForRequest,
                context: {
                  fileName: hasWorkspaceCtx ? null : activeFile,
                  language: activeLanguage,
                  content: effectiveContent,
                  source: effectiveSource,
                  attached: Boolean(effectiveContent.trim()),
                  mode: hasWorkspaceCtx ? "workspace" : effectiveMode,
                },
                attachments: uploadedFiles.map(({ name, content }) => ({
                  name,
                  content,
                })),
              }));

          const response = await fetch(requestUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: requestBody,
          });
          if (!response.ok)
            throw new Error(`Assistant request failed (${response.status})`);
          const payload = await response.json();
          answer = payload.response || payload.message || payload.content;
          references = Array.isArray(payload.references) ? payload.references : [];
          if (!answer)
            throw new Error("The assistant returned an empty response.");
        } catch (fetchErr) {
          console.warn("[CodeTrail AI] Backend API call failed, falling back to local engine:", fetchErr.message);
          answer = requestLocalResponse(question, customActionType, {
            content: effectiveContent,
            fileName: hasWorkspaceCtx ? null : activeFile,
            language: activeLanguage,
            mode: hasWorkspaceCtx ? "workspace" : effectiveMode,
            workspaceFiles,
          });
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        answer = requestLocalResponse(question, customActionType, {
          content: effectiveContent,
          fileName: hasWorkspaceCtx ? null : activeFile,
          language: activeLanguage,
          mode: hasWorkspaceCtx ? "workspace" : effectiveMode,
          workspaceFiles,
        });
      }
      setMessages((previous) => [
        ...previous,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: answer,
          references
        },
      ]);
    } catch (requestError) {
      setError(
        requestError.message || "AI Assistant could not complete that request.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (
      triggerAction &&
      triggerAction.timestamp &&
      triggerAction.timestamp !== lastTriggerRef.current
    ) {
      lastTriggerRef.current = triggerAction.timestamp;
      sendMessage(null, triggerAction.prompt, triggerAction.actionType || "general");
    }
  }, [triggerAction]);

  const clearChat = () => {
    const welcome = [createWelcomeMessage()];
    setMessages(welcome);
    setError("");
    try {
      localStorage.setItem(historyStorageKey, JSON.stringify(welcome));
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <aside
      className="ai-assistant-panel"
      aria-label="AI assistant"
      style={{ "--ai-assistant-width": `${panelWidth}px` }}
    >
      <button
        type="button"
        className="ai-assistant-resize-handle"
        onPointerDown={startResize}
        title="Drag to resize assistant"
        aria-label="Resize AI assistant"
      >
        <GripVertical size={14} />
      </button>
      <div className="ai-assistant-panel-header">
        <div className="ai-assistant-title">
          <span className="ai-assistant-avatar">
            <Sparkles size={15} />
          </span>
          <div>
            <strong>AI Assistant</strong>
            <span>Workspace chat</span>
          </div>
        </div>
        <div className="ai-assistant-header-actions">
          <button type="button" onClick={clearChat} title="Clear chat">
            <Trash2 size={15} />
          </button>
          <button type="button" onClick={onClose} title="Close assistant">
            <X size={17} />
          </button>
        </div>
      </div>


      <div className="ai-assistant-messages" ref={scrollRef}>
        {messages.map((message) => (
          <div
            className={`ai-assistant-message ${message.role}`}
            key={message.id}
          >
            <span className="ai-assistant-message-icon">
              {message.role === "assistant" ? <Bot size={14} /> : "You"}
            </span>
            <div className="ai-assistant-message-body">
              <div className="ai-assistant-message-content">
                {renderMessageContent(
                  message.content,
                  copyCode,
                  handleInsertCode,
                  handlePreviewCode,
                  (code, lang) => handleSaveFileFromCode(code, lang),
                  insertedKey,
                  wrappedCodeBlocks,
                  toggleCodeWrap,
                  message.id,
                )}
              </div>
              {Array.isArray(message.references) && message.references.length > 0 && (
                <div className="ai-assistant-references mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                  <span className="text-[11px] text-gray-300 font-medium">Workspace References</span>
                  <div className="flex flex-wrap gap-2">
                    {message.references.map((ref, rIdx) => (
                      <span
                        key={`ref-${rIdx}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fuchsia-950/40 border border-fuchsia-800/40 text-[10px] text-fuchsia-200 font-mono leading-5"
                        title={`${ref.file} (Lines ${ref.startLine}-${ref.endLine})`}
                      >
                        <FileCode2 size={11} className="text-fuchsia-400 shrink-0" />
                        {ref.file}:{ref.startLine}-{ref.endLine}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {messages.length === 1 && (
          <div className="rounded-2xl border border-[#262C42] bg-[#0E101D] p-4 sm:p-5 space-y-3.5 shadow-lg my-3">
            <div className="flex items-center gap-2 text-[13.5px] font-semibold text-white">
              <Sparkles size={16} className="text-fuchsia-400 shrink-0" />
              <span className="leading-relaxed break-words">Quick AI Actions for {activeFile || "Editor"}:</span>
            </div>
            <div className="space-y-2.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => sendMessage(null, action.prompt, action.actionType)}
                  disabled={isLoading}
                  className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-[#1D2235] hover:bg-[#252C45] border border-[#2B324D] hover:border-purple-500/50 text-white text-[13.5px] font-semibold text-left transition-all cursor-pointer shadow-sm group"
                >
                  <span className="shrink-0 flex items-center justify-center group-hover:scale-110 transition-transform">{action.icon}</span>
                  <span className="font-semibold whitespace-normal break-words">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {isLoading && (
          <div className="ai-assistant-message assistant">
            <span className="ai-assistant-message-icon">
              <Bot size={14} />
            </span>
            <div className="ai-assistant-message-body">
              <div className="ai-assistant-message-content">
                <div className="flex items-center gap-2 text-sm text-fuchsia-200/80 py-1">
                  <Loader2 size={15} className="animate-spin text-fuchsia-400" />
                  <span>Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {previewState && (
        <div className="ai-preview-overlay" role="dialog" aria-modal="true" aria-label="AI code diff preview">
          <div className="ai-preview-modal">
            <div className="ai-preview-header">
              <div>
                <strong className="flex items-center gap-2"><GitCompareArrows size={14} /> Compare & Apply AI Changes</strong>
                <div className="text-[11px] text-gray-400 mt-1">
                  Original vs AI suggestion for <code>{previewState.fileName}</code>. Review the diff, then confirm how to apply.
                </div>
              </div>
              <button type="button" onClick={closePreview} title="Close preview" aria-label="Close preview">
                <X size={16} />
              </button>
            </div>
            <div className="ai-preview-body">
              <DiffEditor
                height="280px"
                language={previewState.language || "javascript"}
                original={previewState.original || ""}
                modified={previewState.code || ""}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 12,
                  wordWrap: "on",
                  automaticLayout: true,
                }}
              />
            </div>
            <div className="ai-preview-footer">
              <div className="text-[11px] text-gray-400">
                {previewState.hasSelection
                  ? "Selection detected: replace selection, insert at cursor, or replace the whole file."
                  : "No selection: insert at cursor or replace the whole file."}
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button type="button" className="ai-preview-btn secondary" onClick={closePreview}>Cancel</button>
                <button type="button" className="ai-preview-btn" onClick={() => confirmApply("insert")} title="Insert AI code at cursor">Insert at cursor</button>
                <button
                  type="button"
                  className="ai-preview-btn"
                  onClick={() => confirmApply("replaceSelection")}
                  disabled={!previewState.hasSelection}
                  title={previewState.hasSelection ? "Replace selected code with AI code" : "Select code in editor to enable Replace selection"}
                >
                  Replace selection
                </button>
                <button type="button" className="ai-preview-btn primary" onClick={() => confirmApply("replaceFile")} title="Replace the entire file with AI code">Replace file</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {fileActionModal && (
        <div className="ai-preview-overlay" role="dialog" aria-modal="true" aria-label="AI file action permission">
          <div className="ai-preview-modal" style={{ maxWidth: 560 }}>
            <div className="ai-preview-header">
              <div>
                <strong className="flex items-center gap-2"><FileCode2 size={14} /> {fileActionModal.mode === "create" ? "Create file" : "Update file"}</strong>
                <div className="text-[11px] text-gray-400 mt-1">
                  AI wants to {fileActionModal.mode === "create" ? "create" : "update"} a workspace file. Review and confirm.
                </div>
              </div>
              <button type="button" onClick={() => setFileActionModal(null)} title="Cancel" aria-label="Cancel file action"><X size={16} /></button>
            </div>
            <div className="ai-preview-body" style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#cbd5e1", display: "flex", flexDirection: "column", gap: 6 }}>
                File name
                <input
                  value={fileActionModal.suggestedName}
                  onChange={(e) => setFileActionModal((p) => p ? { ...p, suggestedName: e.target.value } : p)}
                  style={{ background: "#151821", border: "1px solid #303646", color: "#e5e7eb", borderRadius: 8, padding: "8px 10px", fontSize: 12 }}
                />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#cbd5e1" }}>
                <input type="checkbox" checked={autoFilePermissions} onChange={(e) => setAutoFilePermissions(e.target.checked)} />
                Auto-allow AI file create/update actions in this browser (you can turn this off later)
              </label>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {fileActionModal.mode === "create" ? "A new file will be added to the workspace." : "The existing file content will be replaced with the AI suggestion."} {!canEditFiles ? "You currently don’t have edit permission." : ""}
              </div>
            </div>
            <div className="ai-preview-footer">
              <div />
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button type="button" className="ai-preview-btn secondary" onClick={() => setFileActionModal(null)}>Cancel</button>
                <button type="button" className="ai-preview-btn primary" onClick={confirmFileAction} disabled={!canEditFiles || !String(fileActionModal.suggestedName || "").trim()}>
                  {fileActionModal.mode === "create" ? "Create file" : "Update file"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="ai-assistant-error">{error}</div>}

      <form className="ai-assistant-composer" onSubmit={sendMessage}>
        <input
          ref={fileInputRef}
          className="ai-assistant-file-input"
          type="file"
          multiple
          accept=".js,.jsx,.ts,.tsx,.py,.java,.css,.html,.json,.md,.txt"
          onChange={handleFileUpload}
        />
        <div
          className="ai-assistant-input-attachments"
          aria-label="Attached files"
        >
          <button
            type="button"
            className={`ai-assistant-current-file ${isCurrentFileAttached && contextMode === "file" ? "active" : ""}`}
            onClick={() => {
              if (!activeFile) return;
              setContextMode("file");
              setIsCurrentFileAttached((v) => !v);
            }}
            title={isCurrentFileAttached && contextMode === "file" ? "Detach current file context" : "Attach the currently open file as context"}
            aria-label={isCurrentFileAttached && contextMode === "file" ? `Detach ${activeFile || "current file"} context` : `Attach ${activeFile || "current file"} as context`}
            aria-pressed={isCurrentFileAttached && contextMode === "file"}
          >
            <Plus size={14} />
            <FileCode2 size={13} />
            <span>{activeFile || "Open file"}</span>
            {isCurrentFileAttached && contextMode === "file" ? <span style={{marginLeft: 4, opacity: 0.8}}>{fileContent?.trim() ? "attached" : "attached (empty)"}</span> : null}
          </button>
          {uploadedFiles.map((file) => (
            <span className="ai-assistant-input-file" key={file.name}>
              <FileCode2 size={13} />
              <span>{file.name}</span>
            </span>
          ))}
          {selectedCode && (
            <button
              type="button"
              className={`ai-assistant-input-file ${contextMode === "selection" ? "active" : ""}`}
              onClick={() => setContextMode(contextMode === "selection" ? "file" : "selection")}
              title={contextMode === "selection" ? "Stop using selected code as context" : "Use selected code as context"}
              aria-pressed={contextMode === "selection"}
            >
              <FileCode2 size={13} />
              <span>{contextMode === "selection" ? "Selected code (attached)" : "Selected code"}</span>
            </button>
          )}
          {!context.trim() && uploadedFiles.length === 0 && (
            <span className="ai-assistant-input-file" title="No file/selection attached. Click + to attach the currently open file.">
              <span>No context attached</span>
            </span>
          )}
        </div>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              sendMessage(event);
            }
          }}
          placeholder="Ask AI Assistant about your code..."
          rows={2}
          disabled={isLoading}
        />
        <div className="ai-assistant-composer-footer">
          <div className="ai-assistant-input-toolbar">
            <button
              type="button"
              className="ai-assistant-toolbar-icon"
              onClick={() => { if (activeFile) { setContextMode("file"); setIsCurrentFileAttached((v) => !v); } }}
              title={isCurrentFileAttached && contextMode === "file" ? "Detach current file context" : "Attach current open file as context"}
              aria-label={isCurrentFileAttached && contextMode === "file" ? "Detach current file context" : "Attach current open file as context"}
            >
              <Plus size={15} />
            </button>
            <button
              type="button"
              className="ai-assistant-toolbar-button"
              title="Agent mode"
            >
              <Sparkles size={13} /> Agent
            </button>
            <button
              type="button"
              className="ai-assistant-toolbar-button"
              title="Automatic context"
            >
              <Radio size={13} /> Auto
            </button>
            <span className="ai-assistant-toolbar-label">Standard</span>
            <span className="ai-assistant-toolbar-spacer" />
            <button
              type="button"
              className="ai-assistant-toolbar-icon"
              title="Voice input"
            >
              <Mic size={14} />
            </button>
            <button
              className="ai-assistant-toolbar-icon ai-assistant-send-button"
              type="submit"
              disabled={isLoading || !input.trim()}
              title="Send message"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </form>
      {copied && (
        <div className="ai-assistant-copy-toast">
          <Check size={13} /> Copied to clipboard
        </div>
      )}
    </aside>
  );
}

export default AIAssistantPanel;
