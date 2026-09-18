const { describe, it } = require('mocha')
const { expect } = require('chai')
const fs = require('fs')
const os = require('os')
const path = require('path')

describe('Lunr extension', () => {
  const { generateSearchIndex, getSitePath, register } = require('../src/lunr.js')
  
  it('should export a register function', () => {
    expect(register).to.be.a('function')
  })
  
  it('should register with Antora context', () => {
    let eventRegistered = false
    const mockContext = {
      getLogger: () => ({
        info: () => {},
        error: () => {},
        debug: () => {},
        warn: () => {}
      }),
      once: (event, handler) => {
        if (event === 'sitePublished') {
          eventRegistered = true
        }
      }
    }
    
    const config = {}
    const playbook = { output: { dir: 'build/site' } }
    
    register.call(mockContext, { config, playbook })
    
    expect(eventRegistered).to.be.true
  })

  it('preserves the deployment pathname in indexed URLs', () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feelpp-lunr-'))
    const logger = { debug: () => {}, info: () => {}, warn: () => {} }
    try {
      fs.mkdirSync(path.join(outputDir, 'rom'), { recursive: true })
      fs.writeFileSync(path.join(outputDir, 'rom', 'index.html'), '<title>ROM</title><main>Reduced models overview.</main>')
      generateSearchIndex(outputDir, { minContentLength: 1, siteUrl: 'https://feelpp.github.io/course-rom/' }, logger)
      const index = JSON.parse(fs.readFileSync(path.join(outputDir, 'search-index.json')))
      expect(index.documents).to.deep.include({
        id: 1,
        title: 'ROM',
        content: 'Reduced models overview.',
        url: '/course-rom/rom/'
      })
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true })
    }
  })

  it('normalizes deployment paths with and without a trailing slash', () => {
    expect(getSitePath('https://docs.example.org')).to.equal('/')
    expect(getSitePath('https://docs.example.org/course-rom')).to.equal('/course-rom/')
    expect(getSitePath('https://docs.example.org/course-rom/')).to.equal('/course-rom/')
  })
})