# Antora Extensions by Feel++

![NPM Version](https://img.shields.io/npm/v/%40feelpp%2Fantora-extensions)

A set of Antora extensions.

## Extensions

### Lunr Search Index

Automatically generates a Lunr.js compatible search index during the Antora build process.

#### Usage

Add the Lunr extension to your `site.yml`:

```yaml
antora:
  extensions:
  - require: '@feelpp/antora-extensions/src/lunr.js'
    lunr:
      indexFile: search-index.json  # Output filename (optional)
      maxContentLength: 1000        # Max content per document (optional)
      minContentLength: 50          # Min content to include document (optional)
      debug: false                  # Enable debug logging (optional)
```

The index is written to the configured Antora output directory after the site is built. Result URLs preserve the pathname in `site.url`, so a site deployed at `https://example.org/project/` receives results below `/project/`.

#### Features

- **Zero configuration**: Works out of the box with sensible defaults
- **Smart content extraction**: Focuses on main content, excludes navigation and footers
- **Configurable**: Customize content length limits and output location
- **Performance optimized**: Efficient processing during site generation
- **Error handling**: Graceful handling of malformed HTML or missing content

## Releases

Releases are published from GitHub Actions using npm trusted publishing (OIDC); no npm access token is stored in the repository.

Before the first release, configure a trusted publisher for `@feelpp/antora-extensions` on npm with:

- Organization or user: `feelpp`
- Repository: `feelpp-antora-extensions`
- Workflow filename: `release.yml`
- Environment name: `npm`
- Allowed action: `npm publish`

The GitHub Actions workflow requires the `npm` environment and installs npm 11.5.1 because it supports OIDC trusted publishing. It publishes prereleases under the npm `next` dist-tag and stable versions under `latest`; it creates a matching GitHub prerelease when the version is a prerelease.

To publish a prerelease:

```bash
npm version prerelease --preid=rc
git push origin main --follow-tags
```

To publish a stable release, set the final version, create a `v<version>` tag, and push it.

```bash
npm version 1.0.0
git push origin main --follow-tags
```

Confirm the publication with:

```bash
npm view @feelpp/antora-extensions dist-tags
```

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
