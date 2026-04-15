const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'db.json');

const initData = {
  category: [], product: [], supplier: [], customer: [], inventory: [],
  stock_in_order: [], stock_in_item: [], stock_out_order: [], stock_out_item: [],
  inventory_log: [], check_order: [], check_item: [], user: [], role: [],
  operation_log: [], sequence: [
    { prefix: 'SP', current_value: 0, date_value: '' },
    { prefix: 'GYS', current_value: 0, date_value: '' },
    { prefix: 'KH', current_value: 0, date_value: '' },
    { prefix: 'RK', current_value: 0, date_value: '' },
    { prefix: 'CK', current_value: 0, date_value: '' },
    { prefix: 'PD', current_value: 0, date_value: '' },
    { prefix: 'USR', current_value: 0, date_value: '' }
  ]
};

let data = null;

function loadDb() {
  if (data) return data;
  if (fs.existsSync(dbPath)) {
    try { data = JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
    catch { data = { ...initData }; }
  } else {
    data = JSON.parse(JSON.stringify(initData));
    data.role = [
      { id: 1, role_name: '管理员', role_code: 'admin', description: '系统管理员', status: 1, created_at: new Date().toISOString() },
      { id: 2, role_name: '仓库管理员', role_code: 'warehouse_admin', description: '仓库管理员', status: 1, created_at: new Date().toISOString() },
      { id: 3, role_name: '销售人员', role_code: 'sales', description: '销售人员', status: 1, created_at: new Date().toISOString() },
      { id: 4, role_name: '采购人员', role_code: 'purchaser', description: '采购人员', status: 1, created_at: new Date().toISOString() },
      { id: 5, role_name: '财务人员', role_code: 'finance', description: '财务人员', status: 1, created_at: new Date().toISOString() }
    ];
    data.user = [{ id: 'USR000001', username: 'admin', password: bcrypt.hashSync('admin123', 10), real_name: '系统管理员', role_id: 1, phone: '', email: '', status: 1, last_login: null, created_at: new Date().toISOString() }];
    saveDb();
  }
  return data;
}

function saveDb() {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getDb() {
  if (!data) loadDb();
  return data;
}

function query(sql) {
  const d = getDb();
  const m = {
    find: (table, filter) => {
      let rows = [...(d[table] || [])];
      if (filter) {
        if (typeof filter === 'function') rows = rows.filter(filter);
        else {
          for (const [key, val] of Object.entries(filter)) {
            rows = rows.filter(r => r[key] === val);
          }
        }
      }
      return rows;
    },
    findOne: (table, filter) => query.find(table, filter)[0] || null,
    insert: (table, row) => { if (!d[table]) d[table] = []; d[table].push(row); saveDb(); return row; },
    update: (table, filter, updates) => {
      const rows = query.find(table, filter);
      rows.forEach(r => Object.assign(r, updates));
      saveDb();
    },
    delete: (table, filter) => {
      const rows = query.find(table, filter);
      rows.forEach(r => { const idx = d[table].indexOf(r); if (idx > -1) d[table].splice(idx, 1); });
      saveDb();
    },
    count: (table, filter) => query.find(table, filter).length,
    max: (table, field) => { const rows = d[table] || []; return rows.length ? Math.max(...rows.map(r => r[field] || 0)) : 0; }
  };
  return m;
}

// 简单SQL解析器（支持最基本的查询）
function parseSql(sql) {
  const d = getDb();
  sql = sql.trim();
  
  // SELECT COUNT(*) as count FROM table
  let m = sql.match(/SELECT\s+COUNT\(\*\)\)\s+as\s+(\w+)\s+FROM\s+(\w+)/i);
  if (m) return { [m[1]]: (d[m[2]] || []).length };
  
  // SELECT * FROM table WHERE ... ORDER BY ... LIMIT
  m = sql.match(/SELECT\s+\*\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(DESC|ASC))?)?(?:\s+LIMIT\s+(\d+))?/i);
  if (m) {
    let rows = [...(d[m[1]] || [])];
    if (m[2]) {
      const conditions = m[2].split(/\s+AND\s+/i);
      conditions.forEach((cond, i) => {
        const likeMatch = cond.match(/(\w+)\s+LIKE\s+\?/i);
        const eqMatch = cond.match(/(\w+)\s+=\s+\?/i);
        const gtMatch = cond.match(/(\w+)\s+>\s+\?/i);
        const ltMatch = cond.match(/(\w+)\s+<\s+\?/i);
        const geMatch = cond.match(/(\w+)\s+>=\s+\?/i);
        const leMatch = cond.match(/(\w+)\s+<=\s+\?/i);
        const isnullMatch = cond.match(/(\w+)\s+IS\s+NULL/i);
        if (likeMatch) rows = rows.filter(r => String(r[likeMatch[1]] || '').includes(''));
        else if (eqMatch) rows = rows.filter(r => r[eqMatch[1]] == eqMatch[1]);
        else if (gtMatch) rows = rows.filter(r => r[gtMatch[1]] > gtMatch[1]);
        else if (ltMatch) rows = rows.filter(r => r[ltMatch[1]] < ltMatch[1]);
        else if (geMatch) rows = rows.filter(r => r[geMatch[1]] >= geMatch[1]);
        else if (leMatch) rows = rows.filter(r => r[leMatch[1]] <= leMatch[1]);
        else if (isnullMatch) rows = rows.filter(r => r[isnullMatch[1]] == null);
      });
    }
    if (m[3]) {
      rows.sort((a, b) => {
        const va = a[m[3]], vb = b[m[3]];
        const cmp = va > vb ? 1 : va < vb ? -1 : 0;
        return m[4] && m[4].toUpperCase() === 'DESC' ? -cmp : cmp;
      });
    }
    if (m[5]) rows = rows.slice(0, parseInt(m[5]));
    return rows;
  }
  
  return [];
}

const db = {
  prepare: (sql) => ({
    get: (...params) => {
      const result = parseSql(sql);
      if (Array.isArray(result)) return result[0] || null;
      return result;
    },
    all: (...params) => {
      const result = parseSql(sql);
      return Array.isArray(result) ? result : [result];
    },
    run: (...params) => {
      const d = getDb();
      // 简单INSERT/DELETE/UPDATE处理
      const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i);
      const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i);
      const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(\w+)\s*=\s*\?/i);
      
      if (insertMatch) {
        const fields = insertMatch[2].split(',').map(f => f.trim());
        const vals = params;
        const row = {};
        fields.forEach((f, i) => row[f] = vals[i]);
        if (!d[insertMatch[1]]) d[insertMatch[1]] = [];
        d[insertMatch[1]].push(row);
        saveDb();
      } else if (deleteMatch) {
        if (d[deleteMatch[1]]) {
          const before = d[deleteMatch[1]].length;
          d[deleteMatch[1]] = d[deleteMatch[1]].filter(r => r[deleteMatch[2]] != params[0]);
          saveDb();
          return { changes: before - d[deleteMatch[1]].length };
        }
      } else if (updateMatch) {
        const table = updateMatch[1];
        const setPart = updateMatch[2];
        const whereField = updateMatch[3];
        const setFields = setPart.split(',').map(s => s.trim().split('=')[0].map(x => x.trim()));
        const updateParams = params.slice(0, -1);
        const whereVal = params[params.length - 1];
        if (d[table]) {
          d[table].forEach(r => {
            if (r[whereField] == whereVal) {
              setFields.forEach(([key], i) => { r[key] = updateParams[i]; });
            }
          });
          saveDb();
        }
      }
      return { changes: 1 };
    }
  }),
  query,
  transaction: (fn) => { fn(); saveDb(); }
};

module.exports = { db, getDb, loadDb, saveDb };
