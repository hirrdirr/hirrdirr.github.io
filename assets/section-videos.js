// Progressive enhancement: real YouTube links work without JavaScript.
// Create privacy-enhanced embeds only after an explicit play action.
document.querySelectorAll('.section-video-player').forEach((player) => {
  const id = player.dataset.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id || '')) return;
  const button = player.querySelector('.video-inline-play');
  button.hidden = false;
  button.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
    iframe.title = player.dataset.videoTitle;
    iframe.allow = 'autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    player.replaceChildren(iframe);
    iframe.focus();
  }, { once: true });
});
