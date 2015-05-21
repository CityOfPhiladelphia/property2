/*global $,app*/

app.views.results = function (q) {
  // Breadcrumbs
  app.hooks.resultsCrumb.find('b').text(q);
  app.hooks.crumbs.update(app.hooks.resultsCrumb);

  // Search
  app.hooks.search.val(q);
  app.hooks.searchForm.addClass('hint');
  app.hooks.searchForm.find('p').removeClass('hidden');
  app.hooks.searchRight.html('&nbsp;');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10 float-right').addClass('medium-16');

  // Empty both content areas
  app.hooks.content.children().detach();
  app.hooks.belowContent.children().detach();

  // Determine if q is an account number, intersection, or address
  q = q.trim().replace(/\./g, ''); // API can't handle dots
  var m, opaEndpoint;
  if (m = /#?(\d{9})/.exec(q)) opaEndpoint = 'account/' + m[1];
  else if (m = /(.+) +(&|and) +(.+)/.exec(q)) {
    opaEndpoint = 'intersection/' + encodeURI(m[1] + '/' + m[3])
  } else opaEndpoint = 'address/' + encodeURI(opaAddress(q));

  if (history.state) {
    render();
  } else {
    app.hooks.content.append(app.hooks.loading);

    $.ajax('https://api.phila.gov/opa/v1.1/' + opaEndpoint + '?format=json',
      {dataType: app.settings.ajaxType})
      .done(function (data) {
        var property, accountNumber, href, withUnit;
        if (data.data.property || data.data.properties.length == 1) {
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
          history.replaceState(data, ''); // Second param not optional in IE10
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
    // TODO find a place for count
    //app.hooks.count.find('#total').text(state.total);
    //app.hooks.content.append(app.hooks.count);
    app.hooks.resultRows.empty(); // TODO reuse existing result nodes
    state.data.properties.forEach(addRow);
    if (state.total > state.data.properties.length) {
      var seeMoreA = app.hooks.seeMore.find('a');
      seeMoreA.off('click'); // Drop previously created click events
      seeMoreA.on('click', function (e) {
        $.ajax('https://api.phila.gov/opa/v1.1/' + opaEndpoint + '?format=json'+
          '&skip=' + state.data.properties.length, {dataType: app.settings.ajaxType})
          .done(function (data) {
            state.data.properties = state.data.properties.concat(data.data.properties);
            history.replaceState(state, ''); // Second param not optional in IE10
            data.data.properties.forEach(addRow);
            if (state.total === state.data.properties.length) app.hooks.seeMore.hide();
          })
      });
      app.hooks.seeMore.show();
    } else {
      app.hooks.seeMore.hide();
    }
    app.hooks.content.append(app.hooks.results);
  }

  function addRow (property) {
    var row = app.hooks.resultRow.clone();
    var accountNumber = property.account_number;
    var withUnit = app.util.addressWithUnit(property);
    var href = '?' + $.param({p: accountNumber});
    row.append($('<td>').append($('<a href="' + href + '">').text(withUnit)));
    row.append($('<td>').text(accounting.formatMoney(property.valuation_history[0].market_value)));
    row.append($('<td class="hide-for-small">').text(app.util.formatSalesDate(property.sales_information.sales_date)
      + ', ' + accounting.formatMoney(property.sales_information.sales_price)));
    row.append($('<td class="hide-for-small">').text(property.ownership.owners.join(', ')));
    row.append($('<td>').html('<i class="fa fa-arrow-circle-right"></i>'));
    row.on('click', function (e) {
        if (e.ctrlKey || e.altKey || e.shiftKey) return;
        e.preventDefault();
        history.pushState({opa: property, address: withUnit}, withUnit, href);
        window.scroll(0, 0);
        app.views.property(accountNumber);
      });
    app.hooks.resultRows.append(row);
  }

  // OPA address needs to either separate unit by slash or end in slash
  function opaAddress (address) {
    if (address.indexOf(' #') !== -1) {
      address = address.replace(' #', '/');
    } else address = address + '/';
    return address;
  }
};
