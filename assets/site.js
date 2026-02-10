// ===== theme =====
(function(){
  const key = 'hirrdirr_theme';
  const btn = document.getElementById('themeBtn');
  const sun = document.getElementById('sun');
  const moon = document.getElementById('moon');

  function apply(mode){
    document.body.classList.toggle('light', mode === 'light');
    if(sun && moon){
      if(mode === 'light'){ sun.style.opacity = "1"; moon.style.opacity="0"; }
      else { sun.style.opacity="0"; moon.style.opacity="1"; }
    }
    localStorage.setItem(key, mode);
  }

  const saved = localStorage.getItem(key) || 'dark';
  apply(saved);

  btn?.addEventListener('click', ()=>{
    const now = document.body.classList.contains('light') ? 'dark' : 'light';
    apply(now);
  });
})();

// ===== active nav + breadcrumb label =====
(function(){
  const path = location.pathname.endsWith('/') ? location.pathname : location.pathname + '/';
  document.querySelectorAll('.iconbtn[data-route]').forEach(a=>{
    const r = a.getAttribute('data-route');
    if(r === path) a.classList.add('active');
  });

  const label = document.getElementById('pageLabel');
  if(label){
    label.textContent = path.startsWith('/games/') ? 'games' : 'home';
  }
})();
