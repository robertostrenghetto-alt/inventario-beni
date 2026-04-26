import { supabase } from '../supabase.js'
import { formatDate, daysUntil, CATEGORY_LABELS } from '../utils.js'
import { navigate } from '../main.js'

export async function renderDashboard(container) {
  // Load items and upcoming events
  const [{ data: items }, { data: events }] = await Promise.all([
    supabase.from('items').select('*').order('created_at', { ascending: false }),
    supabase.from('events').select('*, items(name, category)').eq('status', 'da_fare').order('event_date', { ascending: true })
  ])

  const allItems = items || []
  const allEvents = events || []

  // Build alerts: warranty expiring + upcoming events
  const alerts = []

  allItems.forEach(item => {
    if (!item.warranty_expiry) return
    const days = daysUntil(item.warranty_expiry)
    if (days !== null && days <= 90 && days >= 0) {
      alerts.push({ type: 'warn', icon: '🛡️', text: `<strong>${item.name}</strong> — garanzia scade tra <strong>${days} giorni</strong>`, itemId: item.id })
    } else if (days !== null && days < 0) {
      alerts.push({ type: 'danger', icon: '⚠️', text: `<strong>${item.name}</strong> — garanzia <strong>scaduta</strong>`, itemId: item.id })
    }
  })

  allEvents.slice(0, 10).forEach(ev => {
    const days = daysUntil(ev.event_date)
    if (days !== null && days <= 30) {
      const icon = days < 0 ? '🔴' : days <= 7 ? '🟠' : '🟡'
      const when = days < 0 ? `${Math.abs(days)} giorni fa` : days === 0 ? 'oggi' : `tra ${days} giorni`
      alerts.push({ type: days < 0 ? 'danger' : 'warn', icon, text: `<strong>${ev.items?.name || '—'}</strong> — ${ev.description} (${when})`, itemId: ev.item_id })
    }
  })

  // Stats
  const byCategory = {}
  allItems.forEach(i => { byCategory[i.category] = (byCategory[i.category] || 0) + 1 })

  container.innerHTML = `
    ${alerts.length > 0 ? `
    <div class="alerts-section">
      <div class="section-title">⚠️ Avvisi e Promemoria</div>
      ${alerts.map(a => `
        <div class="alert-item ${a.type}">
          <span class="alert-icon">${a.icon}</span>
          <span class="alert-text">${a.text}</span>
          <span class="alert-link" data-item-id="${a.itemId}">Vedi →</span>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-header">
        <span class="card-title">Riepilogo Beni</span>
        <button class="btn btn-secondary btn-sm" id="btn-go-items">Vedi tutti →</button>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Totale beni</div>
          <div class="info-value" style="font-size:1.8rem;font-family:'Fraunces',serif;color:var(--terracotta)">${allItems.length}</div>
        </div>
        ${Object.entries(byCategory).map(([cat, count]) => `
          <div class="info-item">
            <div class="info-label">${CATEGORY_LABELS[cat] || cat}</div>
            <div class="info-value" style="font-size:1.4rem;font-family:'Fraunces',serif">${count}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Prossimi eventi</span>
      </div>
      ${allEvents.length === 0 ? `
        <div class="empty-state" style="padding:30px">
          <div class="empty-state-icon">📅</div>
          <p>Nessun evento in programma</p>
        </div>` : `
        <div class="events-list">
          ${allEvents.slice(0, 8).map(ev => {
            const days = daysUntil(ev.event_date)
            const when = days === null ? '' : days < 0 ? `${Math.abs(days)}gg fa` : days === 0 ? 'oggi' : `tra ${days}gg`
            return `
            <div class="event-item todo" style="cursor:pointer" data-item-id="${ev.item_id}">
              <div class="event-date">${formatDate(ev.event_date)}<br><small style="color:var(--terracotta)">${when}</small></div>
              <div class="event-body">
                <div class="event-type" style="color:var(--text-light)">${ev.items?.name || '—'}</div>
                <div class="event-desc">${ev.description}</div>
              </div>
              ${ev.cost ? `<div class="event-cost">${new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(ev.cost)}</div>` : ''}
            </div>`
          }).join('')}
        </div>`}
    </div>
  `

  // Event listeners
  container.querySelectorAll('[data-item-id]').forEach(el => {
    el.addEventListener('click', () => navigate('detail', el.dataset.itemId))
  })
  document.getElementById('btn-go-items')?.addEventListener('click', () => navigate('items'))
}
