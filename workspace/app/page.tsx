"use client";

import React, { useState, useRef, useEffect } from "react";

const menuItems = [
  { icon: "chat", label: "Chat" },
  { icon: "gavel", label: "Legal Advice" },
  { icon: "description", label: "Documents" },
  { icon: "settings", label: "Settings" },
];

type Message =
  | { role: "user"; content: string }
  | { role: "assistant"; think: string; response: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (input.trim().toLowerCase() === "clear") {
      setMessages([]);
      setInput("");
      return;
    }
    setMessages((prev) => [
      ...prev,
      { role: "user", content: input },
      {
        role: "assistant",
        think: "streaming",
        response: "streaming"
      }
    ]);
    setIsLoading(true);
    setInput("");
    try {
      const res = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      let decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Try to extract complete JSON objects
        let startIndex = 0;
        let braceCount = 0;
        let inString = false;
        let escaped = false;
        
        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          
          if (escaped) {
            escaped = false;
            continue;
          }
          
          if (char === '\\') {
            escaped = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              braceCount++;
            } else if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                // Found complete JSON object
                const jsonStr = buffer.slice(startIndex, i + 1);
                try {
                  const data = JSON.parse(jsonStr);
                  
                  if (data.phase === "thinking") {
                    // Update only the thinking part
                    setMessages((prev) => {
                      return prev.map((msg, idx) =>
                        idx === prev.length - 1 && msg.role === "assistant"
                          ? { ...msg, think: data.think || "", response: "streaming" }
                          : msg
                      );
                    });
                  } else if (data.phase === "response") {
                    // Update the response part
                    setMessages((prev) => {
                      return prev.map((msg, idx) =>
                        idx === prev.length - 1 && msg.role === "assistant"
                          ? { ...msg, think: data.think || "", response: data.response || "" }
                          : msg
                      );
                    });
                  } else {
                    // Fallback for backward compatibility
                    setMessages((prev) => {
                      return prev.map((msg, idx) =>
                        idx === prev.length - 1 && msg.role === "assistant"
                          ? { ...msg, think: data.think || "", response: data.response || "" }
                          : msg
                      );
                    });
                  }
                } catch (e) {
                  console.error("Parse error:", e);
                }
                
                // Remove processed JSON from buffer
                buffer = buffer.slice(i + 1);
                startIndex = 0;
                i = -1; // Reset loop
              }
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const filtered = prev.filter((msg, idx) => !(idx === prev.length - 1 && msg.role === "assistant" && msg.think === "streaming"));
        return [
          ...filtered,
          {
            role: "assistant",
            think: "Error occurred.",
            response: "Sorry, something went wrong.",
          },
        ];
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex bg-gradient-to-br from-[#23235b] via-[#2c2c54] to-[#1a174d]">
      {/* Left Menu Bar */}
      <aside className="w-20 bg-[#23235b] border-r border-[#35357a] flex flex-col items-center py-8 space-y-8">
        {menuItems.map((item, idx) => (
          <button key={idx} className="flex flex-col items-center gap-1 text-white hover:text-indigo-400 focus:outline-none">
            <span className="material-icons text-3xl">{item.icon}</span>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </aside>
      {/* Main Chat UI */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-[#23235b] flex items-center px-8 border-b border-[#35357a]">
          <h1 className="text-2xl font-bold text-white tracking-wide">LegalX Chatbot</h1>
        </header>
        {/* Chat Area with scroll only for messages, fixed input at bottom */}
        <div className="relative flex-1 flex flex-col">
          <div className="absolute inset-0 top-0 bottom-20 flex flex-col overflow-y-auto px-0 sm:px-24 py-8 custom-scrollbar" style={{ minHeight: 0 }}>
            {messages.map((msg, idx) =>
              msg.role === "user" ? (
                <div key={idx} className="flex justify-end mb-4">
                  <div className="max-w-xl bg-blue-600 text-white rounded-2xl px-6 py-4 shadow-lg">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex flex-col items-start mb-4">
                  <div className="max-w-xl bg-gray-900 bg-opacity-80 text-white rounded-2xl px-6 py-4 shadow-lg mb-2">
                    <span className="block text-xs text-indigo-300 mb-2">Thinking...</span>
                    {msg.think === "streaming" || !msg.think ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse">●</span>
                        <span className="animate-pulse">●</span>
                      </span>
                    ) : (
                      msg.think
                    )}
                  </div>
                  <div className="max-w-xl bg-indigo-800 text-white rounded-2xl px-6 py-4 shadow-lg">
                    {msg.response === "streaming" || !msg.response ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce">●</span>
                      </span>
                    ) : (
                      msg.response
                    )}
                  </div>
                </div>
              )
            )}
            <div ref={chatEndRef} />
          </div>
          {/* Input Bar always below chat window, not scrollable */}
          <footer className="absolute left-0 right-0 bottom-0 h-20 bg-[#23235b] flex items-center px-8 border-t border-[#35357a]">
            <input
              type="text"
              className="flex-1 bg-gray-800 bg-opacity-70 text-white rounded-l-2xl px-6 py-4 outline-none"
              placeholder="Type your legal question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              className="bg-indigo-700 text-white rounded-r-2xl px-8 py-4 font-semibold hover:bg-indigo-800 transition"
              onClick={sendMessage}
            >
              Send
            </button>
          </footer>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #3a57e8 #23235b;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          background: #23235b;
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #3a57e8 40%, #23235b 100%);
          border-radius: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #5a7ffb 40%, #23235b 100%);
        }
      `}</style>
    </div>
  );
}
