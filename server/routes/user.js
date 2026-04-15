const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/store');
const { authMiddleware } = require('../middleware/auth');
const { nextId } = require('../utils/sequence');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { keyword, roleId, page = 1, pageSize = 20 } = req.query;
    let list = db.find('user');
    if (keyword) list = list.filter(u => (u.username + (u.real_name || '')).includes(keyword));
    if (roleId) list = list.filter(u => u.role_id === parseInt(roleId));
    const total = list.length;
    list = list.slice((page - 1) * pageSize, page * pageSize).map(u => { const role = db.findOne('role', { id: u.role_id }); return { ...u, roleName: role?.role_name }; });
    res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/', async (req, res) => {
  try {
    const { username, realName, roleId, phone, email, password } = req.body;
    if (!username || !realName || !roleId || !password) return res.json({ code: 400, message: '必填项不能为空' });
    if (db.findOne('user', { username })) return res.json({ code: 400, message: '用户名已存在' });
    const id = db.nextId('USR');
    db.insert('user', { id, username, password: bcrypt.hashSync(password, 10), real_name: realName, role_id: roleId, phone: phone || '', email: email || '', status: 1, last_login: null, created_at: new Date().toISOString() });
    res.json({ code: 200, message: '添加成功', data: { id } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id', async (req, res) => {
  try {
    const user = db.findOne('user', { id: req.params.id });
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    const { username, realName, roleId, phone, email, status } = req.body;
    db.update('user', { id: req.params.id }, { username, real_name: realName, role_id: roleId, phone: phone || '', email: email || '', status: status !== undefined ? status : 1 });
    res.json({ code: 200, message: '更新成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.put('/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    const user = db.findOne('user', { id: req.params.id });
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    db.update('user', { id: req.params.id }, { password: bcrypt.hashSync(password, 10) });
    res.json({ code: 200, message: '密码重置成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.json({ code: 400, message: '不能删除当前登录用户' });
    db.delete('user', { id: req.params.id });
    res.json({ code: 200, message: '删除成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/roles', async (req, res) => {
  try { res.json({ code: 200, data: db.find('role', { status: 1 }) }); } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

module.exports = router;
