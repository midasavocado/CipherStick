/* Tiny helper: dynamic year in footer */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
  
    /* Mobile nav toggle */
    const nav = document.getElementById('siteNav');
    const burger = document.getElementById('navToggle');
  
    burger.addEventListener('click', () => {
      nav.classList.toggle('open');
      burger.classList.toggle('active');
      document.body.classList.toggle('nav-open');
    });
  
    /* Close menu on link click */
    nav.querySelectorAll('a').forEach(link =>
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        burger.classList.remove('active');
        document.body.classList.remove('nav-open');
      })
    );
  });
  