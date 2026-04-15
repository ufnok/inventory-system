const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { authMiddleware } = require('../middleware/auth');
const { generateSequence } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, roleId, page = 1, pageSize = 20 } = req.query;
    let list = db.data.tables.user;
    if (keyword) list = list.filter(u => u.username.includes(keyword) || u.realName.includes(keyword));
    if (roleId) list = list.filter(u => u.roleId === parseInt(roleId));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(u => { const role = db.data.tables.role.find(r => r.id === u.roleId); return { ...u, roleName: role?.roleName }; });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { username, realName, roleId, phone, email, password } = req.body;
    if (!username || !realName || !roleId || !password) return res.json({ code: 400, message: '必填项不能为空' });
    if (db.data.tables.user.find(u => u.username === username)) return res.json({ code: 400, message: '用户名已存在' });
    const id = generateSequence('USR');
    db.data.tables.user.push({ id, username, password: bcrypt.hashSync(password, 10), realName, roleId, phone: phone || '', email: email || '', status: 1, lastLogin: null, createdAt: new Date().toISOString() });
    await db.write();
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const user = db.data.tables.user.find(u => u.id === req.params.id);
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    const { username, realName, roleId, phone, email, status } = req.body;
    Object.assign(user, { username, realName, roleId, phone: phone || '', email: email || '', status: status !== undefined ? status : 1 });
    await db.write();
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    const user = db.data.tables.user.find(u => u.id === req.params.id);
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    user.password = bcrypt.hashSync(password, 10);
    await db.write();
    res.json({ code: 200, message: '密码重置成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.json({ code: 400, message: '不能删除当前登录用户' });
    const idx = db.data.tables.user.findIndex(u => u.id === req.params.id);
    if (idx !== -1) { db.data.tables.user.splice(idx, 1); await db.write(); }
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/roles', async (req, res) => {
  try { res.json({ code: 200, data: db.data.tables.role.filter(r => r.status === 1) }); } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
