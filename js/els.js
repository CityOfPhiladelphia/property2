/* global $,app */
// Set up pointers to useful elements

app.els = {
  appLink: $('<a>').attr('href', window.location.pathname)
};

$('[data-hook]').each(function (i, el) {
  var $el = $(el);
  // Convert hyphen-names to camelCase in hooks
  var hook = $el.data('hook').replace(/-([a-z])/g, function (m) {
    return m[1].toUpperCase();
  });
  app.els[hook] = $el;
});

// We have our pointers so we can take the templates container out of the DOM
$('#templates').detach();

app.els.appCrumbText = app.els.appCrumb.contents();
app.els.appCrumbLink = app.els.appLink.clone().text(app.els.appCrumb.text());

// Attach listeners
app.els.appLink.on('click', homeClick);
app.els.appCrumbLink.on('click', homeClick);

function homeClick (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  if (!history.pushState) return;
  var a = $(e.target);
  var href = a.attr('href');
  e.preventDefault();
  window.scroll(0, 0);
  if (!window.location.search) return; // already home
  history.pushState(null, a.text(), href);
  app.render(e);
}
