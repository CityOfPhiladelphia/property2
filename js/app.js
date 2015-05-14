/*global $*/

// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

// Set up pointers to useful elements
app.hooks = {};

$('[data-hook]').each(function (i, el) {
  var $el = $(el);
  // Convert hyphen-names to camelCase in hooks
  var hook = $el.data('hook').replace(/-([a-z])/g, function (m) {
    return m[1].toUpperCase();
  });
  app.hooks[hook] = $el;
});

// We have our pointers so we can take the templates container out of the DOM
$('#templates').detach();

// A smart link back to the front page for wrapping other elements
app.hooks.frontLink = $('<a>').attr('href', window.location.pathname).on('click', function (e) {
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
app.hooks.crumbs.update = function (crumb) {
  var self = this;

  // Cached related element references
  self.hooks = self.hooks || {};
  self.hooks.app = self.hooks.app || self.find('li').last();
  self.hooks.appText = self.hooks.appText || self.hooks.app.contents();
  self.hooks.appLink = self.hooks.appLink || app.hooks.frontLink.clone(true).text(self.hooks.app.text());

  if (self.hooks.crumb) self.hooks.crumb.detach();

  if (crumb) {
    self.hooks.appText.detach();
    self.hooks.app.append(self.hooks.appLink);
    self.hooks.crumb = crumb;
    self.append(self.hooks.crumb);
  } else {
    self.hooks.appLink.detach();
    self.hooks.app.append(self.hooks.appText);
  }
};

// App title should link to front
app.hooks.appTitle.contents().wrap(app.hooks.frontLink);

// pushState on search submit
app.hooks.search.parent().on('submit', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  e.preventDefault();
  var q = e.target.elements.q;
  q.blur();
  history.pushState(null, q.value, '?' + $.param({q: q.value}));
  window.scroll(0, 0);
  app.views.results(q.value);
});

// global settings
app.settings = {
  ajaxType: 'json'
};

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
  history.replaceState = function (s, t, l) {
    if (l) window.location = l;
    else history.state = s;
  };
}

// App utilties
app.util = {};

// Get a full address with unit included from OPA property
app.util.addressWithUnit = function (property) {
  var unit = property.unit || '';
  if (unit) unit = ' #' + unit.replace(/^0+/, '');
  return property.full_address + unit;
};

// Pull a human-readable sales date from what the OPA API gives us
app.util.formatSalesDate = function (salesDate) {
  var d, m;
  if (m = /(\d+)-/.exec(salesDate)) {
    d = new Date(+m[1]);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' +  d.getFullYear();
  } else return '';
};

// We only handle whole dollar amounts here
accounting.settings.currency.precision = 0;

//things to do on small screens
var smallScreens = $( window ).width() >= '480';
