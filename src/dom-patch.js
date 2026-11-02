// Pembaruan DOM per bagian: hanya node yang berubah yang disentuh.
// Akibatnya teks yang sedang diketik, fokus, posisi gulir, dan <details> yang
// terbuka tidak hilang setiap kali data disimpan, dan animasi tidak terulang.

const FOCUS_ATTRS = ['data-setting', 'data-prayer-setting', 'data-card-field', 'data-city-pick', 'data-action', 'data-view'];

function activeInside(root) {
  const active = document.activeElement;
  return active && active !== root && active !== document.body && root.contains(active) ? active : null;
}

function describeFocus(root) {
  const active = activeInside(root);
  if (!active) return null;
  const info = { id: active.id || null, selector: null, index: 0, start: null, end: null };
  if (!info.id) {
    for (const attr of FOCUS_ATTRS) {
      if (!active.hasAttribute(attr)) continue;
      const value = active.getAttribute(attr);
      const extra = active.hasAttribute('data-value') ? `[data-value="${active.getAttribute('data-value')}"]` : '';
      info.selector = `[${attr}="${value}"]${extra}`;
      info.index = [...root.querySelectorAll(info.selector)].indexOf(active);
      break;
    }
  }
  try { info.start = active.selectionStart; info.end = active.selectionEnd; } catch { /* tipe input tanpa seleksi */ }
  return info;
}

function restoreFocus(root, info) {
  if (!info || activeInside(root)) return;
  const target = info.id ? document.getElementById(info.id) : info.selector ? root.querySelectorAll(info.selector)[Math.max(0, info.index)] : null;
  if (!target) return;
  target.focus({ preventScroll: true });
  if (info.start !== null && info.start !== undefined) {
    try { target.setSelectionRange(info.start, info.end); } catch { /* abaikan */ }
  }
}

function syncAttributes(from, to) {
  for (const { name, value } of [...to.attributes]) {
    if (from.nodeName === 'DETAILS' && name === 'open') continue; // biarkan keputusan pengguna
    if (from.getAttribute(name) !== value) from.setAttribute(name, value);
  }
  for (const { name } of [...from.attributes]) {
    if (from.nodeName === 'DETAILS' && name === 'open') continue;
    if (!to.hasAttribute(name)) from.removeAttribute(name);
  }
}

function morphElement(from, to) {
  const tag = from.nodeName;

  if (tag === 'INPUT') {
    const wasChecked = from.hasAttribute('checked');
    const oldValue = from.getAttribute('value');
    syncAttributes(from, to);
    if (from.type === 'checkbox' || from.type === 'radio') {
      if (wasChecked !== to.hasAttribute('checked')) from.checked = to.hasAttribute('checked');
    } else if (from.type !== 'file' && oldValue !== to.getAttribute('value') && document.activeElement !== from) {
      from.value = to.getAttribute('value') ?? '';
    }
    return;
  }

  if (tag === 'TEXTAREA') {
    const oldDefault = from.defaultValue;
    syncAttributes(from, to);
    if (oldDefault !== to.defaultValue) {
      from.defaultValue = to.defaultValue;
      if (document.activeElement !== from) from.value = to.defaultValue;
    }
    return;
  }

  if (tag === 'SELECT') {
    const oldSelected = from.querySelector('option[selected]')?.value ?? null;
    syncAttributes(from, to);
    morphChildren(from, to);
    const newSelected = to.querySelector('option[selected]')?.value ?? null;
    if (oldSelected !== newSelected && document.activeElement !== from) from.value = newSelected ?? from.options?.[0]?.value ?? '';
    return;
  }

  syncAttributes(from, to);
  morphChildren(from, to);
}

function sameShape(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) return false;
  if (from.nodeType !== 1) return true;
  const fromId = from.getAttribute('id'), toId = to.getAttribute('id');
  return fromId === toId;
}

export function morphChildren(from, to) {
  const oldNodes = [...from.childNodes];
  const newNodes = [...to.childNodes];
  const length = Math.max(oldNodes.length, newNodes.length);
  for (let i = 0; i < length; i += 1) {
    const oldNode = oldNodes[i], newNode = newNodes[i];
    if (!newNode) { oldNode.remove(); continue; }
    if (!oldNode) { from.appendChild(newNode); continue; }
    if (!sameShape(oldNode, newNode)) { from.replaceChild(newNode, oldNode); continue; }
    if (oldNode.nodeType !== 1) {
      if (oldNode.nodeValue !== newNode.nodeValue) oldNode.nodeValue = newNode.nodeValue;
    } else if (oldNode.nodeName.toLowerCase() === 'svg') {
      if (oldNode.outerHTML !== newNode.outerHTML) from.replaceChild(newNode, oldNode);
    } else {
      morphElement(oldNode, newNode);
    }
  }
}

/**
 * Mengisi `element` dengan `html`.
 * Pertama kali, atau saat `key` berubah (mis. pindah halaman): ganti seluruhnya.
 * Selain itu: perbarui hanya bagian yang berbeda.
 */
export function patchHTML(element, html, key = '') {
  if (element.dataset.renderKey !== key || !element.firstChild) {
    element.innerHTML = html;
    element.dataset.renderKey = key;
    return;
  }
  const template = document.createElement('template');
  template.innerHTML = html;
  const focus = describeFocus(element);
  morphChildren(element, template.content);
  restoreFocus(element, focus);
}
