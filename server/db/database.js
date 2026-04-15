const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const dbPath = path.join(__dirname, 'data.json');
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { tables: {} });

async function initDatabase() {
  await db.read();
  
  if (!db.data) db.data = { tables: {} };
  if (!db.data.tables) db.data.tables = {};
  
  const tables = ['category', 'product', 'supplier', 'customer', 'inventory', 'stockInOrder', 'stockInItem', 'stockOutOrder', 'stockOutItem', 'inventoryLog', 'checkOrder', 'checkItem', 'user', 'role', 'operationLog', 'sequence'];
  tables.forEach(t => { if (!db.data.tables[t]) db.data.tables[t] = []; });
  
  if (db.data.tables.role.length === 0) {
    db.data.tables.role = [
      { id: 1, roleName: '管理员', roleCode: 'admin', description: '系统管理员，拥有全部权限', status: 1, createdAt: new Date().toISOString() },
      { id: 2, roleName: '仓库管理员', roleCode: 'warehouse_admin', description: '仓库管理员，负责出入库和库存管理', status: 1, createdAt: new Date().toISOString() },
      { id: 3, roleName: '销售人员', roleCode: 'sales', description: '销售人员，负责销售出库', status: 1, createdAt: new Date().toISOString() },
      { id: 4, roleName: '采购人员', roleCode: 'purchaser', description: '采购人员，负责采购入库', status: 1, createdAt: new Date().toISOString() },
      { id: 5, roleName: '财务人员', roleCode: 'finance', description: '财务人员，负责报表查看', status: 1, createdAt: new Date().toISOString() }
    ];
  }
  
  if (db.data.tables.user.length === 0) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.data.tables.user = [{ id: 'USR000001', username: 'admin', password: hashedPassword, realName: '系统管理员', roleId: 1, phone: '', email: '', status: 1, lastLogin: null, createdAt: new Date().toISOString() }];
  }
  
  if (db.data.tables.sequence.length === 0) {
    db.data.tables.sequence = [
      { prefix: 'SP', currentValue: 0, dateValue: '' },
      { prefix: 'GYS', currentValue: 0, dateValue: '' },
      { prefix: 'KH', currentValue: 0, dateValue: '' },
      { prefix: 'RK', currentValue: 0, dateValue: '' },
      { prefix: 'CK', currentValue: 0, dateValue: '' },
      { prefix: 'PD', currentValue: 0, dateValue: '' },
      { prefix: 'USR', currentValue: 0, dateValue: '' }
    ];
  }
  
  await db.write();
  console.log('数据库初始化完成');
}

module.exports = { db, initDatabase };
