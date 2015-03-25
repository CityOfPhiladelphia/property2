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

$(document).on('click', 'a', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  if (e.defaultPrevented) return;
  if (!history.pushState) return;
  var a = $(e.target);
  var href = a.attr('href');
  if (href.indexOf('?') && href !== window.location.pathname) return;
  e.preventDefault();
  history.pushState(null, a.text(), href);
  app.render(e);
});
