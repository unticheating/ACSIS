/**
 * Collapse / expand all question <details> blocks.
 */
(function () {
  "use strict";

  var btn = document.getElementById("er-collapse-all");
  var list = document.getElementById("er-questions-list");
  if (!btn || !list) return;

  var label = btn.querySelector(".er-collapse-label");

  btn.addEventListener("click", function () {
    var details = Array.prototype.slice.call(list.querySelectorAll(".er-q"));
    var anyOpen = details.some(function (d) {
      return d.open;
    });
    var targetOpen = !anyOpen;
    details.forEach(function (d) {
      d.open = targetOpen;
    });
    if (label) {
      label.textContent = targetOpen ? "Collapse all" : "Expand all";
    }
  });
})();
