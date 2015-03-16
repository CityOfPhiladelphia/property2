// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

app.els = {
  content: $('[data-hook=content]'),
  search: $('[data-hook=property-search]'),
  appTitle: $('[data-hook=app-title]'),
  appCrumb: $('[data-hook=app-crumb]'),
  appLink: $('<a>').attr('href', window.location.pathname)
};

app.els.appCrumbText = app.els.appCrumb.contents();
app.els.appCrumbLink = app.els.appLink.clone().text(app.els.appCrumb.text());

$('#templates').children().each(function (i, template) {
  var el = $(template);
  app.els[el.data('hook')] = el;
});
