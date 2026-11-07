/* Only data-provided IGDB covers are artwork; missing covers stay neutral. */
export function makeGameCover(game, {className = '', eager = false} = {}) {
  const cover = document.createElement('div');
  cover.className = `discovery-cover ${className}`;
  const fallback = document.createElement('div');
  fallback.className = 'discovery-cover-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  const initials = document.createElement('strong');
  initials.textContent = String(game.name || '').replace(/^DEMO:\s*/i, '').split(/\s+/).slice(0, 2).map(word => Array.from(word)[0] || '').join('');
  const label = document.createElement('small');
  label.textContent = 'Omslag saknas';
  fallback.append(initials, label);
  cover.append(fallback);
  cover.setAttribute('role', 'img');
  cover.setAttribute('aria-label', 'Omslag saknas för ' + game.name);
  if (typeof game.cover_id === 'string' && /^[A-Za-z0-9_]+$/.test(game.cover_id)) {
    const img = document.createElement('img');
    img.src = 'https://images.igdb.com/igdb/image/upload/t_cover_big/' + game.cover_id + '.jpg';
    img.alt = '';
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.addEventListener('load', () => cover.setAttribute('aria-label', 'Omslag till ' + game.name), {once: true});
    img.addEventListener('error', () => img.remove(), {once: true});
    cover.append(img);
  }
  return cover;
}
