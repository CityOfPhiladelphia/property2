/*global $,app*/

app.views.results = function (q) {
  // Breadcrumbs
  app.hooks.resultsCrumb.find('b').text(q);
  app.hooks.crumbs.update(app.hooks.resultsCrumb);

  // Search
  app.hooks.search.val(q);
  app.hooks.searchForm.addClass('hint');
  app.hooks.searchForm.find('p').removeClass('hide');
  app.hooks.searchRight.html('&nbsp;');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10 float-right').addClass('medium-16');

  // Empty both content areas
  app.hooks.content.children().detach();
  app.hooks.belowContent.children().detach();

  if (history.state) {
    render();
  } else {
    app.hooks.content.text('Loading...');
    var q = q.trim();

    // Determine if q is an account number, intersection, or address
    var m, opaEndpoint;
    if (m = /#?(\d{9})/.exec(q)) opaEndpoint = 'account/' + m[1];
    else if (m = /(.+) +(&|and) +(.+)/.exec(q)) {
      opaEndpoint = 'intersection/' + encodeURI(m[1] + '/' + m[3])
    } else opaEndpoint = 'address/' + encodeURIComponent(opaAddress(q));

    $.ajax('http://api.phila.gov/opa/v1.1/' + opaEndpoint + '?format=json')
      .done(function (data) {
        var property, p, href, withUnit;
        if (data.data.property || data.data.properties.length == 1) {
          // If only one property go straight to property view
          property = data.data.property || data.data.properties[0];
          p = property.property_id;
          href = '?' + $.param({p: p});
          withUnit = app.util.addressWithUnit(property);
          history.replaceState({
            opa: property,
            address: withUnit
          }, withUnit, href);
          app.views.property(p);
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
    state.data.properties.forEach(function (property) {
      var row = app.hooks.resultRow.clone();
      var p = property.property_id;
      var withUnit = app.util.addressWithUnit(property);
      var href = '?' + $.param({p: p});
      row.append($('<td>').text(withUnit));
      row.append($('<td>').text(property.ownership.owners.join(', ')));
      row.append($('<td>').text(app.util.formatSalesDate(property.sales_information.sales_date)
        + ', ' + accounting.formatMoney(property.sales_information.sales_price)));
      row.append($('<td>').text(accounting.formatMoney(property.valuation_history[0].market_value)));
      row.on('click', function (e) {
          if (e.ctrlKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          history.pushState({opa: property, address: withUnit}, withUnit, href);
          window.scroll(0, 0);
          app.views.property(p);
        });
      app.hooks.resultRows.append(row);
    });
  //  app.hooks.belowContent.empty();
    app.hooks.content.append(app.hooks.results);
  }

  // OPA address needs to either separate unit by slash or end in slash
  function opaAddress (address) {
    if (address.indexOf(' #') !== -1) {
      address = address.replace(' #', '/');
    } else address = address + '/';
    return address;
  }
};
