app.views = {
  search: function (q) {
    app.els.search.val(q);
  },
  count: function (total) {
    app.els.count.find('#total').text(total);
    app.els.count.appendTo(app.els.results);
  },
  result: function (address) {
    // Clone and append to #results
    var result = app.els.result.clone();
    console.log(address);
    result.find('h3').text(address.standardizedAddress);
    result.appendTo(app.els.results);
  },
  results: function (q) {
    app.els.results.appendTo(app.els.content);
    app.els.results.text('Loading...');

    $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + q + '?format=json')
      .done(function (data) {
        app.els.results.empty();
        app.views.count(data.addresses.length);
        data.addresses.forEach(app.views.result);
      })
      .fail(function (jqXHR, status, err) {
        app.els.results.text('Failed to retrieve results. Please try another search.');
      });
  }
}
