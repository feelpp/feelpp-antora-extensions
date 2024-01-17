const {register: registerToolboxNavigation} = require('./toolbox-navigation.js')
const {register: registerListing} = require('./listing.js')

module.exports.register = (thisContext, args) => {
  registerToolboxNavigation.call(thisContext, args)
  registerListing.call(thisContext, args)
}
