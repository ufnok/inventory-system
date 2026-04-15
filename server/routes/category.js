const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const list = db.data.tables.category;
    const tree = [];
    const map = {};
    list.forEach(i => { map[i.id] = { ...i, children: [] }; });
    list.forEach(i => { if (i.pid === 0 || !i.pid) tree.push(map[i.id]); else if (map[i.pid]) map[i.pid].children.push(map[i.id]); });
    res.json({ code: 200, data: tree });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/flat', async (req, res) => {
  try { res.json({ code: 200, data: db.data.tables.category }); } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, pid = 0, sortOrder = 0 } = req.body;
    if (!name) return res.json({ code: 400, message: '分类名称不能为空' });
    if (pid === 0 || pid === '0') {
      const count = db.data.tables.category.filter(c => c.pid === 0 || !c.pid).length;
      if (count >= 10) return res.json({ code: 400, message: '一级分类最多10个' });
    }
    const id = Date.now();
    db.data.tables.category.push({ id, pid: pid || 0, name, sortOrder, createdAt: new Date().toISOString() });
    await db.write();
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const cat = db.data.tables.category.find(c => c.id === parseInt(req.params.id));
    if (!cat) return res.json({ code: 404, message: '分类不存在' });
    cat.name = req.body.name;
    cat.sortOrder = req.body.sortOrder || 0;
    await db.write();
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (db.data.tables.category.some(c => c.pid === id)) return res.json({ code: 400, message: '请先删除子分类' });
    if (db.data.tables.product.some(p => p.categoryId === id)) return res.json({ code: 400, message: '该分类下有商品，无法删除' });
    const idx = db.data.tables.category.findIndex(c => c.id === id);
    if (idx !== -1) { db.data.tables.category.splice(idx, 1); await db.write(); }
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
