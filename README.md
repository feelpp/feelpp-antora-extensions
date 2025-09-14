# Antora Extensions by Feel++

![NPM Version](https://img.shields.io/npm/v/%40feelpp%2Fantora-extensions)

A set of Antora extensions.

## Extensions

### Lunr Search Index

Automatically generates a Lunr.js compatible search index during the Antora build process.

#### Usage

Add the extension to your `site.yml`:

```yaml
antora:
  extensions:
  - '@feelpp/antora-extensions'

config:
  lunr:
    indexFile: 'search-index.json'  # Output filename (optional)
    maxContentLength: 1000          # Max content per document (optional)
    minContentLength: 50            # Min content to include document (optional)
    debug: false                    # Enable debug logging (optional)
```

The search index will be automatically generated at `build/site/search-index.json` after the site is built.

#### Features

- **Zero configuration**: Works out of the box with sensible defaults
- **Smart content extraction**: Focuses on main content, excludes navigation and footers
- **Configurable**: Customize content length limits and output location
- **Performance optimized**: Efficient processing during site generation
- **Error handling**: Graceful handling of malformed HTML or missing content

## Listing

### UI assumptions

This extension relies on a contract with the UI in order to minimize the configuration the user must perform to get the extension working.

#### Environment variable

When this extension is enabled, it sets the `SITE_LISTING_EXTENSION_ENABLED` environment variable to the value `true`.
This variable is available to the UI templates as `env.SITE_LISTING_EXTENSION_ENABLED`.
The existence of this variable informs the UI template that the listing extension is enabled.
When this variable is set, the UI is expected to add certain elements to support the extension.

#### Listing styles

This package provides additional CSS to style the listing results (`data/css/listing.css`).
The creator of the UI can either bundle those styles or reference them (for instance in `head-styles.hbs`):

```hbs
{{#if env.SITE_LISTING_EXTENSION_ENABLED}}
    <link rel="stylesheet" href="{{{uiRootPath}}}/css/listing.css">
{{/if}}
```
