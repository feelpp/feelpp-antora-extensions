const {register: registerTooboxNavigation} = require('./toolbox-navigation.js')
const {register: registerListing} = require('./listing.js')
const {register: registerLunr} = require('./lunr.js')
const {register: registerJupyter} = require('./jupyter.js')

module.exports.register = (thisContext, args) => {
  registerTooboxNavigation.call(thisContext, args)
  registerListing.call(thisContext, args)
  registerLunr.call(thisContext, args)
  registerJupyter.call(thisContext, args)
}
