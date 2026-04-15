const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ code: 400, message: '用户名和密码不能为空' });
    
    const user = db.data.tables.user.find(u => u.username === username && u.status === 1);
    if (!user) return res.json({ code: 401, message: '用户名或密码错误' });
    
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) return res.json({ code: 401, message: '用户名或密码错误' });
    
    user.lastLogin = new Date().toISOString();
    const role = db.data.tables.role.find(r => r.id === user.roleId);
    await db.write();
    
    db.data.tables.operationLog.push({
      id: Date.now(), operatorId: user.id, operateType: 'LOGIN', operateContent: '用户登录系统', operateResult: 'SUCCESS', operateTime: new Date().toISOString()
    });
    await db.write();
    
    const token = generateToken(user);
    res.json({ code: 200, message: '登录成功', data: { token, user: { id: user.id, username: user.username, realName: user.realName, roleId: user.roleId, roleName: role?.roleName, roleCode: role?.roleCode } } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.get('/info', authMiddleware, async (req, res) => {
  try {
    const user = db.data.tables.user.find(u => u.id === req.user.id);
    if (!user) return res.json({ code: 404, message: '用户不存在' });
    const role = db.data.tables.role.find(r => r.id === user.roleId);
    res.json({ code: 200, data: { id: user.id, username: user.username, realName: user.realName, roleId: user.roleId, roleName: role?.roleName, roleCode: role?.roleCode, phone: user.phone, email: user.email, lastLogin: user.lastLogin } });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = db.data.tables.user.find(u => u.id === req.user.id);
    if (!bcrypt.compareSync(oldPassword, user.password)) return res.json({ code: 400, message: '旧密码错误' });
    user.password = bcrypt.hashSync(newPassword, 10);
    await db.write();
    res.json({ code: 200, message: '密码修改成功' });
  } catch (e) { res.json({ code: 500, message: '服务器错误' }); }
});

router.post('/logout', authMiddleware, async (req, res) => { res.json({ code: 200, message: '退出成功' }); });

module.exports = router;
