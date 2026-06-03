import { useEffect, useState } from 'react';
import { listCalls, retryCall } from '../api';
import { Loader2, RotateCcw, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function Calls() {
  const [calls, setCalls] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ job_id: '', status: '' });
  const [expanded, setExpanded] = useState(null);
  const limit = 20;

  useEffect(() => {
    loadCalls();
  }, [page, filters]);

  async function loadCalls() {
    setLoading(true);
    try {
      const params = { page, limit };
      if (filters.job_id) params.job_id = filters.job_id;
      if (filters.status) params.status = filters.status;
      const res = await listCalls(params);
      setCalls(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(id) {
    try {
      await retryCall(id);
      loadCalls();
    } catch (e) {
      alert('Retry failed: ' + e.message);
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">API Calls</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Job ID"
            className="border rounded-lg px-3 py-2 text-sm"
            value={filters.job_id}
            onChange={e => setFilters({ ...filters, job_id: e.target.value })}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={filters.status}
          onChange={e => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={loadCalls} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700">
          Refresh
        </button>
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
                <th className="px-4 py-3 text-left font-medium text-gray-600">Candidate</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Attempts</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {calls.map(call => (
                <>
                  <tr key={call.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === call.id ? null : call.id)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{call.candidate_name || call.candidate_id}</div>
                      {call.candidate_email && <div className="text-xs text-gray-500">{call.candidate_email}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {!call.completed_at ? (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">Pending</span>
                      ) : call.is_success ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Success</span>
                      ) : (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{call.status_code || '-'}</td>
                    <td className="px-4 py-3">{call.attempt_count}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {call.completed_at ? new Date(call.completed_at).toLocaleString() : new Date(call.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {!call.is_success && (
                          <button
                            onClick={e => { e.stopPropagation(); handleRetry(call.id); }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Retry"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                        {expanded === call.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </td>
                  </tr>
                  {expanded === call.id && (
                    <tr>
                      <td colSpan={6} className="px-4 py-4 bg-gray-50">
                        <div className="space-y-3">
                          {call.error_message && (
                            <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                              <strong>Error:</strong> {call.error_message}
                            </div>
                          )}
                          {call.request_payload && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Request Payload</div>
                              <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-48">
                                {JSON.stringify(call.request_payload, null, 2)}
                              </pre>
                            </div>
                          )}
                          {(call.response_body || call.response_text) && (
                            <div>
                              <div className="text-xs font-medium text-gray-500 mb-1">Response</div>
                              <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg text-xs overflow-auto max-h-64">
                                {call.response_body ? JSON.stringify(call.response_body, null, 2) : call.response_text}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-sm text-gray-500">
              Showing {calls.length} of {total} results
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm text-gray-600">
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
