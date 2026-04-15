const express = require('express');
const router = express.Router();
const { db } = require('../db/store');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, categoryId, page = 1, pageSize = 20 } = req.query;
    let list = db.find('product');
    if (keyword) list = list.filter(p => (p.id + (p.name || '') + (p.spec || '')).includes(keyword));
    if (categoryId) list = list.filter(p => p.category_id == categoryId);
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const product = db.findOne('product', { id: req.params.id });
    if (!product) return res.json({ code: 404, message: '商品不存在' });
    res.json({ code: 200, data: product });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, spec, unit, costPrice, salePrice, categoryId, remark } = req.body;
    if (!name || !unit || costPrice === undefined || salePrice === undefined) return res.json({ code: 400, message: '必填项不能为空' });
    if (costPrice < 0 || salePrice < 0) return res.json({ code: 400, message: '价格不能为负数' });
    if (db.find('product').some(p => p.name === name)) return res.json({ code: 400, message: '商品名称已存在' });
    const id = db.nextId('SP');
    db.insert('product', { id, name, spec: spec || '', unit, cost_price: costPrice, sale_price: salePrice, category_id: categoryId || null, remark: remark || '', status: 1, created_at: new Date().toISOString() });
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, spec, unit, costPrice, salePrice, categoryId, remark, status } = req.body;
    const product = db.findOne('product', { id: req.params.id });
    if (!product) return res.json({ code: 404, message: '商品不存在' });
    db.update('product', { id: req.params.id }, { name, spec: spec || '', unit, cost_price: costPrice, sale_price: salePrice, category_id: categoryId || null, remark: remark || '', status: status !== undefined ? status : 1 });
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const idx = db.find('product').findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.json({ code: 404, message: '商品不存在' });
    const hasInItem = db.find('stock_in_item').some(i => i.product_id === req.params.id);
    const hasOutItem = db.find('stock_out_item').some(i => i.product_id === req.params.id);
    if (hasInItem || hasOutItem) return res.json({ code: 400, message: '该商品已被单据引用，无法删除' });
    db.delete('product', { id: req.params.id });
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
