app.views = {
  search: function (q) {
    app.els.search.val(q);
  },
  count: function (total) {
    app.els.count.find('#total').text(total);
    app.els.count.appendTo(app.els.content);
  },
  result: function (address) {
    // Clone and append to #results
    var result = app.els.result.clone();
    console.log(address);
    var key = address.standardizedAddress;
    result.find('a').attr('href', '?' + $.param({a: key})).text(key);
    result.appendTo(app.els.results);
  },
  results: function (q) {
    app.els.content.text('Loading...');
    $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + q + '?format=json')
      .done(function (data) {
        app.els.content.empty();
        app.views.count(data.addresses.length);
        app.els.results.empty();
        data.addresses.forEach(app.views.result);
        app.els.results.appendTo(app.els.content);
      })
      .fail(function (jqXHR, status, err) {
        app.els.content.text('Failed to retrieve results. Please try another search.');
      });
  }
}
