const express = require('express');
const router = express.Router();
const { db } = require('../db/store');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, supplierId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    let list = db.find('stock_in_order');
    if (keyword) list = list.filter(o => (o.id + (o.remark || '')).includes(keyword));
    if (supplierId) list = list.filter(o => o.supplier_id === supplierId);
    if (status !== undefined && status !== '') list = list.filter(o => o.status === parseInt(status));
    if (startDate) list = list.filter(o => o.in_time >= startDate);
    if (endDate) list = list.filter(o => o.in_time <= endDate + ' 23:59:59');
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(o => {
      const supplier = db.findOne('supplier', { id: o.supplier_id });
      const operator = db.findOne('user', { id: o.operator_id });
      return { ...o, supplier_name: supplier?.name, operator_name: operator?.real_name, status_name: o.status === 1 ? '正常' : o.status === -1 ? '作废' : '草稿' };
    });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const order = db.findOne('stock_in_order', { id: req.params.id });
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    const supplier = db.findOne('supplier', { id: order.supplier_id });
    const operator = db.findOne('user', { id: order.operator_id });
    const items = db.find('stock_in_item', { order_id: req.params.id }).map(i => { const p = db.findOne('product', { id: i.product_id }); return { ...i, product_name: p?.name, spec: p?.spec, unit: p?.unit }; });
    res.json({ code: 200, data: { ...order, supplier_name: supplier?.name, operator_name: operator?.real_name, items } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { supplierId, inTime, items, remark } = req.body;
    if (!supplierId) return res.json({ code: 400, message: '请选择供应商' });
    if (!items || items.length === 0) return res.json({ code: 400, message: '请添加商品' });
    const id = db.nextId('RK');
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    db.insert('stock_in_order', { id, supplier_id: supplierId, in_time: inTime || new Date().toISOString(), operator_id: req.user.id, total_amount: totalAmount, status: 0, remark: remark || '', created_at: new Date().toISOString() });
    items.forEach(item => { db.insert('stock_in_item', { order_id: id, product_id: item.productId, quantity: item.quantity, unit_price: item.unitPrice, amount: item.quantity * item.unitPrice }); });
    res.json({ code: 200, message: '入库单创建成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const order = db.findOne('stock_in_order', { id: req.params.id });
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能编辑草稿状态的单据' });
    const { supplierId, inTime, items, remark } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    db.update('stock_in_order', { id: req.params.id }, { supplier_id: supplierId, in_time: inTime, total_amount: totalAmount, remark: remark || '' });
    db.delete('stock_in_item', { order_id: req.params.id });
    items.forEach(item => { db.insert('stock_in_item', { order_id: req.params.id, product_id: item.productId, quantity: item.quantity, unit_price: item.unitPrice, amount: item.quantity * item.unitPrice }); });
    res.json({ code: 200, message: '入库单更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const order = db.findOne('stock_in_order', { id: req.params.id });
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能提交草稿状态的单据' });
    const items = db.find('stock_in_item', { order_id: req.params.id });
    items.forEach(item => {
      let inv = db.findOne('inventory', { product_id: item.product_id });
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = beforeQty + item.quantity;
      if (inv) { db.update('inventory', { product_id: item.product_id }, { quantity: afterQty }); } else { db.insert('inventory', { product_id: item.product_id, quantity: afterQty, warning_min: null, warning_max: null }); }
      db.insert('inventory_log', { order_no: req.params.id, order_type: 'RK', operate_type: 'IN', product_id: item.product_id, quantity_change: item.quantity, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: new Date().toISOString() });
    });
    db.update('stock_in_order', { id: req.params.id }, { status: 1 });
    res.json({ code: 200, message: '入库单提交成功，库存已增加' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const order = db.findOne('stock_in_order', { id: req.params.id });
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 1) return res.json({ code: 400, message: '只能作废已提交的单据' });
    const items = db.find('stock_in_item', { order_id: req.params.id });
    items.forEach(item => {
      let inv = db.findOne('inventory', { product_id: item.product_id });
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = Math.max(0, beforeQty - item.quantity);
      if (inv) { db.update('inventory', { product_id: item.product_id }, { quantity: afterQty }); }
      db.insert('inventory_log', { order_no: req.params.id, order_type: 'RK', operate_type: 'OUT', product_id: item.product_id, quantity_change: -item.quantity, inventory_before: beforeQty, inventory_after: afterQty, operator_id: req.user.id, operate_time: new Date().toISOString() });
    });
    db.update('stock_in_order', { id: req.params.id }, { status: -1 });
    res.json({ code: 200, message: '入库单已作废，库存已回滚' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = db.findOne('stock_in_order', { id: req.params.id });
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能删除草稿状态的单据' });
    db.delete('stock_in_item', { order_id: req.params.id });
    db.delete('stock_in_order', { id: req.params.id });
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
