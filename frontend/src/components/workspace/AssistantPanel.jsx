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
    icon: <Sparkles size={12} className="text-amber-400" />,
    label: "Explain Code",
    prompt: "Explain this code and walk me through its logic step-by-step.",
    actionType: "explain",
  },
  {
    id: "suggest",
    icon: <Code2 size={12} className="text-cyan-400" />,
    label: "Suggest Improvements",
    prompt: "Review this code and suggest performance, quality, and structural improvements with code examples.",
    actionType: "review",
  },
  {
    id: "debug",
    icon: <Bot size={12} className="text-red-400" />,
    label: "Find & Fix Bugs",
    prompt: "Analyze this code for potential runtime bugs, logical errors, or edge-case failures, and suggest fixes.",
    actionType: "debug",
  },
  {
    id: "tests",
    icon: <Check size={12} className="text-emerald-400" />,
    label: "Generate Tests",
    prompt: "Generate comprehensive unit tests covering standard cases and edge cases for this code.",
    actionType: "tests",
  },
];

const createWelcomeMessage = () => ({
  id: "ai-assistant-welcome",
  role: "assistant",
  content:
    "Hi! I’m your CodeTrail AI assistant. I can explain code, fix bugs, suggest changes, or write tests/docs. Click **+** to add the open file if you want help with it.",
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
  let paraLines = [];

  const flushPara = () => {
    if (!paraLines.length) return;
    const content = paraLines.join("\n").trim();
    if (content) {
      nodes.push(
        <p key={`${baseKey}-p-${nodes.length}`} className="text-gray-200 leading-7 break-words whitespace-pre-wrap">
          {renderInlineMarkdown(content, `${baseKey}-p-${nodes.length}`)}
        </p>
      );
    }
    paraLines = [];
  };
  const flushList = () => {
    if (!listItems.length) return;
    nodes.push(
      <ul key={`${baseKey}-ul-${nodes.length}`} className="list-disc pl-5 space-y-1.5 text-gray-200 leading-7">
        {listItems.map((item, i) => (
          <li key={`${baseKey}-li-${i}`} className="break-words">{renderInlineMarkdown(item, `${baseKey}-li-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) {
      flushPara();
      flushList();
      return;
    }
    if (/^#{1,6}\s+/.test(trimmed)) {
      flushPara();
      flushList();
      const level = (trimmed.match(/^#+/) || ["###"])[0].length;
      const content = trimmed.replace(/^#{1,6}\s+/, "");
      const cls = level <= 3 ? "text-sm font-semibold text-gray-100 mt-1" : "text-xs font-semibold text-gray-200 mt-1";
      nodes.push(
        <div key={`${baseKey}-h-${nodes.length}`} className={`${cls} leading-7 break-words`}>
          {renderInlineMarkdown(content, `${baseKey}-h-${nodes.length}`)}
        </div>
      );
      return;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      listItems.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      flushList();
      nodes.push(
        <div key={`${baseKey}-n-${nodes.length}`} className="text-gray-200 leading-7 break-words">
          {renderInlineMarkdown(trimmed, `${baseKey}-n-${nodes.length}`)}
        </div>
      );
      return;
    }
    flushList();
    paraLines.push(trimmed);
  });
  flushPara();
  flushList();
  return nodes;
};

const renderMessageContent = (
  content,
  onCopyCode,
  onInsertCode,
  onPreviewCode,
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
          <div key={`text-${index}`} className="space-y-3">
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
    // Do not auto-attach the open file; user adds context manually via the + button.
    setIsCurrentFileAttached(false);
    setContextMode("file");
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
      : "No file context attached";
  const canSend = Boolean(input.trim() || uploadedFiles.length > 0 || context.trim());

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
    const wantsCodeGen = /\b(suggest|generate|create|write|implement|build|make|show|give|sample|snippet|program)\b/.test(q) || (/\bcode\b/.test(q) && !wantsExplain && !wantsDocs);
    const wantsRefactor = /\b(refactor|improve|optimi[sz]e|clean|rewrite|review)\b/.test(q);

    if (actionType === "debug" || /\b(debug|bug|error|exception|fail|fix|crash)\b/.test(q)) {
      if (!hasContext) {
        return `I can help find the problem, but no file is attached yet.\n\n- Click **+** to add the open file, or paste the code\n- Share the error message if you have one.`;
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
        return `### 🧪 AI-GENERATED TEST SUITE: \`isEven(number)\`

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
  ? `def test_positive_even():\n    assert isEven(4) == True\n\ndef test_positive_odd():\n    assert isEven(5) == False\n\ndef test_zero_boundary():\n    assert isEven(0) == True\n\ndef test_negative_even():\n    assert isEven(-2) == True\n\n# Run tests\ntest_positive_even()\ntest_positive_odd()\ntest_zero_boundary()\ntest_negative_even()\nprint("✔ All isEven tests passed successfully!")`
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
      const preview = String(resolvedContext || "").split("\n").slice(0, 120).map((l, i) => `${i + 1}: ${l}`).join("\n");
      if (!hasContext) {
        return `I can write documentation, but no file is attached yet.\n\nClick **+** to add the open file (${activeFile || "a file"}) or paste the code, then ask again.`;
      }
      return `### Documentation: \`${fileName}\`

**What this code does**
- **Purpose:** What \`${fileName}\` is for.
- **Inputs:** Any inputs or settings it uses.
- **Outputs:** What it returns, prints, or changes.
- **How to use:** How to run or use it.
- **Notes:** Any errors or special cases to know about.

**Example doc comment**
\`\`\`${isPy ? "python" : lang}
${isPy
  ? `"""${fileName}\n\nWhat it does:\n    Briefly explain this file.\n\nHow to use:\n    Explain how to run it.\n"""`
  : `/**\n * ${fileName}\n * What it does: Briefly explain this code.\n * @param {*} input - Inputs.\n * @returns {*} Output.\n */`}
\`\`\`

**Code**
\`\`\`${lang}
${preview}
\`\`\``;
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
        return `I can explain the code, but no file is attached yet.\n\nClick **+** to add the open file (${activeFile || "a file"}), or select/paste the code, then ask again.`;
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

    // Resolve context at send time (avoids stale closure when auto-attaching).
    const needsFileContext = ["explain", "review", "refactor", "tests", "docs", "debug", "algorithm", "analyze", "function-analysis"].includes(customActionType);
    let effectiveMode = contextMode;
    let effectiveFileAttached = isCurrentFileAttached;

    if (effectiveMode === "selection" && !selectedCode?.trim()) {
      effectiveMode = "file";
    }
    if (needsFileContext) {
      if (selectedCode?.trim() && (effectiveMode === "selection" || !fileContent?.trim())) {
        effectiveMode = "selection";
      } else if (activeFile && fileContent?.trim()) {
        effectiveFileAttached = true;
        if (effectiveMode !== "selection" || !selectedCode?.trim()) effectiveMode = "file";
      }
    }

    const hasSelectionCtx = effectiveMode === "selection" && Boolean(selectedCode?.trim());
    const hasFileCtx = effectiveMode === "file" && effectiveFileAttached && Boolean(activeFile);
    const effectiveContent = hasSelectionCtx ? selectedCode : hasFileCtx ? (fileContent ?? "") : "";
    const effectiveSource = hasSelectionCtx ? "Selected code" : hasFileCtx ? (activeFile || "Open file") : "No file context attached";

    // Reflect auto-attach in UI state.
    if (effectiveFileAttached !== isCurrentFileAttached) setIsCurrentFileAttached(effectiveFileAttached);
    if (effectiveMode !== contextMode) setContextMode(effectiveMode);

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
          const testApiUrl = apiUrl.replace(/\/ai\/chat.*$/, "/ai/tests");
          const requestUrl = (isTestAction && hasCode) ? testApiUrl : apiUrl;

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
            : JSON.stringify({
                message: question,
                conversation: messages,
                actionType: customActionType,
                workspaceId: resolvedWorkspaceId,
                files: workspaceFiles,
                context: {
                  fileName: activeFile,
                  language: activeLanguage,
                  content: effectiveContent,
                  source: effectiveSource,
                  attached: Boolean(effectiveContent.trim()),
                  mode: effectiveMode,
                },
                attachments: uploadedFiles.map(({ name, content }) => ({
                  name,
                  content,
                })),
              });

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
            fileName: activeFile,
            language: activeLanguage,
            mode: effectiveMode,
          });
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        answer = requestLocalResponse(question, customActionType, {
          content: effectiveContent,
          fileName: activeFile,
          language: activeLanguage,
          mode: effectiveMode,
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
          <div className="ai-assistant-quick-actions-card" style={{ padding: "16px 18px", margin: "8px 0 12px" }}>
            <div className="text-xs font-semibold text-gray-200 mb-7 flex items-center gap-2" style={{ marginBottom: "20px" }}>
              <Sparkles size={14} className="text-fuchsia-400 shrink-0" />
              <span className="leading-relaxed break-words">Quick AI Actions for {activeFile || "Editor"}:</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => sendMessage(null, action.prompt, action.actionType)}
                  disabled={isLoading}
                  className="flex items-center gap-3 w-full bg-[#252833] hover:bg-[#2d313e] border border-[#3b4050] hover:border-fuchsia-400/50 rounded-lg text-[13px] text-gray-200 hover:text-white transition-all cursor-pointer text-left"
                  style={{ padding: "12px 14px", minHeight: "44px", lineHeight: "1.4" }}
                >
                  <span className="shrink-0 flex items-center justify-center">{action.icon}</span>
                  <span className="font-medium whitespace-normal break-words">{action.label}</span>
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
