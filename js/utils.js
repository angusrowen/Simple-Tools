/* ============================================================
   AusCalc — Shared Utilities  /js/utils.js
   ============================================================ */

/* ── Number helpers ── */
const fmt  = v => '$' + Math.round(+v || 0).toLocaleString('en-AU');
const fmtC = v => '$' + (+v || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nv   = id => parseFloat(document.getElementById(id)?.value) || 0;
const sv   = id => document.getElementById(id)?.value || '';

/* ── DOM helpers ── */
const set  = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
const html = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML  = val; };
const show = (id, vis) => {
  const el = document.getElementById(id);
  if (el) el.style.display = vis === false ? 'none' : (vis === true ? '' : vis);
};

/* ── CSV download ── */
function dlCSV(rows, filename = 'export.csv') {
  if (!rows || rows.length === 0) return;
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ── Chart.js shared defaults ── */
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(26,29,39,.97)',
      borderColor: '#2e3347',
      borderWidth: 1,
      titleColor: '#8b90a0',
      bodyColor: '#e8eaf0',
      padding: 10,
      callbacks: {}
    }
  },
  scales: {
    x: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8b90a0', font: { size: 11 } } },
    y: { grid: { color: 'rgba(255,255,255,.05)' }, ticks: { color: '#8b90a0', font: { size: 11 }, callback: v => '$' + (+v).toLocaleString('en-AU') } }
  }
};

/* ── Collapsible sections ── */
function initCollapsibles() {
  document.querySelectorAll('.collapsible-header').forEach(btn => {
    btn.addEventListener('click', () => {
      const bodyId = btn.getAttribute('data-body');
      const body   = document.getElementById(bodyId);
      if (!body) return;
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      body.classList.toggle('collapsed', open);
    });
  });
}
