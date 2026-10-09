/* Local navigation only. Search, account and cart are intentionally visual controls. */
document.querySelectorAll('.manz-hero-nav--mobile a').forEach((link) => {
  link.addEventListener('click', (event) => {
    const drawer = link.closest('header-drawer');
    const toggle = drawer && drawer.querySelector('summary');
    if (drawer && toggle) drawer.closeMenuDrawer(event, toggle);
  });
});
