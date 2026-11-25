import test from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../js/renderer.js';
import { WIDTH, HEIGHT, TILE } from '../js/world.js';

function camera(width, height, inset) {
  const renderer = Object.create(Renderer.prototype);
  renderer.canvas = {width, height};
  renderer.ground = {width: WIDTH, height: HEIGHT + 3 * TILE};
  renderer.camera = {x: 0, y: 0};
  renderer.dockInset = inset;
  renderer.resetCamera();
  return renderer;
}

function assertVisible(renderer, player) {
  const {width, height} = renderer.canvas;
  const x = Math.round(renderer.camera.x), y = Math.round(renderer.camera.y);
  assert.ok(x >= 0 && x + width <= renderer.ground.width, 'horizontal crop');
  assert.ok(y >= 0 && y + height <= renderer.ground.height, 'vertical crop');
  assert.ok(player.x - x >= 20 && player.x - x <= width - 20, 'sprite sides');
  assert.ok(player.y - y >= 43, 'sprite head during strike');
  assert.ok(player.y - y + 7 <= height - renderer.dockInset, 'feet above prompt and abilities');
}

test('camera keeps the whole player above the dock on every map edge and in Cinder Reach', () => {
  for (const [w, h, inset] of [[960, 524, 76], [675, 346, 87], [298, 245, 88], [920, 305, 82]]) {
    const renderer = camera(w, h, inset);
    for (const x of [43, 450, WIDTH / 2, 1877, 2024, 2496, WIDTH - 43]) {
      for (const y of [43, 536, 1000, HEIGHT - 43]) {
        renderer.resetCamera();
        renderer.followPlayer({x, y}, 0);
        assertVisible(renderer, {x, y});
      }
    }
    // Approach and leave the southern clamp at dodge speed with normal camera easing.
    const p = {x: 2024, y: HEIGHT - 325};
    renderer.resetCamera();
    renderer.followPlayer(p, 0);
    for (const direction of [1, -1]) for (let tick = 0; tick < 100; tick++) {
      p.y = Math.min(HEIGHT - 43, p.y + direction * 510 / 60);
      const previous = renderer.camera.y;
      renderer.followPlayer(p, 1 / 60);
      assert.ok(Math.abs(renderer.camera.y - previous) <= 510 / 60 + 1e-6, 'no camera jump');
      assertVisible(renderer, p);
    }
  }
});

test('reduced motion follows immediately and interior movement keeps normal easing', () => {
  const r = camera(920, 490, 83), p = {x: 730, y: 680};
  r.followPlayer(p, 0);
  const previous = {...r.camera};
  p.x += 20; p.y += 20;
  r.followPlayer(p, 1 / 60);
  assert.ok(r.camera.x > previous.x && r.camera.x < previous.x + 20);
  assert.ok(r.camera.y > previous.y && r.camera.y < previous.y + 20);
  r.reduced = true;
  r.followPlayer(p, 1 / 60);
  assert.equal(r.camera.x, previous.x + 20);
  assert.equal(r.camera.y, previous.y + 20);
});
