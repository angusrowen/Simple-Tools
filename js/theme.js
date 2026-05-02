(function(){
  var PREF = 'auscalc-theme';
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(PREF, t);
  }
  var saved = localStorage.getItem(PREF);
  if (saved) applyTheme(saved);
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('btnTheme');
    if (btn) btn.addEventListener('click', function() {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  });
})();
