import { useEffect, useState } from 'react';
import { getStats, getChart, getSettings } from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { Loader2, CheckCircle, XCircle, Users, Activity } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const [sRes, cRes, setRes] = await Promise.all([getStats(), getChart(7), getSettings()]);
      setStats(sRes.data);
      setChartData(cRes.data.data);
      setSettings(setRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const cards = [
    { label: 'Total Jobs', value: stats?.total_jobs || 0, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Candidates', value: stats?.total_candidates || 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Succeeded', value: stats?.total_succeeded || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Failed', value: stats?.total_failed || 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bg}`}>
                  <Icon className={card.color} size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Success Rate */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Success Rate</h3>
          <span className="text-2xl font-bold text-green-600">{stats?.success_rate || 0}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${stats?.success_rate || 0}%` }}
          />
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Last 7 Days Activity</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="success" fill="#22c55e" name="Success" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Configured URLs */}
      {settings && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Configured API URLs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">Tech Source (Zetheta)</div>
              <div className="font-mono text-indigo-700 break-all">{settings.source_url_tech}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">Non-Tech Source (Zetheta)</div>
              <div className="font-mono text-indigo-700 break-all">{settings.source_url_nontech}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">Tech Target (Evalhub)</div>
              <div className="font-mono text-indigo-700 break-all">{settings.target_url_tech}</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-gray-500 mb-1">Non-Tech Target (Evalhub)</div>
              <div className="font-mono text-indigo-700 break-all">{settings.target_url_nontech}</div>
            </div>
          </div>
          <div className="mt-4 flex gap-6 text-sm text-gray-500">
            <span>Max Concurrent: <strong>{settings.max_concurrent_calls}</strong></span>
            <span>Delay: <strong>{settings.call_delay_seconds}s</strong></span>
            <span>Timeout: <strong>{settings.call_timeout_seconds}s</strong></span>
            <span>Retries: <strong>{settings.max_retries}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
}
