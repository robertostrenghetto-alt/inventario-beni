import { supabase } from '../supabase.js'
import { CATEGORIES, CATEGORY_LABELS, warrantyStatus, formatDate, formatCurrency } from '../utils.js'
import { navigate } from '../main.js'

export async function renderItems(container) {
  const { data: items, error } = await supabase.from('items').select('*').order('name')

  if (error) throw error

  container.innerHTML = `
    <div class="filters-bar">
      <input type="search" class="search-input" id="search-input" placeholder="Cerca per nome, marca, modello..." style="flex:1;min-width:200px">
      <select id="filter-category" style="min-width:180px">
        <option value="">Tutte le categorie</option>
        ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
      </select>
    </div>
    <div class="items-grid" id="items-grid"></div>
  `

  renderGrid(items || [])

  document.getElementById('search-input').addEventListener('input', () => filterItems(items || []))
  document.getElementById('filter-category').addEventListener('change', () => filterItems(items || []))
}

function filterItems(items) {
  const q = document.getElementById('search-input').value.toLowerCase()
  const cat = document.getElementById('filter-category').value
  const filtered = items.filter(i => {
    const matchQ = !q || [i.name, i.brand, i.model, i.location, i.serial_number].some(f => f?.toLowerCase().includes(q))
    const matchCat = !cat || i.category === cat
    return matchQ && matchCat
  })
  renderGrid(filtered)
}

function renderGrid(items) {
  const grid = document.getElementById('items-grid')
  if (!grid) return

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📦</div>
        <h3>Nessun bene trovato</h3>
        <p>Aggiungi il tuo primo bene con il pulsante in alto</p>
      </div>`
    return
  }

  grid.innerHTML = items.map(item => {
    const ws = warrantyStatus(item.warranty_expiry)
    return `
    <div class="item-card" data-id="${item.id}">
      <div class="item-card-category">${CATEGORY_LABELS[item.category] || item.category}</div>
      <div class="item-card-name">${item.name}</div>
      <div class="item-card-sub">${[item.brand, item.model].filter(Boolean).join(' — ') || '&nbsp;'}</div>
      <div class="item-card-sub" style="font-size:0.8rem">📍 ${item.location || '—'}</div>
      <div class="item-card-badges" style="margin-top:10px">
        ${ws ? `<span class="badge ${ws.cls}">${ws.label}</span>` : ''}
        ${item.purchase_date ? `<span class="badge badge-neutral">🛒 ${formatDate(item.purchase_date)}</span>` : ''}
        ${item.purchase_price ? `<span class="badge badge-neutral">💶 ${formatCurrency(item.purchase_price)}</span>` : ''}
      </div>
    </div>`
  }).join('')

  grid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => navigate('detail', card.dataset.id))
  })
}
