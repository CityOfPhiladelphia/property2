app.render = function () {
  // Fix app name in header to point at page without "search" portion of URL
  app.views.titleLink()

  // Check route and display corresponding view
  var params = $.deparam(window.location.search.substr(1));

  if (params.q) {
    app.els.content.children().detach();
    app.views.search(params.q);
    app.views.results(params.q);
  }
}

app.render();

// Handle traversing of history
window.onpopstate = app.render;
