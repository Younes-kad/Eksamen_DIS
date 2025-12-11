document.addEventListener('DOMContentLoaded', () => {
  // Finder de tre vigtigste: knappen, menuen og det mørke lag ovenpå siden
  const toggle = document.querySelector('[data-menu-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('[data-menu-overlay]');

  // Hvis en af dem mangler, så returner
  if (!toggle || !sidebar || !overlay) {
    return;
  }

  // Så vi kan lukke menuen hvor end vi er
  const closeMenu = () => {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-open');
  };

  // Klik på menu-knappen åbner/lukker sidebaren og holder overlayet i sync
  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('is-open');
    overlay.classList.toggle('is-open', isOpen);
  });

  // Klik på overlay lukker menuen
  overlay.addEventListener('click', closeMenu);


});
