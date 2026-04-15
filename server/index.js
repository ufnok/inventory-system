const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/product'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/suppliers', require('./routes/supplier'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/stock/in', require('./routes/stockIn'));
app.use('/api/stock/out', require('./routes/stockOut'));
app.use('/api/inventory/log', require('./routes/inventoryLog'));
app.use('/api/check', require('./routes/check'));
app.use('/api/reports', require('./routes/report'));
app.use('/api/users', require('./routes/user'));
app.use('/api/system', require('./routes/system'));

app.get('/api/health', (req, res) => { res.json({ code: 200, message: 'OK', timestamp: new Date().toISOString() }); });

// 初始化数据库并启动
(async () => {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`进销存管理系统服务已启动: http://localhost:${PORT}`);
    console.log(`默认管理员账号: admin / admin123`);
  });
})();

module.exports = app;
