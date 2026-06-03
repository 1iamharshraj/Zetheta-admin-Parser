import { useEffect, useState } from 'react';
import { listJobs, createJob, startJob, stopJob, deleteJob, retryFailed, getProgress } from '../api';
import { Loader2, Play, Square, RotateCcw, Trash2, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'tech', filter_mode: 'all', filter_value: '' });
  const [progressMap, setProgressMap] = useState({});

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadJobs() {
    try {
      const res = await listJobs();
      setJobs(res.data);
      // Load progress for running jobs
      const running = res.data.filter(j => j.status === 'running');
      for (const job of running) {
        try {
          const p = await getProgress(job.id);
          setProgressMap(prev => ({ ...prev, [job.id]: p.data }));
        } catch (e) {}
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createJob(form);
      setShowForm(false);
      setForm({ name: '', type: 'tech', filter_mode: 'all', filter_value: '' });
      loadJobs();
    } catch (e) {
      alert('Failed to create job: ' + e.message);
    }
  }

  async function handleStart(id) {
    try {
      await startJob(id);
      loadJobs();
    } catch (e) {
      alert('Failed to start job: ' + e.message);
    }
  }

  async function handleStop(id) {
    await stopJob(id);
    loadJobs();
  }

  async function handleDelete(id) {
    if (!confirm('Delete this job and all its call logs?')) return;
    await deleteJob(id);
    loadJobs();
  }

  async function handleRetry(id) {
    try {
      await retryFailed(id);
      loadJobs();
    } catch (e) {
      alert('Failed to retry: ' + e.message);
    }
  }

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-700',
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      stopped: 'bg-yellow-100 text-yellow-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Jobs</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          <Plus size={18} />
          New Job
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Tech Reports - Batch 1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
              >
                <option value="tech">Tech Report</option>
                <option value="nontech">Non-Tech Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Mode</label>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={form.filter_mode}
                onChange={e => setForm({ ...form, filter_mode: e.target.value })}
              >
                <option value="all">All Candidates</option>
                <option value="user_id">By User ID</option>
                <option value="role">By Role</option>
                <option value="course">By Course</option>
                <option value="college">By College</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Value</label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2"
                value={form.filter_value}
                onChange={e => setForm({ ...form, filter_value: e.target.value })}
                placeholder={form.filter_mode === 'all' ? 'Ignored for All' : 'Enter value(s)'}
                disabled={form.filter_mode === 'all'}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              Create Job
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Progress</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Filter</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {jobs.map(job => {
                const prog = progressMap[job.id];
                const percent = prog ? prog.percent : (job.total_candidates > 0 ? Math.round((job.processed / job.total_candidates) * 100) : 0);
                return (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{job.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${job.type === 'tech' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {job.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{statusBadge(job.status)}</td>
                    <td className="px-4 py-3">
                      <div className="w-32">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span>{job.succeeded}</span>
                          <CheckCircle size={12} className="text-green-500" />
                          <span>{job.failed}</span>
                          <XCircle size={12} className="text-red-500" />
                          <span className="ml-auto">{percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {job.filter_mode === 'all' ? 'All' : `${job.filter_mode}: ${job.filter_value}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(job.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {job.status === 'pending' && (
                          <button onClick={() => handleStart(job.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Start">
                            <Play size={16} />
                          </button>
                        )}
                        {job.status === 'running' && (
                          <button onClick={() => handleStop(job.id)} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded" title="Stop">
                            <Square size={16} />
                          </button>
                        )}
                        {(job.status === 'completed' || job.status === 'failed' || job.status === 'stopped') && (
                          <button onClick={() => handleStart(job.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Restart">
                            <Play size={16} />
                          </button>
                        )}
                        {job.failed > 0 && (
                          <button onClick={() => handleRetry(job.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Retry Failed">
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(job.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {jobs.length === 0 && (
            <div className="text-center py-12 text-gray-400">No jobs yet. Create one to get started.</div>
          )}
        </div>
      )}
    </div>
  );
}
