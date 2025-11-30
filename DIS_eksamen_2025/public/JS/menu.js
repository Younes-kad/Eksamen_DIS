document.addEventListener('DOMContentLoaded', () => {
  // Find knappen til at åbne menuen, selve sidebaren og overlayet der ligger ovenpå indholdet
  const toggle = document.querySelector('[data-menu-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('[data-menu-overlay]');

  // Stop tidligt hvis markup ikke er til stede (undgår fejl på sider uden menu)
  if (!toggle || !sidebar || !overlay) {
    return;
  }

  // Hjælpefunktion til at lukke menuen både fra overlay og links
  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
  };

  // Klik på menu-knappen åbner/lukker sidebaren og sync'er overlayet
  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    overlay.classList.toggle('is-open', isOpen);
  });

  // Klik på overlay lukker menuen
  overlay.addEventListener('click', closeMenu);

  // Klik på et link i sidebaren lukker også menuen (god mobil-UX)
  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
});
