const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.supplier;
    if (keyword) list = list.filter(s => s.id.includes(keyword) || s.name.includes(keyword) || (s.contact && s.contact.includes(keyword)));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const supplier = db.data.tables.supplier.find(s => s.id === req.params.id);
    if (!supplier) return res.json({ code: 404, message: '供应商不存在' });
    res.json({ code: 200, data: supplier });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact, phone, address, remark } = req.body;
    if (!name) return res.json({ code: 400, message: '供应商名称不能为空' });
    if (db.data.tables.supplier.find(s => s.name === name)) return res.json({ code: 400, message: '供应商名称已存在' });
    const id = generateSequence('GYS');
    const supplier = { id, name, contact: contact || '', phone: phone || '', address: address || '', remark: remark || '', status: 1, createdAt: new Date().toISOString(), updatedAt: null };
    db.data.tables.supplier.push(supplier);
    await db.write();
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const supplier = db.data.tables.supplier.find(s => s.id === req.params.id);
    if (!supplier) return res.json({ code: 404, message: '供应商不存在' });
    Object.assign(supplier, { name: req.body.name, contact: req.body.contact || '', phone: req.body.phone || '', address: req.body.address || '', remark: req.body.remark || '', status: req.body.status !== undefined ? req.body.status : 1, updatedAt: new Date().toISOString() });
    await db.write();
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const hasOrder = db.data.tables.stockInOrder.some(o => o.supplierId === req.params.id);
    if (hasOrder) return res.json({ code: 400, message: '该供应商已被入库单引用，无法删除' });
    const idx = db.data.tables.supplier.findIndex(s => s.id === req.params.id);
    if (idx !== -1) { db.data.tables.supplier.splice(idx, 1); await db.write(); }
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
