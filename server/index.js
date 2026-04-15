const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { load } = require('./db/store');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api', require('./routes/api'));
app.get('/api/health', (req, res) => { res.json({ code: 200, message: 'OK' }); });

load();
app.listen(PORT, () => {
  console.log(`进销存管理系统服务已启动: http://localhost:${PORT}`);
  console.log(`默认管理员账号: admin / admin123`);
});

module.exports = app;
