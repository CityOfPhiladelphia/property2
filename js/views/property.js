/*global $,app,esri,accounting,google*/

app.views.property = function (accountNumber) {
  var alreadyGettingOpaData, opaRendered, opaDetailsRendered;

  // Search area prep
  app.hooks.propertyTitle.find('h1').html('&nbsp;');
  app.hooks.propertyTitle.find('.small-text').empty();
  app.hooks.search.val('');
  app.hooks.search.attr('placeholder', 'Search for another property');
  app.hooks.searchForm.removeClass('hint');
  app.hooks.searchForm.find('p').addClass('hidden');
  app.hooks.searchLeft.removeClass('medium-4').addClass('medium-14')
    .empty().append(app.hooks.propertyTitle);
    app.hooks.searchRight.html('');
  app.hooks.searchBox.removeClass('medium-16').addClass('medium-10 float-right');

  // Clear existing elements out of the way
  app.hooks.content.children().detach();

  if (!history.state) history.replaceState({}, '');

  if (history.state.error) return renderError();

  if (history.state.opa) {
    renderOpa();
  } else {
    app.hooks.content.append(app.hooks.loading);
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
    $.ajax('https://api.phila.gov/opa/v1.1/account/' + accountNumber + '?format=json',
      {dataType: app.settings.ajaxType})
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
    $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(history.state.address) +
      '/service-areas?format='+app.settings.ajaxType, {dataType: app.settings.ajaxType})
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
    app.hooks.propertyCrumb.text(state.address);
    app.hooks.crumbs.update(app.hooks.propertyCrumb);

    // Search area
    app.hooks.propertyTitle.find('h1').text(state.address);
    app.hooks.propertyTitle.find('.small-text').text('#' + state.opa.account_number);

    // Clear loading...
    app.hooks.content.empty();

    // Render owners
    app.hooks.propertyOwners.empty();
    state.opa.ownership.owners.forEach(function (owner) {
      app.hooks.propertyOwners.append($('<div>').text(owner));
    });

    // Render improvement stuff
    app.hooks.improvementDescription.text(state.opa.characteristics.description);
    app.hooks.landArea.text(accounting.formatNumber(state.opa.characteristics.land_area));
    app.hooks.improvementArea.text(accounting.formatNumber(state.opa.characteristics.improvement_area));

    // Empty zoning in prep for details
    app.hooks.zoning.empty();

    // Render sales details
    app.hooks.salesPrice.text(accounting.formatMoney(state.opa.sales_information.sales_price));
    app.hooks.salesDate.text(app.util.formatSalesDate(state.opa.sales_information.sales_date));

    // Empty mailing address in prep for details
    app.hooks.propertyMailingHeader.detach();
    app.hooks.propertyMailing.empty();

    // Empty valuation history
    app.hooks.valuation.empty();

    app.hooks.content.append(app.hooks.propertyMain);
    app.hooks.content.append(app.hooks.propertySide);
    app.hooks.belowContent.append(app.hooks.propertySecondary);

    // Render map stuff
    renderMap();
    setStreetViewLink();

    opaRendered = true;
  }

  function renderMap() {
    var state = history.state;

    require(['esri/map', 'esri/layers/ArcGISTiledMapServiceLayer',
      'esri/graphic', 'esri/geometry/Point', 'esri/symbols/SimpleMarkerSymbol', 'dojo/domReady!'],
      function(Map, Tiled, Graphic, Point, SimpleMarkerSymbol) {

        function initMapView() {
          var point, markerSymbol, markerGraphic, fillSymbol, fillGraphic;

          // Set center
          app.globals.map.centerAndZoom([state.opa.geometry.x, state.opa.geometry.y], 8);

          // Clear any existing markers
          app.globals.map.graphics.clear();

          // Create a new marker
          point = new Point(state.opa.geometry.x, state.opa.geometry.y);

          // Marker with a hole
          markerSymbol = new SimpleMarkerSymbol({
            "color": [242, 186, 19, 190],
            "size": 20,
            "xoffset": 0,
            "yoffset": 10,
            "type": "esriSMS",
            "style": "esriSMSPath",
            "path": "M16,3.5c-4.142,0-7.5,3.358-7.5,7.5c0,4.143,7.5,18.121,7.5,18.121S23.5,15.143,23.5,11C23.5,6.858,20.143,3.5,16,3.5z M16,14.584c-1.979,0-3.584-1.604-3.584-3.584S14.021,7.416,16,7.416S19.584,9.021,19.584,11S17.979,14.584,16,14.584z",
            "outline": {
              "color": [53, 53, 53, 255],
              "width": 0.5,
              "type": "esriSLS",
              "style": "esriSLSSolid"
            }
          });

          // Fill the hole
          fillSymbol = new SimpleMarkerSymbol({
            "color": [53, 53, 53, 255],
            "size": 5,
            "xoffset": 0,
            "yoffset": 14,
            "type": "esriSMS",
            "style": "esriSMSCircle",
            "outline": null
          });

          // Fill in the hole in the marker (there must be a better way)
          fillGraphic = new Graphic(point, fillSymbol);
          app.globals.map.graphics.add(fillGraphic);
          // Add marker to the map
          markerGraphic = new Graphic(point, markerSymbol);
          app.globals.map.graphics.add(markerGraphic);
        }

        // If the map is already constructed
        if (app.globals.map) {
          initMapView();
        } else {
          // Construct the map
          app.globals.map = new Map(app.hooks.map[0], {
            center: [state.opa.geometry.x, state.opa.geometry.y],
            zoom: 8
          });

          app.globals.layer = new Tiled('http://tiles.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityMap_20150515/MapServer');
          app.globals.map.addLayer(app.globals.layer);

          app.globals.map.on('load', initMapView);
        }
      }
    );
  }

  function setStreetViewLink() {
    var state = history.state,
        sv, addressLatLng;

    // Fetch StreetView data
    sv = new google.maps.StreetViewService();
    addressLatLng = new google.maps.LatLng(
      state.opa.geometry.y, state.opa.geometry.x);

    sv.getPanoramaByLocation(addressLatLng, 50, function(panoData, status) {
      var cbp = '',
          heading;

      if (status === google.maps.StreetViewStatus.OK) {
        heading = google.maps.geometry.spherical.computeHeading(
                    panoData.location.latLng, addressLatLng);

        cbp = '&cbp=12,'+heading+',0,1,0';
      }

      // Set the street view url
      app.hooks.streetViewUrl.attr('href', 'http://maps.google.com/maps?q=loc:'+
        state.opa.geometry.y + ',' + state.opa.geometry.x + '&layer=c&cbll='+
        state.opa.geometry.y + ',' + state.opa.geometry.x + cbp);
    });
  }

  function renderOpaDetails () {
    var state = history.state;

    // Render mailing address
    var pm = app.hooks.propertyMailing;
    var ma = state.opa.ownership.mailing_address;
    app.hooks.propertyMailingHeader.insertBefore(pm);
    pm.append($('<div>').text(state.opa.ownership.liaison));
    pm.append($('<div>').text(ma.street));
    pm.append($('<div>').text(ma.city + ', ' + ma.state));
    pm.append($('<div>').text(ma.zip));

    // Render zoning
    app.hooks.zoning.html(state.opa.characteristics.zoning + '<br>' +
      state.opa.characteristics.zoning_description);

    // Render valuation history
    state.opa.valuation_history.forEach(function (vh) {
      var row = $('<tr>');
      row.append($('<td>').text(vh.certification_year));
      row.append($('<td>').text(accounting.formatMoney(vh.market_value)));
      row.append($('<td>').text(accounting.formatMoney(vh.land_taxable)));
      row.append($('<td>').text(accounting.formatMoney(vh.improvement_taxable)));
      row.append($('<td>').text(accounting.formatMoney(vh.land_exempt)));
      row.append($('<td>').text(accounting.formatMoney(vh.improvement_exempt)));
      app.hooks.valuation.append(row);
    });

    opaDetailsRendered = true;
  }

  function renderSa () {
    var state = history.state;

    // No use rendering if there's been a data error
    if (state.error || state.sa.error) return;

    // Wait for both OPA render and SA data
    if (!opaRendered || !state.sa) return;

    // Render service areas
    state.sa.forEach(function (sa) {
      switch (sa.serviceAreaId) {
        // Sidebox
        case 'SA_STREETS_Rubbish_Recyc':
          return app.hooks.rubbishDay.text(sa.value);

        // School catchment
        case 'SA_SCHOOLS_Elementary_School_Catchment':
          return app.hooks.elementarySchool.text(sa.value);
        case 'SA_SCHOOLS_Middle_School_Catchment':
          return app.hooks.middleSchool.text(sa.value);
        case 'SA_SCHOOLS_High_School_Catchment':
          return app.hooks.highSchool.text(sa.value);

        // Political
        case 'SA_PLANNING_2016Councilmanic':
          return app.hooks.councilDistrict.text(sa.value);
        case 'SA_PLANNING_Ward':
          return app.hooks.ward.text(sa.value);
        case 'SA_PLANNING_Ward_Divisions':
          return app.hooks.wardDivisions.text(sa.value);

        // Public safety
        case 'SA_POLICE_PSA':
          return app.hooks.policePsa.text(sa.value);
        case 'SA_POLICE_District':
          return app.hooks.policeDistrict.text(sa.value);
        case 'SA_POLICE_Sector':
          return app.hooks.policeSector.text(sa.value);
        case 'SA_POLICE_Division':
          return app.hooks.policeDivision.text(sa.value);
        case 'SA_POLICE_FireDistricts':
          return app.hooks.fireDistrict.text(sa.value);

        // Streets
        case 'SA_STREETS_Highway_District':
          return app.hooks.highwayDistrict.text(sa.value);
        case 'SA_STREETS_Highway_Section':
          return app.hooks.highwaySection.text(sa.value);
        case 'SA_STREETS_Highway_Subsection':
          return app.hooks.highwaySubsection.text(sa.value);
        case 'SA_STREETS_Street_Lights_Routes':
          return app.hooks.streetLightRoutes.text(sa.value);
        case 'SA_Streets_Traffic_District':
          return app.hooks.trafficDistrict.text(sa.value);
        case 'SA_STREETS_Recycling_Diversion_Rate':
          return app.hooks.recyclingDiversion.text(sa.value);
        case 'SA_STREETS_Sanitation_Area':
          return app.hooks.sanitationArea.text(sa.value);
        case 'SA_STREETS_Sanitation_Districts':
          return app.hooks.sanitationDistrict.text(sa.value);
        case 'SA_STREETS_Leaf':
          return app.hooks.leafCollection.text(sa.value);
        case 'SA_Streets_Traffic_PM_District':
          return app.hooks.trafficPmDistrict.text(sa.value);

        // Districts
        case 'SA_PLANNING_Planning_Districts':
          return app.hooks.planning.text(sa.value);
        case 'SA_LNI_DISTRICT':
          return app.hooks.liDistrict.text(sa.value);
        case 'SA_RECREATION_Recreation_District':
          return app.hooks.recreation.text(sa.value);

        // Water
        case 'PWD_MAINT_DIST':
          return app.hooks.pwdMaintenance.text(sa.value);
        case 'PWD_PRES_DIST':
          return app.hooks.pwdPressure.text(sa.value);
        case 'PWD_WTPSA':
          return app.hooks.waterTreatment.text(sa.value);
        case 'SA_WATER_Water_Plate_Index':
          return app.hooks.waterPlate.text(sa.value);
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
