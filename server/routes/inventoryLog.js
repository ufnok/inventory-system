const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, orderType, productId, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.inventoryLog;
    if (startDate) list = list.filter(l => l.operateTime >= startDate);
    if (endDate) list = list.filter(l => l.operateTime <= endDate + ' 23:59:59');
    if (orderType) list = list.filter(l => l.orderType === orderType);
    if (productId) list = list.filter(l => l.productId === productId);
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(l => {
      const product = db.data.tables.product.find(p => p.id === l.productId);
      const operator = db.data.tables.user.find(u => u.id === l.operatorId);
      return { ...l, productName: product?.name, operatorName: operator?.realName, orderTypeName: l.orderType === 'RK' ? '入库' : l.orderType === 'CK' ? '出库' : '盘点', operateTypeName: l.operateType === 'IN' ? '入库' : l.operateType === 'OUT' ? '出库' : l.operateType === 'PROFIT' ? '盘盈' : '盘亏' };
    });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
