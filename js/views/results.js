/*global $,app*/

app.views.results = function (parsedQuery) {
  // Breadcrumbs
  app.hooks.resultsCrumb.find('b').text(parsedQuery.label);
  app.hooks.crumbs.update(app.hooks.resultsCrumb);

  // Search
  app.hooks.searchRight.html('&nbsp;');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10 float-right').addClass('medium-16');

  // Empty both content areas
  app.hooks.content.children().detach();
  app.hooks.belowContent.children().detach();
  app.hooks.aboveContent.children().detach();


  var opaEndpoint = parsedQuery.type + '/',
      isOwnerSearch = false;

  switch (parsedQuery.type) {
    case 'account':
      opaEndpoint += encodeURI(parsedQuery.account);
      break;
    case 'intersection':
      opaEndpoint += encodeURI(parsedQuery.street1 + '/' + parsedQuery.street2);
      break;
    case 'block':
      opaEndpoint += encodeURI(parsedQuery.address + '/');
      break;
    case 'address':
      opaEndpoint += encodeURI(parsedQuery.address + '/');

      if (parsedQuery.unit) {
        opaEndpoint += encodeURI(parsedQuery.unit);
      }
      break;
    case 'owner':
      isOwnerSearch = true;
      opaEndpoint += encodeURI(parsedQuery.owner);
      break;
  }

  app.hooks.content.empty(); // Remove loading message
  app.hooks.ownerSearchDisclaimer.addClass('hide');

  if (history.state && app.globals.historyState) {
    render();
  } else {
    app.hooks.content.append(app.hooks.loading);

    // *** LARGE PROP CHECK ***
    // This is a workaround for large properties that are currently causing
    // performance issues in the OPA API.
    
    // TODO: this will return all units for an address even if the user passes
    // in an unambiguous unit num. Previously this would navigate directly to
    // the property.
    
    var matchingProp, searchUrl, targetPropertyAddress;
    
    // 'Try' all this so we don't introduce any unexpected errors.
    try {
      var targetAddress = parsedQuery.address.toUpperCase(),
          largeProps = [
            {addressLow: 2401, addressHigh: null, street: 'PENNSYLVANIA AVE'},
            {addressLow: 1420, addressHigh: null, street: 'LOCUST ST'},
            {addressLow: 2018, addressHigh: 2032, street: 'WALNUT ST'},
            {addressLow: 224,  addressHigh: 230,  street: 'W RITTENHOUSE SQ'},
            {addressLow: 2001, addressHigh: null, street: 'HAMILTON ST'},
            {addressLow: 604,  addressHigh: 636,  street: 'S WASHINGTON SQ'},
            {addressLow: 2601, addressHigh: null, street: 'PENNSYLVANIA AVE'},
            {addressLow: 1100, addressHigh: null, street: 'BROAD ST'},
            {addressLow: 901,  addressHigh: null, street: 'N PENN ST'},
            {addressLow: 822,  addressHigh: 838,  street: 'CHESTNUT ST'},
            {addressLow: 2101, addressHigh: 2017, street: 'CHESTNUT ST'},
          ];
        
      // Parse search address
      var targetAddressParts      = /(\d+)(-\d+)?(?:[A-Z])? (?:1\/2 )?([A-Z0-9 ]+)/.exec(targetAddress),
          targetAddressLow        = targetAddressParts[1],
          targetAddressHigh       = targetAddressParts[2],
          targetAddressHigh       = targetAddressHigh ? targetAddress.slice(-2) : null,
          targetStreet            = targetAddressParts[3].replace(/\s+/g, ' ');
      // console.log(targetAddressLow, targetAddressHigh, targetStreet);
          
      // Loop over large props
      for (var i = 0; i < largeProps.length; i++) {
        var largeProp         = largeProps[i],
            testAddressLow    = largeProp.addressLow,
            testAddressHigh   = largeProp.addressHigh,
            testStreet        = largeProp.street;

        // Try to match exactly(ish)
        if (testAddressLow == targetAddressLow && 
            testStreet.indexOf(targetStreet) > -1
        ) {
          // If there's an address high
          if (targetAddressHigh && testAddressHigh) {
            // Make sure it matches
            if (
              testAddressHigh.toString().slice(-2) == targetAddressHigh ||
              testAddressHigh == targetAddressHigh
            ) matchingProp = largeProp;
          }
          else matchingProp = largeProp;
          
          if (matchingProp) {
            // console.log('matched to (exact)');
            // console.log(largeProp);
            break;
          }
        }
        
        // See if address falls within range and has same parity
        if (testAddressHigh &&
            testStreet.indexOf(targetStreet) > -1 &&
            testAddressLow <= targetAddressLow &&
            targetAddressLow <= testAddressHigh &&
            targetAddressLow % 2 === testAddressLow % 2
        ) {
          matchingProp = largeProp;
          // console.log('matched to (range)');
          // console.log(largeProp);
          break;
        }
      }
    }
    catch (e) {
      // TODO tell Sentry?
      // console.log('Unhandled error during large prop check: ' + e);
    }
    
    if (matchingProp) {
      // Form full address
      var address;
      if (matchingProp.addressHigh) {
        address = matchingProp.addressLow + '-' + matchingProp.addressHigh.toString().slice(-2)
      }
      else address = matchingProp.addressLow;
      address += ' ' + matchingProp.street;
      
      // If the user specified a unit, form the full address that we want to 
      // filter query results on.
      if (parsedQuery.unit) targetPropertyAddress = address + ' #' + parsedQuery.unit;
      
      // Form static file url
      var fileName = address.replace(' ', '+') + '.json',
          searchUrl = 'https://s3.amazonaws.com/phila-property/' + fileName;
    }
    else searchUrl = 'https://api.phila.gov/opa/v1.1/' + opaEndpoint + '?format=json';

    $.ajax(searchUrl,
      {dataType: app.settings.ajaxType})
      .done(function (data) {
        var property, accountNumber, href, withUnit;

        if ( !app.globals.historyState ) history.state={};

        // If we get a 200 response but an 400 error code (ummmmm), treat it like a fail.
        if (!data.data) {
          history.replaceState({error: 'Failed to retrieve results. Please try another search.'}, '');
          render();
          return;
        }

        // If we matched to a large prop and the user specified a unit, try to 
        // go straight to that property.
        if (targetPropertyAddress) {
          var props = data.data.properties;
          for (var i = 0; i < props.length; i++) {
            var prop = props[i],
                propAddress = app.util.addressWithUnit(prop);
            if (propAddress === targetPropertyAddress) {
              data.data.properties = [prop];
            }
          }
        }
        
        // For business reasons, owner searches need to always show on the
        // results page for the disclaimer.
        if (!isOwnerSearch && (data.data.property || data.data.properties.length === 1)) {
          // If only one property go straight to property view
          property = data.data.property || data.data.properties[0];
          accountNumber = property.account_number;
          href = '?' + $.param({p: accountNumber});
          withUnit = app.util.addressWithUnit(property);

          history.replaceState({
            opa: property,
            address: withUnit
          }, withUnit, href);

          app.views.property(accountNumber);
        } else {
          // Used for rendering a special owner search disclaimer
          if (isOwnerSearch) {
            data = $.extend({isOwnerSearch: true}, data);
          }

          if ( !app.globals.historyState ) {
            history.state= data;
          } else {
            history.replaceState(data, ''); // Second param not optional in IE10
          }
          render();
        }
      })
      .fail(function () {
        history.replaceState({error: 'Failed to retrieve results. Please try another search.'}, '');
        render();
      });
  }

  function render () {
    var state = history.state;
    if (state.error) return app.hooks.content.text(state.error);

    app.hooks.content.empty(); // Remove loading message

    if (state.total === 0) {
      return app.hooks.content.append(app.hooks.noResults);
    }

    if (state.isOwnerSearch) {
      renderOwnerSearchDisclaimer();
    }

    // TODO find a place for count
    //app.hooks.count.find('#total').text(state.total);
    //app.hooks.content.append(app.hooks.count);
    app.hooks.resultRows.empty(); // TODO reuse existing result nodes
    if (state.data && state.data.properties) {
      state.data.properties.forEach(addRow);

      if (state.total > state.data.properties.length) {
        var seeMoreA = app.hooks.seeMore.find('a');
        seeMoreA.off('click'); // Drop previously created click events
        seeMoreA.on('click', function (e) {
          if ( islocalQuery ) {
            var tempPropArray = [];
            $.ajax( ajaxRequest, {dataType: app.settings.ajaxType})
              .done(function (data) {
                var tempPropArray =data.data.properties;
                var seeMorePropArray = tempPropArray.slice(state.data.properties.length);
                console.log(state.data.properties.length);
                state.data.properties = state.data.properties.concat(seeMorePropArray);
                history.replaceState(state, ''); // Second param not optional in IE10
                data.data.properties.forEach(addRow);
                if (state.total === state.data.properties.length) app.hooks.seeMore.hide();

                // Update the Tablesaw responsive tables
                $(document).trigger('enhance.tablesaw');
              });

          } else {

            $.ajax( ajaxRequest +
              '&skip=' + state.data.properties.length, {dataType: app.settings.ajaxType})
              .done(function (data) {
                state.data.properties = state.data.properties.concat(data.data.properties);
                history.replaceState(state, ''); // Second param not optional in IE10
                data.data.properties.forEach(addRow);
                if (state.total === state.data.properties.length) app.hooks.seeMore.hide();

                // Update the Tablesaw responsive tables
                $(document).trigger('enhance.tablesaw');
              });
          }
        });
        app.hooks.seeMore.show();
      } else {
        app.hooks.seeMore.hide();
      }
      app.hooks.content.append(app.hooks.results);

      // Update the Tablesaw responsive tables
      $(document).trigger('enhance.tablesaw');
    }
  }

  function renderOwnerSearchDisclaimer() {
    var now = new Date(),
        mins = now.getMinutes(),
        prettyMins = mins < 10 ? ('0' + mins) : mins,
        prettyNow = (now.getMonth() + 1) + '/' + now.getDate() + '/' +  now.getFullYear() +
                    ' ' + now.getHours() + ':' + prettyMins;

    app.hooks.ownerSearchDisclaimer.removeClass('hide');
    app.hooks.ownerSearchDisclaimerDatetime.text(prettyNow);
    app.hooks.ownerSearchDisclaimerQuery.text(parsedQuery.label);

    // Fetch IP & show it
    $.getJSON('https://api.ipify.org?format=json')
      .done(function(response) {
        if(response.ip) {
          app.hooks.ownerSearchDisclaimerIp.text(response.ip);
        }
      })
      .fail(function() {
        app.hooks.ownerSearchDisclaimerIp.text(app.hooks.ownerSearchDisclaimerIp.attr('data-default'));
      });
  }

  function addRow (property, index) {
    var row = app.hooks.resultRow.clone();
    var accountNumber = property.account_number;
    var withUnit = app.util.addressWithUnit(property);
    var href = '?' + $.param({p: accountNumber});
    row.append($('<td>').append($('<a href="' + href + '">').text(withUnit)));
    row.append($('<td>').text(property.valuation_history && accounting.formatMoney(property.valuation_history[0].market_value)));
    row.append($('<td>').text(app.util.formatSalesDate(property.sales_information.sales_date)
      + ', ' + accounting.formatMoney(property.sales_information.sales_price)));
    row.append($('<td>').text(property.ownership.owners.join(', ')));
    row.append($('<td class="hide-for-small-only">').html('<i class="fa fa-arrow-circle-right"></i>'));
    row.on('click', function (e) {
        if (e.ctrlKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        history.pushState({opa: property, address: withUnit}, withUnit, href);
        window.scroll(0, 0);
        app.views.property(accountNumber);
      });
    app.hooks.resultRows.append(row);
  }
};
