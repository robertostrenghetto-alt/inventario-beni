// ── TOAST ──
export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container')
  if (!container) return
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  container.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}

// ── DATE HELPERS ──
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatCurrency(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

export function daysUntil(dateStr) {
  if (!dateStr) return null
  const today = new Date(); today.setHours(0,0,0,0)
  const target = new Date(dateStr); target.setHours(0,0,0,0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

export function warrantyStatus(dateStr) {
  const days = daysUntil(dateStr)
  if (days === null) return null
  if (days < 0) return { label: 'Scaduta', cls: 'badge-danger' }
  if (days <= 30) return { label: `Scade tra ${days}gg`, cls: 'badge-warn' }
  if (days <= 90) return { label: `Scade tra ${days}gg`, cls: 'badge-warn' }
  return { label: `Garanzia OK`, cls: 'badge-ok' }
}

// ── CATEGORIES ──
export const CATEGORIES = [
  { value: 'elettrodomestici', label: '🏠 Elettrodomestici' },
  { value: 'elettronica', label: '📱 Elettronica' },
  { value: 'automobili', label: '🚗 Automobili' },
  { value: 'moto_scooter', label: '🛵 Moto & Scooter' },
  { value: 'biciclette', label: '🚲 Biciclette' },
  { value: 'impianti', label: '⚙️ Impianti' },
  { value: 'altro', label: '📦 Altro' }
]

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

export const EVENT_TYPES = [
  { value: 'manutenzione_programmata', label: '🔧 Manutenzione programmata', cls: 'badge-neutral' },
  { value: 'manutenzione_straordinaria', label: '🔨 Manutenzione straordinaria', cls: 'badge-warn' },
  { value: 'riparazione', label: '🛠️ Riparazione', cls: 'badge-danger' },
  { value: 'promemoria', label: '🔔 Promemoria', cls: 'badge-neutral' },
  { value: 'nota', label: '📝 Nota', cls: 'badge-neutral' }
]

export const EVENT_TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map(e => [e.value, e.label]))
export const EVENT_TYPE_CLS = Object.fromEntries(EVENT_TYPES.map(e => [e.value, e.cls]))

export const EVENT_STATUSES = [
  { value: 'fatto', label: '✅ Fatto' },
  { value: 'da_fare', label: '⏳ Da fare' },
  { value: 'promemoria', label: '🔔 Promemoria' }
]

// ── MODAL HELPER ──
export function showModal(html, onMount) {
  const container = document.getElementById('modal-container')
  container.innerHTML = `<div class="modal-overlay" id="modal-overlay">${html}</div>`
  const overlay = document.getElementById('modal-overlay')
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal() })
  if (onMount) onMount()
}

export function closeModal() {
  const container = document.getElementById('modal-container')
  container.innerHTML = ''
}
