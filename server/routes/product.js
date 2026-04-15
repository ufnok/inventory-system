const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, categoryId, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.product;
    if (keyword) list = list.filter(p => p.id.includes(keyword) || p.name.includes(keyword));
    if (categoryId) list = list.filter(p => p.categoryId === parseInt(categoryId));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const product = db.data.tables.product.find(p => p.id === req.params.id);
    if (!product) return res.json({ code: 404, message: '商品不存在' });
    res.json({ code: 200, data: product });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, spec, unit, costPrice, salePrice, categoryId, remark } = req.body;
    if (!name || !unit || costPrice === undefined || salePrice === undefined) return res.json({ code: 400, message: '必填项不能为空' });
    if (costPrice < 0 || salePrice < 0) return res.json({ code: 400, message: '价格不能为负数' });
    if (db.data.tables.product.find(p => p.name === name)) return res.json({ code: 400, message: '商品名称已存在' });
    const id = generateSequence('SP');
    const product = { id, name, spec: spec || '', unit, costPrice, salePrice, categoryId: categoryId || null, remark: remark || '', status: 1, createdAt: new Date().toISOString(), updatedAt: null };
    db.data.tables.product.push(product);
    db.data.tables.operationLog.push({ id: Date.now(), operatorId: req.user.id, operateType: 'INSERT', operateContent: `新增商品[${name}]`, operateResult: 'SUCCESS', operateTime: new Date().toISOString() });
    await db.write();
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, spec, unit, costPrice, salePrice, categoryId, remark, status } = req.body;
    const product = db.data.tables.product.find(p => p.id === req.params.id);
    if (!product) return res.json({ code: 404, message: '商品不存在' });
    Object.assign(product, { name, spec: spec || '', unit, costPrice, salePrice, categoryId: categoryId || null, remark: remark || '', status: status !== undefined ? status : 1, updatedAt: new Date().toISOString() });
    await db.write();
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const idx = db.data.tables.product.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.json({ code: 404, message: '商品不存在' });
    const hasInItem = db.data.tables.stockInItem.some(i => i.productId === req.params.id);
    const hasOutItem = db.data.tables.stockOutItem.some(i => i.productId === req.params.id);
    if (hasInItem || hasOutItem) return res.json({ code: 400, message: `该商品已被单据引用，无法删除` });
    db.data.tables.product.splice(idx, 1);
    await db.write();
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
