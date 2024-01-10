'use strict'

// The name of the package in order to give the Antora logger a useful name
const fs = require('fs')
const ospath = require('path')
const { promises: fsp } = fs
const LazyReadable = require('./lazy-readable')
const template = require('./template')

/**
 * @module listing-extension
 */
function register ({ config: { listing, ...unknownOptions } }) {
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
    if (uiCatalog.findByType('helper').some(({ path }) => path === helperPath)) {
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
    await partialFile(uiCatalog, 'partials/listing.hbs')
    await partialFile(uiCatalog, 'partials/listing-card.hbs')
  })

  this.on('beforePublish', ({ playbook }) => {
    delete playbook.env.SITE_LISTING_EXTENSION_ENABLED
  })


  async function partialFile(uiCatalog, partialPath) {
    if (uiCatalog.findByType('partial').some(({ path }) => path === partialPath)) {
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
    if (uiCatalog.findByType('helper').some(({ path }) => path === helperPath)) {
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

  function assetFile (
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

module.exports.register = register
