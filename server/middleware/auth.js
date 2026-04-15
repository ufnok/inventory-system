const jwt = require('jsonwebtoken');
const SECRET_KEY = 'inventory-system-secret-key-2024';
const TOKEN_EXPIRES = '8h';

function generateToken(user) {
  return jwt.sign({ id: user.id, username: user.username, roleId: user.roleId }, SECRET_KEY, { expiresIn: TOKEN_EXPIRES });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或Token已过期' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ code: 401, message: 'Token无效' });
  }
}

module.exports = { generateToken, authMiddleware };
