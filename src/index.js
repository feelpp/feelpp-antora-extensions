const {register: registerTooboxNavigation} = require('./toolbox-navigation.js')
const {register: registerListing} = require('./listing.js')

module.exports.register = (thisContext, args) => {
  registerTooboxNavigation.call(thisContext, args)
  registerListing.call(thisContext, args)
}
