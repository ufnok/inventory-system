import request from '@/utils/request'

export const authApi = {
  login: (data) => request.post('/auth/login', data),
  info: () => request.get('/auth/info'),
  changePassword: (data) => request.post('/auth/change-password', data),
  logout: () => request.post('/auth/logout')
}

export const productApi = {
  list: (params) => request.get('/products', { params }),
  get: (id) => request.get(`/products/${id}`),
  create: (data) => request.post('/products', data),
  update: (id, data) => request.put(`/products/${id}`, data),
  delete: (id) => request.delete(`/products/${id}`)
}

export const categoryApi = {
  tree: () => request.get('/categories'),
  flat: () => request.get('/categories/flat'),
  create: (data) => request.post('/categories', data),
  update: (id, data) => request.put(`/categories/${id}`, data),
  delete: (id) => request.delete(`/categories/${id}`)
}

export const supplierApi = {
  list: (params) => request.get('/suppliers', { params }),
  get: (id) => request.get(`/suppliers/${id}`),
  create: (data) => request.post('/suppliers', data),
  update: (id, data) => request.put(`/suppliers/${id}`, data),
  delete: (id) => request.delete(`/suppliers/${id}`)
}

export const customerApi = {
  list: (params) => request.get('/customers', { params }),
  get: (id) => request.get(`/customers/${id}`),
  create: (data) => request.post('/customers', data),
  update: (id, data) => request.put(`/customers/${id}`, data),
  delete: (id) => request.delete(`/customers/${id}`)
}

export const inventoryApi = {
  list: (params) => request.get('/inventory', { params }),
  get: (productId) => request.get(`/inventory/${productId}`),
  setWarning: (productId, data) => request.put(`/inventory/${productId}/warning`, data)
}

export const stockInApi = {
  list: (params) => request.get('/stock/in', { params }),
  get: (id) => request.get(`/stock/in/${id}`),
  create: (data) => request.post('/stock/in', data),
  update: (id, data) => request.put(`/stock/in/${id}`, data),
  submit: (id) => request.post(`/stock/in/${id}/submit`),
  cancel: (id) => request.post(`/stock/in/${id}/cancel`),
  delete: (id) => request.delete(`/stock/in/${id}`)
}

export const stockOutApi = {
  list: (params) => request.get('/stock/out', { params }),
  get: (id) => request.get(`/stock/out/${id}`),
  create: (data) => request.post('/stock/out', data),
  update: (id, data) => request.put(`/stock/out/${id}`, data),
  submit: (id) => request.post(`/stock/out/${id}/submit`),
  cancel: (id) => request.post(`/stock/out/${id}/cancel`),
  delete: (id) => request.delete(`/stock/out/${id}`),
  getStock: (productId) => request.get('/stock/out/product/stock', { params: { productId } })
}

export const inventoryLogApi = {
  list: (params) => request.get('/inventory/log', { params })
}

export const checkApi = {
  list: (params) => request.get('/check', { params }),
  get: (id) => request.get(`/check/${id}`),
  create: (data) => request.post('/check', data),
  updateItems: (id, data) => request.put(`/check/${id}/items`, data),
  submit: (id) => request.post(`/check/${id}/submit`),
  delete: (id) => request.delete(`/check/${id}`)
}

export const reportApi = {
  dashboard: () => request.get('/reports/dashboard'),
  stockIn: (params) => request.get('/reports/stock/in', { params }),
  stockOut: (params) => request.get('/reports/stock/out', { params }),
  profit: (params) => request.get('/reports/profit', { params }),
  inventory: (params) => request.get('/reports/inventory', { params }),
  warning: (params) => request.get('/reports/warning', { params })
}

export const userApi = {
  list: (params) => request.get('/users', { params }),
  create: (data) => request.post('/users', data),
  update: (id, data) => request.put(`/users/${id}`, data),
  resetPassword: (id, data) => request.put(`/users/${id}/password`, data),
  delete: (id) => request.delete(`/users/${id}`),
  roles: () => request.get('/users/roles')
}

export const systemApi = {
  logs: (params) => request.get('/system/logs', { params }),
  backup: () => request.post('/system/backup'),
  restore: (data) => request.post('/system/restore', data)
}
