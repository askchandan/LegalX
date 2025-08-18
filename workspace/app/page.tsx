"use client";

import { useState } from "react";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setAnswer("");
    setThinking("");
    try {
      const res = await fetch("http://localhost:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let thinkText = "";
      let answerText = "";
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          let chunk = decoder.decode(value);
          // Split chunk by prefix, handle multiple or mixed THINK/ANSWER
          const parts = chunk.split(/(THINK:|ANSWER:)/).filter(Boolean);
          let currentType = null;
          for (const part of parts) {
            if (part === "THINK:" || part === "ANSWER:") {
              currentType = part.replace(":", "");
              continue;
            }
            if (currentType === "THINK") {
              setThinking(prev => prev + part);
            } else if (currentType === "ANSWER") {
              setAnswer(prev => prev + part);
            }
          }
        }
      }
    } catch (err) {
      setError("Network error or streaming error. Is the backend running and streaming?");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-xl mx-auto p-6 rounded-lg shadow-lg bg-gray-950/80 border border-gray-800 mt-8">
        <div className="flex flex-col items-center mb-8">
          {/* Lady Justice SVG Placeholder */}
          <div className="mb-4">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="40" cy="40" r="40" fill="#222" />
              <text x="40" y="48" textAnchor="middle" fontSize="32" fill="#fff" fontWeight="bold">⚖️</text>
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 tracking-wide text-center">LegalX</h1>
          <h2 className="text-lg font-semibold text-gray-300 text-center mb-2">Legal Advisory Management System</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            className="w-full px-4 py-3 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
            placeholder="Enter your legal question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            required
            disabled={loading}
          />
          <button
            type="submit"
            className="w-full py-3 rounded bg-blue-600 hover:bg-blue-700 font-semibold text-white transition disabled:opacity-50"
            disabled={loading || !question.trim()}
          >
            {loading ? "Getting answer..." : "Ask"}
          </button>
        </form>
        {thinking && (
          <div className="mt-6 p-4 rounded bg-gray-900 border border-yellow-700 text-lg text-yellow-400">
            <span className="font-bold text-white">Thinking:</span> {thinking}
          </div>
        )}
        {answer && (
          <div className="mt-6 p-4 rounded bg-gray-900 border border-gray-700 text-lg text-green-400">
            <span className="font-bold text-white">Answer:</span> {answer}
          </div>
        )}
        {error && (
          <div className="mt-6 p-4 rounded bg-gray-900 border border-red-700 text-lg text-red-400">
            <span className="font-bold text-white">Error:</span> {error}
          </div>
        )}
      </div>
      <footer className="mt-8 text-gray-500 text-sm text-center">
        &copy; {new Date().getFullYear()} LegalX. All rights reserved.
      </footer>
    </div>
  );
}
