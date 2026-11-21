// Search on the archive page. Every entry is already in the HTML; this only shows and hides rows.
(function () {
  var box = document.getElementById("search");
  var input = document.getElementById("q");
  var holder = document.getElementById("rows");
  if (!box || !input || !holder) return;
  box.hidden = false;

  var rows = Array.prototype.map.call(holder.querySelectorAll(".row"), function (el) {
    return { el: el, hay: el.textContent.toLowerCase() };
  });
  var months = holder.querySelectorAll(".month");
  var empty = document.getElementById("empty");

  input.addEventListener("input", function () {
    var q = input.value.trim().toLowerCase();
    var shown = 0;
    rows.forEach(function (r) {
      var ok = !q || r.hay.indexOf(q) !== -1;
      r.el.hidden = !ok;
      if (ok) shown++;
    });
    Array.prototype.forEach.call(months, function (m) {
      m.hidden = m.querySelectorAll(".row:not([hidden])").length === 0;
    });
    empty.hidden = shown !== 0;
  });
})();
