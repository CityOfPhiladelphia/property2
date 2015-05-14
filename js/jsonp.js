var app = app || {};
app.settings = app.settings || {};

if(!$.support.cors) {
  app.settings.ajaxType = 'jsonp';
}
