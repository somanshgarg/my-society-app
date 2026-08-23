import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  Edit3, 
  Save, 
  X, 
  RefreshCw,
  Layers,
  Wrench,
  Zap,
  Building2,
  ShieldAlert,
  Volume2,
  Car,
  Trash2,
  HelpCircle,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function AdminFlow() {
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('admin_logged_in') === 'true');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loginError, setLoginError] = useState('');
  
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, highUrgency: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Active Detail Modal (Screen 7)
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editCategory, setEditCategory] = useState('');
  const [editUrgency, setEditUrgency] = useState('');
  const [editAdminResponse, setEditAdminResponse] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const categories = ['All', 'Plumbing', 'Electrical', 'Lift', 'Security', 'Noise', 'Parking', 'Sanitation', 'Other'];
  const statuses = ['All', 'Open', 'In Progress', 'Resolved'];

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
    High: "bg-red-100 text-red-700 border-red-200 font-bold",
    Medium: "bg-amber-100 text-amber-800 border-amber-200 font-medium",
    Low: "bg-emerald-100 text-emerald-800 border-emerald-200 font-medium"
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchComplaintsAndStats();
    }
  }, [isLoggedIn, statusFilter, categoryFilter, search]);

  const fetchComplaintsAndStats = async () => {
    setLoading(true);
    try {
      let query = `/api/complaints?status=${statusFilter}&category=${categoryFilter}`;
      if (search.trim()) {
        query += `&search=${encodeURIComponent(search.trim())}`;
      }

      const [resComplaints, resStats] = await Promise.all([
        fetch(query),
        fetch('/api/stats')
      ]);

      const dataComplaints = await resComplaints.json();
      const dataStats = await resStats.json();

      if (dataComplaints.complaints) setComplaints(dataComplaints.complaints);
      if (dataStats.stats) setStats(dataStats.stats);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Screen 5: Admin Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      setIsLoggedIn(true);
      localStorage.setItem('admin_logged_in', 'true');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('admin_logged_in');
  };

  // Open Modal (Screen 7)
  const openComplaintModal = (c) => {
    setSelectedComplaint(c);
    setEditCategory(c.category);
    setEditUrgency(c.urgency);
    setEditAdminResponse(c.admin_edited_response || c.ai_drafted_response || '');
    setAssignedTo(c.assigned_to || '');
    setAdminNotes(c.admin_notes || '');
    setEditStatus(c.status);
    setSaveSuccessMsg('');
  };

  // Save Modal (Screen 7)
  const handleSaveDetail = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: editCategory,
          urgency: editUrgency,
          admin_edited_response: editAdminResponse,
          assigned_to: assignedTo,
          admin_notes: adminNotes,
          status: editStatus
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes.');

      setSaveSuccessMsg('Updated successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 2500);

      // Refresh list
      fetchComplaintsAndStats();
      setSelectedComplaint(data.complaint);
    } catch (err) {
      alert(err.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Facility Admin Login</h2>
          <p className="text-slate-500 text-sm mt-1">Manage, triage & log maintenance assignments</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-slate-800"
              required
            />
          </div>

          {loginError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
          >
            <Lock className="w-4 h-4" />
            Log In as Admin
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Default Demo Credentials: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">admin</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">admin123</code></p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header Bar */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Facility Admin Dashboard</h2>
            <span className="text-xs text-slate-400">Smart Complaint Box • Triage & Dispatch Queue</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchComplaintsAndStats}
            disabled={loading}
            className="text-xs px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Queue
          </button>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Screen 6: Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs text-slate-500 font-medium block">Total Complaints</span>
          <span className="text-2xl font-bold text-slate-800">{stats.total}</span>
        </div>
        <div className="bg-red-50 border border-red-200/80 p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs text-red-700 font-semibold block flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            High Urgency
          </span>
          <span className="text-2xl font-bold text-red-800">{stats.highUrgency}</span>
        </div>
        <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs text-amber-800 font-semibold block">Open Queue</span>
          <span className="text-2xl font-bold text-amber-900">{stats.open}</span>
        </div>
        <div className="bg-blue-50 border border-blue-200/80 p-4 rounded-xl shadow-sm space-y-1">
          <span className="text-xs text-blue-800 font-semibold block">In Progress</span>
          <span className="text-2xl font-bold text-blue-900">{stats.inProgress}</span>
        </div>
        <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-xl shadow-sm space-y-1 col-span-2 md:col-span-1">
          <span className="text-xs text-emerald-800 font-semibold block">Resolved</span>
          <span className="text-2xl font-bold text-emerald-900">{stats.resolved}</span>
        </div>
      </div>

      {/* Screen 6: Filter, Search & Priority Queue */}
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by flat, issue description, or assigned staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
          <span className="text-xs text-slate-400 font-semibold mr-1 shrink-0">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium shrink-0 transition ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Priority List */}
        {complaints.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No complaints match the selected filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => openComplaintModal(c)}
                className="py-4 px-3 hover:bg-slate-50/80 rounded-xl transition cursor-pointer flex flex-wrap items-center justify-between gap-4 group"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      Flat {c.flat_number}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                      {categoryIcons[c.category]}
                      {c.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-xs border ${urgencyBadges[c.urgency]}`}>
                      {c.urgency} Urgency
                    </span>
                  </div>

                  <p className="text-slate-800 text-sm font-medium group-hover:text-blue-600 transition">
                    "{c.description}"
                  </p>

                  {c.assigned_to && (
                    <div className="text-xs text-amber-700 font-medium flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Assigned: {c.assigned_to}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    c.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    c.status === 'In Progress' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                    'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {c.status}
                  </span>
                  <span className="text-xs text-blue-600 font-semibold group-hover:translate-x-0.5 transition">
                    Edit & Action →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screen 7: Complaint Detail & Override Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 animate-scaleUp">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white font-bold px-2.5 py-1 rounded text-sm">
                  Flat {selectedComplaint.flat_number}
                </span>
                <h3 className="font-bold text-base">Complaint Details & Management</h3>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveDetail} className="p-6 space-y-6">
              {/* Resident Original Text */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Original Resident Complaint (Read-only)
                </span>
                <p className="text-slate-900 font-semibold text-base">"{selectedComplaint.description}"</p>
                <span className="text-[11px] text-slate-400 block pt-1">
                  Logged on {new Date(selectedComplaint.created_at).toLocaleString()}
                </span>
              </div>

              {/* AI Override Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
                    Category (Override AI)
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2">
                    Urgency Level (Override AI)
                  </label>
                  <select
                    value={editUrgency}
                    onChange={(e) => setEditUrgency(e.target.value)}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="High">High Urgency</option>
                    <option value="Medium">Medium Urgency</option>
                    <option value="Low">Low Urgency</option>
                  </select>
                </div>
              </div>

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Update Status Stage
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Open', 'In Progress', 'Resolved'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`py-2.5 rounded-xl font-bold text-xs border transition ${
                        editStatus === st
                          ? st === 'Resolved' ? 'bg-emerald-600 text-white border-emerald-600' :
                            st === 'In Progress' ? 'bg-blue-600 text-white border-blue-600' :
                            'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Staff Assignment & Admin Notes (Offline Staff Coordination Footprint) */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Maintenance Staff (Offline Coordination)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh the plumber, ETA today at 3 PM"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Admin Notes / Coordination History
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g., Spoke to Ramesh on WhatsApp. Requested part from hardware shop..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Resident Response / Acknowledgment Message
                  </label>
                  <textarea
                    rows={2}
                    value={editAdminResponse}
                    onChange={(e) => setEditAdminResponse(e.target.value)}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                  />
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  {saveSuccessMsg}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-slate-900/20 transition"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
