/*global $*/

// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

// Set up pointers to useful elements
app.hooks = {};

$('[data-hook]').each(function (i, el) {
  var dataHook = $(el).data('hook'),
      // Get _all_ elements for a data-hook value, not just the single element
      // in the current iteration. Supports multiple elements with the same
      // data-hook value.
      $el = $('[data-hook="' + dataHook + '"]');
  // Convert hyphen-names to camelCase in hooks
  var hook = dataHook.replace(/-([a-z])/g, function (m) {
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
  ajaxType: $.support.cors ? 'json' : 'jsonp'
};

// global variables
app.globals = {};

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
};

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

// Get the string is an account number, intersection, address range, address,
// block, or owner.
app.util.parsePropertyQuery = function(query) {
  var m, parsedQuery,
      streetNum1, streetNum2, streetNumHundred1, streetNumHundred2,
      streetNumRemainder1, streetNumRemainder2, street;

  query = app.util.cleanPropertyQuery(query);

  if (m = /#?(\d{9})/.exec(query)) {
    parsedQuery = { type: 'account', account: m[1] };

  } else if (m = /(.+) +(&|and|at) +(.+)/.exec(query)) {
    parsedQuery = { type: 'intersection', street1: m[1], street2: m[3] };

  } else if (m = /^(\d+) *(-|to) *(\d+) +([A-Za-z ]+)/.exec(query)) {
    streetNum1 = parseInt(m[1], 10);
    streetNum2 = parseInt(m[3], 10);
    street = m[4];

    streetNumHundred1 = Math.floor(streetNum1 / 100);
    streetNumHundred2 = Math.floor(streetNum2 / 100);

    streetNumRemainder1 = streetNum1 % 100;
    streetNumRemainder2 = streetNum2 % 100;

    if (streetNumHundred1 === streetNumHundred2 &&
        streetNumRemainder1 === 0 && streetNumRemainder2 === 99) {
      parsedQuery = { type: 'block', address: streetNum1 + ' ' + street };
    } else{
      parsedQuery = { type: 'address', address: query };
    }

  } else if (m = /^(\d+) +(.+)/.exec(query)) {
    parsedQuery = { type: 'address', address: query };

  } else {
    parsedQuery = { type: 'owner', owner: query };
  }

  return parsedQuery;
};

app.util.cleanPropertyQuery = function(query) {
  // Trim, remove extra speces, and replace dots -- API can't handle them
  return query.trim().replace(/\./g, ' ').replace(/ {2,}/g, ' ');
};

// Pull a human-readable sales date from what the OPA API gives us
app.util.formatSalesDate = function (salesDate) {
  var d, m;
  if (m = /(-?\d+)-/.exec(salesDate)) {
    d = new Date(+m[1]);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' +  d.getFullYear();
  } else return '';
};

// Get a full address with unit included from OPA property
app.util.default = function (val, def) {
  return val || def;
};


// We only handle whole dollar amounts here
accounting.settings.currency.precision = 0;

//things to do on small screens
var smallScreens = $( window ).width() >= '480';
