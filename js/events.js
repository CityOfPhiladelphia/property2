/* global $,app */
// Set up events on elements

app.els.search.parent().on('submit', function (e) {
  if (!history.pushState) return;
  e.preventDefault();
  var q = e.target.elements.q;
  q.blur();
  history.pushState(null, q.value, '?' + $.param({q: q.value}));
  app.render(e);
});
