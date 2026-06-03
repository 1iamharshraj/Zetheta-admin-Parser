import { useEffect, useState } from 'react';
import { listCandidates, syncCandidates } from '../api';
import { Loader2, RefreshCw, Search, Users } from 'lucide-react';

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState({
    submission_type: '',
    role: '',
    course: '',
    college: '',
    search: '',
  });

  useEffect(() => {
    loadCandidates();
  }, [filters]);

  async function loadCandidates() {
    setLoading(true);
    try {
      const params = {};
      if (filters.submission_type) params.submission_type = filters.submission_type;
      if (filters.role) params.role = filters.role;
      if (filters.course) params.course = filters.course;
      if (filters.college) params.college = filters.college;
      if (filters.search) params.search = filters.search;
      const res = await listCandidates(params);
      setCandidates(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync(type) {
    setSyncing(true);
    try {
      await syncCandidates(type);
      loadCandidates();
    } catch (e) {
      alert('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Candidates</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleSync('tech')}
            disabled={syncing}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            Sync Tech
          </button>
          <button
            onClick={() => handleSync('nontech')}
            disabled={syncing}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            Sync Non-Tech
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 bg-white rounded-xl shadow-sm p-4">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.submission_type}
          onChange={e => setFilters({ ...filters, submission_type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="tech">Tech</option>
          <option value="nontech">Non-Tech</option>
        </select>
        <input
          type="text"
          placeholder="Role"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.role}
          onChange={e => setFilters({ ...filters, role: e.target.value })}
        />
        <input
          type="text"
          placeholder="Course"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.course}
          onChange={e => setFilters({ ...filters, course: e.target.value })}
        />
        <input
          type="text"
          placeholder="College"
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.college}
          onChange={e => setFilters({ ...filters, college: e.target.value })}
        />
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search name/email/id"
            className="border rounded-lg px-3 py-2 text-sm flex-1"
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Course</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">College</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {candidates.map(c => (
                <tr key={`${c.id}-${c.submission_type}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.id}</td>
                  <td className="px-4 py-3 font-medium">{c.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.role || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.course || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.college || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${c.submission_type === 'tech' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                      {c.submission_type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidates.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Users size={48} className="mx-auto mb-3 text-gray-300" />
              No candidates found. Try syncing from Zetheta.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
