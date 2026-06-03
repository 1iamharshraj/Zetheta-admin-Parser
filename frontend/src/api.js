import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default API;

// Dashboard
export const getStats = () => API.get('/dashboard/stats');
export const getChart = (days = 7) => API.get(`/dashboard/chart?days=${days}`);
export const getSettings = () => API.get('/settings');

// Jobs
export const listJobs = () => API.get('/jobs');
export const createJob = (data) => API.post('/jobs', data);
export const getJob = (id) => API.get(`/jobs/${id}`);
export const startJob = (id) => API.post(`/jobs/${id}/start`);
export const stopJob = (id) => API.post(`/jobs/${id}/stop`);
export const retryFailed = (id) => API.post(`/jobs/${id}/retry-failed`);
export const deleteJob = (id) => API.delete(`/jobs/${id}`);
export const getProgress = (id) => API.get(`/jobs/${id}/progress`);

// Calls
export const listCalls = (params) => API.get('/calls', { params });
export const getCall = (id) => API.get(`/calls/${id}`);
export const retryCall = (id) => API.post(`/calls/${id}/retry`);

// Candidates
export const listCandidates = (params) => API.get('/candidates', { params });
export const syncCandidates = (type) => API.post(`/candidates/sync?submission_type=${type}`);
