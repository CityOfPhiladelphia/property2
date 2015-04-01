/*global $,app*/

app.views.front = function () {
  app.els.crumbs.update();

  app.els.search.val('').attr('placeholder', 'Enter address, account number, intersection, or city block');
  app.els.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.els.searchBox.removeClass('medium-10').addClass('medium-16');

  app.els.content.children().detach();
  app.els.content.append(app.els.front);
};
