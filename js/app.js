/*global $*/

// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

// Set up pointers to useful elements
app.els = {};

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

// A smart link back to the front page for wrapping other elements
app.els.frontLink = $('<a>').attr('href', window.location.pathname).on('click', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  var a = $(e.target);
  var href = a.attr('href');
  e.preventDefault();
  window.scroll(0, 0);
  if (!window.location.search) return; // already at the front
  history.pushState(null, a.text(), href);
  app.views.front();
});

// Clever breadcrumbs
app.els.crumbs.update = function (crumb) {
  var self = this;

  // Cached related element references
  self.els = self.els || {};
  self.els.app = self.els.app || self.find('li').last();
  self.els.appText = self.els.appText || self.els.app.contents();
  self.els.appLink = self.els.appLink || app.els.frontLink.clone(true).text(self.els.app.text());

  if (self.els.crumb) self.els.crumb.detach();

  if (crumb) {
    self.els.appText.detach();
    self.els.app.append(self.els.appLink);
    self.els.crumb = crumb;
    self.append(self.els.crumb);
  } else {
    self.els.appLink.detach();
    self.els.app.append(self.els.appText);
  }
};

// App title should link to front
app.els.appTitle.contents().wrap(app.els.frontLink);

// pushState on search submit
app.els.search.parent().on('submit', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  e.preventDefault();
  var q = e.target.elements.q;
  q.blur();
  history.pushState(null, q.value, '?' + $.param({q: q.value}));
  app.views.results(q.value);
});

// A place for views to populate
app.views = {};

// Routing
app.route = function () {
  var params = $.deparam(window.location.search.substr(1));

  if (params.q) {
    app.views.results(params.q);
  } else if (params.p) {
    app.views.property(params.p);
  } else {
    app.views.front();
  }
}

// Route on page load and back button
$(app.route);
window.onpopstate = app.route;

// Shims to gracefully degrade pushState and replaceState for IE9
if (!history.pushState) {
  history.pushState = function (s, t, l) {window.location = l};
  history.replaceState = function (s) {history.state = s};
}

// App utilties
app.util = {};

// Get a full address with unit included from OPA property
app.util.addressWithUnit = function (property) {
  var unit = property.unit || '';
  if (unit) unit = ' #' + unit.replace(/^0+/, '');
  return property.full_address + unit;
};
