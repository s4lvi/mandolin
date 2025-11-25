# Changelogs

This directory contains changelog files that are automatically inserted into the database when changes are merged to `main`.

## How It Works

1. **Update version** in `package.json`
2. **Create changelog file** in this directory named `<version>.json` (e.g., `0.2.0.json`)
3. **Commit and merge** to main
4. **GitHub Action** automatically inserts the changelog into the database
5. **Users see** the "What's New" modal on their next app load

## Changelog Format

Each changelog file should be a JSON file with this structure:

```json
{
  "version": "0.2.0",
  "title": "Short release title",
  "changes": [
    "First feature or improvement",
    "Second feature or improvement",
    "Bug fix description"
  ]
}
```

### Fields

- **version** (required): Must match the version in `package.json`
- **title** (required): Short descriptive title for the release
- **changes** (required): Array of strings describing what changed

## Manual Testing

To test inserting a changelog locally:

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/insert-changelog.ts 0.1.0
```

## Notes

- If no changelog file exists for a version, the action will skip insertion (no error)
- Users only see the modal if:
  - A changelog exists for the current version
  - They haven't seen this version before (`lastSeenVersion` differs)
- The modal only shows after the welcome modal (for new users)
