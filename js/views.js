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
    result.find('a').attr('href', '?' + $.param({p: key}))
      .text(property.full_address + unit);
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
  addressPreFetch: function (address) {
    app.views.breadcrumbs('Address');
    app.els.addressTitle.find('h1').html(address);
    app.els.addressTitle.find('.small-text').empty();
    app.els.search.val('');
    app.els.search.attr('placeholder', 'Search for another property');
    app.els.searchLeft.removeClass('medium-4').addClass('medium-14')
      .on('transitionend', function (e) {
        $(e.target).empty().append(app.els.addressTitle);
      });
    app.els.searchBox.removeClass('medium-16').addClass('medium-10');
  },
  address: function (data) {
    if (history.replaceState && !history.state) history.replaceState(data);
    app.els.addressTitle.find('h1').text(data.opa.full_address);
    app.els.addressTitle.find('.small-text').text('#' + data.opa.account_number);
    app.els.content.empty();
    app.els.content.append(app.els.address);
  }
};
