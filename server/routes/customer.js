const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.customer;
    if (keyword) list = list.filter(c => c.id.includes(keyword) || c.name.includes(keyword) || (c.contact && c.contact.includes(keyword)));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = db.data.tables.customer.find(c => c.id === req.params.id);
    if (!customer) return res.json({ code: 404, message: '客户不存在' });
    res.json({ code: 200, data: customer });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact, phone, address, remark } = req.body;
    if (!name) return res.json({ code: 400, message: '客户名称不能为空' });
    if (db.data.tables.customer.find(c => c.name === name)) return res.json({ code: 400, message: '客户名称已存在' });
    const id = generateSequence('KH');
    const customer = { id, name, contact: contact || '', phone: phone || '', address: address || '', remark: remark || '', status: 1, createdAt: new Date().toISOString(), updatedAt: null };
    db.data.tables.customer.push(customer);
    await db.write();
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = db.data.tables.customer.find(c => c.id === req.params.id);
    if (!customer) return res.json({ code: 404, message: '客户不存在' });
    Object.assign(customer, { name: req.body.name, contact: req.body.contact || '', phone: req.body.phone || '', address: req.body.address || '', remark: req.body.remark || '', status: req.body.status !== undefined ? req.body.status : 1, updatedAt: new Date().toISOString() });
    await db.write();
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const hasOrder = db.data.tables.stockOutOrder.some(o => o.customerId === req.params.id);
    if (hasOrder) return res.json({ code: 400, message: '该客户已被出库单引用，无法删除' });
    const idx = db.data.tables.customer.findIndex(c => c.id === req.params.id);
    if (idx !== -1) { db.data.tables.customer.splice(idx, 1); await db.write(); }
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
