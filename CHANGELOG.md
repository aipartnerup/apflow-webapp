# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-07-18

### Removed

- **`apflow-demo` demo feature.** The `apflow-demo` project has been archived
  and its online demo shut down, so all demo-specific
  functionality has been removed from the webapp:
  - "Demo Mode" toggle in the sidebar and the `use_demo` flag passed to task
    execution (`UseDemoContext` removed).
  - Demo task initialization — the "Initialize Demo Tasks" alerts/buttons on the
    Dashboard and Task List, plus the `checkDemoInitStatus()` and
    `initDemoTasks()` API client methods.
  - The unused `.demo-mode-block` styles and related demo UI strings.

### Changed

- Reframed authentication docs, comments, and i18n strings so that cookie-based
  auto-login is described as a general, optional mechanism rather than an
  `apflow-demo` feature.
- `package.json` description updated to `apflow version>=0.12.0`.

### Notes

- **Auto-login is retained.** The optional cookie-based auth path
  (`NEXT_PUBLIC_AUTO_LOGIN_PATH`, off by default) is a general feature
  independent of the demo and is unaffected by this change.

## [0.2.1] - 2026-03-22

### Changed

- Rebranded `aipartnerup` → `aiperceivable`.
