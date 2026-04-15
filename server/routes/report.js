const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const todayIn = db.data.tables.stock_in_order.filter(o => o.status === 1 && o.inTime.startsWith(today));
    const todayOut = db.data.tables.stock_out_order.filter(o => o.status === 1 && o.outTime.startsWith(today));
    const totalProduct = db.data.tables.product.length;
    const warningInv = db.data.tables.inventory.filter(i => (i.warningMin && i.quantity <= i.warningMin) || (i.warningMax && i.quantity >= i.warningMax));
    res.json({ code: 200, data: { todayInCount: todayIn.length, todayInAmount: todayIn.reduce((s, o) => s + (o.totalAmount || 0), 0), todayOutCount: todayOut.length, todayOutAmount: todayOut.reduce((s, o) => s + (o.totalAmount || 0), 0), totalProduct, warningCount: warningInv.length, recentWarning: warningInv.slice(0, 5).map(i => { const p = db.data.tables.product.find(p => p.id === i.productId); return { productName: p?.name, quantity: i.quantity, warningMin: i.warningMin, warningMax: i.warningMax }; }) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/stock/in', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'supplier' } = req.query;
    let orders = db.data.tables.stock_in_order.filter(o => o.status === 1);
    if (startDate) orders = orders.filter(o => o.inTime >= startDate);
    if (endDate) orders = orders.filter(o => o.inTime <= endDate + ' 23:59:59');
    if (groupBy === 'supplier') {
      const grouped = {};
      orders.forEach(o => {
        if (!grouped[o.supplierId]) grouped[o.supplierId] = { name: db.data.tables.supplier.find(s => s.id === o.supplierId)?.name || o.supplierId, orderCount: 0, totalAmount: 0, totalQuantity: 0 };
        grouped[o.supplierId].orderCount++;
        grouped[o.supplierId].totalAmount += o.totalAmount || 0;
        const items = db.data.tables.stock_in_item.filter(i => i.orderId === o.id);
        grouped[o.supplierId].totalQuantity += items.reduce((s, i) => s + i.quantity, 0);
      });
      res.json({ code: 200, data: Object.values(grouped) });
    } else {
      res.json({ code: 200, data: orders.map(o => ({ ...o, supplierName: db.data.tables.supplier.find(s => s.id === o.supplierId)?.name })) });
    }
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/stock/out', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'customer' } = req.query;
    let orders = db.data.tables.stock_out_order.filter(o => o.status === 1);
    if (startDate) orders = orders.filter(o => o.outTime >= startDate);
    if (endDate) orders = orders.filter(o => o.outTime <= endDate + ' 23:59:59');
    if (groupBy === 'customer') {
      const grouped = {};
      orders.forEach(o => {
        if (!grouped[o.customerId]) grouped[o.customerId] = { name: db.data.tables.customer.find(c => c.id === o.customerId)?.name || o.customerId, orderCount: 0, totalAmount: 0, totalQuantity: 0 };
        grouped[o.customerId].orderCount++;
        grouped[o.customerId].totalAmount += o.totalAmount || 0;
        const items = db.data.tables.stock_out_item.filter(i => i.orderId === o.id);
        grouped[o.customerId].totalQuantity += items.reduce((s, i) => s + i.quantity, 0);
      });
      res.json({ code: 200, data: Object.values(grouped) });
    } else {
      res.json({ code: 200, data: orders.map(o => ({ ...o, customerName: db.data.tables.customer.find(c => c.id === o.customerId)?.name })) });
    }
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/profit', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.json({ code: 400, message: '请选择时间范围' });
    let salesAmount = 0, costAmount = 0;
    const orders = db.data.tables.stock_out_order.filter(o => o.status === 1 && o.outTime >= startDate && o.outTime <= endDate + ' 23:59:59');
    orders.forEach(o => {
      const items = db.data.tables.stock_out_item.filter(i => i.orderId === o.id);
      items.forEach(i => {
        const p = db.data.tables.product.find(p => p.id === i.productId);
        salesAmount += i.quantity * i.unitPrice;
        costAmount += i.quantity * (p?.costPrice || 0);
      });
    });
    const profit = salesAmount - costAmount;
    const profitRate = salesAmount > 0 ? (profit / salesAmount * 100).toFixed(2) : 0;
    res.json({ code: 200, data: { salesAmount, costAmount, profit, profitRate } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/inventory', async (req, res) => {
  try {
    const { categoryId } = req.query;
    let products = db.data.tables.product;
    if (categoryId) products = products.filter(p => p.categoryId === parseInt(categoryId));
    const data = products.map(p => {
      const inv = db.data.tables.inventory.find(i => i.productId === p.id);
      const category = db.data.tables.category.find(c => c.id === p.categoryId);
      const qty = inv ? inv.quantity : 0;
      return { id: p.id, name: p.name, spec: p.spec, unit: p.unit, costPrice: p.costPrice, salePrice: p.salePrice, categoryName: category?.name, quantity: qty, costAmount: qty * p.costPrice, saleAmount: qty * p.salePrice };
    });
    res.json({ code: 200, data });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/warning', async (req, res) => {
  try {
    const { type } = req.query;
    let list = db.data.tables.inventory.filter(i => (i.warningMin && i.quantity <= i.warningMin) || (i.warningMax && i.quantity >= i.warningMax));
    if (type === 'low') list = list.filter(i => i.warningMin && i.quantity <= i.warningMin);
    else if (type === 'high') list = list.filter(i => i.warningMax && i.quantity >= i.warningMax);
    const data = list.map(i => { const p = db.data.tables.product.find(p => p.id === i.productId); return { productName: p?.name, quantity: i.quantity, warningMin: i.warningMin, warningMax: i.warningMax }; });
    res.json({ code: 200, data });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
