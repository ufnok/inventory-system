const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db/store');

const SECRET = 'invent...2024';
const TOKEN_EXPIRES = '24h';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role_id: user.role_id }, SECRET, { expiresIn: TOKEN_EXPIRES });
}

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.json({ code: 401, message: '未登录' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (e) {
    return res.json({ code: 401, message: 'Token无效' });
  }
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ code: 400, message: '用户名和密码不能为空' });
    
    const user = db.findOne('user', { username, status: 1 });
    if (!user) return res.json({ code: 401, message: '用户名或密码错误' });
    
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.json({ code: 401, message: '用户名或密码错误' });
    
    db.update('user', { id: user.id }, { last_login: new Date().toISOString() });
    const role = db.findOne('role', { id: user.role_id });
    
    db.insert('operation_log', { id: Date.now(), operator_id: user.id, operate_type: 'LOGIN', operate_content: '用户登录系统', operate_result: 'SUCCESS', operate_time: new Date().toISOString() });
    
    const token = generateToken(user);
    res.json({ code: 200, message: '登录成功', data: { token, user: { id: user.id, username: user.username, realName: user.real_name, roleId: user.role_id, roleName: role?.role_name, roleCode: role?.role_code } } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/info', authMiddleware, async (req, res) => {
  try {
    const user = db.findOne('user', { id: req.user.id });
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    const role = db.findOne('role', { id: user.role_id });
    res.json({ code: 200, data: { id: user.id, username: user.username, realName: user.real_name, roleId: user.role_id, roleName: role?.role_name, roleCode: role?.role_code, phone: user.phone, email: user.email, lastLogin: user.last_login } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = db.findOne('user', { id: req.user.id });
    if (!bcrypt.compareSync(oldPassword, user.password)) return res.json({ code: 400, message: '旧密码错误' });
    db.update('user', { id: req.user.id }, { password: bcrypt.hashSync(newPassword, 10) });
    res.json({ code: 200, message: '密码修改成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/logout', authMiddleware, async (req, res) => { res.json({ code: 200, message: '退出成功' }); });

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.generateToken = generateToken;
