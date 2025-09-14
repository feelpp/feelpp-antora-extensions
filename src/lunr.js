/**
 * Antora extension for automatic Lunr.js search index generation
 * 
 * This extension automatically generates a Lunr.js compatible search index
 * after the site is published. It extracts content from all HTML files
 * and creates a JSON index that can be used for client-side search.
 */

const fs = require('fs')
const path = require('path')

// Lazy load JSDOM only when needed
let JSDOM
function loadJSDOM() {
  if (!JSDOM) {
    try {
      JSDOM = require('jsdom').JSDOM
    } catch (error) {
      throw new Error('JSDOM is required for the Lunr extension. Install it with: npm install jsdom')
    }
  }
  return JSDOM
}

function register({ config, playbook }) {
  const logger = this.getLogger('lunr-extension')
  
  this.once('sitePublished', (event) => {
    logger.info('Generating Lunr.js search index...')
    
    try {
      // Get output directory from the playbook
      const outputDir = playbook.output?.dir || 'build/site'
      logger.info(`Output directory: ${outputDir}`)
      
      generateSearchIndex(outputDir, config.lunr || {}, logger)
    } catch (error) {
      logger.error('Failed to generate search index:', error)
      throw error
    }
  })
}

function generateSearchIndex(outputDir, config = {}, logger) {
  const searchIndexFile = path.join(outputDir, config.indexFile || 'search-index.json')
  const maxContentLength = config.maxContentLength || 1000
  const minContentLength = config.minContentLength || 50
  
  // Find all HTML files
  const htmlFiles = walkDirectory(outputDir).filter(file => file.endsWith('.html'))
  const documents = []
  let id = 0
  
  htmlFiles.forEach(filePath => {
    try {
      const html = fs.readFileSync(filePath, 'utf8')
      const title = getTitle(html)
      const content = extractTextContent(html)
      
      // Skip empty content
      if (!content || content.length < minContentLength) {
        return
      }
      
      // Generate relative URL
      const relativePath = path.relative(outputDir, filePath)
      const url = '/' + relativePath.replace(/\\/g, '/').replace(/\/index\.html$/, '/')
      
      documents.push({
        id: ++id,
        title: title,
        content: content.substring(0, maxContentLength),
        url: url
      })
      
      if (config.debug) {
        logger.debug(`Indexed: ${title} (${url})`)
      }
    } catch (error) {
      logger.warn(`Failed to process ${filePath}:`, error.message)
    }
  })
  
  const searchIndex = {
    documents: documents
  }
  
  // Write search index
  fs.writeFileSync(searchIndexFile, JSON.stringify(searchIndex, null, 2))
  logger.info(`Search index generated: ${documents.length} documents → ${searchIndexFile}`)
}

function extractTextContent(html) {
  try {
    const JSDOM = loadJSDOM()
    const dom = new JSDOM(html)
    const document = dom.window.document
    
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, nav, .navbar, .footer')
    scripts.forEach(el => el.remove())
    
    // Get main content area
    const main = document.querySelector('main, .main, .content, article')
    const content = main || document.body
    
    return content.textContent.trim().replace(/\s+/g, ' ')
  } catch (error) {
    return ''
  }
}

function getTitle(html) {
  try {
    const JSDOM = loadJSDOM()
    const dom = new JSDOM(html)
    const titleEl = dom.window.document.querySelector('title, h1, .page-title')
    return titleEl ? titleEl.textContent.trim() : 'Untitled'
  } catch (error) {
    return 'Untitled'
  }
}

function walkDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList
  }
  
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      walkDirectory(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  })
  
  return fileList
}

module.exports = { register }