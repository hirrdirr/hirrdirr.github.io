// A small, independent presentation loop. Never advances simulation or touches saves.
// The sprite resolver is the seam for future equipment appearance layers.
export function drawCharacterPreview(g, sprite, time = 0) {
  g.clearRect(0, 0, 240, 280);
  if (!sprite) return;
  const breath = Math.sin(time / 900) * 1.5;
  g.fillStyle = '#102b2c30'; g.beginPath(); g.ellipse(120, 237, 47, 8, 0, 0, Math.PI * 2); g.fill();
  g.imageSmoothingEnabled = false;
  g.drawImage(sprite, 40, 55 + breath, 160, 192);
}

export class CharacterPreview {
  constructor(resolveSprite, env = { window, document }) {
    this.resolveSprite = resolveSprite; this.env = env; this.canvas = null; this.frame = 0; this.lastDraw = -Infinity;
    this.refresh = () => this.sync();
    this.tick = time => {
      this.frame = 0;
      if (!this.canAnimate()) return;
      if (time - this.lastDraw >= 1000 / 30) { this.draw(time); this.lastDraw = time; }
      this.frame = this.env.window.requestAnimationFrame(this.tick);
    };
  }
  mount(canvas, player) {
    this.unmount();
    if (!canvas) return;
    this.canvas = canvas; this.player = player; this.context = canvas.getContext('2d');
    this.motion = this.env.window.matchMedia('(prefers-reduced-motion: reduce)');
    this.intersecting = true; this.lastDraw = -Infinity;
    this.env.document.addEventListener('visibilitychange', this.refresh);
    this.env.window.addEventListener('blur', this.refresh); this.env.window.addEventListener('focus', this.refresh);
    this.motion.addEventListener('change', this.refresh);
    if (this.env.window.IntersectionObserver) {
      this.observer = new this.env.window.IntersectionObserver(entries => { this.intersecting = entries[0]?.isIntersecting === true; this.sync(); });
      this.observer.observe(canvas);
    }
    this.draw(0); this.sync();
  }
  canAnimate() {
    return this.canvas && this.context && !this.env.document.hidden && this.env.document.hasFocus() &&
      this.canvas.isConnected && this.canvas.checkVisibility() && this.intersecting && !this.motion.matches;
  }
  draw(time) { if (this.context) drawCharacterPreview(this.context, this.resolveSprite(this.player), time); }
  sync() {
    if (this.canAnimate()) { if (!this.frame) this.frame = this.env.window.requestAnimationFrame(this.tick); }
    else { if (this.frame) this.env.window.cancelAnimationFrame(this.frame); this.frame = 0; if (this.motion?.matches) this.draw(0); }
  }
  unmount() {
    if (this.frame) this.env.window.cancelAnimationFrame(this.frame);
    this.frame = 0; this.observer?.disconnect(); this.observer = null;
    this.env.document.removeEventListener('visibilitychange', this.refresh);
    this.env.window.removeEventListener('blur', this.refresh); this.env.window.removeEventListener('focus', this.refresh);
    this.motion?.removeEventListener('change', this.refresh);
    this.canvas = null; this.context = null; this.player = null;
  }
}
