import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 15000 })

export const fetchBlocks = () => api.get('/blocks').then(r => r.data)

export const fetchPanchayats = (params = {}) =>
  api.get('/panchayats', { params }).then(r => r.data)

export const fetchAdvisories = (block_id) =>
  api.get('/advisories', { params: block_id ? { block_id } : {} }).then(r => r.data)

export const approveAdvisory = (id) =>
  api.post(`/advisories/${id}/approve`).then(r => r.data)

export const editAdvisory = (id, body) =>
  api.post(`/advisories/${id}/edit`, body).then(r => r.data)

export const dispatchSMS = (id) =>
  api.post(`/advisories/${id}/dispatch`).then(r => r.data)

export const submitFeedback = (payload) =>
  api.post('/feedback/rain', payload).then(r => r.data)

export const fetchFeedbackLog = () =>
  api.get('/feedback/log').then(r => r.data)

export const fetchValidationScorecard = () =>
  api.get('/validation-scorecard').then(r => r.data)

export const fetchHealth = () =>
  api.get('/health').then(r => r.data)
