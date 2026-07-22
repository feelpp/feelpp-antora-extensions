const crypto = require('node:crypto')
const path = require('node:path').posix

const asciidoctor = require('@asciidoctor/core')()
const JupyterConverter = require('asciidoctor-jupyter')
const extensionPackage = require('../package.json')
const converterPackage = require('asciidoctor-jupyter/package.json')

asciidoctor.ConverterFactory.register(JupyterConverter, ['jupyter'])

const DEFAULT_FIGURE_CONTRACT = 'alt text, caption, labelled axes and units, and non-colour encoding'

function sha256 (value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function parseHeaderAttributes (source) {
  const attributes = {}
  const lines = source.split(/\r?\n/)
  let titleSeen = false
  for (const line of lines) {
    if (!titleSeen) {
      if (line.startsWith('= ')) titleSeen = true
      continue
    }
    if (line === '' || line.startsWith('//')) continue
    const match = line.match(/^:([^:]+):(?:\s*(.*))?$/)
    if (!match) break
    attributes[match[1]] = match[2] || ''
  }
  return attributes
}

function listAttribute (attributes, name) {
  return (attributes[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function resourceId ({ component, version, module, relative }, family = 'page') {
  const prefix = version ? `${version}@${component}` : component
  const familyMarker = family === 'page' ? '' : `${family}$`
  return `${prefix}:${module}:${familyMarker}${relative}`
}

function matchesInclude (relative, include) {
  if (!include || include.length === 0) return true
  return include.some((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')
    return new RegExp(`^${escaped}$`).test(relative)
  })
}

function isJupyterPage (page, options = {}) {
  const source = page.contents.toString('utf8')
  const attributes = parseHeaderAttributes(source)
  return Object.hasOwn(attributes, 'page-jupyter') && matchesInclude(page.src.relative, options.include)
}

function notebookMetadata (page, source, attributes, options) {
  const required = [
    'page-course-language',
    'page-course-priority',
    'page-course-difficulty',
    'page-course-duration-minutes',
    'page-course-concepts',
    'page-course-outcomes'
  ]
  const missing = required.filter((name) => !attributes[name])
  if (missing.length) {
    throw new Error(`${resourceId(page.src)}: missing notebook metadata: ${missing.join(', ')}`)
  }
  if (attributes['page-course-language'] !== 'en') {
    throw new Error(`${resourceId(page.src)}: generated notebooks must use English`)
  }
  const duration = Number.parseInt(attributes['page-course-duration-minutes'], 10)
  if (!Number.isInteger(duration) || duration < 1) {
    throw new Error(`${resourceId(page.src)}: invalid page-course-duration-minutes`)
  }
  return {
    schema_version: 1,
    source_kind: 'asciidoc',
    source_resource_id: resourceId(page.src),
    source_path: page.src.relative,
    source_sha256: sha256(source),
    source_page_url: page.pub.url,
    language: 'en',
    priority: attributes['page-course-priority'],
    difficulty: attributes['page-course-difficulty'],
    duration_minutes: duration,
    concept_ids: listAttribute(attributes, 'page-course-concepts'),
    outcomes: listAttribute(attributes, 'page-course-outcomes'),
    execution_profile: attributes['page-course-execution-profile'] || 'fast',
    accessibility: {
      keyboard_only: true,
      colour_alone_forbidden: true,
      required_figure_contract: attributes['page-course-figure-contract'] || DEFAULT_FIGURE_CONTRACT
    },
    generator: {
      asciidoctor_jupyter: converterPackage.version,
      feelpp_antora_extensions: extensionPackage.version,
      feelpp_asciidoctor_extensions: options.asciidoctorExtensionVersion || '1.0.0-rc.17'
    }
  }
}

function normaliseMarkdown (source, page) {
  return source
    .replace(
      /(^|\n)\+\n(\\[\s\S]*?)\n\+(?=\n|$)/g,
      (_match, prefix, latex) => `${prefix}$$\n${latex}\n$$`
    )
    .replace(/\]\(attachment\$([^)]+)\)/g, (_match, target) => {
      const relative = path.relative(path.dirname(page.src.relative), target)
      return `](${relative || path.basename(target)})`
    })
}

function normaliseNotebook (notebook, page, source, attributes, options = {}) {
  notebook.nbformat = 4
  notebook.nbformat_minor = Math.max(notebook.nbformat_minor || 0, 5)
  notebook.metadata = notebook.metadata || {}
  notebook.metadata.kernelspec = notebook.metadata.kernelspec || {}
  notebook.metadata.kernelspec.name = notebook.metadata.kernelspec.name || 'python3'
  notebook.metadata.kernelspec.language = notebook.metadata.kernelspec.language || 'python'
  notebook.metadata.kernelspec.display_name = notebook.metadata.kernelspec.display_name || 'Python 3'
  notebook.metadata.course = notebookMetadata(page, source, attributes, options)
  notebook.cells.forEach((cell, index) => {
    let cellSource = Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''
    if (cell.cell_type === 'markdown') {
      cellSource = normaliseMarkdown(cellSource, page)
      cell.source = cellSource
    }
    cell.id = sha256(`${resourceId(page.src)}\0${index}\0${cell.cell_type}\0${cellSource}`).slice(0, 16)
    if (cell.cell_type === 'code') {
      cell.execution_count = null
      cell.outputs = []
    }
  })
  return notebook
}

function generateNotebook (page, options = {}) {
  const source = page.contents.toString('utf8')
  const attributes = parseHeaderAttributes(source)
  let notebook
  try {
    notebook = JSON.parse(asciidoctor.convert(source, {
      backend: 'jupyter',
      safe: 'safe',
      standalone: true,
      to_file: false,
      attributes: {
        'jupyter-language-name': attributes['jupyter-language-name'] || 'python',
        'jupyter-language-version': attributes['jupyter-language-version'] || '3.12',
        'jupyter-kernel-name': attributes['jupyter-kernel-name'] || 'python3',
        'jupyter-kernel-language': attributes['jupyter-kernel-language'] || 'python'
      }
    }))
  } catch (error) {
    throw new Error(`${resourceId(page.src)}: notebook conversion failed: ${error.message}`)
  }
  normaliseNotebook(notebook, page, source, attributes, options)
  return Buffer.from(`${JSON.stringify(notebook, null, 2)}\n`)
}

function attachmentRelative (page) {
  return page.src.relative.replace(/\.adoc$/, '.ipynb')
}

function manifestEntry (page, attachment, notebook) {
  const metadata = notebook.metadata.course
  const codeBlocks = notebook.cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.cell_type === 'code')
    .map(({ cell, index }) => ({
      id: cell.id,
      index,
      source_sha256: sha256(Array.isArray(cell.source) ? cell.source.join('') : cell.source || ''),
      dynamic: false,
      required: true
    }))
  return {
    source_resource_id: metadata.source_resource_id,
    source_path: metadata.source_path,
    source_sha256: metadata.source_sha256,
    page_url: page.pub.url,
    notebook_resource_id: resourceId(attachment.src, 'attachment'),
    notebook_path: attachment.src.relative,
    notebook_sha256: sha256(attachment.contents),
    notebook_url: attachment.pub.url,
    priority: metadata.priority,
    difficulty: metadata.difficulty,
    concept_ids: metadata.concept_ids,
    outcomes: metadata.outcomes,
    code_blocks: codeBlocks,
    warnings: []
  }
}

function buildManifest (entries) {
  return Buffer.from(`${JSON.stringify({
    schema_version: 1,
    artifact: 'asciidoc-notebook-manifest',
    generator: {
      name: extensionPackage.name,
      version: extensionPackage.version
    },
    entries: [...entries].sort((a, b) => a.source_resource_id.localeCompare(b.source_resource_id))
  }, null, 2)}\n`)
}

function register ({ config = {} } = {}) {
  const logger = this.getLogger('jupyter-extension')
  const options = config.jupyter || {}
  const generated = new Map()

  this.on('contentClassified', ({ contentCatalog }) => {
    const pages = contentCatalog.getPages().filter((page) => isJupyterPage(page, options))
      .sort((a, b) => resourceId(a.src).localeCompare(resourceId(b.src)))
    const entriesByComponent = new Map()
    for (const page of pages) {
      const contents = generateNotebook(page, options)
      const attachment = contentCatalog.addFile({
        contents,
        src: {
          component: page.src.component,
          version: page.src.version,
          module: page.src.module,
          family: 'attachment',
          relative: attachmentRelative(page)
        }
      })
      const notebook = JSON.parse(contents.toString('utf8'))
      const entry = manifestEntry(page, attachment, notebook)
      const key = `${page.src.component}\0${page.src.version || ''}`
      const group = entriesByComponent.get(key) || { page, entries: [] }
      group.entries.push(entry)
      entriesByComponent.set(key, group)
      generated.set(page, attachment)
      logger.info(`generated ${attachment.pub.url} from ${resourceId(page.src)}`)
    }
    for (const { page, entries } of entriesByComponent.values()) {
      contentCatalog.addFile({
        contents: buildManifest(entries),
        src: {
          component: page.src.component,
          version: page.src.version,
          module: 'ROOT',
          family: 'attachment',
          relative: 'generated/asciidoc-notebook-manifest.json'
        }
      })
    }
  })

  this.on('documentsConverted', () => {
    for (const [page, attachment] of generated) {
      page.asciidoc.attributes['page-jupyter-url'] = attachment.pub.url
      page.asciidoc.attributes['page-jupyter-status'] = 'generated'
    }
  })
}

module.exports = {
  attachmentRelative,
  buildManifest,
  generateNotebook,
  isJupyterPage,
  manifestEntry,
  normaliseMarkdown,
  parseHeaderAttributes,
  register,
  resourceId,
  sha256
}
