'use strict'

// The name of the package in order to give the Antora logger a useful name
const fs = require('node:fs')
const ospath = require('node:path')
const {promises: fsp} = fs
const LazyReadable = require('./lazy-readable')
const template = require('./template')

/**
 * @module listing-extension
 */
function register({config: {listing, ...unknownOptions}}) {
  const packageName = "@feelpp/antora-listing-extension"
  const logger = this.getLogger(packageName)

  if (Object.keys(unknownOptions).length) {
    const keys = Object.keys(unknownOptions)
    throw new Error(`Unrecognized option${keys.length > 1 ? 's' : ''} specified for ${packageName}: ${keys.join(', ')}`)
  }

  this.on('uiLoaded', async ({playbook, uiCatalog}) => {
    playbook.env.SITE_LISTING_EXTENSION_ENABLED = 'true'
    const uiOutputDir = playbook.ui.outputDir
    assetFile(uiCatalog, logger, uiOutputDir, 'css', 'listing.css')
    const helperPath = 'helpers/listing-get-sections.js'
    if (uiCatalog.findByType('helper').some(({path}) => path === helperPath)) {
      // ignore
    } else {
      const helperFilePath = ospath.join(__dirname, '../data', helperPath)
      uiCatalog.addFile({
        contents: Buffer.from(template(await fsp.readFile(helperFilePath, 'utf8'), {listingConfig: JSON.stringify(listing)})),
        path: helperPath,
        stem: ospath.parse(helperPath).name,
        type: 'helper',
      })
    }
    await helperFile(uiCatalog, 'helpers/image-spec.js')
    await helperFile(uiCatalog, 'helpers/resolve-resource-url.js')
    await helperFile(uiCatalog, 'helpers/listing-get-data.js')
    await partialFile(uiCatalog, 'partials/listing.hbs')
    await partialFile(uiCatalog, 'partials/listing-card.hbs')
    await layoutFile(uiCatalog, 'layouts/listing.hbs')
  })

  this.on('beforePublish', ({playbook}) => {
    delete playbook.env.SITE_LISTING_EXTENSION_ENABLED
  })

  this.on('navigationBuilt', ({contentCatalog, navigationCatalog}) => {
    const navigation = {}
    for (const [configKey, config] of Object.entries(listing)) {
      for (const [sectionKey, section] of Object.entries(config)) {
        if ('navigation' in section && 'root' in section.navigation && section.navigation.root === true) {
          const listingPages = contentCatalog.getPages((catalogPage) => {
            const {asciidoc, out} = catalogPage
            if (!out || !asciidoc) return
            return asciidoc.attributes['page-listing-config'] === configKey
          })
          for (const listingPage of listingPages) {
            let nav = navigationCatalog.getNavigation(listingPage.src.component, listingPage.src.version)
            if (!nav) {
              nav = []
              navigationCatalog.addNavigation(listingPage.src.component, listingPage.src.version, nav)
            }
            const sectionConfig = listing[configKey][sectionKey]
            nav.push({
              items: createNavigationItems(sectionConfig, listingPage, contentCatalog, listing)
            })
          }
        }
      }
    }
  })

  async function layoutFile(uiCatalog, layoutPath) {
    if (uiCatalog.findByType('layout').some(({path}) => path === layoutPath)) {
      // ignore
    } else {
      const layoutFilePath = ospath.join(__dirname, '../data', layoutPath)
      uiCatalog.addFile({
        contents: Buffer.from(await fsp.readFile(layoutFilePath, 'utf8')),
        path: layoutPath,
        stem: ospath.parse(layoutPath).name,
        type: 'layout',
      })
    }
  }

  async function partialFile(uiCatalog, partialPath) {
    if (uiCatalog.findByType('partial').some(({path}) => path === partialPath)) {
      // ignore
    } else {
      const partialFilePath = ospath.join(__dirname, '../data', partialPath)
      uiCatalog.addFile({
        contents: Buffer.from(await fsp.readFile(partialFilePath, 'utf8')),
        path: partialPath,
        stem: ospath.parse(partialPath).name,
        type: 'partial',
      })
    }
  }

  async function helperFile(uiCatalog, helperPath) {
    if (uiCatalog.findByType('helper').some(({path}) => path === helperPath)) {
      // ignore
    } else {
      const helperFilePath = ospath.join(__dirname, '../data', helperPath)
      uiCatalog.addFile({
        contents: Buffer.from(await fsp.readFile(helperFilePath, 'utf8')),
        path: helperPath,
        stem: ospath.parse(helperPath).name,
        type: 'helper',
      })
    }
  }

  function assetFile(
    uiCatalog,
    logger,
    uiOutputDir,
    assetDir,
    basename,
    assetPath = assetDir + '/' + basename,
    contents = new LazyReadable(() => fs.createReadStream(ospath.join(__dirname, '../data', assetPath))),
    overwrite = false
  ) {
    const outputDir = uiOutputDir + '/' + assetDir
    const existingFile = uiCatalog.findByType('asset').some(({path}) => path === assetPath)
    if (existingFile) {
      if (overwrite) {
        logger.warn(`Please remove the following file from your UI since it is managed by ${packageName}: ${assetPath}`)
        existingFile.contents = contents
        delete existingFile.stat
      } else {
        logger.info(`The following file already exists in your UI: ${assetPath}, skipping`)
      }
    } else {
      uiCatalog.addFile({
        contents,
        type: 'asset',
        path: assetPath,
        out: {dirname: outputDir, path: outputDir + '/' + basename, basename},
      })
    }
  }
}

const createNavigationItems = function (sectionConfig, parentPage, contentCatalog, listing) {
  let navigationTitle = sectionConfig.sectionTitle
  if ('navigation' in sectionConfig) {
    if ('skip' in sectionConfig.navigation && sectionConfig.navigation.skip === true) {
      return []
    }
    if ('title' in sectionConfig.navigation) {
      navigationTitle = sectionConfig.navigation.title
    }
  }
  const pages = getPages(contentCatalog, parentPage, sectionConfig.selector)
  const navigationItems = pages.map((page) => {
    const pageListingConfig = page.asciidoc.attributes['page-listing-config']
    const items = pageListingConfig && pageListingConfig in listing
      ? Object.entries(listing[pageListingConfig]).flatMap(([_, nestedSectionConfig]) => {
        return createNavigationItems(nestedSectionConfig, page, contentCatalog, listing)
      })
      : undefined
    return {
      content: page.title,
      url: page.pub.url,
      urlType: 'internal',
      items
    }
  })
  if (navigationTitle === null) {
    return navigationItems
  }
  return [{
    content: navigationTitle,
    items: navigationItems
  }]
}

const getPages = function (contentCatalog, page, selector) {
  const filters = []
  if ('module' in selector && 'version' in selector && 'component' in selector) {
    filters.push((currentPage, catalogPage) => {
      const componentMatches = selector.component === '<current>'
        ? catalogPage.src.component === currentPage.src.component
        : catalogPage.src.component === selector.component

      const versionMatches = selector.version === '<current>'
        ? catalogPage.src.version === currentPage.src.version
        : catalogPage.src.version === selector.version

      const moduleMatches = selector.module === '<current>'
        ? catalogPage.src.module === currentPage.src.module
        : catalogPage.src.module === selector.module

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
          const {asciidoc} = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue.split(',').map((v) => v.trim()).includes(value)
        })
      } else if ('equals' in attributeSelector) {
        const value = attributeSelector['equals']
        filters.push((_, catalogPage) => {
          const {asciidoc} = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue === value
        })
      } else if ('startsWith' in attributeSelector) {
        const value = attributeSelector['startsWith']
        filters.push((_, catalogPage) => {
          const {asciidoc} = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue.startsWith(value)
        })
      } else if ('endsWith' in attributeSelector) {
        const value = attributeSelector['endsWith']
        filters.push((_, catalogPage) => {
          const {asciidoc} = catalogPage
          const attributeValue = asciidoc.attributes[attributeSelectorName]
          return attributeValue && attributeValue.endsWith(value)
        })
      } else {
        throw new Error('Unsupported attribute selector, must be one of: contains, equals, startsWith or endsWith')
      }
    }
  }
  return contentCatalog.getPages((catalogPage) => {
    const {asciidoc, out} = catalogPage
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
}


module.exports.register = register
