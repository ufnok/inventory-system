const { db } = require('../db/database');

function generateSequence(prefix) {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const todayPrefix = today.slice(2);
  
  const seq = db.data.tables.sequence.find(s => s.prefix === prefix);
  let newValue;
  
  if (!seq) {
    db.data.tables.sequence.push({ prefix, currentValue: 1, dateValue: today });
    newValue = 1;
  } else if (seq.dateValue !== today) {
    seq.currentValue = 1;
    seq.dateValue = today;
    newValue = 1;
  } else {
    seq.currentValue += 1;
    newValue = seq.currentValue;
  }
  
  if (['RK', 'CK', 'PD'].includes(prefix)) {
    return `${prefix}${todayPrefix}${String(newValue).padStart(3, '0')}`;
  } else {
    return `${prefix}${String(newValue).padStart(6, '0')}`;
  }
}

module.exports = { generateSequence };
