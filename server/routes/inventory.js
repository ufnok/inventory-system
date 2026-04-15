const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, categoryId, warningStatus, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.inventory.map(inv => {
      const product = db.data.tables.product.find(p => p.id === inv.productId);
      if (!product) return null;
      const category = db.data.tables.category.find(c => c.id === product.categoryId);
      let status = 'normal';
      if (inv.warningMin && inv.quantity <= inv.warningMin) status = 'low';
      else if (inv.warningMax && inv.quantity >= inv.warningMax) status = 'high';
      return { productId: inv.productId, productName: product.name, spec: product.spec, unit: product.unit, categoryId: product.categoryId, categoryName: category?.name, quantity: inv.quantity, costPrice: product.costPrice, costAmount: inv.quantity * product.costPrice, salePrice: product.salePrice, saleAmount: inv.quantity * product.salePrice, warningMin: inv.warningMin, warningMax: inv.warningMax, warningStatus: status };
    }).filter(Boolean);
    if (keyword) list = list.filter(l => l.productId.includes(keyword) || l.productName.includes(keyword));
    if (categoryId) list = list.filter(l => l.categoryId === parseInt(categoryId));
    if (warningStatus && warningStatus !== 'all') list = list.filter(l => l.warningStatus === warningStatus);
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:productId', async (req, res) => {
  try {
    let inv = db.data.tables.inventory.find(i => i.productId === req.params.productId);
    const product = db.data.tables.product.find(p => p.id === req.params.productId);
    if (!product) return res.json({ code: 404, message: '商品不存在' });
    if (!inv) { inv = { productId: req.params.productId, quantity: 0, warningMin: null, warningMax: null }; db.data.tables.inventory.push(inv); await db.write(); }
    let status = 'normal';
    if (inv.warningMin && inv.quantity <= inv.warningMin) status = 'low';
    else if (inv.warningMax && inv.quantity >= inv.warningMax) status = 'high';
    res.json({ code: 200, data: { productId: inv.productId, productName: product.name, spec: product.spec, unit: product.unit, quantity: inv.quantity, costPrice: product.costPrice, salePrice: product.salePrice, warningMin: inv.warningMin, warningMax: inv.warningMax, warningStatus: status } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:productId/warning', async (req, res) => {
  try {
    let inv = db.data.tables.inventory.find(i => i.productId === req.params.productId);
    if (!inv) { inv = { productId: req.params.productId, quantity: 0, warningMin: req.body.warningMin || null, warningMax: req.body.warningMax || null }; db.data.tables.inventory.push(inv); }
    else { inv.warningMin = req.body.warningMin || null; inv.warningMax = req.body.warningMax || null; }
    await db.write();
    res.json({ code: 200, message: '预警设置成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
