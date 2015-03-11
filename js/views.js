app.views = {}

app.views.search = function () {
  var template = app.templates.find('#search');
  app.container.append(template);
};

app.views.results = function (q) {
  var template = app.templates.find('#results');

  $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + q + '?format=json')
    .done(function (data) {
      console.log(data);
    })
    .fail(function () {
    });
};
