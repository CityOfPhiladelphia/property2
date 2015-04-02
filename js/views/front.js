/*global $,app*/

app.views.front = function () {
  app.hooks.crumbs.update();

  app.hooks.search.val('').attr('placeholder', 'Enter address, account number, intersection, or city block');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10').addClass('medium-16');

  app.hooks.content.children().detach();
  app.hooks.content.append(app.hooks.front);
};
