'use strict'

const listingConfig = ${listingConfig}

module.exports = (configName, page, {data: {root}}) => {
  const {contentCatalog} = root
  if (configName in listingConfig) {
    const config = listingConfig[configName]
    if (config) {
      return config.map((section) => {
        const selector = {
          tag: section.tag,
          withinParentModule: section.withinParentModule
        }
        const pages = getPages(contentCatalog, page, selector)
        return {
          title: section.sectionTitle,
          pages,
        }
      })
    }
  }
  return []
}

const getPages = function (contentCatalog, page, {tag, withinParentModule}) {
  const pages = contentCatalog.getPages(({asciidoc, out, src}) => {
    if (!out || !asciidoc) return
    if (src.component !== page.componentVersion.name ||
      (withinParentModule && src.module !== page.module) ||
      src.version !== page.componentVersion.version) return
    const pageTags = asciidoc.attributes['page-tags']
    return pageTags && pageTags.split(',').map((v) => v.trim()).includes(tag)
  }).sort((a, b) => (a.title || '').localeCompare((b.title || '')))
  if (pages && pages.length > 0) {
    while (pages.length % 3 !== 0) {
      pages.push({
        empty: true,
      })
    }
  }
  return pages
}
