'use strict';
(function(){
  var PREF='auscalc-theme';
  function applyTheme(t){
    document.documentElement.setAttribute('data-theme',t);
    localStorage.setItem(PREF,t);
  }
  // Apply saved preference before paint (no flash)
  var saved=localStorage.getItem(PREF);
  if(saved) applyTheme(saved);

  document.addEventListener('DOMContentLoaded',function(){
    var btn=document.getElementById('btnTheme');
    if(!btn) return;
    btn.addEventListener('click',function(){
      var cur=document.documentElement.getAttribute('data-theme');
      applyTheme(cur==='dark'?'light':'dark');
    });
  });
})();
