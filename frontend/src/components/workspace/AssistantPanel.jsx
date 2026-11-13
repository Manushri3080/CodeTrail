import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Clipboard,
  Code2,
  FileCode2,
  Loader2,
  Mic,
  Plus,
  Radio,
  GripVertical,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

const createWelcomeMessage = () => ({
  id: "ai-assistant-welcome",
  role: "assistant",
  content:
    "Hi! I’m your AI coding assistant. Ask me about the open file, share a selection, or describe what you want to build.",
});

const getCodeLanguage = (language = "") =>
  language === "javascript" ? "js" : language || "code";

const renderMessageContent = (content, onCopyCode, onInsertCode) => {
  const parts = content.split(/```(\w*)\n([\s\S]*?)```/g);
  const blocks = [];

  for (let index = 0; index < parts.length; index += 1) {
    if (index % 3 === 0) {
      if (parts[index])
        blocks.push(<span key={`text-${index}`}>{parts[index]}</span>);
    } else if (index % 3 === 1) {
      const code = parts[index + 1] || "";
      blocks.push(
        <div className="ai-assistant-code-block" key={`code-${index}`}>
          <div className="ai-assistant-code-header">
            <span>{getCodeLanguage(parts[index])}</span>
            <div className="ai-assistant-code-actions">
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
                onClick={() => onInsertCode(code)}
                title="Insert code into the editor"
              >
                <Code2 size={13} />
                Insert
              </button>
            </div>
          </div>
          <pre>
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
  apiUrl = import.meta.env.VITE_AI_ASSISTANT_API_URL,
}) {
  const [messages, setMessages] = useState([createWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [contextMode, setContextMode] = useState(
    selectedCode ? "selection" : "file",
  );
  const [copied, setCopied] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
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

  useEffect(() => {
    if (selectedCode) setContextMode("selection");
  }, [selectedCode]);

  useEffect(() => {
    setIsCurrentFileAttached(Boolean(activeFile));
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

  if (!isOpen) return null;

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

  const context =
    contextMode === "selection" && selectedCode ? selectedCode : fileContent;
  const contextLabel =
    contextMode === "selection" && selectedCode
      ? "Selected code"
      : activeFile || "Open file";

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (copyError) {
      setError(`Could not copy code: ${copyError.message}`);
    }
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

  const requestLocalResponse = (question) => {
    const hasContext = Boolean(context?.trim());
    if (/clear|reset/i.test(question)) {
      return "I can clear the conversation using the trash button above. What would you like to work on next?";
    }
    if (/explain|what does|understand/i.test(question)) {
      return hasContext
        ? `The ${contextLabel.toLowerCase()} is ${context.split("\n").length} lines long. I can explain a specific function or flow if you point me to it.`
        : "Attach the open file or select some code and I’ll explain it step by step.";
    }
    return hasContext
      ? `I’m ready to help with ${contextLabel.toLowerCase()}. I have the context for your question, but no AI endpoint is configured yet. Set VITE_AI_ASSISTANT_API_URL to connect AI Assistant to your backend.`
      : "I’m ready to help. Attach the open file or select code to give me useful context.";
  };

  const sendMessage = async (event) => {
    event?.preventDefault();
    const question = input.trim();
    if (!question || isLoading) return;

    setError("");
    setInput("");
    setMessages((previous) => [
      ...previous,
      { id: `user-${Date.now()}`, role: "user", content: question },
    ]);
    setIsLoading(true);

    try {
      let answer;
      if (apiUrl) {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: question,
            conversation: messages,
            context: {
              fileName: activeFile,
              language: activeLanguage,
              content: context,
              source: contextLabel,
            },
            attachments: uploadedFiles.map(({ name, content }) => ({
              name,
              content,
            })),
          }),
        });
        if (!response.ok)
          throw new Error(`Assistant request failed (${response.status})`);
        const payload = await response.json();
        answer = payload.response || payload.message || payload.content;
        if (!answer)
          throw new Error("The assistant returned an empty response.");
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 650));
        answer = requestLocalResponse(question);
      }
      setMessages((previous) => [
        ...previous,
        { id: `assistant-${Date.now()}`, role: "assistant", content: answer },
      ]);
    } catch (requestError) {
      setError(
        requestError.message || "AI Assistant could not complete that request.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([createWelcomeMessage()]);
    setError("");
  };

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

      <div className="ai-assistant-viewbar">
        <button type="button" className="active">
          Chat
        </button>
        <span className="ai-assistant-status">
          <span /> Ready
        </span>
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
                {renderMessageContent(message.content, copyCode, onInsertCode)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="ai-assistant-message assistant">
            <span className="ai-assistant-message-icon">
              <Bot size={14} />
            </span>
            <div className="ai-assistant-typing">
              <Loader2 size={14} className="animate-spin" /> AI Assistant is
              thinking...
            </div>
          </div>
        )}
        {error && <div className="ai-assistant-error">{error}</div>}
      </div>

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
            className={`ai-assistant-current-file ${isCurrentFileAttached ? "active" : ""}`}
            onClick={() => {
              setIsCurrentFileAttached(true);
              setContextMode("file");
            }}
            title="Attach the current editor file as reference"
            aria-label={`Attach ${activeFile || "current file"} as reference`}
            aria-pressed={isCurrentFileAttached}
          >
            <Plus size={14} />
            <FileCode2 size={13} />
            <span>{activeFile || "Open file"}</span>
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
              className="ai-assistant-input-file"
              onClick={() => setContextMode("selection")}
              title="Use selected code as context"
            >
              <FileCode2 size={13} />
              <span>Selected code</span>
            </button>
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
              onClick={() => setIsCurrentFileAttached(true)}
              title="Add current file reference"
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
              disabled={!input.trim() || isLoading}
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
