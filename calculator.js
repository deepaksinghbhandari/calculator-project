// Deepak Calculator - external JS (save as calculator.js)
/* Minimal comments added for clarity */

const expressionEl = document.getElementById('expression');
const resultEl = document.getElementById('result');
const historyEl = document.getElementById('history');
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

let expr = '';
let memory = Number(localStorage.getItem('calc_memory') || 0);
let history = JSON.parse(localStorage.getItem('calc_history') || '[]');

document.getElementById('memoryVal').textContent = memory;

// restore theme (optional)
const savedTheme = localStorage.getItem('calc_theme');
if (savedTheme === 'dark') {
  themeToggle.checked = true;
  body.setAttribute('data-theme', 'dark');
}

renderExpression();
renderHistory();

// sanitize: disallow dangerous punctuation; allow digits, ops, parentheses, dot, spaces, percent and letters used for Math/sqrt
function sanitizeForEval(s) {
  if (/[\;\{\}\[\]`]/.test(s)) throw new Error('Invalid characters');
  const allowed = /^[-+\*\/\(\)\.\s0-9%Mathqrt]*$/; // safe char whitelist
  if (!allowed.test(s)) throw new Error('Invalid characters');
  return s;
}

// Improved evaluate: handles %, sqrt, common unicode ops, and then evaluates.
// Percent handling: converts `50%` => `(50/100)` and `(... )%` => `(...)/100`
function evaluateExpression(input) {
  let s = String(input);
  s = s.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');

  // Convert percent after parentheses first: ')%' => ')/100'
  s = s.replace(/\)\%/g, ')/100');

  // Convert simple number% => (number/100)
  s = s.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // Allow using a friendly token 'sqrt(' in expression and convert to Math.sqrt
  s = s.replace(/sqrt\(/g, 'Math.sqrt(');

  // Basic sanitize
  sanitizeForEval(s);

  if (!s.trim()) return 0;

  try {
    const value = Function('return (' + s + ')')(); // local-only evaluation
    if (typeof value === 'number' && !isFinite(value)) throw new Error('Math error');
    return value;
  } catch (e) {
    throw new Error('Syntax error');
  }
}

function renderExpression() {
  expressionEl.textContent = expr || '\u00A0';
  try {
    const val = evaluateExpression(expr);
    resultEl.textContent = String(val);
  } catch (e) {
    resultEl.textContent = 'Error';
  }
}

function pushToHistory(exp, val) {
  const item = { exp, val, at: new Date().toISOString() };
  history.unshift(item);
  history = history.slice(0, 100);
  localStorage.setItem('calc_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  historyEl.innerHTML = '';
  if (history.length === 0) {
    historyEl.innerHTML = '<div class="small-muted">No history yet</div>';
    return;
  }
  history.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = 'history-item d-flex justify-content-between align-items-center';
    div.innerHTML = `<div><div class="small-muted">${new Date(h.at).toLocaleString()}</div><div>${escapeHtml(h.exp)} = <strong>${h.val}</strong></div></div><div class="ms-2"><button class="btn btn-sm btn-outline-secondary" data-index="${i}">Use</button></div>`;
    historyEl.appendChild(div);
  });
  historyEl.querySelectorAll('button[data-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.index);
      if (history[i]) {
        expr = String(history[i].exp);
        renderExpression();
      }
    });
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ---------- UI handlers ---------- */
document.querySelectorAll('[data-value]').forEach(btn => {
  btn.addEventListener('click', () => { expr += btn.dataset.value; renderExpression(); });
});
document.querySelectorAll('[data-action]').forEach(btn => {
  btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    if (a === 'percent') expr += '%';
    if (a === 'sqrt') expr += 'sqrt('; // friendly token replaced before eval
    if (a === 'paren') {
      const open = (expr.match(/\(/g) || []).length;
      const close = (expr.match(/\)/g) || []).length;
      expr += (open === close) ? '(' : ')';
    }
    renderExpression();
  });
});

document.getElementById('equals').addEventListener('click', () => {
  try {
    const val = evaluateExpression(expr);
    pushToHistory(expr, val);
    expr = String(val);
    renderExpression();
  } catch (e) {
    resultEl.textContent = e.message;
  }
});

document.getElementById('allClear').addEventListener('click', () => { expr = ''; renderExpression(); });
document.getElementById('clearAll').addEventListener('click', () => {
  expr = '';
  history = [];
  localStorage.removeItem('calc_history');
  renderExpression();
  renderHistory();
});
document.getElementById('backspace').addEventListener('click', () => { expr = expr.slice(0, -1); renderExpression(); });
document.getElementById('plusMinus').addEventListener('click', () => {
  if (!expr) return;
  expr = expr.replace(/(-?\d+(\.\d+)?)$/, m => (m.startsWith('-') ? m.slice(1) : '(-' + m + ')'));
  renderExpression();
});

/* Memory */
document.getElementById('memClear').addEventListener('click', () => {
  memory = 0; localStorage.setItem('calc_memory', memory); document.getElementById('memoryVal').textContent = memory;
});
document.getElementById('memRecall').addEventListener('click', () => { expr += String(memory); renderExpression(); });
document.getElementById('memPlus').addEventListener('click', () => {
  try {
    const v = evaluateExpression(expr || '0');
    memory = Number((memory + Number(v)).toFixed(12));
    localStorage.setItem('calc_memory', memory);
    document.getElementById('memoryVal').textContent = memory;
  } catch (e) { resultEl.textContent = 'Error'; }
});
document.getElementById('memMinus').addEventListener('click', () => {
  try {
    const v = evaluateExpression(expr || '0');
    memory = Number((memory - Number(v)).toFixed(12));
    localStorage.setItem('calc_memory', memory);
    document.getElementById('memoryVal').textContent = memory;
  } catch (e) { resultEl.textContent = 'Error'; }
});

/* History controls */
document.getElementById('clearHistory').addEventListener('click', () => { history = []; localStorage.removeItem('calc_history'); renderHistory(); });
document.getElementById('exportHistory').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'calc_history.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
});

/* Keyboard support */
window.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') { expr += e.key; renderExpression(); return; }
  if (['+', '-', '*', '/', '.', '(', ')'].includes(e.key)) { expr += e.key; renderExpression(); return; }
  if (e.key === 'Enter') { document.getElementById('equals').click(); return; }
  if (e.key === 'Backspace') { document.getElementById('backspace').click(); return; }
  if (e.key === '%') { expr += '%'; renderExpression(); return; }
  if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) { /* optional: 's' for sqrt */ expr += 'sqrt('; renderExpression(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { navigator.clipboard && navigator.clipboard.writeText(resultEl.textContent); }
});

/* Theme toggle */
themeToggle.addEventListener('change', () => {
  const theme = themeToggle.checked ? 'dark' : 'light';
  body.setAttribute('data-theme', theme);
  localStorage.setItem('calc_theme', theme);
});
