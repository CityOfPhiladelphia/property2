/*global $,app,esri,accounting,google*/

app.views.property = function (accountNumber) {
  console.debug('*property*', accountNumber);

  var alreadyGettingOpaData, opaRendered, opaDetailsRendered;

  app.hooks.ownerSearchDisclaimer.addClass('hide');

  // Search area prep
  app.hooks.propertyTitle.find('h1').html('&nbsp;');
  app.hooks.propertyTitle.find('.small-text').empty();
  // Reset the search forms when showing details
  app.hooks.searchFormContainer.find('form').each(function(i, form) {
    form.reset();
  });
  app.hooks.searchLeft.removeClass('medium-4')
                      .addClass('medium-14')
                      .empty()
                      .append(app.hooks.propertyTitle);
  app.hooks.searchRight.html('');
  app.hooks.searchBox.removeClass('medium-16').addClass('medium-10 float-right');

  // Clear existing elements out of the way
  if (app.hooks.valuationTable) app.hooks.valuationTable.detach();
  app.hooks.content.children().detach();
  app.hooks.aboveContent.children().detach();

  // Show loading messages
  app.hooks.valuationStatus.removeClass('hide');
  app.hooks.trashStatus.removeClass('hide');
  app.hooks.serviceAreaStatus.removeClass('hide');
  app.hooks.valuationPanel.addClass('hide');
  app.hooks.trashPanel.addClass('hide');
  app.hooks.serviceAreaPanel.addClass('hide');

  if (!history.state) history.replaceState({}, '');

  // If there's an error, render it and stop there.
  // REVIEW this doesn't seem to be used anymore
  if (history.state.error) {
    renderError(history.state.error);
    return;
  }

  if (history.state.ais && history.state.opa) {
    renderOpa();
    renderOpaDetails();
    renderSa();
  } else if (history.state.ais && !history.state.opa) {
    renderSa();
    getOpaData();
  } else {
    app.hooks.content.append(app.hooks.loading);
    getSaData();
  }

  function hasOpaDetails() {
    // mailing_address_1 is only included in detailed results, not the
    // basic stuff that comes back from the geocode.
    return history.state.opa && history.state.opa.mailing_address_1;
  }

  function getOpaData() {
    var url = app.config.carto.baseUrl,
        table = app.config.carto.datasets.properties;

    alreadyGettingOpaData = true;
    params = {q: "select * from " + table + " where \
                  parcel_number = '" + accountNumber + "'"};

    $.ajax({
      url: url,
      data: params,
    })
      .then(function (res) {
        var rows = res.rows,
            d = $.Deferred();

        // make sure we got at least one result
        rows.length > 0 ? d.resolve(rows[0]) : d.reject();
        return d.promise();
      })
      .done(function (data) {
        var state = $.extend({}, history.state);
        state.opa = data;
        // per issue #208, this line has been throwing errors when state.ais
        // is undefined (which should never happen). wrapping it in a try and
        // passing the exact state data back with the exception.
        try {
          state.address = state.ais.properties.opa_address;
        } catch (e) {
          Raven.captureException(e, {
            extra: {
              state: state,
            },
          });
        }

        if (app.globals.historyState) {
          history.replaceState(state, ''); // Second param not optional in IE10
        } else {
          history.state = state;
        }

        renderOpa();
        renderOpaDetails();
      })
      .fail(function () {
        var error = app.config.defaultError;
        history.replaceState({error: error}, '');
        renderError(error);
      });
  }

  // this appears to be called when the app is loaded with a account num in the
  // query string.
  function getSaData() {
    // REVIEW should this url be protocol-less?
    $.ajax('https://api.phila.gov/ais_ps/v1/account/' + accountNumber)
      .done(function (data) {
        var state = $.extend({}, history.state);
        var property, href, withUnit;
        
        // DEBUG for sentry breadcrumb
        // Object.keys has been shimmed, so this should work everywhere.
        var prevStateKeys = Object.keys(state || {});

        state.ais = data;

        // leave sentry breadcrumb to help with debugging
        Raven.captureBreadcrumb({
          message: 'results.js: getSaData will replace AIS state',
          category: 'data',
          level: 'debug',
          data: {
            prevStateKeys: prevStateKeys,
            nextStateKeys: Object.keys(state || {}),
          },
        });

        if (app.globals.historyState) {
          history.replaceState(state, ''); // Second param not optional in IE10
        } else {
          history.state = state;
        }

        renderSa();
        getOpaData();
      })
      .fail(function () {
        var error = app.config.defaultError;
        history.replaceState({error: error}, '');
        // render();
        renderError(error);
      });
  }

  function renderOpa() {
    var state = history.state;

    // Breadcrumbs
    app.hooks.propertyCrumb.text(state.address);
    app.hooks.crumbs.update(app.hooks.propertyCrumb);

    // Search area
    app.hooks.propertyTitle.find('h1').text(state.address);
    var zip_code = app.util.formatZipCode(state.opa && state.opa.zip_code),
        address_line_2 = 'Philadelphia, PA ' + zip_code;
    app.hooks.propertyTitle.find('.small-text').text(address_line_2);

    // Clear loading...
    app.hooks.content.empty();

    // Render owners
    app.hooks.propertyOwners.empty();
    // Check to see if the state.opa object is from the OPA API or Socrata.
    var owners = state.opa.ownership ? state.opa.ownership.owners : [state.opa.owner_1, state.opa.owner_2];
    owners.forEach(function (owner) {
      if (owner) app.hooks.propertyOwners.append($('<div>').text(owner));
    });

    // Empty things that will be rendered form OPA details
    app.hooks.improvementDescription.empty();
    app.hooks.landArea.empty();
    app.hooks.improvementArea.empty();
    app.hooks.zoning.empty();
    app.hooks.salesPrice.empty();
    app.hooks.salesDate.empty();
    app.hooks.valuation.empty();
    app.hooks.propertyMailing.empty();
    app.hooks.propertyMailingHeader.detach();

    app.hooks.content.append(app.hooks.propertyMain);
    app.hooks.content.append(app.hooks.propertySide);
    app.hooks.belowContent.append(app.hooks.propertySecondary);

    // Set OPA inquiry link
    // this has been failing when state.ais is undefined. wrapping in a try.
    // related to issue #208.
    var tencode;
    try {
      tencode = app.util.constructTencode(state.ais);
    } catch (e) {
      Raven.captureException(e, {
        extra: {
          state: state,
        },
      });
    }
    app.hooks.opaInquiryUrl.attr('href', 'http://opa.phila.gov/opa.apps/Help/CitizenMain.aspx?sch=Ctrl2&s=1&url=search&id=' + tencode);

    // Set L&I link
    app.hooks.liLink.attr('href', 'http://li.phila.gov/#summary?address=' + encodeURI(state.address));

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
          app.globals.map.centerAndZoom(
            state.ais.geometry.coordinates,
            app.config.initialMapZoomLevel
          );

          // If check to fix intermittent bugs
          if (!app.globals.map || !app.globals.map.graphics) {
            console.warn('`graphics` layer on the map is null. Marker can not be added.');
            return;
          }

          // Clear any existing markers
          app.globals.map.graphics.clear();

          // Create a new marker
          point = new Point(state.ais.geometry.coordinates);

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
            center: state.ais.geometry.coordinates,
            zoom: app.config.initialMapZoomLevel,
            smartNavigation: false
          });

          app.globals.tileLayer = new Tiled('https://tiles.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap/MapServer');
          app.globals.map.addLayer(app.globals.tileLayer);

          app.globals.labelLayer = new Tiled('https://tiles.arcgis.com/tiles/fLeGjb7u4uXqeF9q/arcgis/rest/services/CityBasemap_Labels/MapServer');
          app.globals.map.addLayer(app.globals.labelLayer);

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
      state.ais.geometry.coordinates[1], state.ais.geometry.coordinates[0]);

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
        state.ais.geometry.coordinates[1] + ',' + state.ais.geometry.coordinates[0] + '&layer=c&cbll='+
        state.ais.geometry.coordinates[1] + ',' + state.ais.geometry.coordinates[0] + cbp);
    });
  }

  function renderOpaDetails() {
    var state = history.state,
        opa = state.opa;

    // Render mailing address
    var pm = app.hooks.propertyMailing;
    app.hooks.propertyMailingHeader.insertBefore(pm);
    if (opa.mailing_care_of) pm.append($('<div>').text(opa.mailing_care_of));

    // Form address
    var mailing_address, mailing_street, mailing_city_state, mailing_zip;
    // Check for an off-premise owner address. Note thhat mailing_street is the
    // first line of the address, e.g. 1234 MARKET ST
    if (opa.mailing_street) {
      // mailing_address_1 and 2 are recipient names which should be joined with
      // a space.
      if (opa.mailing_address_1) {
        mailing_address = opa.mailing_address_1;
        if (opa.mailing_address_2) {
          mailing_address += ' ' + opa.mailing_address_2;
        }
      }
      mailing_street = opa.mailing_street;
      mailing_city_state = opa.mailing_city_state;
      mailing_zip = opa.mailing_zip;
    // If there's no mailing address, fall back to the property address.
    } else {
      mailing_street = state.address;
      mailing_city_state = 'Philadelphia, PA';
      mailing_zip = opa.zip_code;
    }
    mailing_zip = app.util.formatZipCode(mailing_zip);

    if (mailing_address) pm.append($('<div>').text(mailing_address));
    pm.append($('<div>').text(mailing_street));
    pm.append($('<div>').text(mailing_city_state));
    pm.append($('<div>').text(mailing_zip));

    // Update tax balance button with a direct link to the account
    var taxBalanceUrl = 'http://www.phila.gov/revenue/realestatetax/?txtBRTNo=' + opa.parcel_number;
    app.hooks.taxBalanceLink.attr('href', taxBalanceUrl);

    // Render zoning
    // TODO Socrata is missing zoning description
    // app.hooks.zoning.html(state.opa.characteristics.zoning + ': ' +
    //   state.opa.characteristics.zoning_description);

    // DEBUG
    var zoning;

    // this line has been throwing errors when state.ais is undefined,
    // which should never happen.
    try {
     zoning = state.ais.properties.zoning;
    } catch (e) {
      Raven.captureException(e, {
        extra: {
          state: state,
        },
      });
    }

    app.hooks.zoning.html(zoning || '');

    // Fetch and render valuation history
    var url = app.config.carto.baseUrl,
        table = app.config.carto.datasets.valuations,
        accountNum = state.ais.properties.opa_account_num,
        params = {
          q: "select * from " + table + " where parcel_number = '" +
              accountNum + "'",
        };

    $.ajax({
      url: url,
      data: params,
      success: function (data) {
        var rows = data.rows;

        // Sort by valuation year
        rows.sort(function (a, b) {
          return (a.year > b.year) ? 1 : ((b.year > a.year) ? -1 : 0);
        });
        rows.reverse();
        rows.forEach(function (vh) {
          var row = $('<tr>');
          row.append($('<td>').text(vh.year));
          row.append($('<td>').text(accounting.formatMoney(vh.market_value)));
          row.append($('<td>').text(accounting.formatMoney(vh.taxable_land)));
          row.append($('<td>').text(accounting.formatMoney(vh.taxable_building)));
          row.append($('<td>').text(accounting.formatMoney(vh.exempt_land)));
          row.append($('<td>').text(accounting.formatMoney(vh.exempt_building)));
          app.hooks.valuation.append(row);
        });

        app.hooks.valuationTable.append(app.hooks.valuation);
        app.hooks.valuationPanel.append(app.hooks.valuationTable);

        // Update the Tablesaw responsive tables
        $(document).trigger('enhance.tablesaw');
      },

      error: function () {
        // TODO show warning
        console.warn('Error getting valuation history');
      },
    })

    // Render sales info
    app.hooks.salesPrice.text(accounting.formatMoney(state.opa.sale_price));
    var saleDateMoment = moment(state.opa.sale_date),
        saleDate = saleDateMoment.format('M/D/YYYY');
    app.hooks.salesDate.text(saleDate);

    // Render property details
    app.hooks.opaAccount.text(state.opa.parcel_number);
    app.hooks.improvementCondition.text(getExteriorConditionDescription(state.opa.exterior_condition));
    app.hooks.improvementDescription.text(state.opa.building_code_description);
    app.hooks.landArea.text(accounting.formatNumber(state.opa.total_area));
    app.hooks.improvementArea.text(accounting.formatNumber(state.opa.total_livable_area));
    app.hooks.beginningPoint.text(state.opa.beginning_point);
    app.hooks.homestead.text(state.opa.homestead_exemption && state.opa.homestead_exemption > 0 ? 'Yes' : 'No');

    opaDetailsRendered = true;

    // Hide status, show content.
    app.hooks.valuationStatus.addClass('hide');
    app.hooks.valuationPanel.removeClass('hide');

    // Render map stuff
    renderMap();
    setStreetViewLink();
  }

  function getExteriorConditionDescription(id) {
    switch(id) {
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
    var sa = state.ais ? state.ais.properties : null;

    // No use rendering if there's been a data error
    if (state.error || !state.ais || state.ais.error) {
      app.hooks.propertySecondary.hide();
      return;
    }

    // Wait for both OPA render and SA data
    if (!state.ais) return;

    app.hooks.propertySecondary.show();

    // Render service areas
    // Sidebox
    app.hooks.rubbishDay.text(app.util.abbrevToFullDay(sa.rubbish_recycle_day));

    // School catchment
    app.hooks.elementarySchool.text(sa.elementary_school);
    app.hooks.middleSchool.text(sa.middle_school);
    app.hooks.highSchool.text(sa.high_school);

    // Political
    app.hooks.councilDistrict.text(sa.council_district_2016);
    app.hooks.ward.text(sa.political_ward);
    app.hooks.wardDivisions.text(sa.political_division);

    // Public safety
    app.hooks.policePsa.text(sa.police_service_area);
    app.hooks.policeDistrict.text(sa.police_district);
    app.hooks.policeDivision.text(sa.police_division);

    // Streets
    app.hooks.highwayDistrict.text(sa.highway_district);
    app.hooks.highwaySection.text(sa.highway_section);
    app.hooks.highwaySubsection.text(sa.highway_subsection);
    app.hooks.streetLightRoutes.text(sa.street_light_route);
    app.hooks.trafficDistrict.text(sa.traffic_district);
    app.hooks.recyclingDiversion.text((parseFloat(sa.recycling_diversion_rate) * 100).toFixed(1) + '%');  // <-- percentified
    app.hooks.sanitationArea.text(sa.sanitation_area);
    app.hooks.sanitationDistrict.text(sa.sanitation_district);
    app.hooks.leafCollection.text(sa.leaf_collection_area);
    app.hooks.trafficPmDistrict.text(sa.traffic_pm_district);

    // Districts
    app.hooks.planning.text(sa.planning_district);
    app.hooks.liDistrict.text(sa.li_district);

    // Hide status messages, load content.
    app.hooks.trashStatus.addClass('hide');
    app.hooks.trashPanel.removeClass('hide');
    app.hooks.serviceAreaStatus.addClass('hide');
    app.hooks.serviceAreaPanel.removeClass('hide');
  }

  function renderError(error) {
    app.hooks.propertySecondary.hide();
    app.hooks.content.text(error);
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
