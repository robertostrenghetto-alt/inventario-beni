import { supabase } from '../supabase.js'
import { formatDate, formatCurrency, CATEGORIES, CATEGORY_LABELS, EVENT_TYPES, EVENT_TYPE_LABELS, showToast } from '../utils.js'
import { navigate } from '../main.js'

export async function renderReports(container) {
  const [{ data: items }, { data: events }] = await Promise.all([
    supabase.from('items').select('*').order('name'),
    supabase.from('events').select('*, items(name, category)').order('event_date', { ascending: false })
  ])

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">📋 Report & Export</span>
      </div>
      <div class="form-grid" style="margin-bottom:20px">
        <div class="form-group">
          <label>Bene</label>
          <select id="r-item">
            <option value="">Tutti i beni</option>
            ${(items || []).map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select id="r-category">
            <option value="">Tutte le categorie</option>
            ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Tipo evento</label>
          <select id="r-type">
            <option value="">Tutti i tipi</option>
            ${EVENT_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Stato</label>
          <select id="r-status">
            <option value="">Tutti</option>
            <option value="fatto">✅ Fatto</option>
            <option value="da_fare">⏳ Da fare</option>
            <option value="promemoria">🔔 Promemoria</option>
          </select>
        </div>
        <div class="form-group">
          <label>Data da</label>
          <input type="date" id="r-from">
        </div>
        <div class="form-group">
          <label>Data a</label>
          <input type="date" id="r-to">
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:24px;flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-filter">🔍 Filtra</button>
        <button class="btn btn-secondary" id="btn-export-csv">📥 Esporta CSV</button>
        <button class="btn btn-secondary" id="btn-print">🖨️ Stampa / PDF</button>
      </div>
      <div id="report-summary" style="margin-bottom:16px"></div>
      <div id="report-results"></div>
    </div>
  `

  let filtered = events || []

  function applyFilters() {
    const itemId = document.getElementById('r-item').value
    const cat = document.getElementById('r-category').value
    const type = document.getElementById('r-type').value
    const status = document.getElementById('r-status').value
    const from = document.getElementById('r-from').value
    const to = document.getElementById('r-to').value

    filtered = (events || []).filter(ev => {
      if (itemId && ev.item_id !== itemId) return false
      if (cat && ev.items?.category !== cat) return false
      if (type && ev.event_type !== type) return false
      if (status && ev.status !== status) return false
      if (from && ev.event_date < from) return false
      if (to && ev.event_date > to) return false
      return true
    })

    renderResults(filtered, items || [])
  }

  function renderResults(evs, allItems) {
    const totalCost = evs.reduce((s, e) => s + (e.cost || 0), 0)
    document.getElementById('report-summary').innerHTML = `
      <div style="display:flex;gap:20px;flex-wrap:wrap;padding:14px;background:var(--cream-dark);border-radius:8px;margin-bottom:16px">
        <div><span style="font-size:0.8rem;color:var(--text-light);text-transform:uppercase;letter-spacing:.05em">Eventi trovati</span><br>
          <strong style="font-size:1.3rem;font-family:'Fraunces',serif">${evs.length}</strong></div>
        <div><span style="font-size:0.8rem;color:var(--text-light);text-transform:uppercase;letter-spacing:.05em">Costo totale</span><br>
          <strong style="font-size:1.3rem;font-family:'Fraunces',serif;color:var(--terracotta)">${formatCurrency(totalCost)}</strong></div>
      </div>`

    if (evs.length === 0) {
      document.getElementById('report-results').innerHTML = `
        <div class="empty-state" style="padding:40px">
          <div class="empty-state-icon">🔍</div>
          <h3>Nessun risultato</h3>
          <p>Modifica i filtri per trovare eventi</p>
        </div>`
      return
    }

    document.getElementById('report-results').innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.875rem">
        <thead>
          <tr style="background:var(--cream-dark)">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-mid)">Data</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-mid)">Bene</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-mid)">Tipo</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-mid)">Descrizione</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:var(--text-mid)">Stato</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:var(--text-mid)">Costo</th>
          </tr>
        </thead>
        <tbody>
          ${evs.map((ev, i) => `
            <tr style="border-bottom:1px solid var(--cream-dark);${i%2===0?'background:var(--white)':'background:var(--cream)'}" 
                data-item-id="${ev.item_id}" style="cursor:pointer">
              <td style="padding:10px 12px;white-space:nowrap">${formatDate(ev.event_date)}</td>
              <td style="padding:10px 12px;font-weight:500">${ev.items?.name || '—'}</td>
              <td style="padding:10px 12px">${EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}</td>
              <td style="padding:10px 12px">${ev.description}</td>
              <td style="padding:10px 12px">${ev.status === 'fatto' ? '✅' : ev.status === 'promemoria' ? '🔔' : '⏳'} ${ev.status}</td>
              <td style="padding:10px 12px;text-align:right;font-weight:500">${ev.cost ? formatCurrency(ev.cost) : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`

    document.querySelectorAll('tr[data-item-id]').forEach(row => {
      row.style.cursor = 'pointer'
      row.addEventListener('click', () => navigate('detail', row.dataset.itemId))
    })
  }

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    if (filtered.length === 0) { showToast('Nessun dato da esportare', 'error'); return }
    const rows = [['Data', 'Bene', 'Tipo', 'Descrizione', 'Note', 'Stato', 'Costo']]
    filtered.forEach(ev => rows.push([
      formatDate(ev.event_date),
      ev.items?.name || '',
      EVENT_TYPE_LABELS[ev.event_type] || ev.event_type,
      ev.description,
      ev.notes || '',
      ev.status,
      ev.cost || ''
    ]))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventario-report.csv'; a.click()
    showToast('CSV esportato!')
  })

  document.getElementById('btn-print').addEventListener('click', () => window.print())
  document.getElementById('btn-filter').addEventListener('click', applyFilters)

  // Initial render
  renderResults(filtered, items || [])
}
