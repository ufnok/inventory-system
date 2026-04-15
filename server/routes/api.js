const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, now } = require('../db/store');

const SECRET = 'inventory-secret-2024';
const TOKEN_EXPIRES = '8h';

// 认证中间件
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.json({ code: 401, message: '未登录' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.json({ code: 401, message: 'Token无效' });
  }
}

// ==================== 认证 ====================
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.findOne('user', { username, status: 1 });
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.json({ code: 401, message: '用户名或密码错误' });
  }
  db.update('user', { id: user.id }, { last_login: now() });
  db.insert('operation_log', { operate_time: now(), operator_id: user.id, operate_type: 'LOGIN', operate_content: '用户登录', operate_result: 'SUCCESS' });
  const token = jwt.sign({ id: user.id, username: user.username, role_id: user.role_id }, SECRET, { expiresIn: TOKEN_EXPIRES });
  const role = db.findOne('role', { id: user.role_id });
  res.json({ code: 200, message: '登录成功', data: { token, user: { id: user.id, username: user.username, realName: user.real_name, roleId: user.role_id, roleName: role?.role_name, roleCode: role?.role_code } } });
});

router.get('/auth/info', auth, (req, res) => {
  const user = db.findOne('user', { id: req.user.id });
  if (!user) return res.json({ code: 404, message: '用户不存在' });
  const role = db.findOne('role', { id: user.role_id });
  res.json({ code: 200, data: { id: user.id, username: user.username, realName: user.real_name, roleId: user.role_id, roleName: role?.role_name, roleCode: role?.role_code, phone: user.phone, email: user.email } });
});

router.post('/auth/change-password', auth, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = db.findOne('user', { id: req.user.id });
  if (!bcrypt.compareSync(oldPassword, user.password)) return res.json({ code: 400, message: '旧密码错误' });
  db.update('user', { id: user.id }, { password: bcrypt.hashSync(newPassword, 10) });
  res.json({ code: 200, message: '密码修改成功' });
});

// ==================== 仪表盘 ====================
router.get('/dashboard', auth, (req, res) => {
  const today = now().slice(0, 10);
  const todayIn = db.find('stock_in_order', { status: 1 }).filter(o => o.in_time?.slice(0, 10) === today);
  const todayOut = db.find('stock_out_order', { status: 1 }).filter(o => o.out_time?.slice(0, 10) === today);
  const warningItems = db.find('inventory').filter(i => (i.warning_min && i.quantity <= i.warning_min) || (i.warning_max && i.quantity >= i.warning_max));
  res.json({ code: 200, data: {
    todayInCount: todayIn.length, todayInAmount: todayIn.reduce((s, o) => s + (o.total_amount || 0), 0),
    todayOutCount: todayOut.length, todayOutAmount: todayOut.reduce((s, o) => s + (o.total_amount || 0), 0),
    totalProduct: db.count('product'), warningCount: warningItems.length,
    recentWarning: warningItems.slice(0, 5).map(i => { const p = db.findOne('product', { id: i.product_id }); return { name: p?.name, quantity: i.quantity, warning_min: i.warning_min, warning_max: i.warning_max }; })
  }});
});

// ==================== 分类 ====================
router.get('/categories', auth, (req, res) => {
  const list = db.find('category');
  const tree = [], map = {};
  list.forEach(i => { map[i.id] = { ...i, children: [] }; });
  list.forEach(i => { if (!i.pid || i.pid === 0) tree.push(map[i.id]); else if (map[i.pid]) map[i.pid].children.push(map[i.id]); });
  res.json({ code: 200, data: tree });
});
router.get('/categories/flat', auth, (req, res) => { res.json({ code: 200, data: db.find('category') }); });
router.post('/categories', auth, (req, res) => {
  const { name, pid = 0, sortOrder = 0 } = req.body;
  if (!name) return res.json({ code: 400, message: '名称不能为空' });
  if ((!pid || pid === 0) && db.count('category', { pid: 0 }) >= 10) return res.json({ code: 400, message: '一级分类最多10个' });
  const id = (db.find('category').length || 0) + 1;
  db.insert('category', { id, name, pid: pid || 0, sort_order: sortOrder, created_at: now() });
  res.json({ code: 200, message: '添加成功' });
});
router.put('/categories/:id', auth, (req, res) => { db.update('category', { id: parseInt(req.params.id) }, { name: req.body.name, sort_order: req.body.sortOrder || 0 }); res.json({ code: 200, message: '更新成功' }); });
router.delete('/categories/:id', auth, (req, res) => {
  if (db.count('category', { pid: parseInt(req.params.id) }) > 0) return res.json({ code: 400, message: '请先删除子分类' });
  db.delete('category', { id: parseInt(req.params.id) });
  res.json({ code: 200, message: '删除成功' });
});

// ==================== 商品 ====================
router.get('/products', auth, (req, res) => {
  const { keyword, categoryId, page = 1, pageSize = 20 } = req.query;
  let list = db.find('product');
  if (keyword) list = list.filter(i => (i.id + i.name).includes(keyword));
  if (categoryId) list = list.filter(i => i.category_id == categoryId);
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, categoryName: db.findOne('category', { id: i.category_id })?.name }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.get('/products/:id', auth, (req, res) => {
  const p = db.findOne('product', { id: req.params.id });
  if (!p) return res.json({ code: 404, message: '商品不存在' });
  res.json({ code: 200, data: { ...p, categoryName: db.findOne('category', { id: p.category_id })?.name } });
});
router.post('/products', auth, (req, res) => {
  const { name, spec, unit, costPrice, salePrice, categoryId, remark } = req.body;
  if (!name || !unit || costPrice === undefined || salePrice === undefined) return res.json({ code: 400, message: '必填项不能为空' });
  if (db.find('product').some(i => i.name === name)) return res.json({ code: 400, message: '商品名称已存在' });
  const id = db.nextId('SP');
  db.insert('product', { id, name, spec: spec || '', unit, cost_price: costPrice, sale_price: salePrice, category_id: categoryId || null, remark: remark || '', status: 1, created_at: now() });
  db.insert('inventory', { product_id: id, quantity: 0, warning_min: null, warning_max: null });
  res.json({ code: 200, message: '添加成功', data: { id } });
});
router.put('/products/:id', auth, (req, res) => {
  const { name, spec, unit, costPrice, salePrice, categoryId, remark, status } = req.body;
  db.update('product', { id: req.params.id }, { name, spec: spec || '', unit, cost_price: costPrice, sale_price: salePrice, category_id: categoryId || null, remark: remark || '', status: status !== undefined ? status : 1 });
  res.json({ code: 200, message: '更新成功' });
});
router.delete('/products/:id', auth, (req, res) => {
  const inCount = db.count('stock_in_item', { product_id: req.params.id });
  const outCount = db.count('stock_out_item', { product_id: req.params.id });
  if (inCount > 0 || outCount > 0) return res.json({ code: 400, message: `该商品已被${inCount + outCount}张单据引用，无法删除` });
  db.delete('product', { id: req.params.id });
  res.json({ code: 200, message: '删除成功' });
});

// ==================== 供应商 ====================
router.get('/suppliers', auth, (req, res) => {
  const { keyword, page = 1, pageSize = 20 } = req.query;
  let list = db.find('supplier');
  if (keyword) list = list.filter(i => (i.id + i.name + (i.contact || '')).includes(keyword));
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.post('/suppliers', auth, (req, res) => {
  const { name, contact, phone, address, remark } = req.body;
  if (!name) return res.json({ code: 400, message: '供应商名称不能为空' });
  if (db.find('supplier').some(i => i.name === name)) return res.json({ code: 400, message: '供应商名称已存在' });
  const id = db.nextId('GYS');
  db.insert('supplier', { id, name, contact: contact || '', phone: phone || '', address: address || '', remark: remark || '', status: 1, created_at: now() });
  res.json({ code: 200, message: '添加成功', data: { id } });
});
router.put('/suppliers/:id', auth, (req, res) => { db.update('supplier', { id: req.params.id }, { ...req.body }); res.json({ code: 200, message: '更新成功' }); });
router.delete('/suppliers/:id', auth, (req, res) => {
  if (db.count('stock_in_order', { supplier_id: req.params.id }) > 0) return res.json({ code: 400, message: '该供应商已被入库单引用，无法删除' });
  db.delete('supplier', { id: req.params.id });
  res.json({ code: 200, message: '删除成功' });
});

// ==================== 客户 ====================
router.get('/customers', auth, (req, res) => {
  const { keyword, page = 1, pageSize = 20 } = req.query;
  let list = db.find('customer');
  if (keyword) list = list.filter(i => (i.id + i.name + (i.contact || '')).includes(keyword));
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.post('/customers', auth, (req, res) => {
  const { name, contact, phone, address, remark } = req.body;
  if (!name) return res.json({ code: 400, message: '客户名称不能为空' });
  if (db.find('customer').some(i => i.name === name)) return res.json({ code: 400, message: '客户名称已存在' });
  const id = db.nextId('KH');
  db.insert('customer', { id, name, contact: contact || '', phone: phone || '', address: address || '', remark: remark || '', status: 1, created_at: now() });
  res.json({ code: 200, message: '添加成功', data: { id } });
});
router.put('/customers/:id', auth, (req, res) => { db.update('customer', { id: req.params.id }, { ...req.body }); res.json({ code: 200, message: '更新成功' }); });
router.delete('/customers/:id', auth, (req, res) => {
  if (db.count('stock_out_order', { customer_id: req.params.id }) > 0) return res.json({ code: 400, message: '该客户已被出库单引用，无法删除' });
  db.delete('customer', { id: req.params.id });
  res.json({ code: 200, message: '删除成功' });
});

// ==================== 库存 ====================
router.get('/inventory', auth, (req, res) => {
  const { keyword, categoryId, warningStatus, page = 1, pageSize = 20 } = req.query;
  let list = db.find('inventory').map(i => { const p = db.findOne('product', { id: i.product_id }); return { ...i, name: p?.name, spec: p?.spec, unit: p?.unit, cost_price: p?.cost_price, sale_price: p?.sale_price, category_id: p?.category_id, categoryName: db.findOne('category', { id: p?.category_id })?.name }; });
  if (keyword) list = list.filter(i => (i.product_id + (i.name || '')).includes(keyword));
  if (categoryId) list = list.filter(i => i.category_id == categoryId);
  list = list.map(i => { let ws = 'normal'; if (i.warning_min && i.quantity <= i.warning_min) ws = 'low'; else if (i.warning_max && i.quantity >= i.warning_max) ws = 'high'; return { ...i, warningStatus: ws, costAmount: i.quantity * i.cost_price, saleAmount: i.quantity * i.sale_price }; });
  if (warningStatus && warningStatus !== 'all') list = list.filter(i => i.warningStatus === warningStatus);
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.get('/inventory/:productId', auth, (req, res) => {
  let inv = db.findOne('inventory', { product_id: req.params.productId });
  if (!inv) { const p = db.findOne('product', { id: req.params.productId }); if (!p) return res.json({ code: 404, message: '商品不存在' }); db.insert('inventory', { product_id: req.params.productId, quantity: 0, warning_min: null, warning_max: null }); inv = { product_id: req.params.productId, quantity: 0, warning_min: null, warning_max: null }; }
  const p = db.findOne('product', { id: inv.product_id });
  res.json({ code: 200, data: { ...inv, name: p?.name, spec: p?.spec, unit: p?.unit, cost_price: p?.cost_price, sale_price: p?.sale_price } });
});
router.put('/inventory/:productId/warning', auth, (req, res) => {
  const { warningMin, warningMax } = req.body;
  let inv = db.findOne('inventory', { product_id: req.params.productId });
  if (!inv) { db.insert('inventory', { product_id: req.params.productId, quantity: 0, warning_min: warningMin || null, warning_max: warningMax || null }); }
  else { db.update('inventory', { product_id: req.params.productId }, { warning_min: warningMin || null, warning_max: warningMax || null }); }
  res.json({ code: 200, message: '预警设置成功' });
});

// ==================== 入库 ====================
router.get('/stock/in', auth, (req, res) => {
  const { keyword, supplierId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
  let list = db.find('stock_in_order');
  if (keyword) list = list.filter(i => (i.id + (i.remark || '')).includes(keyword));
  if (supplierId) list = list.filter(i => i.supplier_id === supplierId);
  if (status !== undefined && status !== '') list = list.filter(i => i.status === parseInt(status));
  if (startDate) list = list.filter(i => i.in_time >= startDate);
  if (endDate) list = list.filter(i => i.in_time <= endDate + ' 23:59:59');
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, supplierName: db.findOne('supplier', { id: i.supplier_id })?.name, operatorName: db.findOne('user', { id: i.operator_id })?.real_name, statusName: i.status === 1 ? '正常' : i.status === -1 ? '作废' : '草稿' }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.get('/stock/in/:id', auth, (req, res) => {
  const order = db.findOne('stock_in_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '入库单不存在' });
  const items = db.find('stock_in_item', { order_id: req.params.id }).map(i => { const p = db.findOne('product', { id: i.product_id }); return { ...i, productName: p?.name, spec: p?.spec, unit: p?.unit }; });
  res.json({ code: 200, data: { ...order, supplierName: db.findOne('supplier', { id: order.supplier_id })?.name, operatorName: db.findOne('user', { id: order.operator_id })?.real_name, items } });
});
router.post('/stock/in', auth, (req, res) => {
  const { supplierId, inTime, items, remark } = req.body;
  if (!supplierId) return res.json({ code: 400, message: '请选择供应商' });
  if (!items?.length) return res.json({ code: 400, message: '请添加商品' });
  const id = db.nextId('RK');
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  db.insert('stock_in_order', { id, supplier_id: supplierId, in_time: inTime || now(), operator_id: req.user.id, total_amount: totalAmount, status: 0, remark: remark || '', created_at: now() });
  items.forEach(i => { db.insert('stock_in_item', { order_id: id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, amount: i.quantity * i.unitPrice }); });
  res.json({ code: 200, message: '入库单创建成功', data: { id } });
});
router.put('/stock/in/:id', auth, (req, res) => {
  const order = db.findOne('stock_in_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '入库单不存在' });
  if (order.status !== 0) return res.json({ code: 400, message: '只能编辑草稿状态的单据' });
  const { supplierId, inTime, items, remark } = req.body;
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  db.update('stock_in_order', { id: req.params.id }, { supplier_id: supplierId, in_time: inTime, total_amount: totalAmount, remark: remark || '' });
  db.delete('stock_in_item', { order_id: req.params.id });
  items.forEach(i => { db.insert('stock_in_item', { order_id: req.params.id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, amount: i.quantity * i.unitPrice }); });
  res.json({ code: 200, message: '入库单更新成功' });
});
router.post('/stock/in/:id/submit', auth, (req, res) => {
  const order = db.findOne('stock_in_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '入库单不存在' });
  if (order.status !== 0) return res.json({ code: 400, message: '只能提交草稿状态的单据' });
  const items = db.find('stock_in_item', { order_id: req.params.id });
  items.forEach(item => {
    let inv = db.findOne('inventory', { product_id: item.product_id });
    const beforeQty = inv?.quantity || 0;
    const afterQty = beforeQty + item.quantity;
    if (inv) { db.update('inventory', { product_id: item.product_id }, { quantity: afterQty }); } else { db.insert('inventory', { product_id: item.product_id, quantity: afterQty, warning_min: null, warning_max: null }); }
    db.insert('inventory_log', { order_no: req.params.id, order_type: 'RK', operate_type: 'IN', product_id: item.product_id, quantity_change: item.quantity, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: now() });
  });
  db.update('stock_in_order', { id: req.params.id }, { status: 1 });
  res.json({ code: 200, message: '入库单提交成功，库存已增加' });
});
router.post('/stock/in/:id/cancel', auth, (req, res) => {
  const order = db.findOne('stock_in_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '入库单不存在' });
  if (order.status !== 1) return res.json({ code: 400, message: '只能作废已提交的单据' });
  const items = db.find('stock_in_item', { order_id: req.params.id });
  items.forEach(item => {
    let inv = db.findOne('inventory', { product_id: item.product_id });
    const beforeQty = inv?.quantity || 0;
    const afterQty = Math.max(0, beforeQty - item.quantity);
    db.update('inventory', { product_id: item.product_id }, { quantity: afterQty });
    db.insert('inventory_log', { order_no: req.params.id, order_type: 'RK', operate_type: 'OUT', product_id: item.product_id, quantity_change: -item.quantity, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: now() });
  });
  db.update('stock_in_order', { id: req.params.id }, { status: -1 });
  res.json({ code: 200, message: '入库单已作废，库存已回滚' });
});
router.delete('/stock/in/:id', auth, (req, res) => {
  const order = db.findOne('stock_in_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '入库单不存在' });
  if (order.status !== 0) return res.json({ code: 400, message: '只能删除草稿状态的单据' });
  db.delete('stock_in_item', { order_id: req.params.id });
  db.delete('stock_in_order', { id: req.params.id });
  res.json({ code: 200, message: '删除成功' });
});

// ==================== 出库 ====================
router.get('/stock/out', auth, (req, res) => {
  const { keyword, customerId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
  let list = db.find('stock_out_order');
  if (keyword) list = list.filter(i => (i.id + (i.remark || '')).includes(keyword));
  if (customerId) list = list.filter(i => i.customer_id === customerId);
  if (status !== undefined && status !== '') list = list.filter(i => i.status === parseInt(status));
  if (startDate) list = list.filter(i => i.out_time >= startDate);
  if (endDate) list = list.filter(i => i.out_time <= endDate + ' 23:59:59');
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, customerName: db.findOne('customer', { id: i.customer_id })?.name, operatorName: db.findOne('user', { id: i.operator_id })?.real_name, statusName: i.status === 1 ? '正常' : i.status === -1 ? '作废' : '草稿' }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.get('/stock/out/:id', auth, (req, res) => {
  const order = db.findOne('stock_out_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '出库单不存在' });
  const items = db.find('stock_out_item', { order_id: req.params.id }).map(i => { const p = db.findOne('product', { id: i.product_id }); return { ...i, productName: p?.name, spec: p?.spec, unit: p?.unit }; });
  res.json({ code: 200, data: { ...order, customerName: db.findOne('customer', { id: order.customer_id })?.name, operatorName: db.findOne('user', { id: order.operator_id })?.real_name, items } });
});
router.post('/stock/out', auth, (req, res) => {
  const { customerId, outTime, items, remark } = req.body;
  if (!customerId) return res.json({ code: 400, message: '请选择客户' });
  if (!items?.length) return res.json({ code: 400, message: '请添加商品' });
  const id = db.nextId('CK');
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  db.insert('stock_out_order', { id, customer_id: customerId, out_time: outTime || now(), operator_id: req.user.id, total_amount: totalAmount, status: 0, remark: remark || '', created_at: now() });
  items.forEach(i => { db.insert('stock_out_item', { order_id: id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, amount: i.quantity * i.unitPrice }); });
  res.json({ code: 200, message: '出库单创建成功', data: { id } });
});
router.put('/stock/out/:id', auth, (req, res) => {
  const order = db.findOne('stock_out_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '出库单不存在' });
  if (order.status !== 0) return res.json({ code: 400, message: '只能编辑草稿状态的单据' });
  const { customerId, outTime, items, remark } = req.body;
  const totalAmount = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  db.update('stock_out_order', { id: req.params.id }, { customer_id: customerId, out_time: outTime, total_amount: totalAmount, remark: remark || '' });
  db.delete('stock_out_item', { order_id: req.params.id });
  items.forEach(i => { db.insert('stock_out_item', { order_id: req.params.id, product_id: i.productId, quantity: i.quantity, unit_price: i.unitPrice, amount: i.quantity * i.unitPrice }); });
  res.json({ code: 200, message: '出库单更新成功' });
});
router.post('/stock/out/:id/submit', auth, (req, res) => {
  const order = db.findOne('stock_out_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '出库单不存在' });
  if (order.status !== 0) return res.json({ code: 400, message: '只能提交草稿状态的单据' });
  const items = db.find('stock_out_item', { order_id: req.params.id });
  for (const item of items) {
    let inv = db.findOne('inventory', { product_id: item.product_id });
    const currentQty = inv?.quantity || 0;
    if (currentQty < item.quantity) { const p = db.findOne('product', { id: item.product_id }); return res.json({ code: 400, message: `商品[${p?.name || item.product_id}]库存不足，当前库存：${currentQty}，需要：${item.quantity}` }); }
  }
  items.forEach(item => {
    let inv = db.findOne('inventory', { product_id: item.product_id });
    const beforeQty = inv?.quantity || 0;
    const afterQty = beforeQty - item.quantity;
    db.update('inventory', { product_id: item.product_id }, { quantity: afterQty });
    db.insert('inventory_log', { order_no: req.params.id, order_type: 'CK', operate_type: 'OUT', product_id: item.product_id, quantity_change: -item.quantity, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: now() });
  });
  db.update('stock_out_order', { id: req.params.id }, { status: 1 });
  res.json({ code: 200, message: '出库单提交成功，库存已扣减' });
});
router.post('/stock/out/:id/cancel', auth, (req, res) => {
  const order = db.findOne('stock_out_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '出库单不存在' });
  if (order.status !== 1) return res.json({ code: 400, message: '只能作废已提交的单据' });
  const items = db.find('stock_out_item', { order_id: req.params.id });
  items.forEach(item => {
    let inv = db.findOne('inventory', { product_id: item.product_id });
    const beforeQty = inv?.quantity || 0;
    const afterQty = beforeQty + item.quantity;
    db.update('inventory', { product_id: item.product_id }, { quantity: afterQty });
    db.insert('inventory_log', { order_no: req.params.id, order_type: 'CK', operate_type: 'IN', product_id: item.product_id, quantity_change: item.quantity, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: now() });
  });
  db.update('stock_out_order', { id: req.params.id }, { status: -1 });
  res.json({ code: 200, message: '出库单已作废，库存已恢复' });
});
router.delete('/stock/out/:id', auth, (req, res) => {
  const order = db.findOne('stock_out_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '出库单不存在' });
  if (order.status !== 0) return res.json({ code: 400, message: '只能删除草稿状态的单据' });
  db.delete('stock_out_item', { order_id: req.params.id });
  db.delete('stock_out_order', { id: req.params.id });
  res.json({ code: 200, message: '删除成功' });
});
router.get('/stock/out/product/stock', auth, (req, res) => {
  const { productId } = req.query;
  const inv = db.findOne('inventory', { product_id: productId });
  res.json({ code: 200, data: { productId, quantity: inv?.quantity || 0 } });
});

// ==================== 库存流水 ====================
router.get('/inventory/log', auth, (req, res) => {
  const { startDate, endDate, orderType, productId, page = 1, pageSize = 20 } = req.query;
  let list = db.find('inventory_log');
  if (startDate) list = list.filter(i => i.operate_time >= startDate);
  if (endDate) list = list.filter(i => i.operate_time <= endDate + ' 23:59:59');
  if (orderType) list = list.filter(i => i.order_type === orderType);
  if (productId) list = list.filter(i => i.product_id === productId);
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, productName: db.findOne('product', { id: i.product_id })?.name, operatorName: db.findOne('user', { id: i.operator_id })?.real_name, orderTypeName: i.order_type === 'RK' ? '入库' : i.order_type === 'CK' ? '出库' : '盘点', operateTypeName: i.operate_type === 'IN' ? '入库' : i.operate_type === 'OUT' ? '出库' : i.operate_type === 'PROFIT' ? '盘盈' : '盘亏' }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

// ==================== 盘点 ====================
router.get('/check', auth, (req, res) => {
  const { keyword, status, page = 1, pageSize = 20 } = req.query;
  let list = db.find('check_order');
  if (keyword) list = list.filter(i => i.id.includes(keyword));
  if (status) list = list.filter(i => i.status === parseInt(status));
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, operatorName: db.findOne('user', { id: i.operator_id })?.real_name, auditorName: i.auditor_id ? db.findOne('user', { id: i.auditor_id })?.real_name : null, statusName: i.status === 1 ? '待审核' : '已审核' }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.get('/check/:id', auth, (req, res) => {
  const order = db.findOne('check_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '盘点单不存在' });
  const items = db.find('check_item', { order_id: req.params.id }).map(i => { const p = db.findOne('product', { id: i.product_id }); return { ...i, productName: p?.name, spec: p?.spec, unit: p?.unit, statusName: i.status === 'PROFIT' ? '盘盈' : i.status === 'LOSS' ? '盘亏' : '平' }; });
  res.json({ code: 200, data: { ...order, operatorName: db.findOne('user', { id: order.operator_id })?.real_name, auditorName: order.auditor_id ? db.findOne('user', { id: order.auditor_id })?.real_name : null, statusName: order.status === 1 ? '待审核' : '已审核', items } });
});
router.post('/check', auth, (req, res) => {
  const { checkDate, productIds, remark } = req.body;
  const id = db.nextId('PD');
  db.insert('check_order', { id, check_date: checkDate || now().slice(0, 10), operator_id: req.user.id, status: 1, remark: remark || '', created_at: now() });
  let products = productIds?.length ? productIds.map(pid => db.findOne('product', { id: pid })).filter(Boolean) : db.find('product');
  products.forEach(p => {
    const inv = db.findOne('inventory', { product_id: p.id });
    db.insert('check_item', { order_id: id, product_id: p.id, system_qty: inv?.quantity || 0, actual_qty: inv?.quantity || 0, diff_qty: 0, status: 'EQUAL' });
  });
  res.json({ code: 200, message: '盘点单创建成功', data: { id } });
});
router.put('/check/:id/items', auth, (req, res) => {
  const order = db.findOne('check_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '盘点单不存在' });
  if (order.status !== 1) return res.json({ code: 400, message: '只能修改待审核状态' });
  req.body.items?.forEach(item => {
    const diffQty = item.actualQty - item.systemQty;
    let status = 'EQUAL';
    if (diffQty > 0) status = 'PROFIT';
    else if (diffQty < 0) status = 'LOSS';
    db.update('check_item', { id: item.id }, { actual_qty: item.actualQty, diff_qty: diffQty, status });
  });
  res.json({ code: 200, message: '盘点数据更新成功' });
});
router.post('/check/:id/submit', auth, (req, res) => {
  const order = db.findOne('check_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '盘点单不存在' });
  if (order.status !== 1) return res.json({ code: 400, message: '只能审核待审核状态' });
  db.update('check_order', { id: req.params.id }, { status: 2, auditor_id: req.user.id, auditor_time: now() });
  const items = db.find('check_item', { order_id: req.params.id });
  items.forEach(item => {
    if (item.diff_qty !== 0) {
      let inv = db.findOne('inventory', { product_id: item.product_id });
      const beforeQty = inv?.quantity || 0;
      const afterQty = item.actual_qty;
      if (inv) { db.update('inventory', { product_id: item.product_id }, { quantity: afterQty }); } else { db.insert('inventory', { product_id: item.product_id, quantity: afterQty, warning_min: null, warning_max: null }); }
      db.insert('inventory_log', { order_no: req.params.id, order_type: 'PD', operate_type: item.diff_qty > 0 ? 'PROFIT' : 'LOSS', product_id: item.product_id, quantity_change: item.diff_qty, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: now() });
    }
  });
  res.json({ code: 200, message: '盘点单审核完成，库存已更新' });
});
router.delete('/check/:id', auth, (req, res) => {
  const order = db.findOne('check_order', { id: req.params.id });
  if (!order) return res.json({ code: 404, message: '盘点单不存在' });
  if (order.status === 2) return res.json({ code: 400, message: '已审核的盘点单无法删除' });
  db.delete('check_item', { order_id: req.params.id });
  db.delete('check_order', { id: req.params.id });
  res.json({ code: 200, message: '删除成功' });
});

// ==================== 报表 ====================
router.get('/reports/stock/in', auth, (req, res) => {
  const { startDate, endDate, supplierId, groupBy = 'supplier' } = req.query;
  let orders = db.find('stock_in_order').filter(o => o.status === 1);
  if (startDate) orders = orders.filter(o => o.in_time >= startDate);
  if (endDate) orders = orders.filter(o => o.in_time <= endDate + ' 23:59:59');
  if (supplierId) orders = orders.filter(o => o.supplier_id === supplierId);
  if (groupBy === 'supplier') {
    const grouped = {};
    orders.forEach(o => {
      const key = o.supplier_id;
      if (!grouped[key]) { const s = db.findOne('supplier', { id: key }); grouped[key] = { name: s?.name, orderCount: 0, totalAmount: 0, totalQuantity: 0 }; }
      grouped[key].orderCount++;
      grouped[key].totalAmount += o.total_amount || 0;
      const items = db.find('stock_in_item', { order_id: o.id });
      items.forEach(i => { grouped[key].totalQuantity += i.quantity; });
    });
    res.json({ code: 200, data: Object.values(grouped) });
  } else {
    res.json({ code: 200, data: orders.map(o => ({ ...o, supplierName: db.findOne('supplier', { id: o.supplier_id })?.name })) });
  }
});
router.get('/reports/stock/out', auth, (req, res) => {
  const { startDate, endDate, customerId, groupBy = 'customer' } = req.query;
  let orders = db.find('stock_out_order').filter(o => o.status === 1);
  if (startDate) orders = orders.filter(o => o.out_time >= startDate);
  if (endDate) orders = orders.filter(o => o.out_time <= endDate + ' 23:59:59');
  if (customerId) orders = orders.filter(o => o.customer_id === customerId);
  if (groupBy === 'customer') {
    const grouped = {};
    orders.forEach(o => {
      const key = o.customer_id;
      if (!grouped[key]) { const c = db.findOne('customer', { id: key }); grouped[key] = { name: c?.name, orderCount: 0, totalAmount: 0, totalQuantity: 0 }; }
      grouped[key].orderCount++;
      grouped[key].totalAmount += o.total_amount || 0;
      const items = db.find('stock_out_item', { order_id: o.id });
      items.forEach(i => { grouped[key].totalQuantity += i.quantity; });
    });
    res.json({ code: 200, data: Object.values(grouped) });
  } else {
    res.json({ code: 200, data: orders.map(o => ({ ...o, customerName: db.findOne('customer', { id: o.customer_id })?.name })) });
  }
});
router.get('/reports/profit', auth, (req, res) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return res.json({ code: 400, message: '请选择时间范围' });
  let salesAmount = 0, costAmount = 0;
  const orders = db.find('stock_out_order').filter(o => o.status === 1 && o.out_time >= startDate && o.out_time <= endDate + ' 23:59:59');
  orders.forEach(o => {
    const items = db.find('stock_out_item', { order_id: o.id });
    items.forEach(i => { salesAmount += i.quantity * i.unit_price; const p = db.findOne('product', { id: i.product_id }); costAmount += i.quantity * (p?.cost_price || 0); });
  });
  const profit = salesAmount - costAmount;
  res.json({ code: 200, data: { salesAmount, costAmount, profit, profitRate: salesAmount > 0 ? (profit / salesAmount * 100).toFixed(2) : 0 } });
});
router.get('/reports/inventory', auth, (req, res) => {
  const { categoryId } = req.query;
  let products = db.find('product');
  if (categoryId) products = products.filter(p => p.category_id == categoryId);
  const data = products.map(p => { const inv = db.findOne('inventory', { product_id: p.id }); return { id: p.id, name: p.name, spec: p.spec, unit: p.unit, cost_price: p.cost_price, sale_price: p.sale_price, quantity: inv?.quantity || 0, categoryName: db.findOne('category', { id: p.category_id })?.name, costAmount: (inv?.quantity || 0) * p.cost_price, saleAmount: (inv?.quantity || 0) * p.sale_price }; });
  res.json({ code: 200, data });
});
router.get('/reports/warning', auth, (req, res) => {
  const { type } = req.query;
  let items = db.find('inventory').filter(i => (i.warning_min && i.quantity <= i.warning_min) || (i.warning_max && i.quantity >= i.warning_max));
  if (type === 'low') items = items.filter(i => i.warning_min && i.quantity <= i.warning_min);
  else if (type === 'high') items = items.filter(i => i.warning_max && i.quantity >= i.warning_max);
  const data = items.map(i => { const p = db.findOne('product', { id: i.product_id }); return { name: p?.name, spec: p?.spec, quantity: i.quantity, warning_min: i.warning_min, warning_max: i.warning_max }; });
  res.json({ code: 200, data });
});

// ==================== 用户 ====================
router.get('/users', auth, (req, res) => {
  const { keyword, roleId, page = 1, pageSize = 20 } = req.query;
  let list = db.find('user');
  if (keyword) list = list.filter(i => (i.username + i.real_name).includes(keyword));
  if (roleId) list = list.filter(i => i.role_id == roleId);
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, roleName: db.findOne('role', { id: i.role_id })?.role_name }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.post('/users', auth, (req, res) => {
  const { username, realName, roleId, phone, email, password } = req.body;
  if (!username || !realName || !roleId || !password) return res.json({ code: 400, message: '必填项不能为空' });
  if (db.find('user').some(i => i.username === username)) return res.json({ code: 400, message: '用户名已存在' });
  const id = db.nextId('USR');
  db.insert('user', { id, username, password: bcrypt.hashSync(password, 10), real_name: realName, role_id: roleId, phone: phone || '', email: email || '', status: 1, created_at: now() });
  res.json({ code: 200, message: '添加成功', data: { id } });
});
router.put('/users/:id', auth, (req, res) => { db.update('user', { id: req.params.id }, { username: req.body.username, real_name: req.body.realName, role_id: req.body.roleId, phone: req.body.phone || '', email: req.body.email || '', status: req.body.status !== undefined ? req.body.status : 1 }); res.json({ code: 200, message: '更新成功' }); });
router.put('/users/:id/password', auth, (req, res) => { db.update('user', { id: req.params.id }, { password: bcrypt.hashSync(req.body.password, 10) }); res.json({ code: 200, message: '密码重置成功' }); });
router.delete('/users/:id', auth, (req, res) => { if (req.params.id === req.user.id) return res.json({ code: 400, message: '不能删除当前用户' }); db.delete('user', { id: req.params.id }); res.json({ code: 200, message: '删除成功' }); });
router.get('/users/roles', auth, (req, res) => { res.json({ code: 200, data: db.find('role') }); });

// ==================== 系统 ====================
router.get('/system/logs', auth, (req, res) => {
  const { startDate, endDate, operateType, page = 1, pageSize = 20 } = req.query;
  let list = db.find('operation_log');
  if (startDate) list = list.filter(i => i.operate_time >= startDate);
  if (endDate) list = list.filter(i => i.operate_time <= endDate + ' 23:59:59');
  if (operateType) list = list.filter(i => i.operate_type === operateType);
  const total = list.length;
  list = list.slice((page - 1) * pageSize, page * pageSize).map(i => ({ ...i, operatorName: db.findOne('user', { id: i.operator_id })?.real_name }));
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});
router.post('/system/backup', auth, (req, res) => {
  const timestamp = now().replace(/[-:T]/g, '').slice(0, 14);
  const filename = `inventory_backup_${timestamp}.json`;
  const filepath = path.join(__dirname, '../backups', filename);
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  res.json({ code: 200, message: '备份成功', data: { filename } });
});
router.post('/system/restore', auth, (req, res) => {
  const { filepath } = req.body;
  if (!filepath || !fs.existsSync(filepath)) return res.json({ code: 400, message: '备份文件不存在' });
  try {
    const raw = fs.readFileSync(filepath, 'utf8');
    const loaded = JSON.parse(raw);
    Object.assign(data, loaded);
    db.save();
    res.json({ code: 200, message: '恢复成功' });
  } catch (e) { res.json({ code: 500, message: '恢复失败' }); }
});

module.exports = router;
