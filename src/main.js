import './style.css'
import { supabase } from './supabase.js'
import { renderDashboard } from './views/dashboard.js'
import { renderItems } from './views/items.js'
import { renderItemDetail } from './views/itemDetail.js'
import { renderReports } from './views/reports.js'
import { showToast } from './utils.js'

// ── STATE ──
export const state = {
  currentView: 'dashboard',
  currentItemId: null,
  items: [],
  events: [],
  attachments: []
}

// ── ROUTER ──
export async function navigate(view, itemId = null) {
  state.currentView = view
  state.currentItemId = itemId
  updateNavTabs()
  await renderView()
}

function updateNavTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === state.currentView ||
      (state.currentView === 'detail' && tab.dataset.view === 'items'))
  })
}

async function renderView() {
  const main = document.getElementById('main-content')
  main.innerHTML = '<div class="loading"><div class="spinner"></div> Caricamento...</div>'
  try {
    switch (state.currentView) {
      case 'dashboard': await renderDashboard(main); break
      case 'items':     await renderItems(main); break
      case 'detail':    await renderItemDetail(main, state.currentItemId); break
      case 'reports':   await renderReports(main); break
      default:          await renderDashboard(main)
    }
  } catch (err) {
    console.error(err)
    main.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Errore caricamento</h3><p>${err.message}</p></div>`
  }
}

// ── INIT ──
function init() {
  document.getElementById('app').innerHTML = `
    <header>
      <h1>🏠 Inventario Beni di Casa</h1>
      <div class="header-actions">
        <button class="btn btn-primary btn-sm" id="btn-add-item">+ Aggiungi Bene</button>
      </div>
    </header>
    <nav class="nav-tabs">
      <button class="nav-tab active" data-view="dashboard">📊 Dashboard</button>
      <button class="nav-tab" data-view="items">📦 Beni</button>
      <button class="nav-tab" data-view="reports">📋 Report</button>
    </nav>
    <main>
      <div id="main-content"></div>
    </main>
    <div class="toast-container" id="toast-container"></div>
    <div id="modal-container"></div>
  `

  // Nav clicks
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigate(tab.dataset.view))
  })

  // Add item button
  document.getElementById('btn-add-item').addEventListener('click', () => {
    import('./views/itemForm.js').then(m => m.showItemForm())
  })

  navigate('dashboard')
}

init()
