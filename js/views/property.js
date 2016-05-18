/*global $,app,esri,accounting,google*/

app.views.property = function (accountNumber) {
  var alreadyGettingOpaData, opaRendered, opaDetailsRendered;

  app.hooks.ownerSearchDisclaimer.addClass('hide');

  // Search area prep
  app.hooks.propertyTitle.find('h1').html('&nbsp;');
  app.hooks.propertyTitle.find('.small-text').empty();
  // Reset the search forms when showing details
  app.hooks.searchFormContainer.find('form').each(function(i, form) {
    form.reset();
  });
  app.hooks.searchLeft.removeClass('medium-4').addClass('medium-14')
    .empty().append(app.hooks.propertyTitle);
    app.hooks.searchRight.html('');
  app.hooks.searchBox.removeClass('medium-16').addClass('medium-10 float-right');

  // Clear existing elements out of the way
  app.hooks.content.children().detach();
  app.hooks.aboveContent.children().detach();

  // Toggle loading messages, content panels
  app.hooks.valuationStatus.removeClass('hide');
  app.hooks.trashStatus.removeClass('hide');
  app.hooks.serviceAreaStatus.removeClass('hide');
  app.hooks.valuationPanel.addClass('hide');
  app.hooks.trashPanel.addClass('hide');
  app.hooks.serviceAreaPanel.addClass('hide');

  if (!history.state) history.replaceState({}, '');

  if (history.state.error) return renderError();

  if (history.state.opa && typeof(state) == 'object') {
    renderOpa();
  } else {
    app.hooks.content.append(app.hooks.loading);
    getOpaData();
  }

  // The less-detailed search result contains address_match
  if (hasOpaDetails()) {
    renderOpaDetails();
  } else {
    if (!alreadyGettingOpaData) getOpaData();
  }

  if (history.state.sa) {
    renderSa();
  } else if (history.state.address && !alreadyGettingOpaData) {
    getSaData();
  }

  function hasOpaDetails() {
    // ownership.mailing_address is only included in detailed results, not the
    // basic stuff that comes back from the geocode.
    return history.state.opa && history.state.opa.ownership.mailing_address;
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
        if( app.globals.historyState ){
          history.replaceState(state, ''); // Second param not optional in IE10
        } else {
          history.state = state;
        }
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
    // Check for an address with a dash in it. Dashed addresses are not in the
    // service area table, so pluck off the first number and try to look it up
    // that way.
    var address = history.state.address,
        matches = /(\d+) *- *(\d+) +(.+)$/gi.exec(address);

    if (matches && matches.length > 1) {
      address = matches[1] + ' ' + matches[3];
    }

    $.ajax('https://data.phila.gov/resource/bz79-67af.json?address_id=' + encodeURIComponent(address),
        {dataType: app.settings.ajaxType})
      .done(function (data) {
        var state = $.extend({}, history.state);
        state.sa = data.length > 0 ? data[0] : null;
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
    app.hooks.propertyTitle.find('.small-text').text('Philadelphia, PA ' + state.opa.zip);

    // Clear loading...
    app.hooks.content.empty();

    // Render owners
    app.hooks.propertyOwners.empty();
    state.opa.ownership.owners.forEach(function (owner) {
      app.hooks.propertyOwners.append($('<div>').text(owner));
    });

    app.hooks.opaAccount.text(state.opa.account_number);

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

    // Set OPA inquiry link
    app.hooks.opaInquiryUrl.attr('href', 'http://opa.phila.gov/opa.apps/Help/CitizenMain.aspx?sch=Ctrl2&s=1&url=search&id=' + state.opa.property_id);

    // Set L&I link
    app.hooks.liLink.attr('href', 'http://li.phila.gov/#summary?address=' + encodeURI(state.address));

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

          // Because you apparently can't do this through the setup properties.
          app.globals.map.disableScrollWheelZoom();

          // Set center
          app.globals.map.centerAndZoom([state.opa.geometry.x, state.opa.geometry.y], 8);

          // If check to fix intermittent bugs
          if (!app.globals.map || !app.globals.map.graphics) {
            console.warn('`graphics` layer on the map is null. Marker can not be added.');
            return;
          }

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
            zoom: 8,
            smartNavigation: false
          });

          app.globals.layer = new Tiled('https://tiles.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap/MapServer', {
            // esri is annoying in that it conversts my https into http. :\ this fixes that.
            tileServers: [
              'https://tiles1.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap/MapServer',
              'https://tiles2.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap/MapServer',
              'https://tiles3.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap/MapServer',
              'https://tiles4.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap/MapServer'
            ]
          });
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
    app.hooks.zoning.html(state.opa.characteristics.zoning + ': ' +
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

    app.hooks.improvementCondition.text(getExteriorConditionDescription(state.opa.characteristics.exterior_condition));
    app.hooks.beginningPoint.text(state.opa.characteristics.beginning_point);
    app.hooks.homestead.text(state.opa.characteristics.homestead ? 'Yes' : 'No');

    opaDetailsRendered = true;

    // Update the Tablesaw responsive tables
    $(document).trigger('enhance.tablesaw');

    // Hide status, show content.
    app.hooks.valuationStatus.addClass('hide');
    app.hooks.valuationPanel.removeClass('hide');
  }

  function getExteriorConditionDescription(id) {
    switch (id) {
      case '1':
        return 'Other';
      case '2':
        return 'New / Rehabbed';
      case '3':
        return 'Above Average';
      case '4':
        return 'Average';
      case '5':
        return 'Below Average';
      case '6':
        return 'Vacant';
      case '7':
        return 'Sealed / Structurally Compromised';
      default:
        return 'Not Applicable';
    }
  }

  function renderSa () {
    var state = history.state;
    var sa = state.sa;

    // No use rendering if there's been a data error
    if (state.error || !state.sa || state.sa.error) {
      app.hooks.propertySecondary.hide();
      return;
    }

    // Wait for both OPA render and SA data
    if (!opaRendered || !state.sa) return;

    app.hooks.propertySecondary.show();

    // Render service areas
    // Sidebox
    app.hooks.rubbishDay.text(app.util.abbrevToFullDay(sa.rubbish));

    // School catchment
    app.hooks.elementarySchool.text(sa.elementary_school);
    app.hooks.middleSchool.text(sa.middle_school);
    app.hooks.highSchool.text(sa.high_school);

    // Political
    app.hooks.councilDistrict.text(sa.council_2016);
    app.hooks.ward.text(sa.ward);
    app.hooks.wardDivisions.text(sa.ward_div);

    // Public safety
    app.hooks.policePsa.text(sa.psa);
    app.hooks.policeDistrict.text(sa.ppd_district);
    app.hooks.policeSector.text(sa.ppd_sector);
    app.hooks.policeDivision.text(sa.ppd_div);

    // Streets
    app.hooks.highwayDistrict.text(sa.highway_district);
    app.hooks.highwaySection.text(sa.highway_section);
    app.hooks.highwaySubsection.text(sa.highway_subsection);
    app.hooks.streetLightRoutes.text(sa.street_light_route);
    app.hooks.trafficDistrict.text(sa.traffic_district);
    app.hooks.recyclingDiversion.text(sa.recycling_diversion_rate_score);
    app.hooks.sanitationArea.text(sa.sanitation_area);
    app.hooks.sanitationDistrict.text(sa.sanitation_district);
    app.hooks.leafCollection.text(sa.leaf);
    app.hooks.trafficPmDistrict.text(sa.traffic_pm_district);

    // Districts
    app.hooks.planning.text(sa.planning_district);
    app.hooks.liDistrict.text(sa.lni_district);
    app.hooks.recreation.text(sa.rec_district);

    // Water
    app.hooks.pwdMaintenance.text(sa.pwd_maint_dist);
    app.hooks.pwdPressure.text(sa.pwd_pres_dist);
    app.hooks.waterTreatment.text(sa.pwd_wtpsa);
    app.hooks.waterPlate.text(sa.water_plate);

    // Hide status messages, load content.
    app.hooks.trashStatus.addClass('hide');
    app.hooks.trashPanel.removeClass('hide');
    app.hooks.serviceAreaStatus.addClass('hide');
    app.hooks.serviceAreaPanel.removeClass('hide');
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
