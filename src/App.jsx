import React, { useState } from 'react';
import ResidentFlow from './components/ResidentFlow';
import AdminFlow from './components/AdminFlow';
import { Building2, ShieldCheck, Sparkles, User, Wrench } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('resident'); // 'resident' | 'admin'
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_api_key') || '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Global Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-2">
                Smart Complaint Box
                <span className="text-[10px] bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Gemini Powered
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Housing Society AI Triage & Management System</p>
            </div>
          </div>

          {/* Role Switcher Tabs */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('resident')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'resident'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Resident Flow
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Facility Admin
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'resident' ? (
          <ResidentFlow apiKey={apiKey} setApiKey={setApiKey} />
        ) : (
          <AdminFlow />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>Smart Complaint Box • Gemini + Antigravity Society Care Build</span>
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Powered by Gemini API & SQLite / Supabase SQL Schema
          </span>
        </div>
      </footer>
    </div>
  );
}
