const express = require('express');
const router = express.Router();
const { db } = require('../db/store');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    let list = db.find('customer');
    if (keyword) list = list.filter(c => (c.id + c.name + (c.contact || '')).includes(keyword));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = db.findOne('customer', { id: req.params.id });
    if (!customer) return res.json({ code: 404, message: '客户不存在' });
    res.json({ code: 200, data: customer });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, contact, phone, address, remark } = req.body;
    if (!name) return res.json({ code: 400, message: '客户名称不能为空' });
    if (db.find('customer').some(c => c.name === name)) return res.json({ code: 400, message: '客户名称已存在' });
    const id = db.nextId('KH');
    db.insert('customer', { id, name, contact: contact || '', phone: phone || '', address: address || '', remark: remark || '', status: 1, created_at: new Date().toISOString() });
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const customer = db.findOne('customer', { id: req.params.id });
    if (!customer) return res.json({ code: 404, message: '客户不存在' });
    const { name, contact, phone, address, remark, status } = req.body;
    db.update('customer', { id: req.params.id }, { name: name || customer.name, contact: contact || '', phone: phone || '', address: address || '', remark: remark || '', status: status !== undefined ? status : 1 });
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (db.count('stock_out_order', { customer_id: req.params.id }) > 0) return res.json({ code: 400, message: '该客户已被出库单引用，无法删除' });
    db.delete('customer', { id: req.params.id });
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
