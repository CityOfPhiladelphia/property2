// Set up events on elements

app.els.search.parent().on('submit', function (e) {
  if (!history.pushState) return;
  e.preventDefault();
  var q = e.target.elements.q.value;
  history.pushState(null, q, '?' + $.param({q: q}));
  app.render();
});
