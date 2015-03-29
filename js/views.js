/* global $,app */

app.views = {
  titleLink: function () {
    app.els.appTitle.contents().wrap(app.els.appLink);
  },
  breadcrumbs: function (section) {
    if (section) {
      app.els.appCrumbText.detach();
      app.els.appCrumbLink.appendTo(app.els.appCrumb);
      app.els.crumb.text(section).appendTo(app.els.appCrumb.parent());
    } else {
      app.els.appCrumbLink.detach();
      app.els.appCrumbText.appendTo(app.els.appCrumb);
      app.els.crumb.detach();
    }
  },
  search: function (q, placeholder) {
    if (q) app.els.search.val(q);
    else {
      app.els.search.val('');
      app.els.search.attr('placeholder', placeholder);
    }
  },
  count: function (total) {
    app.els.count.find('#total').text(total);
    app.els.count.appendTo(app.els.content);
  },
  loading: function () {
    app.els.content.children().detach();
    app.els.content.text('Loading...');
  },
  front: function () {
    app.els.searchLeft.off('transitionend').removeClass('medium-14')
      .addClass('medium-4').html('&nbsp;');
    app.els.searchBox.removeClass('medium-10').addClass('medium-16');
    app.els.content.children().detach();
    app.els.content.append(app.els.front);
  },
  result: function (property) {
    // Clone and append to #results
    var result = app.els.result.clone();
    var key = property.property_id;
    var unit = property.unit || '';
    unit = unit.replace(/^0+/, '');
    if (unit) unit = ' #' + unit;
    var withUnit = property.full_address + unit;
    var href = '?' + $.param({p: key});
    result.find('a').attr('href', href)
      .text(withUnit).on('click', function (e) {
        if (e.ctrlKey || e.altKey || e.shiftKey) return;
        if (!history.pushState) return;
        e.preventDefault();
        history.pushState({opa: property, address: withUnit}, withUnit, href);
        app.render(e);
      });
    result.appendTo(app.els.results);
  },
  resultsPreFetch: function (q) {
    app.views.breadcrumbs('Search Results');
    app.views.search(q);
    app.els.searchLeft.off('transitionend').removeClass('medium-14')
      .addClass('medium-4').html('&nbsp;');
    app.els.searchBox.removeClass('medium-10').addClass('medium-16');
  },
  results: function (data) {
    if (history.replaceState && !history.state) history.replaceState(data);
    if (data.error) return app.els.content.text(data.error);
    app.els.content.empty();
    app.views.count(data.total);
    app.els.results.empty();
    data.data.properties.forEach(app.views.result);
    app.els.results.appendTo(app.els.content);
  },
  property: function (id) {
    var state = history.state;
    app.views.propertyTitle();
    app.els.content.empty();
    if (state) {
      app.views.propertyOpa(state);
    } else {
      $.ajax('http://api.phila.gov/opa/v1.1/property/' + id + '?format=json')
        .done(function (data) {
          state.opa = data.data.property;
        })
        .fail(function () {
          state.opa = {error: 'Failed to retrieve OPA address data.'};
        });
    }
  },
  propertyOpa: function (state) {
    app.els.propertyTitle.find('h1').text(state.address);
    app.els.propertyTitle.find('.small-text').text('#' + state.opa.account_number);
  },
  propertyOpaDetails: function () {
  },
  propertyTitle: function () {
    app.views.breadcrumbs('Address');
    app.els.propertyTitle.find('h1').html('&nbsp;');
    app.els.propertyTitle.find('.small-text').empty();
    app.els.search.val('');
    app.els.search.attr('placeholder', 'Search for another property');
    app.els.searchLeft.removeClass('medium-4').addClass('medium-14')
      .on('transitionend', function (e) {
        $(e.target).empty().append(app.els.propertyTitle);
      });
    app.els.searchBox.removeClass('medium-16').addClass('medium-10');
}
  // property: function (data) {
  //   if (history.replaceState && !history.state) history.replaceState(data);
  //   app.els.propertyTitle.find('h1').text(data.opa.full_address);
  //   app.els.propertyTitle.find('.small-text').text('#' + data.opa.account_number);
  //   app.els.content.empty();
  //   app.els.content.append(app.els.property);
  // }
};
