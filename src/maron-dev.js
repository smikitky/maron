(() => {
  if (!location.href.match(/^http/)) return;

  const dataElement = document.getElementById('maron-dev-nav-data');
  let items = [];
  try {
    items = JSON.parse(dataElement?.textContent || '[]');
  } catch {
    items = [];
  }

  if (Array.isArray(items) && items.length > 0) {
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = './maron-dev.css';
    document.head.append(cssLink);

    const nav = document.createElement('nav');
    nav.className = 'maron-dev-nav';
    nav.setAttribute('aria-label', 'MaRon entry navigation');
    for (const item of items) {
      const link = document.createElement('a');
      link.href = item.path;
      link.textContent = item.name;
      if (item.isCurrent) {
        link.classList.add('maron-dev-nav-current');
      }
      nav.append(link);
    }
    document.body.append(nav);
  }

  const eventSource = new EventSource('/updates');
  eventSource.addEventListener('change', () => location.reload());
})();
