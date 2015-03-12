// Global namespace for the app
var app = {};

// Expose it for introspection
window.app = app;

app.els = {
  content: $('#content'),
  search: $('#property-search')
};

$('#templates').children().each(function (i, template) {
  app.els[template.id] = $(template);
});
