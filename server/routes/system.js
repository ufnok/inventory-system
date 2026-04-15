const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/logs', async (req, res) => {
  try {
    const { startDate, endDate, operateType, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.operation_log;
    if (startDate) list = list.filter(l => l.operateTime >= startDate);
    if (endDate) list = list.filter(l => l.operateTime <= endDate + ' 23:59:59');
    if (operateType) list = list.filter(l => l.operateType === operateType);
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(l => { const op = db.data.tables.user.find(u => u.id === l.operatorId); return { ...l, operatorName: op?.realName }; });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/backup', async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `hermes_inventory_backup_${timestamp}.json`;
    const backupsDir = path.join(__dirname, '../backups');
    fs.mkdirSync(backupsDir, { recursive: true });
    const filepath = path.join(backupsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(db.data.tables, null, 2));
    res.json({ code: 200, message: '备份成功', data: { filename, path: filepath } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/restore', async (req, res) => {
  try {
    const { filepath } = req.body;
    if (!filepath || !fs.existsSync(filepath)) return res.json({ code: 400, message: '备份文件不存在' });
    const raw = fs.readFileSync(filepath, 'utf8');
    db.data.tables = JSON.parse(raw);
    await db.write();
    res.json({ code: 200, message: '恢复成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
