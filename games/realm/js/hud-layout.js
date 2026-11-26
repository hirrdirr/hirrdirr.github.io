import { tr } from './i18n.js';
import { PLAY_BAND } from './renderer.js';

export const HUD_KEY = 'hirrdirr.realm.hud';
export const WIDGETS = ['player', 'target', 'map', 'tracker', 'abilities'];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const inRange = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
const defaults = () => ({version: 1, widgets: {}, folds: {}});
const overlaps = (a, b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;

export function readLayout(storage) {
  try {
    const value = JSON.parse(storage.getItem(HUD_KEY));
    if (value?.version !== 1 || !value.widgets || typeof value.widgets !== 'object' ||
        Array.isArray(value.widgets) || !value.folds || typeof value.folds !== 'object' || Array.isArray(value.folds)) return defaults();
    const result = defaults();
    for (const [id, p] of Object.entries(value.widgets)) {
      if (!WIDGETS.includes(id) || !inRange(p?.x,0,1) || !inRange(p.y,0,1) ||
          !inRange(p.scale,id === 'abilities' ? 1 : .8,1.25)) return defaults();
      result.widgets[id] = {x:p.x, y:p.y, scale:p.scale};
    }
    for (const id of ['map','tracker']) if (typeof value.folds[id] === 'boolean') result.folds[id] = value.folds[id];
    return result;
  } catch { return defaults(); }
}

// Positions describe a fraction of the distance the scaled widget can travel.
export function project(base, p, view) {
  const w = base.w*p.scale, h = base.h*p.scale;
  return {x:(view.w-w)*p.x, y:(view.h-h)*p.y, w, h};
}
function normalized(left, top, box, view) {
  return {x:clamp(left/Math.max(1,view.w-box.w),0,1), y:clamp(top/Math.max(1,view.h-box.h),0,1)};
}
export function resolveLayout(widgets, base, view, reserved) {
  const boxes = {...base};
  for (const [id, p] of Object.entries(widgets)) boxes[id] = project(base[id],p,view);
  const lane = {x:0, y:view.h*PLAY_BAND.top, w:view.w, h:view.h*(PLAY_BAND.bottom-PLAY_BAND.top)};
  for (const id of Object.keys(widgets)) {
    const b = boxes[id];
    if (b.w > view.w || b.h > view.h || [lane,...reserved].some(r => overlaps(b,r)) ||
        WIDGETS.some(other => other !== id && overlaps(b,boxes[other]))) return null;
  }
  return boxes;
}

export class HudLayout {
  constructor(field, storage, onFinish) {
    this.field = field;
    this.storage = storage;
    this.onFinish = onFinish;
    this.saved = readLayout(storage);
    this.nodes = Object.fromEntries([...field.querySelectorAll('[data-widget]')].map(n => [n.dataset.widget,n]));
    this.panel = field.querySelector('#hud-editor');
    this.controls = this.panel.elements;
    this.compact = matchMedia('(max-width: 620px), (max-height: 620px)');
    this.compact.addEventListener('change', () => this.updateFolds());
    for (const button of this.field.querySelectorAll('[data-fold]')) {
      button.addEventListener('click', () => {
        if (this.editing) return;
        this.saved.folds[button.dataset.fold] = button.getAttribute('aria-expanded') === 'true';
        this.fold(button,this.saved.folds[button.dataset.fold]);
        this.persist(this.saved);
      });
    }
    this.updateFolds();
    this.observer = new ResizeObserver(() => this.measure());
    for (const node of [field,...Object.values(this.nodes),field.querySelector('.game-tools')]) this.observer.observe(node);
    this.controls.widget.addEventListener('change', () => this.select(this.controls.widget.value));
    for (const name of ['horizontal','vertical','scale']) {
      this.controls[name].addEventListener('change', () => this.changeControl(name));
    }
    this.panel.addEventListener('submit', event => { event.preventDefault(); this.finish(true); });
    this.controls.cancel.addEventListener('click', () => this.finish(false));
    this.controls.resetLayout.addEventListener('click', () => {
      this.draft = defaults();
      this.updateFolds();
      this.measure();
      this.feedback('hud.reset_pending');
    });
    this.field.addEventListener('pointerdown', event => this.startDrag(event));
    this.field.addEventListener('pointermove', event => this.dragTo(event));
    const stop = event => { if (this.drag?.pointer === event.pointerId) this.drag = null; };
    this.field.addEventListener('pointerup', stop);
    this.field.addEventListener('lostpointercapture', stop);
    this.field.addEventListener('click', event => {
      if (this.editing && !this.panel.contains(event.target) && !event.target.closest('#focus-overlay')) {
        event.preventDefault(); event.stopPropagation();
      }
    }, true);
  }
  get editing() { return Boolean(this.draft); }
  fold(button, collapsed) {
    button.setAttribute('aria-expanded',String(!collapsed));
    document.getElementById(button.getAttribute('aria-controls')).hidden = collapsed;
  }
  updateFolds() {
    const prefs = this.draft || this.saved;
    for (const b of this.field.querySelectorAll('[data-fold]')) {
      this.fold(b,this.compact.matches || (prefs.folds[b.dataset.fold] ?? false));
    }
  }
  persist(value) {
    try { this.storage.setItem(HUD_KEY, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  measure() {
    const field = this.field;
    if (!field.clientWidth || !field.clientHeight) return;
    field.style.setProperty('--map-height',this.nodes.map.offsetHeight+'px');
    for (const node of Object.values(this.nodes)) node.classList.remove('placed');
    const origin = field.getBoundingClientRect();
    const rect = n => {
      const r = n.getBoundingClientRect();
      return {x:r.left-origin.left,y:r.top-origin.top,w:r.width,h:r.height};
    };
    this.view = {w:origin.width,h:origin.height};
    this.base = Object.fromEntries(WIDGETS.map(id => [id,rect(this.nodes[id])]));
    this.reserved = ['.xp-strip','.game-tools','.messages'].map(s => rect(field.querySelector(s)));
    const widgets = (this.draft || this.saved).widgets;
    const boxes = resolveLayout(widgets,this.base,this.view,this.reserved);
    this.current = boxes ? widgets : {};
    this.boxes = boxes || this.base;
    for (const id of Object.keys(this.current)) this.place(id);
    if (this.editing) this.select(this.selected);
  }
  place(id) {
    const node = this.nodes[id], box = this.boxes[id];
    node.style.setProperty('--hud-x',box.x+'px');
    node.style.setProperty('--hud-y',box.y+'px');
    node.style.setProperty('--hud-scale',this.current[id].scale);
    node.classList.add('placed');
  }
  begin() {
    this.originalFolds = Array.from(this.field.querySelectorAll('[data-fold]'), b => [b,b.getAttribute('aria-expanded') === 'false']);
    this.draft = structuredClone(this.saved);
    this.field.classList.add('editing');
    this.panel.hidden = false;
    this.selected = 'player';
    this.measure();
    // Edit the visible responsive fallback if the saved layout cannot currently fit.
    this.draft.widgets = {...this.current};
    this.feedback('hud.edit_hint');
    this.controls.widget.focus();
  }
  select(id) {
    this.selected = id;
    for (const key of WIDGETS) this.nodes[key].classList.toggle('selected-widget',key === id);
    const box = this.boxes[id];
    const p = this.current[id] || {...normalized(box.x,box.y,box,this.view),scale:1};
    this.controls.widget.value = id;
    this.controls.horizontal.value = Math.round(p.x*100);
    this.controls.vertical.value = Math.round(p.y*100);
    this.controls.scale.min = id === 'abilities' ? 100 : 80;
    this.controls.scale.value = Math.round(p.scale*100);
  }
  feedback(key) { this.panel.querySelector('[role="status"]').textContent = tr(key); }
  changeControl(name) {
    const input = this.controls[name], value = input.valueAsNumber;
    if (!input.validity.valid || !Number.isFinite(value)) { this.select(this.selected); return; }
    const id = this.selected, box = this.boxes[id];
    const p = this.current[id] || {...normalized(box.x,box.y,box,this.view),scale:1};
    const key = {horizontal:'x',vertical:'y',scale:'scale'}[name];
    this.propose(id,{...p,[key]:value/100});
  }
  propose(id, p) {
    const widgets = {...this.current,[id]:p};
    const boxes = resolveLayout(widgets,this.base,this.view,this.reserved);
    if (boxes) {
      this.current = this.draft.widgets = widgets;
      this.boxes = boxes;
      this.place(id);
    }
    this.select(id);
    this.feedback(boxes ? 'hud.edit_hint' : 'hud.blocked');
  }
  startDrag(event) {
    const n = event.target.closest('[data-widget]');
    if (!this.editing || !n || event.button !== 0 || !event.isPrimary) return;
    event.preventDefault();
    this.select(n.dataset.widget);
    const box = this.boxes[this.selected];
    this.drag = {pointer:event.pointerId,id:this.selected,x:event.clientX-box.x,y:event.clientY-box.y};
    this.field.setPointerCapture(event.pointerId);
  }
  dragTo(event) {
    if (this.drag?.pointer !== event.pointerId) return;
    const {id,x,y} = this.drag, box = this.boxes[id];
    this.propose(id,{...normalized(event.clientX-x,event.clientY-y,box,this.view),scale:this.current[id]?.scale || 1});
  }
  finish(save) {
    if (save && !this.persist(this.draft)) { this.feedback('hud.storage_failed'); return; }
    if (save) this.saved = this.draft;
    this.draft = this.drag = null;
    this.panel.hidden = true;
    this.field.classList.remove('editing');
    this.nodes[this.selected].classList.remove('selected-widget');
    if (!save) for (const [b,collapsed] of this.originalFolds) this.fold(b,collapsed);
    this.measure();
    this.onFinish();
  }
}
