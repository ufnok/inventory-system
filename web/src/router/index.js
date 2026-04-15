import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/dashboard/Index.vue') },
      { path: 'basic/product', name: 'Product', component: () => import('@/views/basic/Product.vue') },
      { path: 'basic/category', name: 'Category', component: () => import('@/views/basic/Category.vue') },
      { path: 'basic/supplier', name: 'Supplier', component: () => import('@/views/basic/Supplier.vue') },
      { path: 'basic/customer', name: 'Customer', component: () => import('@/views/basic/Customer.vue') },
      { path: 'warehouse/stockIn', name: 'StockIn', component: () => import('@/views/warehouse/StockIn.vue') },
      { path: 'warehouse/stockOut', name: 'StockOut', component: () => import('@/views/warehouse/StockOut.vue') },
      { path: 'warehouse/inventory', name: 'Inventory', component: () => import('@/views/warehouse/Inventory.vue') },
      { path: 'warehouse/check', name: 'Check', component: () => import('@/views/warehouse/Check.vue') },
      { path: 'warehouse/inventoryLog', name: 'InventoryLog', component: () => import('@/views/warehouse/InventoryLog.vue') },
      { path: 'document/stockInList', name: 'StockInList', component: () => import('@/views/document/StockInList.vue') },
      { path: 'document/stockOutList', name: 'StockOutList', component: () => import('@/views/document/StockOutList.vue') },
      { path: 'report/dashboard', name: 'ReportDashboard', component: () => import('@/views/report/Report.vue') },
      { path: 'system/user', name: 'UserManage', component: () => import('@/views/system/User.vue') },
      { path: 'system/log', name: 'OpLog', component: () => import('@/views/system/Log.vue') },
      { path: 'system/backup', name: 'Backup', component: () => import('@/views/system/Backup.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
