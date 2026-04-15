const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, customerId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.stockOutOrder;
    if (keyword) list = list.filter(o => o.id.includes(keyword) || (o.remark && o.remark.includes(keyword)));
    if (customerId) list = list.filter(o => o.customerId === customerId);
    if (status !== undefined && status !== '') list = list.filter(o => o.status === parseInt(status));
    if (startDate) list = list.filter(o => o.outTime >= startDate);
    if (endDate) list = list.filter(o => o.outTime <= endDate + ' 23:59:59');
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(o => {
      const customer = db.data.tables.customer.find(c => c.id === o.customerId);
      const operator = db.data.tables.user.find(u => u.id === o.operatorId);
      return { ...o, customerName: customer?.name, operatorName: operator?.realName, statusName: o.status === 1 ? '正常' : o.status === -1 ? '作废' : '草稿' };
    });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const order = db.data.tables.stockOutOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '出库单不存在' });
    const customer = db.data.tables.customer.find(c => c.id === order.customerId);
    const operator = db.data.tables.user.find(u => u.id === order.operatorId);
    const items = db.data.tables.stockOutItem.filter(i => i.orderId === req.params.id).map(i => { const p = db.data.tables.product.find(p => p.id === i.productId); return { ...i, productName: p?.name, spec: p?.spec, unit: p?.unit }; });
    res.json({ code: 200, data: { ...order, customerName: customer?.name, operatorName: operator?.realName, items } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { customerId, outTime, items, remark } = req.body;
    if (!customerId) return res.json({ code: 400, message: '请选择客户' });
    if (!items || items.length === 0) return res.json({ code: 400, message: '请添加商品' });
    const orderId = generateSequence('CK');
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    db.data.tables.stockOutOrder.push({ id: orderId, customerId, outTime: outTime || new Date().toISOString(), operatorId: req.user.id, totalAmount, status: 0, remark: remark || '', createdAt: new Date().toISOString(), updatedAt: null });
    items.forEach(item => { db.data.tables.stockOutItem.push({ id: Date.now() + Math.random(), orderId, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.quantity * item.unitPrice, createdAt: new Date().toISOString() }); });
    await db.write();
    res.json({ code: 200, message: '出库单创建成功', data: { id: orderId } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const order = db.data.tables.stockOutOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '出库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能编辑草稿状态的单据' });
    const { customerId, outTime, items, remark } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    order.customerId = customerId; order.outTime = outTime || order.outTime; order.totalAmount = totalAmount; order.remark = remark || '';
    db.data.tables.stockOutItem = db.data.tables.stockOutItem.filter(i => i.orderId !== req.params.id);
    items.forEach(item => { db.data.tables.stockOutItem.push({ id: Date.now() + Math.random(), orderId: req.params.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.quantity * item.unitPrice, createdAt: new Date().toISOString() }); });
    await db.write();
    res.json({ code: 200, message: '出库单更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const order = db.data.tables.stockOutOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '出库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能提交草稿状态的单据' });
    const items = db.data.tables.stockOutItem.filter(i => i.orderId === req.params.id);
    // 库存校验
    for (const item of items) {
      let inv = db.data.tables.inventory.find(i => i.productId === item.productId);
      const currentQty = inv ? inv.quantity : 0;
      if (currentQty < item.quantity) {
        const product = db.data.tables.product.find(p => p.id === item.productId);
        return res.json({ code: 400, message: `商品[${product?.name || item.productId}]库存不足，当前库存：${currentQty}，需要：${item.quantity}` });
      }
    }
    db.data.tables.inventoryLog.push(...items.map(item => {
      let inv = db.data.tables.inventory.find(i => i.productId === item.productId);
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = beforeQty - item.quantity;
      if (inv) inv.quantity = afterQty; else db.data.tables.inventory.push({ productId: item.productId, quantity: afterQty, warningMin: null, warningMax: null });
      return { id: Date.now(), orderNo: req.params.id, orderType: 'CK', operateType: 'OUT', productId: item.productId, quantityChange: -item.quantity, inventoryBefore: beforeQty, inventoryAfter: afterQty, operatorId: req.user.id, operateTime: new Date().toISOString() };
    }));
    order.status = 1; order.updatedAt = new Date().toISOString();
    await db.write();
    res.json({ code: 200, message: '出库单提交成功，库存已扣减' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const order = db.data.tables.stockOutOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '出库单不存在' });
    if (order.status !== 1) return res.json({ code: 400, message: '只能作废已提交的单据' });
    const items = db.data.tables.stockOutItem.filter(i => i.orderId === req.params.id);
    db.data.tables.inventoryLog.push(...items.map(item => {
      let inv = db.data.tables.inventory.find(i => i.productId === item.productId);
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = beforeQty + item.quantity;
      if (inv) inv.quantity = afterQty; else db.data.tables.inventory.push({ productId: item.productId, quantity: afterQty, warningMin: null, warningMax: null });
      return { id: Date.now(), orderNo: req.params.id, orderType: 'CK', operateType: 'IN', productId: item.productId, quantityChange: item.quantity, inventoryBefore: beforeQty, inventoryAfter: afterQty, operatorId: req.user.id, operateTime: new Date().toISOString() };
    }));
    order.status = -1; order.updatedAt = new Date().toISOString();
    await db.write();
    res.json({ code: 200, message: '出库单已作废，库存已恢复' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = db.data.tables.stockOutOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '出库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能删除草稿状态的单据' });
    db.data.tables.stockOutOrder = db.data.tables.stockOutOrder.filter(o => o.id !== req.params.id);
    db.data.tables.stockOutItem = db.data.tables.stockOutItem.filter(i => i.orderId !== req.params.id);
    await db.write();
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/product/stock', async (req, res) => {
  try {
    const { productId } = req.query;
    const inv = db.data.tables.inventory.find(i => i.productId === productId);
    res.json({ code: 200, data: { productId, quantity: inv ? inv.quantity : 0 } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
