'use client';

import React from 'react';
import { ArrowLeft, Code, Database, Globe, Mic, Cpu, Lock } from 'lucide-react';
import Link from 'next/link';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#020202] text-slate-200 font-sans p-6 md:p-12 overflow-y-auto selection:bg-violet-500/30">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm font-bold mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Application
          </Link>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent pb-2">
            SAMRAT AETHERMIND API
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl leading-relaxed">
            Developer documentation for the SAMRAT AETHERMIND V2 endpoints. Integrate advanced LLM routing, RAG context, and Voice processing directly into your own tools.
          </p>
        </div>

        {/* Authentication */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
            <Lock className="w-5 h-5 text-violet-500" /> Authentication
          </h2>
          <p className="text-sm text-slate-400">
            All API requests must include your API token in the <code className="text-emerald-400 bg-emerald-950/30 px-1 py-0.5 rounded">Authorization</code> header.
          </p>
          <div className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl font-mono text-xs overflow-x-auto text-emerald-300 shadow-inner">
            Authorization: Bearer YOUR_API_TOKEN
          </div>
        </section>

        {/* Base URL */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
            <Globe className="w-5 h-5 text-violet-500" /> Base URL
          </h2>
          <div className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl font-mono text-xs overflow-x-auto text-emerald-300 shadow-inner">
            https://api.samrat-aether.com/v1
          </div>
        </section>

        {/* Endpoints */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold flex items-center gap-2 border-b border-slate-800 pb-2">
            <Database className="w-5 h-5 text-violet-500" /> Core Endpoints
          </h2>

          {/* Endpoint 1 */}
          <div className="border border-slate-800 bg-[#070707] rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-900/50 px-5 py-3 border-b border-slate-800 flex items-center gap-3">
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold px-2 py-1 rounded">POST</span>
              <code className="text-sm font-bold">/chat/completions</code>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-400">Creates a model response for the given chat conversation.</p>
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Request Body (JSON)</h4>
                <div className="bg-[#0a0a0a] border border-slate-800 p-4 rounded-xl font-mono text-xs overflow-x-auto text-blue-300 shadow-inner">
<pre>{`{
  "model": "gemini-1.5-flash",
  "messages": [
    {"role": "user", "content": "Hello, Aethermind!"}
  ],
  "temperature": 0.7,
  "stream": true
}`}</pre>
                </div>
              </div>
            </div>
          </div>

          {/* Endpoint 2 */}
          <div className="border border-slate-800 bg-[#070707] rounded-2xl overflow-hidden shadow-lg">
            <div className="bg-slate-900/50 px-5 py-3 border-b border-slate-800 flex items-center gap-3">
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold px-2 py-1 rounded">POST</span>
              <code className="text-sm font-bold">/rag/ingest</code>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-400">Upload a document to index into the Vector Database for RAG context.</p>
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Request Body (FormData)</h4>
                <ul className="text-sm text-slate-400 list-disc list-inside space-y-1">
                  <li><code className="text-violet-400">file</code>: The PDF or TXT file to upload.</li>
                  <li><code className="text-violet-400">collection_name</code>: (Optional) Namespace for vector isolation.</li>
                </ul>
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
}
