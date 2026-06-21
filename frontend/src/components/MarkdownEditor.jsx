import { useState } from "react";
import { motion } from "framer-motion";
import { Bold, Italic, Code, List, Link as LinkIcon, Eye } from "lucide-react";

export default function MarkdownEditor({ value, onChange, placeholder = "Write your message..." }) {
  const [showPreview, setShowPreview] = useState(false);

  // Insert markdown syntax at cursor position
  const insertMarkdown = (before, after = "") => {
    const textarea = document.getElementById("markdown-textarea");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value || "";
    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    
    onChange(newText);
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  // Simple markdown to HTML converter (basic implementation)
  const renderMarkdown = (text) => {
    if (!text) return "";
    
    return text
      // Bold: **text** or __text__
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<strong>$1</strong>")
      // Italic: *text* or _text_
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<em>$1</em>")
      // Code: `code`
      .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 bg-cyan-400/10 text-cyan-400 rounded">$1</code>')
      // Links: [text](url)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-cyan-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Line breaks
      .replace(/\n/g, "<br>");
  };

  const toolbarButtons = [
    { icon: Bold, label: "Bold", action: () => insertMarkdown("**", "**") },
    { icon: Italic, label: "Italic", action: () => insertMarkdown("*", "*") },
    { icon: Code, label: "Code", action: () => insertMarkdown("`", "`") },
    { icon: List, label: "List", action: () => insertMarkdown("- ") },
    { icon: LinkIcon, label: "Link", action: () => insertMarkdown("[", "](url)") },
  ];

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-black/40 backdrop-blur-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-cyan-500/20 bg-black/20">
        <div className="flex items-center gap-1">
          {toolbarButtons.map((btn) => (
            <motion.button
              key={btn.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={btn.action}
              className="p-2 rounded-lg hover:bg-cyan-400/10 text-white/60 hover:text-cyan-400 transition"
              title={btn.label}
              type="button"
            >
              <btn.icon size={18} />
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowPreview(!showPreview)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
            showPreview
              ? "bg-cyan-400 text-black"
              : "bg-cyan-400/10 text-cyan-400 hover:bg-cyan-400/20"
          }`}
          type="button"
        >
          <Eye size={16} />
          {showPreview ? "Edit" : "Preview"}
        </motion.button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div
          className="p-4 min-h-[150px] text-white/80 prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      ) : (
        <textarea
          id="markdown-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3 bg-transparent text-white placeholder-white/40 
                     focus:outline-none resize-none min-h-[150px]"
          rows={6}
        />
      )}

      {/* Helper text */}
      <div className="px-4 py-2 text-xs text-white/40 border-t border-cyan-500/20 bg-black/20">
        Supports: **bold**, *italic*, `code`, [links](url)
      </div>
    </div>
  );
}
