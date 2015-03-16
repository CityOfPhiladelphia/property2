// Fix app name in header to point at page without "search" portion of URL
app.views.titleLink()

app.render = function () {
  // Check route and display corresponding view
  var params = $.deparam(window.location.search.substr(1));
  app.views.search(params.q);

  if (params.q) {
    app.views.breadcrumbs('Search Results')

    // Set existing content children aside for later
    app.els.content.children().detach();
    
    // If we already have state no need to hit API
    if (history.state) app.views.results(history.state);
    else {
      app.els.content.text('Loading...');
      $.ajax('https://api.phila.gov/ulrs/v3/addresses/' + encodeURIComponent(params.q) + '?format=json')
        .done(function (data) {
          if (history.replaceState) history.replaceState(data);
          app.views.results(data);
        })
        .fail(function () {
          var data = {error: 'Failed to retrieve results. Please try another search.'};
          if (history.replaceState) history.replaceState(data);
          app.views.results(data);
        });
    }
  } else if (params.a) {
    app.views.breadcrumbs('Address')
  } else {
    app.views.breadcrumbs()
  }
}

app.render();

// Handle traversing of history
window.onpopstate = app.render;
