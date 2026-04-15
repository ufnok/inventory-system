const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');
let data = {};

function now() { return new Date().toISOString(); }

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } else {
      initDefaultData();
      save();
    }
  } catch (e) {
    initDefaultData();
  }
}

function save() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function initDefaultData() {
  const bcrypt = require('bcryptjs');
  data = {
    sequence: { SP: { v: 0, d: '' }, GYS: { v: 0, d: '' }, KH: { v: 0, d: '' }, RK: { v: 0, d: '' }, CK: { v: 0, d: '' }, PD: { v: 0, d: '' }, USR: { v: 0, d: '' } },
    role: [
      { id: 1, role_name: '管理员', role_code: 'admin', description: '系统管理员', status: 1, created_at: now() },
      { id: 2, role_name: '仓库管理员', role_code: 'warehouse_admin', description: '仓库管理员', status: 1, created_at: now() },
      { id: 3, role_name: '销售人员', role_code: 'sales', description: '销售人员', status: 1, created_at: now() },
      { id: 4, role_name: '采购人员', role_code: 'purchaser', description: '采购人员', status: 1, created_at: now() },
      { id: 5, role_name: '财务人员', role_code: 'finance', description: '财务人员', status: 1, created_at: now() }
    ],
    user: [{ id: 'USR000001', username: 'admin', password: bcrypt.hashSync('admin123', 10), real_name: '系统管理员', role_id: 1, phone: '', email: '', status: 1, last_login: null, created_at: now() }],
    category: [], product: [], supplier: [], customer: [], inventory: [],
    stock_in_order: [], stock_in_item: [], stock_out_order: [], stock_out_item: [],
    inventory_log: [], check_order: [], check_item: [], operation_log: []
  };
}

const db = {
  findOne: (t, q) => (data[t] || []).find(i => Object.entries(q).every(([k, v]) => i[k] === v)) || null,
  find: (t, q = {}) => (data[t] || []).filter(i => Object.entries(q).every(([k, v]) => i[k] === v)),
  insert: (t, item) => { if (!data[t]) data[t] = []; data[t].push(item); save(); return item; },
  update: (t, q, u) => { const arr = data[t] || []; let cnt = 0; arr.forEach((i, idx) => { if (Object.entries(q).every(([k, v]) => i[k] === v)) { Object.assign(arr[idx], u, { updated_at: now() }); cnt++; } }); if (cnt > 0) save(); return cnt; },
  delete: (t, q) => { const arr = data[t] || []; const before = arr.length; data[t] = arr.filter(i => !Object.entries(q).every(([k, v]) => i[k] === v)); if (data[t].length < before) save(); return before - data[t].length; },
  count: (t, q = {}) => db.find(t, q).length,
  nextId: (prefix) => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const short = today.slice(2);
    const seq = data.sequence[prefix] || { v: 0, d: '' };
    if (seq.d !== today) { seq.v = 0; seq.d = today; }
    seq.v++;
    data.sequence[prefix] = seq;
    save();
    return ['RK', 'CK', 'PD'].includes(prefix) ? `${prefix}${short}${String(seq.v).padStart(3, '0')}` : `${prefix}${String(seq.v).padStart(6, '0')}`;
  },
  save, data
};

// 自动加载数据
load();

module.exports = { db, load, now };
