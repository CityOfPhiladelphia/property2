/*global $*/

// disable console.debug in production
if (window.location.hostname !== 'localhost') {
  console.debug = function () {};
}

// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

// Config
app.config = {
  ajaxType:             $.support.cors ? 'json' : 'jsonp',
  gatekeeperKey:        'c0eb3e7795b0235dfed5492fcd12a344',
  initialMapZoomLevel:  18,
  defaultError:         'Failed to retrieve results. Please try another search.',
  // carto tables used for retrieving property details
  carto: {
    baseUrl:              '//phl.carto.com/api/v2/sql',
    datasets: {
      properties:           'opa_properties_public',
      valuations:           'assessments',
    },
  },
};

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
  app.hooks.searchSelectClose.toggleClass('hide');
});

app.hooks.searchSelectClose.on('click', function(e) {
  e.preventDefault();
  app.hooks.searchSelectOptions.toggleClass('hide');
  app.hooks.searchSelectClose.toggleClass('hide');
});
$('.search-form-option').on('click', function(e) {
  if ( !$('.search-select-close').hasClass('hide') ){
    app.hooks.searchSelectOptions.addClass('hide');
    app.hooks.searchSelectClose.addClass('hide');
  }
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

// global variables
app.globals = {};

// A place for views to populate
app.views = {};

// Routing
app.route = function () {
  var query = $.deparam(window.location.search.substr(1)),
      params;

  // if there's a query, normalize it
  if (Object.keys(query).length > 0) {
    params = app.util.normalizeSearchQuery(query);
  }

  // if normalizing yielded valid params, route to results
  if (params) {
    app.views.results(params);
  }
  // otherwise show the front page
  else {
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
// This may not be needed after migrating to AIS
// app.util.address = function (property) {
//   var unit = property.unit;
//   // Trim leading zeros
//   if (unit) {
//     var unitTrimmed = unit.replace(/^0+/, '');
//     if (unitTrimmed.length > 0) unit = unitTrimmed;
//     else unit = null;
//   }
//   // Handle different address keys in OPA, Socrata
//   var address = property.full_address || property.location;
//   address += (unit ? ' #' + unit : '');
//   return address;
// };

// Form a well-formatted ZIP code.
app.util.formatZipCode = function (zip) {
  if (zip) {
    if (!(typeof zip == 'string' || zip instanceof String)) {
      zip = zip.toString();
    }
    if (zip.length === 9) zip  = [zip.slice(0, 5), '-', zip.slice(5)].join('');
  }
  else zip = '';
  return zip;
}

app.util.normalizeSearchQuery = function (data) {
  var parsedQuery;

  if (data.p || data.an) {
    var accountNum = data.p || data.an;
    parsedQuery = {
      type: 'account',
      label: app.util.cleanPropertyQuery(accountNum),
      account: app.util.cleanPropertyQuery(accountNum)
    };

  } else if (data.bn && data.bs) {
    parsedQuery = {
      type: 'block',
      label: app.util.cleanPropertyQuery(data.bn + ' ' + data.bs),
      address: app.util.cleanPropertyQuery(data.bn + ' ' + data.bs)
    };

  } else if (data.a) {
    var label = app.util.cleanPropertyQuery(data.a);
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

app.util.cleanPropertyQuery = function (query) {
  if (!query) {
    return '';
  }

  // Trim, remove extra speces, and replace dots and hashes -- API can't handle them
  return query.replace(/\./g, ' ').replace(/ {2,}/g, ' ').replace(/#/g, '').trim().toUpperCase();
};

app.util.abbrevToFullDay = function (abbrev) {
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
app.util.serializeQueryStringParams = function (obj) {
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

app.util.constructTencode = function (aisObj) {
  var props = aisObj.properties,
      streetCode = props.street_code,
      addressLow = props.address_low.toString(),
      addressLowPadded = '0'.repeat(5 - addressLow.length) + addressLow,
      unitNum = props.unit_num,
      tencode = streetCode + addressLowPadded;

  // check for unit num and pad
  if (unitNum.length > 0) {
    var unitNumPadded = '0'.repeat(7 - unitNum.length) + unitNum;
    tencode += unitNumPadded;
  }

  return tencode;
}
