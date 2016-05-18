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

app.hooks.searchSelect.on('click', function(e) {
  e.preventDefault();
  app.hooks.searchSelectOptions.toggleClass('hide');
});

app.hooks.searchSelectOptions.find('li').on('click', function(e) {
  e.preventDefault();

  var type = $(this).data('searchtype');

  // Reset the forms when selecting a new one
  app.hooks.searchFormContainer.find('form').each(function(i, form) {
    form.reset();
  });

  showSearchOption(type);
});

function showSearchOption(type) {
  // Hide all search options
  app.hooks.searchFormContainer.find('.search-form-option').addClass('hide');

  // Show the search option selected
  switch(type) {
  case 'account':
    app.hooks.searchSelectLabel.text('Account');
    app.hooks.searchAccount.removeClass('hide');
    break;
  case 'intersection':
    app.hooks.searchSelectLabel.text('Intersection');
    app.hooks.searchIntersection.removeClass('hide');
    break;
  case 'block':
    app.hooks.searchSelectLabel.text('Block');
    app.hooks.searchBlock.removeClass('hide');
    break;
  case 'address':
    app.hooks.searchSelectLabel.text('Address');
    app.hooks.searchAddress.removeClass('hide');
    break;
  case 'owner':
    app.hooks.searchSelectLabel.text('Owner');
    app.hooks.searchOwner.removeClass('hide');
    break;
  }
}

// pushState on search submit
app.hooks.searchFormContainer.find('form').on('submit', function (e) {
  if (e.ctrlKey || e.altKey || e.shiftKey) return;
  e.preventDefault();

  var params = app.util.serializeObject(this),
      queryStringParams = app.util.serializeQueryStringParams(params);

  params = app.util.normalizeSearchQuery(params);

  if (params) {
    $(this).find('input').blur();
    history.pushState(null, params, '?' + queryStringParams);
    window.scroll(0, 0);
    app.views.results(params);
  }
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

  if (params.p) {
    app.views.property(params.p);
  } else if (Object.keys(params).length) {
    params = app.util.normalizeSearchQuery(params);
    if (params) {
      showSearchOption(params.type);
      app.views.results(params);
    }
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

// Support browsers lacking history.state support (Safari 5)
if (history.state === undefined){
  app.globals.historyState = false;
} else {
  app.globals.historyState = true;
}

// App utilties
app.util = {};

// Get a full address with unit included from OPA property
app.util.addressWithUnit = function (property) {
  var unit = property.unit || '';
  if (unit) unit = ' #' + unit.replace(/^0+/, '');
  // Handle different address keys in OPA, Socrata
  var baseAddress = property.full_address || property.location;
  return baseAddress + unit;
};

app.util.normalizeSearchQuery = function(data) {
  var parsedQuery, label;

  if (data.an) {
    parsedQuery = {
      type: 'account',
      label: app.util.cleanPropertyQuery(data.an),
      account: app.util.cleanPropertyQuery(data.an)
    };

  } else if (data.s1 && data.s2) {
    parsedQuery = {
      type: 'intersection',
      label: app.util.cleanPropertyQuery(data.s1 + ' and ' + data.s2),
      street1: app.util.cleanPropertyQuery(data.s1),
      street2: app.util.cleanPropertyQuery(data.s2)
    };

  } else if (data.bn && data.bs) {
    parsedQuery = {
      type: 'block',
      label: app.util.cleanPropertyQuery(data.bn + ' ' + data.bs),
      address: app.util.cleanPropertyQuery(data.bn + ' ' + data.bs)
    };

  } else if (data.a) {
    label = app.util.cleanPropertyQuery(data.a);
    label += app.util.cleanPropertyQuery(data.u) ? ' ' + data.u : '';

    parsedQuery = {
      type: 'address',
      label: label,
      address: app.util.cleanPropertyQuery(data.a),
      unit: app.util.cleanPropertyQuery(data.u)
    };

  } else if (data.o) {
    parsedQuery = {
      type: 'owner',
      label: app.util.cleanPropertyQuery(data.o),
      owner: app.util.cleanPropertyQuery(data.o)
    };
  }

  return parsedQuery;
};

app.util.cleanPropertyQuery = function(query) {
  if (!query) {
    return '';
  }

  // Trim, remove extra speces, and replace dots and hashes -- API can't handle them
  return query.replace(/\./g, ' ').replace(/ {2,}/g, ' ').replace(/#/g, '').trim().toUpperCase();
};

// Pull a human-readable sales date from what the OPA API gives us
app.util.formatSalesDate = function (salesDate) {
  var d, m;
  if (m = /(-?\d+)-/.exec(salesDate)) {
    d = new Date(+m[1]);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' +  d.getFullYear();
  } else return '';
};

app.util.abbrevToFullDay = function(abbrev) {
  switch(abbrev) {
    case 'SUN': return 'Sunday';
    case 'MON': return 'Monday';
    case 'TUE': return 'Tuesday';
    case 'WED': return 'Wednesday';
    case 'THU': return 'Thursday';
    case 'FRI': return 'Friday';
    case 'SAT': return 'Saturday';
  }

  return abbrev;
};

// Get a full address with unit included from OPA property
app.util.default = function (val, def) {
  return val || def;
};

// Serialize a form into an object, assuming only one level of depth
app.util.serializeObject = function (form) {
  var obj = {};
  $.each($(form).serializeArray(), function (i, element) {
      if (!obj[element.name]) {
        obj[element.name] = element.value;
      }
    });
  return obj;
};

// Serialize an object to query string params
app.util.serializeQueryStringParams = function(obj) {
  var str = [];
  for(var p in obj) {
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
    }
  }
  return str.join('&');
};

// We only handle whole dollar amounts here
accounting.settings.currency.precision = 0;

//things to do on small screens
var smallScreens = $( window ).width() >= '480';
