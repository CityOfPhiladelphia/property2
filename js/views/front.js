/*global $,app*/

app.views.front = function () {
  app.hooks.crumbs.update();

  app.hooks.searchRight.html('&nbsp;');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10 right').addClass('medium-16');

  app.hooks.content.children().detach();
  app.hooks.content.empty();
  app.hooks.belowContent.children().detach();
  app.hooks.belowContent.empty();
  app.hooks.content.append(app.hooks.front);

  app.hooks.ownerSearchDisclaimer.addClass('hide');
};
