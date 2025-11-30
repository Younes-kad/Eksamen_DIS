document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('[data-menu-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('[data-menu-overlay]');

  if (!toggle || !sidebar || !overlay) {
    return;
  }

  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
  };

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    overlay.classList.toggle('is-open', isOpen);
  });

  overlay.addEventListener('click', closeMenu);

  sidebar.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
});
