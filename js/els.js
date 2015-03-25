/* global $,app */
// Set up pointers to useful elements

app.els = {
  appLink: $('<a>').attr('href', window.location.pathname)
};

$('[data-hook]').each(function (i, el) {
  var $el = $(el);
  // Convert hyphen-names to camelCase in hooks
  var hook = $el.data('hook').replace(/-([a-z])/g, function (m) {
    return m[1].toUpperCase();
  });
  app.els[hook] = $el;
});

app.els.appCrumbText = app.els.appCrumb.contents();
app.els.appCrumbLink = app.els.appLink.clone().text(app.els.appCrumb.text());

// We have our pointers so we can take the templates container out of the DOM
$('#templates').detach();
