/* global $,app */

// Fix app name in header to point at page without "search" portion of URL
app.views.titleLink()

// OPA address needs to either separate unit by slash or end in slash
function opaAddress (address) {
  if (address.indexOf(' #') !== -1) {
    address = address.replace(' #', '/');
  } else address = address + '/';
  return address;
}

app.render = function (e) {
  // Check route and display corresponding view
  var params = $.deparam(window.location.search.substr(1));

  // Event passed in if called via onpopstate or event handler
  if (e) {
  }

  if (params.q) {
    app.views.resultsPreFetch(params.q);

    // If we already have state no need to hit API
    if (history.state) app.views.results(history.state);
    else {
      app.views.loading();
      $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.q) + '?format=json')
        .done(function (data) {
          app.views.results(data);
        })
        .fail(function () {
          var data = {error: 'Failed to retrieve results. Please try another search.'};
          app.views.results(data);
        });
    }
  } else if (params.a) {
    app.views.addressPreFetch(params.a);
    if (history.state) {
      app.views.address(history.state);
    } else {
      app.views.loading();
      var addressData = {};
      var pending = 3;
      // Get CityMaps data
      $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.a) + '/service-areas?format=json')
        .done(function (data) {
          addressData.sa = data.serviceAreaValues;
          --pending || app.views.address(addressData);
        })
        .fail(function () {
          addressData.sa = {error: 'Failed to retrieve data for service areas.'};
          --pending || app.views.address(addressData);
        });
      // Get OPA data
      $.ajax('http://api.phila.gov/opa/v1.1/address/' + encodeURIComponent(opaAddress(params.a)) + '?format=json')
        .done(function (data) {
          if (data.data && data.data.properties && data.data.properties.length) {
            addressData.opa = data.data.properties[0];
          } else {
            addressData.opa = {error: 'No properties returned in OPA data.'};
          }
          --pending || app.views.address(addressData);
        })
        .fail(function () {
          addressData.opa = {error: 'Failed to retrieve OPA address data.'};
          --pending || app.views.address(addressData);
        });
      // Get L&I data
      // Tim also pointed at http://api.phila.gov/ULRS311/Data/LIAddressKey/340%20n%2012th%20st
      var topicsUrl = 'https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.a) + '/topics?format=json';
      $.ajax(topicsUrl)
        .done(function (data) {
          var addressKey;
          data.topics.some(function (topic) {
            if (topic.topicName === 'AddressKeys') {
              return topic.keys.some(function (key) {
                if (key.topicId) {
                  addressKey = key.topicId;
                  return true;
                }
              });
            }
          });
          if (!addressKey) {
            addressData.li = {error: 'No L&I key found at ' + topicsUrl + '.'};
            return --pending || app.views.address(addressData);
          }
          $.ajax('https://services.phila.gov/PhillyApi/Data/v1.0/locations(' + addressKey + ')?$format=json')
            .done(function (data) {
              addressData.li = data.d;
              --pending || app.views.address(addressData);
            })
            .fail(function () {
              addressData.li = {error: 'Failed to retrieve L&I address data.'};
              --pending || app.views.address(addressData);
            });
        })
        .fail(function () {
          addressData.li = {error: 'Failed to retrieve address topics.'};
          --pending || app.views.address(addressData);
        });
    }
  } else {
    app.views.breadcrumbs();
    app.views.search(null, 'Enter address, account number, intersection, or city block');
    app.views.front();
  }
};

app.render();

// Handle traversing of history
window.onpopstate = app.render;
