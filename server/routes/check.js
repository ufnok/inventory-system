const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, status, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.checkOrder;
    if (keyword) list = list.filter(o => o.id.includes(keyword));
    if (status) list = list.filter(o => o.status === parseInt(status));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(o => {
      const operator = db.data.tables.user.find(u => u.id === o.operatorId);
      const auditor = db.data.tables.user.find(u => u.id === o.auditorId);
      return { ...o, operatorName: operator?.realName, auditorName: auditor?.realName, statusName: o.status === 1 ? '待审核' : '已审核' };
    });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const order = db.data.tables.checkOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '盘点单不存在' });
    const operator = db.data.tables.user.find(u => u.id === order.operatorId);
    const auditor = db.data.tables.user.find(u => u.id === order.auditorId);
    const items = db.data.tables.checkItem.filter(i => i.orderId === req.params.id).map(i => {
      const p = db.data.tables.product.find(p => p.id === i.productId);
      return { ...i, productName: p?.name, spec: p?.spec, unit: p?.unit, statusName: i.status === 'PROFIT' ? '盘盈' : i.status === 'LOSS' ? '盘亏' : '平' };
    });
    res.json({ code: 200, data: { ...order, operatorName: operator?.realName, auditorName: auditor?.realName, statusName: order.status === 1 ? '待审核' : '已审核', items } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { checkDate, productIds, remark } = req.body;
    const orderId = generateSequence('PD');
    db.data.tables.checkOrder.push({ id: orderId, checkDate: checkDate || new Date().toISOString().slice(0, 10), operatorId: req.user.id, auditorId: null, auditorTime: null, status: 1, remark: remark || '', createdAt: new Date().toISOString() });
    const products = productIds && productIds.length > 0 ? db.data.tables.product.filter(p => productIds.includes(p.id)) : db.data.tables.product;
    products.forEach(p => {
      const inv = db.data.tables.inventory.find(i => i.productId === p.id);
      const systemQty = inv ? inv.quantity : 0;
      db.data.tables.checkItem.push({ id: Date.now() + Math.random(), orderId, productId: p.id, systemQty, actualQty: systemQty, diffQty: 0, status: 'EQUAL', createdAt: new Date().toISOString() });
    });
    await db.write();
    res.json({ code: 200, message: '盘点单创建成功', data: { id: orderId } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id/items', async (req, res) => {
  try {
    const order = db.data.tables.checkOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '盘点单不存在' });
    if (order.status !== 1) return res.json({ code: 400, message: '只能修改待审核状态的盘点单' });
    const { items } = req.body;
    items.forEach(item => {
      const checkItem = db.data.tables.checkItem.find(i => i.id === item.id);
      if (checkItem) {
        checkItem.actualQty = item.actualQty;
        checkItem.diffQty = item.actualQty - item.systemQty;
        checkItem.status = checkItem.diffQty > 0 ? 'PROFIT' : checkItem.diffQty < 0 ? 'LOSS' : 'EQUAL';
      }
    });
    await db.write();
    res.json({ code: 200, message: '盘点数据更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const order = db.data.tables.checkOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '盘点单不存在' });
    if (order.status !== 1) return res.json({ code: 400, message: '只能审核待审核状态的盘点单' });
    order.status = 2; order.auditorId = req.user.id; order.auditorTime = new Date().toISOString();
    const items = db.data.tables.checkItem.filter(i => i.orderId === req.params.id && i.diffQty !== 0);
    db.data.tables.inventoryLog.push(...items.map(item => {
      let inv = db.data.tables.inventory.find(i => i.productId === item.productId);
      const beforeQty = inv ? inv.quantity : 0;
      const afterQty = item.actualQty;
      if (inv) inv.quantity = afterQty; else db.data.tables.inventory.push({ productId: item.productId, quantity: afterQty, warningMin: null, warningMax: null });
      return { id: Date.now(), orderNo: req.params.id, orderType: 'PD', operateType: item.diffQty > 0 ? 'PROFIT' : 'LOSS', productId: item.productId, quantityChange: item.diffQty, inventoryBefore: beforeQty, inventoryAfter: afterQty, operatorId: req.user.id, operateTime: new Date().toISOString() };
    }));
    await db.write();
    res.json({ code: 200, message: '盘点单审核完成，库存已更新' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const order = db.data.tables.checkOrder.find(o => o.id === req.params.id);
    if (!order) return res.json({ code: 404, message: '盘点单不存在' });
    if (order.status === 2) return res.json({ code: 400, message: '已审核的盘点单无法删除' });
    db.data.tables.checkOrder = db.data.tables.checkOrder.filter(o => o.id !== req.params.id);
    db.data.tables.checkItem = db.data.tables.checkItem.filter(i => i.orderId !== req.params.id);
    await db.write();
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
