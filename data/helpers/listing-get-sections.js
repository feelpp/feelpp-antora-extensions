'use strict'

const listingConfig = ${listingConfig}

module.exports = (configName, page, {data: {root}}) => {
  const {contentCatalog} = root
  if (configName in listingConfig) {
    const config = listingConfig[configName]
    if (config) {
      return Object.entries(config).map(([_, section]) => {
        const pages = getPages(contentCatalog, page, section.selector)
        return {
          title: section.sectionTitle,
          pages,
        }
      })
    }
  }
  return []
}

const getPages = function (contentCatalog, page, selector) {
  const filters = []
  if ('module' in selector && 'version' in selector && 'component' in selector) {
    filters.push((currentPage, catalogPage) => {
      const { src } = catalogPage
      const componentMatches = selector.component === '<current>'
        ? src.component === currentPage.componentVersion.name
        : src.component === selector.component

      const versionMatches = selector.version === '<current>'
        ? src.version === currentPage.componentVersion.version
        : src.version === selector.version

      const moduleMatches = selector.module === '<current>'
        ? src.module === currentPage.module
        : src.module === selector.module

      return componentMatches && versionMatches && moduleMatches
    })
  }
  if ('attributes' in selector) {
    const attributeSelectors = selector.attributes
    for (const attributeSelector of attributeSelectors) {
      const attributeSelectorName = attributeSelector.name
      if ('contains' in attributeSelector) {
        const value = attributeSelector['contains']
        filters.push((_, catalogPage) => {
          const { asciidoc } = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue.split(',').map((v) => v.trim()).includes(value)
        })
      } else if ('equals' in attributeSelector) {
        const value = attributeSelector['equals']
        filters.push((_, catalogPage) => {
          const { asciidoc } = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue === value
        })
      } else if ('startsWith' in attributeSelector) {
        const value = attributeSelector['startsWith']
        filters.push((_, catalogPage) => {
          const { asciidoc } = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue.startsWith(value)
        })
      } else if ('endsWith' in attributeSelector) {
        const value = attributeSelector['endsWith']
        filters.push((_, catalogPage) => {
          const { asciidoc } = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue.endsWith(value)
        })
      } else {
        throw new Error('Unsupported attribute selector, must be one of: contains, equals, startsWith or endsWith')
      }
    }
  }
  const pages = contentCatalog.getPages((catalogPage) => {
    const { asciidoc, out } = catalogPage
    if (!out || !asciidoc) return
    if (filters && filters.length) {
      for (const filter of filters) {
        const match = filter(page, catalogPage)
        if (!match) {
          return
        }
      }
    }
    return true
  }).sort((a, b) => (a.title || '').localeCompare((b.title || '')))
  if (pages && pages.length > 0) {
    while (pages.length % 3 !== 0) {
      pages.push({
        empty: true,
      })
    }
  }
  pages.push({
    empty: true,
  })
  return pages
}
