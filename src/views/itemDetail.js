import { supabase } from '../supabase.js'
import { formatDate, formatCurrency, warrantyStatus, CATEGORY_LABELS, EVENT_TYPE_LABELS, EVENT_TYPE_CLS, showModal, closeModal, showToast } from '../utils.js'
import { navigate } from '../main.js'

export async function renderItemDetail(container, itemId) {
  const [{ data: item }, { data: events }, { data: attachments }, { data: contacts }] = await Promise.all([
    supabase.from('items').select('*').eq('id', itemId).single(),
    supabase.from('events').select('*').eq('item_id', itemId).order('event_date', { ascending: false }),
    supabase.from('attachments').select('*').eq('item_id', itemId),
    supabase.from('contacts').select('*').eq('item_id', itemId).order('created_at')
  ])

  if (!item) { container.innerHTML = '<div class="empty-state"><h3>Bene non trovato</h3></div>'; return }

  const ws = warrantyStatus(item.warranty_expiry)

  container.innerHTML = `
    <div style="margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" id="btn-back">← Torna ai beni</button>
    </div>

    <div class="card">
      <div class="detail-header">
        <div class="detail-header-info">
          <div class="detail-category">${CATEGORY_LABELS[item.category] || item.category}</div>
          <div class="detail-name">${item.name}</div>
          <div class="detail-sub">${[item.brand, item.model].filter(Boolean).join(' — ') || ''}</div>
          ${ws ? `<div style="margin-top:8px"><span class="badge ${ws.cls}">${ws.label}</span></div>` : ''}
        </div>
        <div class="detail-actions">
          <button class="btn btn-secondary btn-sm" id="btn-edit-item">✏️ Modifica</button>
          <button class="btn btn-danger btn-sm" id="btn-delete-item">🗑️ Elimina</button>
        </div>
      </div>

      <div class="info-grid">
        ${infoRow('📍 Ubicazione', item.location)}
        ${infoRow('🛒 Data acquisto', formatDate(item.purchase_date))}
        ${infoRow('💶 Prezzo', formatCurrency(item.purchase_price))}
        ${infoRow('🛡️ Garanzia fino al', formatDate(item.warranty_expiry))}
        ${infoRow('🔢 N° seriale', item.serial_number)}
        ${infoRow('🏷️ Marca', item.brand)}
        ${infoRow('📋 Modello', item.model)}
      </div>

      ${item.notes ? `
        <div style="margin-top:16px">
          <div class="info-label">📝 Note</div>
          <div style="margin-top:6px;padding:12px;background:var(--cream);border-radius:8px;font-size:0.9rem;line-height:1.6">${item.notes}</div>
        </div>` : ''}
    </div>

    <!-- CONTATTI -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📞 Contatti</span>
        <button class="btn btn-primary btn-sm" id="btn-add-contact">+ Aggiungi contatto</button>
      </div>
      <div id="contacts-container">
        ${renderContactsList(contacts || [])}
      </div>
    </div>

    <!-- EVENTI -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📅 Registro eventi</span>
        <button class="btn btn-primary btn-sm" id="btn-add-event">+ Aggiungi evento</button>
      </div>
      <div id="events-container">
        ${renderEventsList(events || [])}
      </div>
    </div>

    <!-- ALLEGATI -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">📎 Documenti allegati</span>
        <button class="btn btn-secondary btn-sm" id="btn-add-attachment">+ Allega PDF</button>
      </div>
      <div id="attachments-container">
        ${renderAttachmentsList(attachments || [])}
      </div>
    </div>
  `

  document.getElementById('btn-back').addEventListener('click', () => navigate('items'))
  document.getElementById('btn-edit-item').addEventListener('click', () => {
    import('./itemForm.js').then(m => m.showItemForm(item, () => navigate('detail', itemId)))
  })
  document.getElementById('btn-delete-item').addEventListener('click', () => confirmDeleteItem(item, itemId))
  document.getElementById('btn-add-event').addEventListener('click', () => showEventForm(itemId, null, () => navigate('detail', itemId)))
  document.getElementById('btn-add-contact').addEventListener('click', () => showContactForm(itemId, null, () => navigate('detail', itemId)))

  container.querySelectorAll('[data-edit-contact]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const ct = (contacts || []).find(x => x.id === btn.dataset.editContact)
      if (ct) showContactForm(itemId, ct, () => navigate('detail', itemId))
    })
  })
  container.querySelectorAll('[data-delete-contact]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      confirmDeleteContact(btn.dataset.deleteContact, () => navigate('detail', itemId))
    })
  })
  container.querySelectorAll('[data-edit-event]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      const ev = (events || []).find(x => x.id === btn.dataset.editEvent)
      if (ev) showEventForm(itemId, ev, () => navigate('detail', itemId))
    })
  })
  container.querySelectorAll('[data-delete-event]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      confirmDeleteEvent(btn.dataset.deleteEvent, () => navigate('detail', itemId))
    })
  })
  document.getElementById('btn-add-attachment').addEventListener('click', () => showAttachmentUpload(itemId, () => navigate('detail', itemId)))
  container.querySelectorAll('[data-delete-attachment]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      confirmDeleteAttachment(btn.dataset.deleteAttachment, btn.dataset.path, () => navigate('detail', itemId))
    })
  })
}

function infoRow(label, value) {
  if (!value || value === '—') return ''
  return `<div class="info-item"><div class="info-label">${label}</div><div class="info-value">${value}</div></div>`
}

const CONTACT_TYPE_LABELS = {
  assistenza: '🔧 Assistenza',
  rivenditore: '🏪 Rivenditore',
  tecnico: '👷 Tecnico',
  garanzia: '🛡️ Garanzia',
  emergenza: '🚨 Emergenza',
  altro: '📋 Altro'
}

function renderContactsList(contacts) {
  if (contacts.length === 0) return `
    <div class="empty-state" style="padding:30px">
      <div class="empty-state-icon">📞</div>
      <p>Nessun contatto registrato</p>
    </div>`

  return `<div style="display:flex;flex-direction:column;gap:10px">${contacts.map(ct => `
    <div style="padding:14px 16px;background:var(--cream);border-radius:8px;border-left:3px solid var(--terracotta)">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-weight:600;font-size:0.95rem">${ct.name}</span>
            <span class="badge badge-neutral" style="font-size:0.7rem">${CONTACT_TYPE_LABELS[ct.type] || ct.type}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:3px">
            ${ct.phone ? `<div style="font-size:0.875rem">📱 <a href="tel:${ct.phone}" style="color:var(--terracotta);text-decoration:none;font-weight:500">${ct.phone}</a></div>` : ''}
            ${ct.email ? `<div style="font-size:0.875rem">✉️ <a href="mailto:${ct.email}" style="color:var(--terracotta);text-decoration:none">${ct.email}</a></div>` : ''}
            ${ct.address ? `<div style="font-size:0.875rem">📍 ${ct.address}</div>` : ''}
            ${ct.notes ? `<div style="font-size:0.8rem;color:var(--text-light);margin-top:4px">📝 ${ct.notes}</div>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn-icon" data-edit-contact="${ct.id}" title="Modifica">✏️</button>
          <button class="btn-icon" data-delete-contact="${ct.id}" title="Elimina">🗑️</button>
        </div>
      </div>
    </div>`).join('')}</div>`
}

export function showContactForm(itemId, existing, onSave) {
  const isEdit = !!existing
  import('../utils.js').then(({ showModal, closeModal, showToast }) => {
    showModal(`
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${isEdit ? '✏️ Modifica contatto' : '+ Nuovo contatto'}</span>
          <button class="btn-icon" id="modal-close">✕</button>
        </div>
        <div class="form-grid">
          <div class="form-group full">
            <label>Nome / Ragione sociale *</label>
            <input type="text" id="ct-name" placeholder="Es: Assistenza Samsung, Mario Rossi Tecnico..." value="${existing?.name || ''}">
          </div>
          <div class="form-group">
            <label>Tipo contatto</label>
            <select id="ct-type">
              <option value="assistenza" ${existing?.type === 'assistenza' ? 'selected' : ''}>🔧 Assistenza</option>
              <option value="rivenditore" ${existing?.type === 'rivenditore' ? 'selected' : ''}>🏪 Rivenditore</option>
              <option value="tecnico" ${existing?.type === 'tecnico' ? 'selected' : ''}>👷 Tecnico</option>
              <option value="garanzia" ${existing?.type === 'garanzia' ? 'selected' : ''}>🛡️ Garanzia</option>
              <option value="emergenza" ${existing?.type === 'emergenza' ? 'selected' : ''}>🚨 Emergenza</option>
              <option value="altro" ${existing?.type === 'altro' ? 'selected' : ''}>📋 Altro</option>
            </select>
          </div>
          <div class="form-group">
            <label>Telefono</label>
            <input type="tel" id="ct-phone" placeholder="Es: 049 1234567" value="${existing?.phone || ''}">
          </div>
          <div class="form-group full">
            <label>Email</label>
            <input type="email" id="ct-email" placeholder="Es: assistenza@samsung.com" value="${existing?.email || ''}">
          </div>
          <div class="form-group full">
            <label>Indirizzo</label>
            <input type="text" id="ct-address" placeholder="Es: Via Roma 1, Chioggia (VE)" value="${existing?.address || ''}">
          </div>
          <div class="form-group full">
            <label>Note</label>
            <textarea id="ct-notes" placeholder="Orari, informazioni utili...">${existing?.notes || ''}</textarea>
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
        const name = document.getElementById('ct-name').value.trim()
        if (!name) { showToast('Inserisci il nome del contatto', 'error'); return }
        const payload = {
          item_id: itemId,
          name,
          type: document.getElementById('ct-type').value,
          phone: document.getElementById('ct-phone').value.trim() || null,
          email: document.getElementById('ct-email').value.trim() || null,
          address: document.getElementById('ct-address').value.trim() || null,
          notes: document.getElementById('ct-notes').value.trim() || null
        }
        const { error } = isEdit
          ? await supabase.from('contacts').update(payload).eq('id', existing.id)
          : await supabase.from('contacts').insert(payload)
        if (error) { showToast('Errore: ' + error.message, 'error'); return }
        showToast(isEdit ? 'Contatto aggiornato' : 'Contatto aggiunto')
        closeModal()
        if (onSave) onSave()
      })
    })
  })
}

function renderEventsList(events) {
  if (events.length === 0) return `
    <div class="empty-state" style="padding:30px">
      <div class="empty-state-icon">📅</div>
      <p>Nessun evento registrato</p>
    </div>`

  return `<div class="events-list">${events.map(ev => {
    const statusCls = ev.status === 'fatto' ? 'done' : ev.status === 'promemoria' ? 'reminder' : 'todo'
    const typeCls = EVENT_TYPE_CLS[ev.event_type] || 'badge-neutral'
    return `
    <div class="event-item ${statusCls}">
      <div class="event-date">${formatDate(ev.event_date)}</div>
      <div class="event-body">
        <div style="display:flex;gap:6px;margin-bottom:4px;flex-wrap:wrap">
          <span class="badge ${typeCls}" style="font-size:0.7rem">${EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}</span>
          <span class="badge ${ev.status === 'fatto' ? 'badge-ok' : 'badge-warn'}" style="font-size:0.7rem">
            ${ev.status === 'fatto' ? '✅ Fatto' : ev.status === 'promemoria' ? '🔔 Promemoria' : '⏳ Da fare'}
          </span>
        </div>
        <div class="event-desc">${ev.description}</div>
        ${ev.notes ? `<div style="font-size:0.8rem;color:var(--text-light);margin-top:4px">${ev.notes}</div>` : ''}
      </div>
      ${ev.cost ? `<div class="event-cost">${formatCurrency(ev.cost)}</div>` : ''}
      <div class="event-actions">
        <button class="btn-icon" data-edit-event="${ev.id}" title="Modifica">✏️</button>
        <button class="btn-icon" data-delete-event="${ev.id}" title="Elimina">🗑️</button>
      </div>
    </div>`
  }).join('')}</div>`
}

function renderAttachmentsList(attachments) {
  if (attachments.length === 0) return `
    <div class="empty-state" style="padding:30px">
      <div class="empty-state-icon">📎</div>
      <p>Nessun documento allegato</p>
    </div>`

  return `<div class="attachments-list">${attachments.map(att => `
    <div class="attachment-item">
      <span class="attachment-icon">📄</span>
      <a class="attachment-name" href="${att.file_url}" target="_blank">${att.file_name}</a>
      <span class="attachment-size">${att.file_size ? (att.file_size / 1024).toFixed(0) + ' KB' : ''}</span>
      <button class="btn-icon" data-delete-attachment="${att.id}" data-path="${att.file_path}" title="Elimina">🗑️</button>
    </div>`).join('')}</div>`
}

export function showEventForm(itemId, existing, onSave) {
  const isEdit = !!existing
  import('../utils.js').then(({ showModal, closeModal, EVENT_TYPES, EVENT_STATUSES, showToast }) => {
    showModal(`
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${isEdit ? '✏️ Modifica evento' : '+ Nuovo evento'}</span>
          <button class="btn-icon" id="modal-close">✕</button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label>Tipo evento</label>
            <select id="ev-type">
              ${EVENT_TYPES.map(t => `<option value="${t.value}" ${existing?.event_type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Stato</label>
            <select id="ev-status">
              ${EVENT_STATUSES.map(s => `<option value="${s.value}" ${existing?.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Data</label>
            <input type="date" id="ev-date" value="${existing?.event_date?.slice(0,10) || new Date().toISOString().slice(0,10)}">
          </div>
          <div class="form-group">
            <label>Costo (€)</label>
            <input type="number" id="ev-cost" step="0.01" placeholder="0.00" value="${existing?.cost || ''}">
          </div>
          <div class="form-group full">
            <label>Descrizione *</label>
            <input type="text" id="ev-desc" placeholder="Es: Sostituzione filtro, Tagliando, ecc." value="${existing?.description || ''}">
          </div>
          <div class="form-group full">
            <label>Note aggiuntive</label>
            <textarea id="ev-notes" placeholder="Dettagli, tecnico, ricambi usati...">${existing?.notes || ''}</textarea>
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
        const desc = document.getElementById('ev-desc').value.trim()
        if (!desc) { showToast('Inserisci una descrizione', 'error'); return }
        const payload = {
          item_id: itemId,
          event_type: document.getElementById('ev-type').value,
          status: document.getElementById('ev-status').value,
          event_date: document.getElementById('ev-date').value,
          cost: parseFloat(document.getElementById('ev-cost').value) || null,
          description: desc,
          notes: document.getElementById('ev-notes').value.trim() || null
        }
        const { error } = isEdit
          ? await supabase.from('events').update(payload).eq('id', existing.id)
          : await supabase.from('events').insert(payload)
        if (error) { showToast('Errore: ' + error.message, 'error'); return }
        showToast(isEdit ? 'Evento aggiornato' : 'Evento aggiunto')
        closeModal()
        if (onSave) onSave()
      })
    })
  })
}

function showAttachmentUpload(itemId, onSave) {
  import('../utils.js').then(({ showModal, closeModal, showToast }) => {
    showModal(`
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">📎 Allega documento PDF</span>
          <button class="btn-icon" id="modal-close">✕</button>
        </div>
        <div class="form-grid">
          <div class="form-group full">
            <label>Nome documento</label>
            <input type="text" id="att-name" placeholder="Es: Manuale d'uso, Ricevuta, Fattura...">
          </div>
          <div class="form-group full">
            <label>File PDF</label>
            <input type="file" id="att-file" accept=".pdf,application/pdf">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Annulla</button>
          <button class="btn btn-primary" id="modal-save">📤 Carica</button>
        </div>
      </div>
    `, () => {
      document.getElementById('modal-close').addEventListener('click', closeModal)
      document.getElementById('modal-cancel').addEventListener('click', closeModal)
      document.getElementById('modal-save').addEventListener('click', async () => {
        const file = document.getElementById('att-file').files[0]
        alert('Files count: ' + document.getElementById('att-file').files.length)
        const name = document.getElementById('att-name').value.trim() || file?.name || 'Documento'
        if (!file) { showToast('Seleziona un file PDF', 'error'); return }
        alert('File: ' + file.name + ' - size: ' + file.size + ' - type: ' + file.type)
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
const filePath = `${itemId}/${Date.now()}_${safeName}`
const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file, {
  contentType: file.type || 'application/pdf',
  upsert: false
})
  if (uploadError) { alert('Errore upload: ' + JSON.stringify(uploadError)); return }
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
        const { error } = await supabase.from('attachments').insert({
          item_id: itemId, file_name: name, file_path: filePath,
          file_url: urlData.publicUrl, file_size: file.size
        })
        if (error) { showToast('Errore salvataggio: ' + error.message, 'error'); return }
        showToast('Documento caricato!')
        closeModal()
        if (onSave) onSave()
      })
    })
  })
}

function confirmDeleteItem(item, itemId) {
  import('../utils.js').then(({ showModal, closeModal, showToast }) => {
    showModal(`
      <div class="modal" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">🗑️ Elimina bene</span>
          <button class="btn-icon" id="modal-close">✕</button>
        </div>
        <p style="margin-bottom:20px">Sei sicuro di voler eliminare <strong>${item.name}</strong>? Verranno eliminati anche tutti gli eventi, i contatti e i documenti allegati. Questa azione non è reversibile.</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">Annulla</button>
          <button class="btn btn-danger" id="modal-confirm">🗑️ Elimina</button>
        </div>
      </div>
    `, () => {
      document.getElementById('modal-close').addEventListener('click', closeModal)
      document.getElementById('modal-cancel').addEventListener('click', closeModal)
      document.getElementById('modal-confirm').addEventListener('click', async () => {
        await supabase.from('events').delete().eq('item_id', itemId)
        await supabase.from('attachments').delete().eq('item_id', itemId)
        await supabase.from('contacts').delete().eq('item_id', itemId)
        const { error } = await supabase.from('items').delete().eq('id', itemId)
        if (error) { showToast('Errore: ' + error.message, 'error'); return }
        showToast('Bene eliminato')
        closeModal()
        import('../main.js').then(m => m.navigate('items'))
      })
    })
  })
}

function confirmDeleteEvent(eventId, onDone) {
  import('../utils.js').then(async ({ showToast }) => {
    if (!confirm('Eliminare questo evento?')) return
    const { error } = await supabase.from('events').delete().eq('id', eventId)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    showToast('Evento eliminato')
    if (onDone) onDone()
  })
}

function confirmDeleteContact(contactId, onDone) {
  import('../utils.js').then(async ({ showToast }) => {
    if (!confirm('Eliminare questo contatto?')) return
    const { error } = await supabase.from('contacts').delete().eq('id', contactId)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    showToast('Contatto eliminato')
    if (onDone) onDone()
  })
}

function confirmDeleteAttachment(attId, filePath, onDone) {
  import('../utils.js').then(async ({ showToast }) => {
    if (!confirm('Eliminare questo documento?')) return
    await supabase.storage.from('attachments').remove([filePath])
    const { error } = await supabase.from('attachments').delete().eq('id', attId)
    if (error) { showToast('Errore: ' + error.message, 'error'); return }
    showToast('Documento eliminato')
    if (onDone) onDone()
  })
}
