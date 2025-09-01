"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaBalanceScale, FaGavel, FaFileAlt, FaUserShield, FaComments } from "react-icons/fa";

const menuItems = [
  { icon: <FaComments size={28} />, label: "Chat" },
  { icon: <FaGavel size={28} />, label: "Legal Advice" },
  { icon: <FaFileAlt size={28} />, label: "Documents" },
  { icon: <FaUserShield size={28} />, label: "Privacy" },
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
          if (char === "\\") {
            escaped = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") {
              braceCount++;
            } else if (char === "}") {
              braceCount--;
              if (braceCount === 0) {
                const jsonStr = buffer.slice(startIndex, i + 1);
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.phase === "thinking") {
                    setMessages((prev) => {
                      return prev.map((msg, idx) =>
                        idx === prev.length - 1 && msg.role === "assistant"
                          ? { ...msg, think: data.think || "", response: "streaming" }
                          : msg
                      );
                    });
                  } else if (data.phase === "response") {
                    setMessages((prev) => {
                      return prev.map((msg, idx) =>
                        idx === prev.length - 1 && msg.role === "assistant"
                          ? { ...msg, think: data.think || "", response: data.response || "" }
                          : msg
                      );
                    });
                  } else {
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
                buffer = buffer.slice(i + 1);
                startIndex = 0;
                i = -1;
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
      {/* Sidebar with branding and icons */}
      <aside className="w-24 bg-[#23235b] border-r border-[#35357a] flex flex-col items-center py-8 space-y-10 shadow-xl">
        <div className="mb-8 flex flex-col items-center">
          <FaBalanceScale size={40} className="text-yellow-400 mb-2" />
          <span className="text-lg font-bold text-yellow-400 tracking-wide">LegalX</span>
        </div>
        {menuItems.map((item, idx) => (
          <button key={idx} className="flex flex-col items-center gap-1 text-white hover:text-yellow-300 focus:outline-none">
            {item.icon}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </aside>
      {/* Main Chat UI */}
      <div className="flex-1 flex flex-col">
        {/* Header with logo and tagline */}
        <header className="h-20 bg-[#23235b] flex items-center px-10 border-b border-[#35357a] shadow-lg">
          <FaBalanceScale size={32} className="text-yellow-400 mr-4" />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-wide">LegalX Law Chatbot</h1>
            <p className="text-sm text-yellow-300">Your trusted legal assistant</p>
          </div>
        </header>
        {/* Chat Area with law-themed bubbles */}
        <div className="relative flex-1 flex flex-col">
          <div className="absolute inset-0 top-0 bottom-20 flex flex-col overflow-y-auto px-0 sm:px-24 py-8 custom-scrollbar" style={{ minHeight: 0 }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-white opacity-70">
                <FaBalanceScale size={60} className="mb-6 text-yellow-400" />
                <h2 className="text-2xl font-semibold mb-2">Welcome to LegalX</h2>
                <p className="text-lg mb-4">Ask your legal questions and get instant, reliable answers from our AI-powered law assistant.</p>
                <span className="text-yellow-300">Start by typing your question below.</span>
              </div>
            )}
            {messages.map((msg, idx) =>
              msg.role === "user" ? (
                <div key={idx} className="flex justify-end mb-4">
                  <div className="max-w-xl bg-yellow-400 text-[#23235b] rounded-2xl px-6 py-4 shadow-lg font-semibold border border-yellow-500">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={idx} className="flex flex-col items-start mb-4">
                  <div className="max-w-xl bg-gray-900 bg-opacity-80 text-white rounded-2xl px-6 py-4 shadow-lg mb-2 border border-yellow-700">
                    <span className="block text-xs text-yellow-300 mb-2">Thinking...</span>
                    {msg.think === "streaming" || !msg.think ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-pulse text-yellow-300">●</span>
                        <span className="animate-pulse text-yellow-300">●</span>
                        <span className="animate-pulse text-yellow-300">●</span>
                      </span>
                    ) : (
                      msg.think
                    )}
                  </div>
                  <div className="max-w-xl bg-yellow-400 text-[#23235b] rounded-2xl px-6 py-4 shadow-lg font-semibold border border-yellow-500">
                    {msg.response === "streaming" || !msg.response ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-bounce text-yellow-300">●</span>
                        <span className="animate-bounce text-yellow-300">●</span>
                        <span className="animate-bounce text-yellow-300">●</span>
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
          {/* Input Bar with law theme */}
          <div className="absolute left-0 right-0 bottom-0 h-20 bg-[#23235b] flex items-center px-8 border-t border-[#35357a]">
            <input
              type="text"
              className="flex-1 bg-gray-800 bg-opacity-70 text-white rounded-l-2xl px-6 py-4 outline-none text-lg border border-yellow-500"
              placeholder="Type your legal question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              className="bg-yellow-400 text-[#23235b] rounded-r-2xl px-8 py-4 font-bold text-lg hover:bg-yellow-300 transition border border-yellow-500"
              onClick={sendMessage}
              disabled={isLoading}
            >
              Send
            </button>
          </div>
        </div>
        {/* Footer for legal info and links */}
        <footer className="w-full bg-[#23235b] border-t border-[#35357a] py-6 px-4 flex flex-col md:flex-row items-center justify-between text-sm text-yellow-300 mt-auto">
          <div className="flex items-center gap-2">
            <FaBalanceScale className="text-yellow-400" />
            <span>LegalX &copy; {new Date().getFullYear()} | All rights reserved</span>
          </div>
          <div className="flex gap-4 mt-2 md:mt-0">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Contact</a>
          </div>
        </footer>
      </div>
    </div>
  );
}