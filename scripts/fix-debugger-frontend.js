#!/usr/bin/env node
// Some @expo/cli code paths look up '@react-native/debugger-frontend' with a
// resolver that only checks @expo/cli's own node_modules (no walking up to
// the hoisted root copy) — see the "Open debugger" ENOENT bug tracked in the
// kronos project. Yarn hoists a single shared copy to the project root since
// there's no version conflict forcing it to nest, so @expo/cli's own
// node_modules never gets one on its own. This recreates that expected
// nested path as a symlink to the real hoisted package, idempotently, after
// every install.
const fs = require('fs');
const path = require('path');

const root = __dirname + '/..';
const target = path.join(root, 'node_modules/@react-native/debugger-frontend');
const linkDir = path.join(root, 'node_modules/@expo/cli/node_modules/@react-native');
const link = path.join(linkDir, 'debugger-frontend');

if (!fs.existsSync(target)) {
  // Package isn't installed (e.g. a future @expo/cli fixed this upstream and
  // dropped the dependency) — nothing to patch.
  process.exit(0);
}
if (fs.existsSync(link)) {
  process.exit(0);
}

fs.mkdirSync(linkDir, { recursive: true });
fs.symlinkSync(path.relative(linkDir, target), link, 'dir');
console.log('[fix-debugger-frontend] linked @expo/cli/node_modules/@react-native/debugger-frontend -> hoisted package');
