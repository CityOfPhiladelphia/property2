/*global $,app*/

app.views.front = function () {
  app.hooks.crumbs.update();

  app.hooks.search.val('').attr('placeholder', 'Enter address, account number, intersection, or city block');
  if($( window ).width() <= '480'){
    app.hooks.search.val('').attr('placeholder','Enter address, account number, etc.');
  }
  app.hooks.searchForm.addClass('hint');
  app.hooks.searchForm.find('p').removeClass('hidden');
  app.hooks.searchRight.html('&nbsp;');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10 float-right').addClass('medium-16');

  app.hooks.content.children().detach();
  app.hooks.content.empty();
  app.hooks.belowContent.children().detach();
  app.hooks.belowContent.empty();
  app.hooks.content.append(app.hooks.front);
};
