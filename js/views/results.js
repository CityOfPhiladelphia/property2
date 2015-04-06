/*global $,app*/

app.views.results = function (q) {
  // Breadcrumbs
  app.hooks.resultsCrumb.find('b').text(q);
  app.hooks.crumbs.update(app.hooks.resultsCrumb);

  // Search
  app.hooks.search.val(q);
  app.hooks.searchForm.addClass('hint');
  app.hooks.searchForm.find('p').removeClass('hide');
  app.hooks.searchLeft.removeClass('medium-14').addClass('medium-4').html('&nbsp;');
  app.hooks.searchBox.removeClass('medium-10').addClass('medium-16');

  // Empty content area
  app.hooks.content.children().detach();

  if (history.state) {
    render();
  } else {
    app.hooks.content.text('Loading...');
    $.ajax('http://api.phila.gov/opa/v1.1/address/' + encodeURIComponent(opaAddress(q)) + '?format=json')
      .done(function (data) {
        history.replaceState(data, ''); // Second param not optional in IE10
        render();
      })
      .fail(function () {
        history.replaceState({error: 'Failed to retrieve results. Please try another search.'}, '');
        render();
      });
  }

  function render () {
    var state = history.state;
    if (state.error) return app.hooks.content.text(state.error);
    app.hooks.content.empty(); // Remove loading message
    app.hooks.count.find('#total').text(state.total);
    app.hooks.content.append(app.hooks.count);
    app.hooks.results.empty(); // TODO reuse existing result nodes
    state.data.properties.forEach(function (p) {
      var result = app.hooks.result.clone();
      var key = p.property_id;
      var withUnit = app.util.addressWithUnit(p);
      var href = '?' + $.param({p: key});
      result.find('a').attr('href', href)
        .text(withUnit).on('click', function (e) {
          if (e.ctrlKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          history.pushState({opa: p, address: withUnit}, withUnit, href);
          window.scroll(0, 0);
          app.views.property(key);
        });
      result.appendTo(app.hooks.results);
    });
    app.hooks.content.append(app.hooks.results);
  }

  // OPA address needs to either separate unit by slash or end in slash
  function opaAddress (address) {
    if (address.indexOf(' #') !== -1) {
      address = address.replace(' #', '/');
    } else address = address + '/';
    return address;
  }
};
