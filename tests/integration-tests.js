/* eslint-env mocha */
'use strict'

const { expect } = require('./harness')
const { promises: fsp } = require('node:fs')
const ospath = require('node:path')

const FIXTURES_DIR = ospath.join(__dirname, 'fixtures')
const WORK_DIR = ospath.join(__dirname, 'work')

const generateSite = require('@antora/site-generator')

describe('generateSite()', () => {
  const cacheDir = ospath.join(WORK_DIR, '.cache/antora')
  const outputDir = ospath.join(WORK_DIR, 'public')
  const defaultPlaybookFile = ospath.join(
    FIXTURES_DIR,
    'docs-site/playbook.yml'
  )
  beforeEach(() => fsp.rm(outputDir, {recursive: true, force: true}))
  /*after(() => fsp.rm(WORK_DIR, {recursive: true, force: true}))*/

  it('should generate a site', async () => {
    const env = {}
    await generateSite(
      [
        '--playbook',
        defaultPlaybookFile,
        '--to-dir',
        outputDir,
        '--cache-dir',
        cacheDir,
        '--quiet',
      ],
      env
    )
  })
})
