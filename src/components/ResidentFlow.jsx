import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Send, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert,
  Wrench,
  Zap,
  Volume2,
  Car,
  Trash2,
  HelpCircle,
  Key
} from 'lucide-react';

export default function ResidentFlow({ apiKey, setApiKey }) {
  const [flatNumber, setFlatNumber] = useState(localStorage.getItem('resident_flat') || '');
  const [isFlatConfirmed, setIsFlatConfirmed] = useState(!!localStorage.getItem('resident_flat'));
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentSubmission, setRecentSubmission] = useState(null);
  const [myComplaints, setMyComplaints] = useState([]);
  const [refreshingHistory, setRefreshingHistory] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Quick prompt suggestions
  const suggestions = [
    "Kitchen tap leaking heavily for 3 days",
    "Gas smell in corridor near B-wing lift",
    "Loud party music past 11:30 PM",
    "Main entrance gate automatic lock broken",
    "Garbage not collected from 4th floor bin"
  ];

  const categoryIcons = {
    Plumbing: <Wrench className="w-4 h-4 text-blue-600" />,
    Electrical: <Zap className="w-4 h-4 text-amber-500" />,
    Lift: <Building2 className="w-4 h-4 text-purple-600" />,
    Security: <ShieldAlert className="w-4 h-4 text-red-600" />,
    Noise: <Volume2 className="w-4 h-4 text-indigo-600" />,
    Parking: <Car className="w-4 h-4 text-emerald-600" />,
    Sanitation: <Trash2 className="w-4 h-4 text-emerald-700" />,
    Other: <HelpCircle className="w-4 h-4 text-slate-500" />
  };

  const urgencyBadges = {
    High: "bg-red-100 text-red-700 border-red-200 animate-pulse font-semibold",
    Medium: "bg-amber-100 text-amber-800 border-amber-200 font-medium",
    Low: "bg-emerald-100 text-emerald-800 border-emerald-200 font-medium"
  };

  useEffect(() => {
    if (isFlatConfirmed && flatNumber) {
      fetchMyComplaints();
    }
  }, [isFlatConfirmed, flatNumber]);

  const fetchMyComplaints = async () => {
    setRefreshingHistory(true);
    try {
      const res = await fetch(`/api/complaints?flat_number=${encodeURIComponent(flatNumber)}`);
      const data = await res.json();
      if (data.complaints) {
        setMyComplaints(data.complaints);
      }
    } catch (err) {
      console.error('Failed to load complaint history:', err);
    } finally {
      setRefreshingHistory(false);
    }
  };

  const handleConfirmFlat = (e) => {
    e.preventDefault();
    if (!flatNumber.trim()) return;
    const formatted = flatNumber.trim().toUpperCase();
    setFlatNumber(formatted);
    localStorage.setItem('resident_flat', formatted);
    setIsFlatConfirmed(true);
  };

  const handleChangeFlat = () => {
    setIsFlatConfirmed(false);
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe your issue in a few words.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flat_number: flatNumber,
          description: description.trim(),
          apiKey: apiKey || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      setRecentSubmission(data.complaint);
      setDescription('');
      fetchMyComplaints();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Screen 1: Flat Number Entry
  if (!isFlatConfirmed) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-600">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Resident Portal</h2>
          <p className="text-slate-500 text-sm mt-1">Enter your flat number to log or track complaints</p>
        </div>

        <form onSubmit={handleConfirmFlat} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Flat / House Number
            </label>
            <input
              type="text"
              placeholder="e.g. A-101 or B-304"
              value={flatNumber}
              onChange={(e) => setFlatNumber(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 text-lg font-medium tracking-wide uppercase placeholder:normal-case placeholder:font-normal"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            Continue to Complaint Box
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">No passwords or accounts required. Quick one-step resident access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Top Banner / Flat Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold">
            {flatNumber}
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium block">ACTIVE RESIDENT</span>
            <span className="text-slate-800 font-semibold text-sm">Flat {flatNumber}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 font-medium transition"
          >
            <Key className="w-3.5 h-3.5" />
            {apiKey ? 'Gemini Key Saved' : 'Set Gemini Key'}
          </button>
          <button
            onClick={handleChangeFlat}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition"
          >
            Change Flat
          </button>
        </div>
      </div>

      {/* Optional Gemini API Key Drawer */}
      {showSettings && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Custom Gemini API Key (Optional)
            </span>
            <button onClick={() => setShowSettings(false)} className="text-indigo-400 hover:text-indigo-700">✕</button>
          </div>
          <p className="text-indigo-700">
            If left blank, the app will use standard society rule-based AI classification automatically.
          </p>
          <input
            type="password"
            placeholder="AIzaSy..."
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              localStorage.setItem('gemini_api_key', e.target.value);
            }}
            className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      )}

      {/* Screen 2: Submit Complaint Form */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200/80">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Log a Complaint</h3>
            <p className="text-xs text-slate-500">Describe the problem in plain text — Gemini AI will instantly triage & route it.</p>
          </div>
        </div>

        <form onSubmit={handleSubmitComplaint} className="space-y-4">
          <div>
            <textarea
              rows={3}
              placeholder="e.g., Kitchen tap leaking for 3 days..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-800 text-sm resize-none shadow-inner placeholder:text-slate-400"
              required
            />
          </div>

          {/* Prompt Suggestions */}
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Common issues (click to insert):
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDescription(s)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition text-left"
                >
                  "{s}"
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Gemini is triaging complaint...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Complaint
              </>
            )}
          </button>
        </form>
      </div>

      {/* Screen 3: Instant AI Confirmation Card */}
      {recentSubmission && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200/80 p-6 rounded-2xl shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Complaint Submitted & AI Triaged!</span>
            </div>
            <span className="text-xs bg-emerald-200/60 text-emerald-900 px-2.5 py-1 rounded-full font-medium">
              ID #{recentSubmission.id}
            </span>
          </div>

          <div className="bg-white/90 backdrop-blur p-4 rounded-xl border border-emerald-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">CATEGORY:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-md text-xs font-semibold text-slate-700">
                  {categoryIcons[recentSubmission.category] || categoryIcons.Other}
                  {recentSubmission.category}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">URGENCY:</span>
                <span className={`px-2.5 py-1 rounded-md text-xs border ${urgencyBadges[recentSubmission.urgency] || urgencyBadges.Medium}`}>
                  {recentSubmission.urgency} Urgency
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block mb-1">ORIGINAL COMPLAINT:</span>
              <p className="text-slate-800 text-sm italic">"{recentSubmission.description}"</p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs text-indigo-600 font-semibold flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                AI DRAFTED ACKNOWLEDGMENT:
              </span>
              <p className="text-slate-700 text-sm font-medium bg-indigo-50/60 p-3 rounded-lg border border-indigo-100/60">
                "{recentSubmission.ai_drafted_response}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Screen 4: My Complaints History & Status Timeline */}
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">My Complaint History</h3>
          </div>
          <button
            onClick={fetchMyComplaints}
            disabled={refreshingHistory}
            className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingHistory ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {myComplaints.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No past complaints found for flat {flatNumber}. Submit one above!
          </div>
        ) : (
          <div className="space-y-4">
            {myComplaints.map((c) => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition space-y-3 bg-slate-50/40">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">#{c.id}</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-700">
                      {categoryIcons[c.category]}
                      {c.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${urgencyBadges[c.urgency]}`}>
                      {c.urgency}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    c.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse' :
                    'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <p className="text-slate-800 text-sm font-medium">"{c.description}"</p>

                {/* Coordination details if populated by admin */}
                {(c.assigned_to || c.admin_notes) && (
                  <div className="bg-amber-50/80 border border-amber-200/80 p-3 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-amber-900 block">Facility Admin Update:</span>
                    {c.assigned_to && (
                      <p className="text-amber-800">
                        <span className="font-semibold">Assigned To:</span> {c.assigned_to}
                      </p>
                    )}
                    {c.admin_notes && (
                      <p className="text-amber-800">
                        <span className="font-semibold">Notes:</span> {c.admin_notes}
                      </p>
                    )}
                  </div>
                )}

                <div className="text-[11px] text-slate-400 text-right">
                  Logged on {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
