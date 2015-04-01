/*global $,app*/

app.views.property = function (p) {
  var alreadyGettingOpaData, opaRendered, opaDetailsRendered;

  // Search area prep
  app.els.propertyTitle.find('h1').html('&nbsp;');
  app.els.propertyTitle.find('.small-text').empty();
  app.els.search.val('');
  app.els.search.attr('placeholder', 'Search for another property');
  app.els.searchLeft.removeClass('medium-4').addClass('medium-14')
    .empty().append(app.els.propertyTitle);
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

    // Render owners
    app.els.propertyOwners.empty();
    state.opa.ownership.owners.forEach(function (owner) {
      app.els.propertyOwners.append($('<div>').text(owner));
    });

    // Render improvement stuff
    app.els.improvementDescription.text(state.opa.characteristics.description);
    app.els.landArea.text(state.opa.characteristics.land_area);
    app.els.improvementArea.text(state.opa.characteristics.improvement_area);
    app.els.zoning.text(state.opa.characteristics.zoning_description);

    // Empty mailing address in prep for details
    app.els.propertyMailingHeader.detach();
    app.els.propertyMailing.empty();

    // Empty valuation history
    app.els.valuation.empty();

    app.els.content.append(app.els.propertySide);
    app.els.content.append(app.els.propertyMain);

    opaRendered = true;
  }

  function renderOpaDetails () {
    var state = history.state;

    // Render mailing address
    var pm = app.els.propertyMailing;
    var ma = state.opa.ownership.mailing_address;
    app.els.propertyMailingHeader.insertBefore(pm);
    pm.append($('<div>').text(ma.street));
    pm.append($('<div>').text(ma.city + ', ' + ma.state));
    pm.append($('<div>').text(ma.zip));

    // Render valuation history
    state.opa.valuation_history.forEach(function (vh) {
      var row = $('<tr>');
      row.append($('<td>').text(vh.certification_year));
      row.append($('<td>').text(vh.market_value));
      row.append($('<td>').text(vh.improvement_taxable));
      row.append($('<td>').text(vh.land_taxable));
      row.append($('<td>').text(vh.total_exempt));
      row.append($('<td>').text(vh.taxes));
      app.els.valuation.append(row);
    });

    opaDetailsRendered = true;
  }

  function renderSa () {
    var state = history.state;

    // No use rendering if there's been a data error
    if (state.error || state.sa.error) return;

    // Wait for both OPA render and SA data
    if (!opaRendered || !state.sa) return;

    // TODO Render service areas
    state.sa.forEach(function (sa) {
      if (sa.serviceAreaId === 'SA_STREETS_Rubbish_Recyc') {
        app.els.rubbishDay.text(sa.value);
      } else if (sa.serviceAreaId === 'SA_SCHOOLS_Elementary_School_Catchment') {
        app.els.elementarySchool.text(sa.value);
      }
    });
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
