/*global $,app*/

app.views.property = function (p) {
  var alreadyGettingOpaData, opaRendered, opaDetailsRendered;

  // Search area prep
  app.els.propertyTitle.find('h1').html('&nbsp;');
  app.els.propertyTitle.find('.small-text').empty();
  app.els.search.val('');
  app.els.search.attr('placeholder', 'Search for another property');
  app.els.searchLeft.removeClass('medium-4').addClass('medium-14')
    .on('transitionend', function (e) {
      $(e.target).empty().append(app.els.propertyTitle);
    });
  app.els.searchBox.removeClass('medium-16').addClass('medium-10');

  // Empty content area
  app.els.content.children().detach();

  if (!history.state) history.replaceState({}, '');

  if (history.state.error) return renderError();

  if (history.state.opa) {
    renderOpa();
  } else {
    app.els.content.text('Loading...');
    getOpaData();
  }

  // The less-detailed search result contains address_match
  if (history.state.opa && !history.state.opa.address_match) {
    renderOpaDetails();
  } else {
    if (!alreadyGettingOpaData) getOpaData();
  }

  if (history.state.sa) {
    renderSa();
  } else if (history.state.address) {
    getSaData();
  }

  function getOpaData () {
    alreadyGettingOpaData = true;
    $.ajax('http://api.phila.gov/opa/v1.1/property/' + p + '?format=json')
      .done(function (data) {
        var state = $.extend({}, history.state);
        var property = data.data.property;
        state.opa = property;
        state.address = app.util.addressWithUnit(property);
        history.replaceState(state, ''); // Second param not optional in IE10
        if (!opaRendered) renderOpa();
        if (!opaDetailsRendered) renderOpaDetails();
        if (!state.sa) getSaData();
      })
      .fail(function () {
        history.replaceState({error: true}, '');
        renderError();
      });
  }

  function getSaData () {
    $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(history.state.address) + '/service-areas?format=json')
      .done(function (data) {
        var state = $.extend({}, history.state);
        state.sa = data.serviceAreaValues;
        history.replaceState(state, '');
        renderSa();
      })
      .fail(function () {
        var state = $.extend({}, history.state);
        state.sa = {error: true};
        history.replaceState(state, '');
      });
  }

  function renderOpa () {
    var state = history.state;

    // Breadcrumbs
    app.els.propertyCrumb.text(state.address);
    app.els.crumbs.update(app.els.propertyCrumb);

    // Search area
    app.els.propertyTitle.find('h1').text(state.address);
    app.els.propertyTitle.find('.small-text').text('#' + state.opa.account_number);

    // Clear loading...
    app.els.content.empty();

    // TODO Render OPA content

    opaRendered = true;
  }

  function renderOpaDetails () {
    // TODO Render valuation history

    opaDetailsRendered = true;
  }

  function renderSa () {
    var state = history.state;

    // No use rendering if there's been a data error
    if (state.error || state.sa.error) return;

    // Wait for both OPA render and SA data
    if (!opaRendered || !state.sa) return;

    // TODO Render service areas
  }

  function renderError () {
    // TODO Display an error message that looks nice
  }

  // // TODO Get L&I data
  // // Tim also pointed at http://api.phila.gov/ULRS311/Data/LIAddressKey/340%20n%2012th%20st
  // var topicsUrl = 'https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.p) + '/topics?format=json';
  // $.ajax(topicsUrl)
  //   .done(function (data) {
  //     var addressKey;
  //     data.topics.some(function (topic) {
  //       if (topic.topicName === 'AddressKeys') {
  //         return topic.keys.some(function (key) {
  //           if (key.topicId) {
  //             addressKey = key.topicId;
  //             return true;
  //           }
  //         });
  //       }
  //     });
  //     if (!addressKey) {
  //       propertyData.li = {error: 'No L&I key found at ' + topicsUrl + '.'};
  //       return --pending || app.views.address(propertyData);
  //     }
  //     $.ajax('https://services.phila.gov/PhillyApi/Data/v1.0/locations(' + addressKey + ')?$format=json')
  //       .done(function (data) {
  //         propertyData.li = data.d;
  //         --pending || app.views.property(propertyData);
  //       })
  //       .fail(function () {
  //         propertyData.li = {error: 'Failed to retrieve L&I address data.'};
  //         --pending || app.views.property(propertyData);
  //       });
  //   })
  //   .fail(function () {
  //     propertyData.li = {error: 'Failed to retrieve address topics.'};
  //     --pending || app.views.property(propertyData);
  //   });
  //
  // function renderLi () {
  // }
};
