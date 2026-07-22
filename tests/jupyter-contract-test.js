const fs = require('node:fs')
const path = require('node:path')
const chai = require('chai')
const expect = chai.expect
const jupyter = require('../src/jupyter.js')

const fixtureDir = path.join(__dirname, 'fixtures', 'jupyter-contract')

describe('Jupyter generation contract fixture', () => {
  it('defines a page-relative attachment and confirmed UI URL contract', () => {
    const expected = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'expected.json'), 'utf8'))

    expect(expected.source_relative_path).to.equal('foundations/sample.adoc')
    expect(expected.attachment_relative_path).to.equal('foundations/sample.ipynb')
    expect(expected.attachment_url).to.equal(
      '/executable-contract/_attachments/foundations/sample.ipynb'
    )
    expect(expected.plain_page_generates_notebook).to.equal(false)
    expect(expected.ui_contract.resolved_url_attribute).to.equal('jupyter-url')
    expect(expected.ui_contract.status_attribute).to.equal('jupyter-status')
  })

  it('contains marked and unmarked representative Antora pages', () => {
    const pages = path.join(fixtureDir, 'content', 'modules', 'ROOT', 'pages')
    const marked = fs.readFileSync(path.join(pages, 'foundations', 'sample.adoc'), 'utf8')
    const plain = fs.readFileSync(path.join(pages, 'plain.adoc'), 'utf8')

    expect(marked).to.contain(':page-jupyter:')
    expect(marked).to.contain('[source,python]')
    expect(plain).not.to.contain(':page-jupyter:')
  })

  it('inventories required generation failures before implementation', () => {
    const failures = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'failures.json'), 'utf8'))
    const ids = failures.cases.map((item) => item.id)

    expect(ids).to.deep.equal([
      'duplicate-attachment',
      'converter-warning',
      'missing-converter',
      'unresolved-url',
      'nondeterministic-manifest'
    ])
    expect(failures.cases.filter((item) => item.importance === 'P0')).to.have.length(4)
  })

  it('converts only marked pages and normalises notebook metadata deterministically', () => {
    const pagesRoot = path.join(fixtureDir, 'content', 'modules', 'ROOT', 'pages')
    const page = fixturePage('foundations/sample.adoc', pagesRoot)
    const plain = fixturePage('plain.adoc', pagesRoot)

    expect(jupyter.isJupyterPage(page)).to.equal(true)
    expect(jupyter.isJupyterPage(plain)).to.equal(false)
    const first = jupyter.generateNotebook(page)
    const second = jupyter.generateNotebook(page)
    expect(first.equals(second)).to.equal(true)

    const notebook = JSON.parse(first.toString('utf8'))
    expect(notebook.nbformat).to.equal(4)
    expect(notebook.nbformat_minor).to.equal(5)
    expect(notebook.metadata.kernelspec).to.include({
      name: 'python3',
      language: 'python',
      display_name: 'Python 3'
    })
    expect(notebook.metadata.course).to.include({
      source_kind: 'asciidoc',
      source_path: 'foundations/sample.adoc',
      priority: 'P0',
      difficulty: 'D1',
      language: 'en',
      execution_profile: 'fast'
    })
    expect(notebook.metadata.course.concept_ids).to.deep.equal(['DP-FND-01', 'DP-REP-01'])
    expect(notebook.cells.every((cell) => /^[0-9a-f]{16}$/.test(cell.id))).to.equal(true)
    const markdown = notebook.cells
      .filter((cell) => cell.cell_type === 'markdown')
      .map((cell) => Array.isArray(cell.source) ? cell.source.join('') : cell.source)
      .join('\n')
    expect(markdown).to.contain('$$\n\\widehat\\mu')
    expect(markdown).to.contain('](sample.ipynb)')
    expect(markdown).not.to.match(/\n\+\n\\widehat/)
    expect(markdown).not.to.contain('attachment$')
    expect(notebook.cells.filter((cell) => cell.cell_type === 'code'))
      .to.satisfy((cells) => cells.length === 1 && cells.every((cell) => cell.outputs.length === 0))
  })

  it('registers page-relative attachments, a manifest, and confirmed UI attributes', () => {
    const pagesRoot = path.join(fixtureDir, 'content', 'modules', 'ROOT', 'pages')
    const page = fixturePage('foundations/sample.adoc', pagesRoot)
    const plain = fixturePage('plain.adoc', pagesRoot)
    const files = []
    const contentCatalog = {
      getPages: () => [plain, page],
      addFile: (file) => {
        if (files.some((candidate) => JSON.stringify(candidate.src) === JSON.stringify(file.src))) {
          throw new Error(`duplicate attachment: ${file.src.relative}`)
        }
        file.pub = {
          url: `/executable-contract/_attachments/${file.src.relative}`
        }
        files.push(file)
        return file
      }
    }
    const handlers = {}
    const context = {
      getLogger: () => ({ info: () => {} }),
      on: (event, handler) => { handlers[event] = handler }
    }

    jupyter.register.call(context, { config: {} })
    handlers.contentClassified({ contentCatalog })
    page.asciidoc = { attributes: {} }
    plain.asciidoc = { attributes: {} }
    handlers.documentsConverted()

    expect(files.map((file) => file.src.relative)).to.deep.equal([
      'foundations/sample.ipynb',
      'generated/asciidoc-notebook-manifest.json'
    ])
    expect(page.asciidoc.attributes).to.include({
      'page-jupyter-status': 'generated',
      'page-jupyter-url': '/executable-contract/_attachments/foundations/sample.ipynb'
    })
    expect(plain.asciidoc.attributes).to.deep.equal({})

    const manifest = JSON.parse(files[1].contents.toString('utf8'))
    expect(manifest.entries).to.have.length(1)
    expect(manifest.entries[0].notebook_path).to.equal('foundations/sample.ipynb')
    expect(manifest.entries[0].notebook_url).to.equal(
      '/executable-contract/_attachments/foundations/sample.ipynb'
    )
    expect(manifest).not.to.have.property('generated_at')
  })
})

function fixturePage (relative, root) {
  return {
    contents: fs.readFileSync(path.join(root, relative)),
    src: {
      component: 'executable-contract',
      version: '',
      module: 'ROOT',
      family: 'page',
      relative
    },
    pub: {
      url: `/executable-contract/${relative.replace(/\.adoc$/, '.html')}`
    }
  }
}
