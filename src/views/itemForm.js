import { supabase } from '../supabase.js'
import { showModal, closeModal, showToast, CATEGORIES } from '../utils.js'

export function showItemForm(existing = null, onSave = null) {
  const isEdit = !!existing

  showModal(`
    <div class="modal" style="max-width:700px">
      <div class="modal-header">
        <span class="modal-title">${isEdit ? '✏️ Modifica bene' : '🏠 Aggiungi nuovo bene'}</span>
        <button class="btn-icon" id="modal-close">✕</button>
      </div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Nome *</label>
          <input type="text" id="item-name" placeholder="Es: Lavatrice Samsung, iPhone 14, Fiat 500..." value="${existing?.name || ''}">
        </div>
        <div class="form-group">
          <label>Categoria *</label>
          <select id="item-category">
            ${CATEGORIES.map(c => `<option value="${c.value}" ${existing?.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Ubicazione</label>
          <input type="text" id="item-location" placeholder="Es: Cucina, Garage, Bagno..." value="${existing?.location || ''}">
        </div>
        <div class="form-group">
          <label>Marca</label>
          <input type="text" id="item-brand" placeholder="Es: Samsung, Apple, Fiat..." value="${existing?.brand || ''}">
        </div>
        <div class="form-group">
          <label>Modello</label>
          <input type="text" id="item-model" placeholder="Es: WW90T534DAE, iPhone 14 Pro..." value="${existing?.model || ''}">
        </div>
        <div class="form-group">
          <label>Numero seriale</label>
          <input type="text" id="item-serial" placeholder="Numero seriale o targa..." value="${existing?.serial_number || ''}">
        </div>
        <div class="form-group">
          <label>Data acquisto</label>
          <input type="date" id="item-purchase-date" value="${existing?.purchase_date?.slice(0,10) || ''}">
        </div>
        <div class="form-group">
          <label>Prezzo acquisto (€)</label>
          <input type="number" id="item-price" step="0.01" placeholder="0.00" value="${existing?.purchase_price || ''}">
        </div>
        <div class="form-group">
          <label>Garanzia fino al</label>
          <input type="date" id="item-warranty" value="${existing?.warranty_expiry?.slice(0,10) || ''}">
        </div>
        <div class="form-group full">
          <label>Note e suggerimenti</label>
          <textarea id="item-notes" placeholder="Note, suggerimenti, informazioni utili...">${existing?.notes || ''}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="modal-cancel">Annulla</button>
        <button class="btn btn-primary" id="modal-save">💾 Salva</button>
      </div>
    </div>
  `, () => {
    document.getElementById('modal-close').addEventListener('click', closeModal)
    document.getElementById('modal-cancel').addEventListener('click', closeModal)
    document.getElementById('modal-save').addEventListener('click', async () => {
      const name = document.getElementById('item-name').value.trim()
      if (!name) { showToast('Inserisci il nome del bene', 'error'); return }

      const payload = {
        name,
        category: document.getElementById('item-category').value,
        location: document.getElementById('item-location').value.trim() || null,
        brand: document.getElementById('item-brand').value.trim() || null,
        model: document.getElementById('item-model').value.trim() || null,
        serial_number: document.getElementById('item-serial').value.trim() || null,
        purchase_date: document.getElementById('item-purchase-date').value || null,
        purchase_price: parseFloat(document.getElementById('item-price').value) || null,
        warranty_expiry: document.getElementById('item-warranty').value || null,
        notes: document.getElementById('item-notes').value.trim() || null
      }

      const { error } = isEdit
        ? await supabase.from('items').update(payload).eq('id', existing.id)
        : await supabase.from('items').insert(payload)

      if (error) { showToast('Errore: ' + error.message, 'error'); return }

      showToast(isEdit ? 'Bene aggiornato!' : 'Bene aggiunto!')
      closeModal()
      if (onSave) {
        onSave()
      } else {
        import('../main.js').then(m => m.navigate('items'))
      }
    })
  })
}
