'use strict'

module.exports = (page) => {
  const attributes = page.asciidoc && page.asciidoc.attributes
  if (attributes) {
    const listingDataAttrs = Object.fromEntries(Object.entries(attributes)
      .filter(([key, _]) => key.startsWith("page-listing-data-"))
      .map(([key, value]) => [key.substring("page-listing-data-".length, key.length), value]))
    return JSON.stringify(listingDataAttrs)
  }
  return ''
}
