$.ajax('templates.html').done(function (html) {
  app.templates = $(html);
  views();
});
