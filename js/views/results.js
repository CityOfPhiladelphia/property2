/*global $,app*/

app.views.results = function (q) {
  // Breadcrumbs
  app.els.resultsCrumb.find('b').text(q);
  app.els.crumbs.update(app.els.resultsCrumb);

  // Search
  app.els.search.val(q);
  app.els.searchLeft.off('transitionend').removeClass('medium-14')
    .addClass('medium-4').html('&nbsp;');
  app.els.searchBox.removeClass('medium-10').addClass('medium-16');

  // Empty content area
  app.els.content.children().detach();

  if (history.state) {
    render();
  } else {
    app.els.content.text('Loading...');
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
    if (state.error) return app.els.content.text(state.error);
    app.els.content.empty(); // Remove loading message
    app.els.count.find('#total').text(state.total);
    app.els.content.append(app.els.count);
    app.els.results.empty(); // TODO reuse existing result nodes
    state.data.properties.forEach(function (p) {
      var result = app.els.result.clone();
      var key = p.property_id;
      var withUnit = app.util.addressWithUnit(p);
      var href = '?' + $.param({p: key});
      result.find('a').attr('href', href)
        .text(withUnit).on('click', function (e) {
          if (e.ctrlKey || e.altKey || e.shiftKey) return;
          e.preventDefault();
          history.pushState({opa: p, address: withUnit}, withUnit, href);
          app.views.property(key);
        });
      result.appendTo(app.els.results);
    });
    app.els.content.append(app.els.results);
  }

  // OPA address needs to either separate unit by slash or end in slash
  function opaAddress (address) {
    if (address.indexOf(' #') !== -1) {
      address = address.replace(' #', '/');
    } else address = address + '/';
    return address;
  }
};
