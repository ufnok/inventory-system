const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, supplierId, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.stockInOrder;
    if (keyword) list = list.filter(o => o.id.includes(keyword) || (o.remark && o.remark.includes(keyword)));
    if (supplierId) list = list.filter(o => o.supplierId === supplierId);
    if (status !== undefined && status !== '') list = list.filter(o => o.status === parseInt(status));
    if (startDate) list = list.filter(o => o.inTime >= startDate);
    if (endDate) list = list.filter(o => o.inTime <= endDate + ' 23:59:59');
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(o => {
      const supplier = db.data.tables.supplier.find(s => s.id === o.supplierId);
      const operator = db.data.tables.user.find(u => u.id === o.operatorId);
      return { ...o, supplierName: supplier?.name, operatorName: operator?.realName, statusName: o.status === 1 ? '正常' : o.status === -1 ? '作废' : '草稿' };
    });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const order = db.data.tables.stockInOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    const supplier = db.data.tables.supplier.find(s => s.id === order.supplierId);
    const operator = db.data.tables.user.find(u => u.id === order.operatorId);
    const items = db.data.tables.stockInItem.filter(i => i.orderId === req.params.id).map(i => { const p = db.data.tables.product.find(p => p.id === i.productId); return { ...i, productName: p?.name, spec: p?.spec, unit: p?.unit }; });
    res.json({ code: 200, data: { ...order, supplierName: supplier?.name, operatorName: operator?.realName, items } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { supplierId, inTime, items, remark } = req.body;
    if (!supplierId) return res.json({ code: 400, message: '请选择供应商' });
    if (!items || items.length === 0) return res.json({ code: 400, message: '请添加商品' });
    const orderId = generateSequence('RK');
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    db.data.tables.stockInOrder.push({ id: orderId, supplierId, inTime: inTime || new Date().toISOString(), operatorId: req.user.id, totalAmount, status: 0, remark: remark || '', createdAt: new Date().toISOString(), updatedAt: null });
    items.forEach(item => { db.data.tables.stockInItem.push({ id: Date.now() + Math.random(), orderId, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.quantity * item.unitPrice, createdAt: new Date().toISOString() }); });
    await db.write();
    res.json({ code: 200, message: '入库单创建成功', data: { id: orderId } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const order = db.data.tables.stockInOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能编辑草稿状态的单据' });
    const { supplierId, inTime, items, remark } = req.body;
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    order.supplierId = supplierId; order.inTime = inTime || order.inTime; order.totalAmount = totalAmount; order.remark = remark || '';
    db.data.tables.stockInItem = db.data.tables.stockInItem.filter(i => i.orderId !== req.params.id);
    items.forEach(item => { db.data.tables.stockInItem.push({ id: Date.now() + Math.random(), orderId: req.params.id, productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, amount: item.quantity * item.unitPrice, createdAt: new Date().toISOString() }); });
    await db.write();
    res.json({ code: 200, message: '入库单更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const order = db.data.tables.stockInOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能提交草稿状态的单据' });
    const items = db.data.tables.stockInItem.filter(i => i.orderId === req.params.id);
    db.data.tables.inventoryLog.push(...items.map(item => {
      let inv = db.data.tables.inventory.find(i => i.productId === item.productId);
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = beforeQty + item.quantity;
      if (inv) inv.quantity = afterQty; else db.data.tables.inventory.push({ productId: item.productId, quantity: afterQty, warningMin: null, warningMax: null });
      return { id: Date.now(), orderNo: req.params.id, orderType: 'RK', operateType: 'IN', productId: item.productId, quantityChange: item.quantity, inventoryBefore: beforeQty, inventoryAfter: afterQty, operatorId: req.user.id, operateTime: new Date().toISOString() };
    }));
    order.status = 1; order.updatedAt = new Date().toISOString();
    await db.write();
    res.json({ code: 200, message: '入库单提交成功，库存已增加' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const order = db.data.tables.stockInOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 1) return res.json({ code: 400, message: '只能作废已提交的单据' });
    const items = db.data.tables.stockInItem.filter(i => i.orderId === req.params.id);
    db.data.tables.inventoryLog.push(...items.map(item => {
      let inv = db.data.tables.inventory.find(i => i.productId === item.productId);
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = Math.max(0, beforeQty - item.quantity);
      if (inv) inv.quantity = afterQty;
      return { id: Date.now(), orderNo: req.params.id, orderType: 'RK', operateType: 'OUT', productId: item.productId, quantityChange: -item.quantity, inventoryBefore: beforeQty, inventoryAfter: afterQty, operatorId: req.user.id, operateTime: new Date().toISOString() };
    }));
    order.status = -1; order.updatedAt = new Date().toISOString();
    await db.write();
    res.json({ code: 200, message: '入库单已作废，库存已回滚' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = db.data.tables.stockInOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '入库单不存在' });
    if (order.status !== 0) return res.json({ code: 400, message: '只能删除草稿状态的单据' });
    db.data.tables.stockInOrder = db.data.tables.stockInOrder.filter(o => o.id !== req.params.id);
    db.data.tables.stockInItem = db.data.tables.stockInItem.filter(i => i.orderId !== req.params.id);
    await db.write();
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
