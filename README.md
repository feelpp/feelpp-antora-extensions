# Antora Extensions by Feel++

![NPM Version](https://img.shields.io/npm/v/%40feelpp%2Fantora-extensions)

A set of Antora extensions.

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
