/*
 * Dialogs and toasts. All content is built with static markup authored here;
 * player-provided strings are only ever inserted via textContent.
 */

import { audio } from '../services/audio-service.js';

const root = () => document.getElementById('dialog-root');
const toastRoot = () => document.getElementById('toast-root');

function buildDialog() {
  const backdrop = document.createElement('div');
  backdrop.className = 'dialog-backdrop';
  const box = document.createElement('div');
  box.className = 'dialog';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  backdrop.appendChild(box);
  return { backdrop, box };
}

function close(backdrop) {
  backdrop.remove();
}

/*
 * Generic dialog. options:
 *   title, message (string), build(box) for extra content,
 *   buttons: [{label, cls, value, icon}]
 * Resolves with the chosen button's value.
 */
export function showDialog({ title, message, build, buttons }) {
  return new Promise((resolve) => {
    const { backdrop, box } = buildDialog();
    if (title) {
      const h = document.createElement('h2');
      h.textContent = title;
      box.appendChild(h);
    }
    if (message) {
      const p = document.createElement('p');
      p.className = 'center';
      p.textContent = message;
      box.appendChild(p);
    }
    if (build) build(box);
    const row = document.createElement('div');
    row.className = 'dialog-buttons';
    for (const b of buttons) {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || '');
      btn.textContent = (b.icon ? b.icon + ' ' : '') + b.label;
      btn.addEventListener('click', () => {
        audio.click();
        close(backdrop);
        resolve(b.value);
      });
      row.appendChild(btn);
    }
    box.appendChild(row);
    root().appendChild(backdrop);
    const first = row.querySelector('button');
    if (first) first.focus();
  });
}

export function alertDialog(title, message, label = 'OK') {
  return showDialog({ title, message, buttons: [{ label, cls: 'btn-primary', value: true }] });
}

export function confirmDialog(title, message, okLabel = 'Yes', cancelLabel = 'No') {
  return showDialog({
    title, message,
    buttons: [
      { label: cancelLabel, cls: 'btn-ghost', value: false },
      { label: okLabel, cls: 'btn-primary', value: true }
    ]
  });
}

/* Text input dialog with optional preset chips. Resolves string or null. */
export function promptText({ title, message, value = '', maxLen = 12, presets = [] }) {
  return new Promise((resolve) => {
    const { backdrop, box } = buildDialog();
    const h = document.createElement('h2');
    h.textContent = title;
    box.appendChild(h);
    if (message) {
      const p = document.createElement('p');
      p.className = 'center';
      p.textContent = message;
      box.appendChild(p);
    }
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = maxLen;
    input.value = value;
    input.setAttribute('aria-label', title);
    input.autocomplete = 'off';
    box.appendChild(input);

    if (presets.length) {
      const chips = document.createElement('div');
      chips.className = 'swatch-row';
      chips.style.justifyContent = 'center';
      for (const name of presets) {
        const c = document.createElement('button');
        c.className = 'btn btn-small btn-ghost';
        c.textContent = name;
        c.addEventListener('click', () => { input.value = name; audio.click(); });
        chips.appendChild(c);
      }
      box.appendChild(chips);
    }

    const row = document.createElement('div');
    row.className = 'dialog-buttons';
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { audio.back(); close(backdrop); resolve(null); });
    const ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.textContent = 'OK';
    const submit = () => {
      const v = input.value.trim().slice(0, maxLen);
      if (!v) { input.focus(); return; }
      audio.select();
      close(backdrop);
      resolve(v);
    };
    ok.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(row);
    root().appendChild(backdrop);
    input.focus();
  });
}

/*
 * Parent gate: shows a random 3-digit code the child is unlikely to type
 * without reading; the grown-up enters it to confirm destructive actions.
 */
export function parentGate(actionLabel) {
  const code = String(100 + Math.floor(Math.random() * 900));
  return new Promise((resolve) => {
    const { backdrop, box } = buildDialog();
    const h = document.createElement('h2');
    h.textContent = 'Grown-Up Check 🧑‍🔧';
    box.appendChild(h);
    const p = document.createElement('p');
    p.className = 'center';
    p.textContent = `To ${actionLabel}, please type this code:`;
    box.appendChild(p);
    const codeEl = document.createElement('div');
    codeEl.className = 'parent-code';
    codeEl.textContent = code;
    box.appendChild(codeEl);
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.maxLength = 3;
    input.setAttribute('aria-label', 'Enter the three digit code');
    box.appendChild(input);
    const row = document.createElement('div');
    row.className = 'dialog-buttons';
    const cancel = document.createElement('button');
    cancel.className = 'btn btn-ghost';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => { close(backdrop); resolve(false); });
    const ok = document.createElement('button');
    ok.className = 'btn btn-primary';
    ok.textContent = 'Confirm';
    ok.addEventListener('click', () => {
      if (input.value.trim() === code) { close(backdrop); resolve(true); }
      else { input.value = ''; input.placeholder = 'Try again'; input.focus(); }
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok.click(); });
    row.appendChild(cancel);
    row.appendChild(ok);
    box.appendChild(row);
    root().appendChild(backdrop);
    input.focus();
  });
}

/* ---------- Toasts ---------- */

export function toast(text, icon = '⭐', ms = 2600) {
  const el = document.createElement('div');
  el.className = 'toast';
  const i = document.createElement('span');
  i.className = 'toast-icon';
  i.textContent = icon;
  const t = document.createElement('span');
  t.textContent = text;
  el.appendChild(i);
  el.appendChild(t);
  toastRoot().appendChild(el);
  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 500);
  }, ms);
}

export function achievementToast(a) {
  audio.achievement();
  toast(`Achievement: ${a.name}!`, a.icon, 3200);
}
