'use strict'

/**
 * Adds image$ family if missing
 * @param {string} spec
 * @returns {string}
 */
module.exports = (spec) => {
  if (!spec || spec.includes('image$') || spec.startsWith('http://') || spec.startsWith('https://')) {
    return spec
  }
  const lastColon = spec.lastIndexOf(':')
  if (lastColon > 0 && lastColon < spec.length - 1) {
    return spec.slice(0, lastColon + 1) + 'image$' + spec.slice(lastColon + 1)
  }
  return 'image$' + spec
}
