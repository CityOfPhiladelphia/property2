function render () {
  // Check route and display corresponding view
}

// Initialize
$.ajax('templates.html').done(function (html) {
  app.templates = $(html);
  render();
});

// Handle traversing of history
window.onpopstate = render;
