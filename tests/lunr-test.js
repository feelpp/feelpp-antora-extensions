const { describe, it } = require('mocha')
const { expect } = require('chai')
const fs = require('fs')
const path = require('path')

describe('Lunr extension', () => {
  const { register } = require('../src/lunr.js')
  
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
})