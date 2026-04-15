const express = require('express');
const router = express.Router();
const { db } = require('../db/store');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, categoryId, warningStatus, page = 1, pageSize = 20 } = req.query;
    let list = db.find('inventory').map(inv => {
      const product = db.findOne('product', { id: inv.product_id });
      if (!product) return null;
      const category = db.findOne('category', { id: product.category_id });
      let status = 'normal';
      if (inv.warning_min && inv.quantity <= inv.warning_min) status = 'low';
      else if (inv.warning_max && inv.quantity >= inv.warning_max) status = 'high';
      return { product_id: inv.product_id, product_name: product.name, spec: product.spec, unit: product.unit, category_id: product.category_id, category_name: category?.name, quantity: inv.quantity, cost_price: product.cost_price, cost_amount: inv.quantity * product.cost_price, sale_price: product.sale_price, sale_amount: inv.quantity * product.sale_price, warning_min: inv.warning_min, warning_max: inv.warning_max, warning_status: status };
    }).filter(Boolean);
    if (keyword) list = list.filter(l => ((l.product_id || '') + (l.product_name || '')).includes(keyword));
    if (categoryId) list = list.filter(l => l.category_id == categoryId);
    if (warningStatus && warningStatus !== 'all') list = list.filter(l => l.warning_status === warningStatus);
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize);
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/:productId', async (req, res) => {
  try {
    let inv = db.findOne('inventory', { product_id: req.params.productId });
    const product = db.findOne('product', { id: req.params.productId });
    if (!product) return res.json({ code: 404, message: '商品不存在' });
    if (!inv) { inv = { product_id: req.params.productId, quantity: 0, warning_min: null, warning_max: null }; db.insert('inventory', inv); }
    let status = 'normal';
    if (inv.warning_min && inv.quantity <= inv.warning_min) status = 'low';
    else if (inv.warning_max && inv.quantity >= inv.warning_max) status = 'high';
    res.json({ code: 200, data: { product_id: inv.product_id, product_name: product.name, spec: product.spec, unit: product.unit, quantity: inv.quantity, cost_price: product.cost_price, sale_price: product.sale_price, warning_min: inv.warning_min, warning_max: inv.warning_max, warning_status: status } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:productId/warning', async (req, res) => {
  try {
    let inv = db.findOne('inventory', { product_id: req.params.productId });
    const { warningMin, warningMax } = req.body;
    if (!inv) { db.insert('inventory', { product_id: req.params.productId, quantity: 0, warning_min: warningMin || null, warning_max: warningMax || null }); }
    else { db.update('inventory', { product_id: req.params.productId }, { warning_min: warningMin || null, warning_max: warningMax || null }); }
    res.json({ code: 200, message: '预警设置成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
