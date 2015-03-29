/* global $,app */

// Fix app name in header to point at page without "search" portion of URL
app.views.titleLink();

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
      $.ajax('http://api.phila.gov/opa/v1.1/address/' + encodeURIComponent(opaAddress(params.q)) + '?format=json')
        .done(function (data) {
          app.views.results(data);
        })
        .fail(function () {
          var data = {error: 'Failed to retrieve results. Please try another search.'};
          app.views.results(data);
        });
    }
  } else if (params.p) {
    app.views.property(params.p);
    // app.views.propertyPreFetch(params.p);
    // if (history.state) {
    //   app.views.property(history.state);
    // } else {
    //   app.views.loading();
    //   var propertyData = {};
    //   // Get OPA data
    //   $.ajax('http://api.phila.gov/opa/v1.1/address/' + encodeURIComponent(opaAddress(params.p)) + '?format=json')
    //     .done(function (data) {
    //       if (data.data && data.data.properties && data.data.properties.length) {
    //         propertyData.opa = data.data.properties[0];
    //       } else {
    //         propertyData.opa = {error: 'No properties returned in OPA data.'};
    //       }
    //       --pending || app.views.property(propertyData);
    //     })
    //     .fail(function () {
    //       propertyData.opa = {error: 'Failed to retrieve OPA address data.'};
    //       --pending || app.views.property(propertyData);
    //     });
    //   var pending = 3;
    //   // Get CityMaps data
    //   $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.p) + '/service-areas?format=json')
    //     .done(function (data) {
    //       propertyData.sa = data.serviceAreaValues;
    //       --pending || app.views.property(propertyData);
    //     })
    //     .fail(function () {
    //       propertyData.sa = {error: 'Failed to retrieve data for service areas.'};
    //       --pending || app.views.property(propertyData);
    //     });
    //   // Get L&I data
    //   // Tim also pointed at http://api.phila.gov/ULRS311/Data/LIAddressKey/340%20n%2012th%20st
    //   var topicsUrl = 'https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.p) + '/topics?format=json';
    //   $.ajax(topicsUrl)
    //     .done(function (data) {
    //       var addressKey;
    //       data.topics.some(function (topic) {
    //         if (topic.topicName === 'AddressKeys') {
    //           return topic.keys.some(function (key) {
    //             if (key.topicId) {
    //               addressKey = key.topicId;
    //               return true;
    //             }
    //           });
    //         }
    //       });
    //       if (!addressKey) {
    //         propertyData.li = {error: 'No L&I key found at ' + topicsUrl + '.'};
    //         return --pending || app.views.address(propertyData);
    //       }
    //       $.ajax('https://services.phila.gov/PhillyApi/Data/v1.0/locations(' + addressKey + ')?$format=json')
    //         .done(function (data) {
    //           propertyData.li = data.d;
    //           --pending || app.views.property(propertyData);
    //         })
    //         .fail(function () {
    //           propertyData.li = {error: 'Failed to retrieve L&I address data.'};
    //           --pending || app.views.property(propertyData);
    //         });
    //     })
    //     .fail(function () {
    //       propertyData.li = {error: 'Failed to retrieve address topics.'};
    //       --pending || app.views.property(propertyData);
    //     });
    // }
  } else {
    app.views.breadcrumbs();
    app.views.search(null, 'Enter address, account number, intersection, or city block');
    app.views.front();
  }
};

app.render();

// Handle traversing of history
window.onpopstate = app.render;
