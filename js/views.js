app.views = {
  search: function (q) {
    app.els.search.val(q);
  },
  count: function (total) {
    if (!app.els.count) app.els.count = app.templates.find('#count');
    app.els.count.find('#total').text(total);
    app.els.count.appendTo(app.els.results);
  },
  result: function (address) {
    if (!app.els.result) app.els.result = app.templates.find('#result');
    // Clone and append to #results
    var result = app.els.result.clone();
    result.find('h3').text(address.standardizedAddress);
    result.appendTo(app.els.results);
  },
  results: function (q) {
    if (!app.els.results) app.els.results = app.templates.find('#results');

    app.els.results.appendTo(app.els.content);
    app.els.results.text('Loading...');

    $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + q + '?format=json')
      .done(function (data) {
        app.els.results.empty();
        app.views.count(data.addresses.length);
        data.addresses.forEach(app.views.result);
      })
      .fail(function () {
      });
  }
}
