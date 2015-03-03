var app = require('ampersand-app')
var domReady = require('domready')
var _ = require('underscore')
var AddressesCollection = require('./models/addresses')
// var MeModel = require('./models/me')
// var Router = require('./router')

// Attach app to window for console reference
window.app = app

app.extend({
  // me: new MeModel(),
  addresses: new AddressesCollection(),
  // router: new Router(),
  init: function () {
    this.addresses.geocode('1234 market')
    console.log(this.addresses)
    // this.router.history.start({pushState: true})
  }
})

// run it on domReady
domReady(_.bind(app.init, app));
