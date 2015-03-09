app.views = {}

function views () {
  app.views.search = (function () {
    var template = app.templates.find('#search');
    app.container.append(template);
    return template;
  })();
}
