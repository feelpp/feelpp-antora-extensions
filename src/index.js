const { register: registerTooboxNavigation } = require('./toolbox-navigation.js')

module.exports.register = (context) => {
  registerTooboxNavigation(context)
}
