// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

app.els = {
  content: $('[data-hook=content]'),
  search: $('[data-hook=property-search]'),
  titleLink: $('[data-hook=title-link]')
};

$('#templates').children().each(function (i, template) {
  var el = $(template);
  app.els[el.data('hook')] = el;
});
