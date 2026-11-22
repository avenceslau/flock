# Vendored anti-slop

Source: https://github.com/dmmulroy/anti-slop

Revision: `63dbb09f73438e550a6991dc6d778f979ffbf183`

The contents of upstream `src/` are copied here unchanged, together with the MIT license. Only the generic plugin is enabled; Effect rules are not enabled.

The plugin imports `@oxlint/plugins`, pinned to the Oxlint version bundled with Vite+. Keep those versions aligned when upgrading. This directory is excluded from repository linting and formatting to preserve upstream source; the tooling integration tests exercise the loaded plugin.

Compare upstream changes and review local customizations before updating this copy. Upstream recommends `cloudflare/oxlint-config` as its maintained successor; Flock currently uses Dillon Mulroy's rules explicitly.
