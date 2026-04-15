const express = require('express');
const router = express.Router();
const { db } = require('../db/store');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const list = db.find('category');
    const tree = [];
    const map = {};
    list.forEach(i => { map[i.id] = { ...i, children: [] }; });
    list.forEach(i => { if (i.pid === 0 || !i.pid) tree.push(map[i.id]); else if (map[i.pid]) map[i.pid].children.push(map[i.id]); });
    res.json({ code: 200, data: tree });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/flat', async (req, res) => {
  try { res.json({ code: 200, data: db.find('category') }); } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, pid = 0, sortOrder = 0 } = req.body;
    if (!name) return res.json({ code: 400, message: '分类名称不能为空' });
    if ((!pid || pid === 0) && db.find('category', { pid: 0 }).length >= 10) return res.json({ code: 400, message: '一级分类最多10个' });
    const id = (db.find('category').length || 0) + 1;
    db.insert('category', { id, name, pid: pid || 0, sort_order: sortOrder, created_at: new Date().toISOString() });
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const cat = db.findOne('category', { id: parseInt(req.params.id) });
    if (!cat) return res.json({ code: 404, message: '分类不存在' });
    db.update('category', { id: parseInt(req.params.id) }, { name: req.body.name, sort_order: req.body.sortOrder || 0 });
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (db.find('category').some(c => c.pid === id)) return res.json({ code: 400, message: '请先删除子分类' });
    if (db.find('product').some(p => p.category_id === id)) return res.json({ code: 400, message: '该分类下有商品，无法删除' });
    db.delete('category', { id });
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
