// Filters for the home page. Every entry is already in the HTML; this only shows and hides them.
(function () {
  var feed = document.getElementById("feed");
  var filters = document.getElementById("filters");
  if (!feed || !filters) return;
  filters.hidden = false;

  var entries = Array.prototype.map.call(feed.querySelectorAll(".entry"), function (el) {
    return { el: el, field: el.dataset.field, hay: el.textContent.toLowerCase() };
  });
  var days = feed.querySelectorAll(".day");
  var empty = document.getElementById("empty");
  var chips = filters.querySelectorAll(".chip");
  var state = { field: "All", q: "" };

  function apply() {
    var shown = 0;
    entries.forEach(function (e) {
      var ok = (state.field === "All" || e.field === state.field) &&
        (!state.q || e.hay.indexOf(state.q) !== -1);
      e.el.hidden = !ok;
      if (ok) shown++;
    });
    Array.prototype.forEach.call(days, function (d) {
      var n = d.querySelectorAll(".entry:not([hidden])").length;
      d.hidden = n === 0;
      d.querySelector("h2 span").textContent = n + (n === 1 ? " entry" : " entries");
    });
    empty.hidden = shown !== 0;
  }

  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener("click", function () {
      state.field = chip.dataset.field;
      Array.prototype.forEach.call(chips, function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
      apply();
    });
  });
  document.getElementById("q").addEventListener("input", function (ev) { state.q = ev.target.value.trim().toLowerCase(); apply(); });
})();
