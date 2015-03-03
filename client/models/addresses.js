var Collection = require('ampersand-collection');
var restMixin = require('ampersand-collection-rest-mixin');
var underscoreMixin = require('ampersand-collection-underscore-mixin');

// or we can extend it with underscore and REST methods
// to turn it into something similar to a Backbone Collection
module.exports = Collection.extend(underscoreMixin, restMixin, {
  // TODO maybe parse input with geocode?
  geocode: function (rawAddress, options) {
    this.rawAddress = encodeURIComponent(rawAddress)
    this.fetch(options)
  },
  parse: function (response) {
    return response.addresses
  },
  url: function () {
    return 'https://api.phila.gov/ulrs/v3/addresses/' + this.rawAddress + '?format=json'
  }
});
