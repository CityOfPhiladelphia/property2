/*global $,app*/

app.views.results = function (parsedQuery) {
  console.debug('*results*', parsedQuery)

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

  var endpointMap = {
    address: 'addresses',
    account: 'account',
    block: 'block',
    owner: 'owner',
  };

  var queryType = parsedQuery.type,
      endpoint = endpointMap[queryType] + '/',
      isOwnerSearch = false,
      queryParam;

  switch(queryType) {
    case 'account':
      queryParam = parsedQuery.account;
      break;
    case 'block':
      queryParam = parsedQuery.address;
      break;
    case 'address':
      queryParam = parsedQuery.address;

      if (parsedQuery.unit) {
        queryParam += ' UNIT ' + parsedQuery.unit;
      }
      break;
    case 'owner':
      isOwnerSearch = true;
      queryParam = parsedQuery.owner;
      break;
  }

  endpoint += encodeURI(queryParam);

  app.hooks.content.empty(); // Remove loading message
  app.hooks.ownerSearchDisclaimer.addClass('hide');

  var state = history.state;

  if (app.globals.historyState && state && state.ais) {
    didGetAisData(history.state.ais);
  } else {
    app.hooks.content.append(app.hooks.loading);
    getAisData();
  }

  function getAisData() {
    var params = {
      // gatekeeperKey: app.config['gatekeeperKey'],
      include_units: null,
      opa_only: null,
    };

    $.ajax({
      url: 'https://api.phila.gov/ais_ps/v1/' + endpoint,
      data: params,
      success: didGetAisData,
      error: didGetAisError,
    });
  }

  function didGetAisData(aisData) {
    var property, accountNumber, href, withUnit;

    if (!app.globals.historyState) history.state = {};

    // If we didn't get a good result from AIS (or rehydrate a feature from
    // history), show the error message.
    if (!aisData || (!aisData.features && !aisData.properties)) {
      console.debug('no ais features', aisData);
      var error = app.config.defaultError;
      // history.replaceState({error: error}, '');
      history.replaceState({error: error}, '', null, 'results.js - did get ais data');
      render();
      return;
    }

    // single result
    if (!isOwnerSearch && (
      aisData.type == 'Feature' ||
      aisData.features.length === 1)) {
        // If only one property go straight to property view
        feature = (aisData.features ? aisData.features[0] : aisData);
        attrs = feature.properties;
        accountNumber = attrs.opa_account_num;
        href = '?' + $.param({p: accountNumber});
        withUnit = feature.properties.street_address;

        var nextState = {
          ais: feature,
          address: withUnit,
        };

        // history.replaceState(nextState, withUnit, href);
        history.replaceState(nextState, withUnit, href, 'results.js - did get ais result [single]');

        app.views.property(accountNumber);
    // multiple results
    } else {
      // Fetch market_value, sale data from OPA dataset
      var opaUrl = constructOpaUrl(aisData.features);
      $.ajax(opaUrl)
        .done(function (opaData) {
          var keyedOpaData = keyBy(opaData.rows, 'parcel_number')
          $.each(aisData.features, function (index, feature) {
            $.extend(feature.properties, keyedOpaData[feature.properties.opa_account_num] || {})
          })

          var newState = $.extend({}, history.state);
          // For business reasons, owner searches need to always show on the
          // results page for the disclaimer.
          if (isOwnerSearch) {
            aisData = $.extend({isOwnerSearch: true}, aisData);
          }
          newState = aisData;

          if (!app.globals.historyState) {
            history.state = newState;
          } else {
            // history.replaceState(newState, ''); // Second param not optional in IE10
            history.replaceState(newState, '', null, 'results.js - did get ais data [multiple]'); // Second param not optional in IE10
          }
          render();
        });
    }
  }

  function didGetAisError(jqXHR, textStatus, errorThrown) {
    var status = jqXHR.status,
        message;

    console.debug('did get ais error', status);

    switch(status) {
      case 404:
        message = "We couldn't find any <strong>" + queryType +
                  "</strong> results for <strong>" + queryParam +
                  "</strong>. Please review your search and try again.";
        break;
      default:
        message = app.config.defaultError;
        break;
    }

    // history.replaceState({error: message}, '');
    history.replaceState({error: message}, '', null, 'results.js - did get ais error');
    render();
  }

  function constructOpaUrl(features) {
    var accountNumbers = $.map(features, function (feature) {
      return feature.properties.opa_account_num
    })

    var params = {
      select: [
        'parcel_number',
        'market_value',
        'sale_date',
        'sale_price'
      ].join(','),
      where: 'parcel_number in ("' + accountNumbers.join('","') + '")'
    };
    var query = 'SELECT parcel_number, market_value, sale_date, sale_price FROM '
      + app.config.carto.datasets.properties + " WHERE parcel_number IN ('"
      + accountNumbers.join("','") + "')"
    return app.config.carto.baseUrl + '?q=' + encodeURIComponent(query)
  }

  function keyBy(items, key) {
    var hash = {}
    for (var i = 0; i < items.length; i++) {
      hash[items[i][key]] = items[i]
    }
    return hash
  }

  function render() {
    var state = history.state;
    if (state.error) return app.hooks.content.html(state.error);
    var features = state.features;
    var totalSize = state.total_size;
    var isOwnerSearch = state.isOwnerSearch;

    app.hooks.content.empty(); // Remove loading message

    if (totalSize === 0) {
      return app.hooks.content.append(app.hooks.noResults);
    }

    if (isOwnerSearch) {
      renderOwnerSearchDisclaimer();
    }

    // TODO find a place for count
    //app.hooks.count.find('#total').text(state.total);
    //app.hooks.content.append(app.hooks.count);
    app.hooks.resultRows.empty(); // TODO reuse existing result nodes
    if (features) {
      $.each(features, addRow);

      if (totalSize > features.length) {
        var seeMoreA = app.hooks.seeMore.find('a');
        seeMoreA.off('click'); // Drop previously created click events
        seeMoreA.on('click', function (e) {

          var params = {
            // gatekeeperKey: app.config['gatekeeperKey'],
            include_units: null,
            opa_only: null,
            page: state.page + 1
          };

          $.ajax({
            url: 'https://api.phila.gov/ais_ps/v1/' + endpoint,
            data: params
          })
            .done(function (aisData) {
              // Fetch market_value, sale data from OPA dataset
              var opaUrl = constructOpaUrl(aisData.features);
              $.ajax(opaUrl)
                .done(function (opaData) {
                  var keyedOpaData = keyBy(opaData, 'parcel_number')
                  $.each(aisData.features, function (index, feature) {
                    $.extend(feature.properties, keyedOpaData[feature.properties.opa_account_num] || {})
                  })

                  state.features = state.features.concat(aisData.features);
                  state.page = aisData.page;
                  // history.replaceState(state, ''); // Second param not optional in IE10
                  history.replaceState(state, '', null, 'results.js - see more click'); // Second param not optional in IE10

                  $.each(aisData.features, addRow);
                  if (state.totalSize === state.features.length) app.hooks.seeMore.hide();

                  // Remove old Tablesaw data and refresh
                  $('[data-hook="results-table"]').table().data("table").destroy();
                  $('[data-hook="results-table"]').table().data("table").refresh();
                });
            });
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
      .done(function (response) {
        if (response.ip) {
          app.hooks.ownerSearchDisclaimerIp.text(response.ip);
        }
      })
      .fail(function () {
        app.hooks.ownerSearchDisclaimerIp.text(app.hooks.ownerSearchDisclaimerIp.attr('data-default'));
      });
  }

  function addRow(index, property) {
    var row = app.hooks.resultRow.clone(),
        attrs = property.properties,
        accountNumber = attrs.opa_account_num,
        withUnit = attrs.street_address,
        href = '?' + $.param({p: accountNumber});

    row.append($('<td>').append($('<a href="' + href + '">').text(withUnit)));
    row.append($('<td>').text(accounting.formatMoney(attrs.market_value)));
    row.append($('<td>').text(moment(attrs.sale_date).format('M/D/YYYY') + ', ' + accounting.formatMoney(attrs.sale_price)));
    row.append($('<td>').text(attrs.opa_owners && attrs.opa_owners.join(', ')));
    row.append($('<td class="hide-for-small-only">').html('<i class="fa fa-arrow-circle-right"></i>'));

    row.on('click', function (e) {
      if (e.ctrlKey || e.altKey || e.shiftKey) return;
      e.preventDefault();

      var nextState = {
        ais: property,
        address: withUnit,
      };

      // history.pushState(nextState, withUnit, href);
      history.pushState(nextState, withUnit, href, 'results.js - row click');
      
      window.scroll(0, 0);
      app.views.property(accountNumber);
    });
    app.hooks.resultRows.append(row);
  }
};
