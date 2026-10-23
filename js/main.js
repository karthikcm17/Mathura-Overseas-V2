// main.js — shared behaviour for every page.

// Image slots: if a photo file is missing (not uploaded yet), mark the slot
// so CSS shows the exact file name + size you need to supply. Once the real
// image exists, nothing changes — the label simply never appears.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.img-slot img').forEach(function (img) {
    function markEmpty() { img.closest('.img-slot').classList.add('is-empty'); }
    if (img.complete && img.naturalWidth === 0) { markEmpty(); }
    else { img.addEventListener('error', markEmpty); }
  });
});
