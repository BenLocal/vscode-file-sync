#!/usr/bin/env node

/**
 * Script to collect only native/external module dependencies
 * Pure JS dependencies will be bundled by webpack
 */

const fs = require('fs');
const path = require('path');

// Only external modules (those with native bindings or that cannot be webpack'ed)
const externalModules = [
  'ssh2',
  'ssh2-sftp-client',
  'cpu-features',
];

// Native modules that must always be external
const nativeModules = ['cpu-features', 'nan', 'buildcheck'];

function getAllDependencies(moduleName, visited = new Set(), isExternalChain = false) {
  if (visited.has(moduleName)) {
    return new Set();
  }
  visited.add(moduleName);

  const dependencies = new Set([moduleName]);

  try {
    const modulePath = path.join(__dirname, '..', 'node_modules', moduleName, 'package.json');
    if (!fs.existsSync(modulePath)) {
      return dependencies;
    }

    const pkg = JSON.parse(fs.readFileSync(modulePath, 'utf8'));

    // Check if this is a native module
    const hasNativeBinding =
      pkg.binary !== undefined ||
      pkg.gypfile !== undefined ||
      fs.existsSync(path.join(path.dirname(modulePath), 'binding.gyp')) ||
      nativeModules.includes(moduleName);

    // If this is an external module or native module, or part of an external chain,
    // we need to collect all its dependencies
    const shouldCollectDeps =
      hasNativeBinding ||
      externalModules.includes(moduleName) ||
      isExternalChain;

    if (!shouldCollectDeps) {
      // Pure JS module that's not part of external chain - will be bundled by webpack
      return dependencies;
    }

    const deps = {
      ...pkg.dependencies,
      ...pkg.optionalDependencies
    };

    // Recursively collect dependencies, marking them as part of external chain
    for (const dep of Object.keys(deps || {})) {
      const subDeps = getAllDependencies(dep, visited, true);
      subDeps.forEach(d => dependencies.add(d));
    }
  } catch (error) {
    console.warn(`Warning: Could not read dependencies for ${moduleName}:`, error.message);
  }

  return dependencies;
}

function main() {
  console.log('Collecting dependencies for external/native modules only...');
  console.log('(Pure JavaScript dependencies will be bundled by webpack)\n');

  const allDeps = new Set();

  for (const module of externalModules) {
    console.log(`Processing ${module}...`);
    const deps = getAllDependencies(module);
    deps.forEach(dep => {
      allDeps.add(dep);
      console.log(`  - ${dep}`);
    });
  }

  console.log(`\nTotal unique dependencies to include: ${allDeps.size}`);

  // Read current .vscodeignore
  const vscodeignorePath = path.join(__dirname, '..', '.vscodeignore');
  let content = fs.readFileSync(vscodeignorePath, 'utf8');

  // Find the node_modules section
  const lines = content.split('\n');
  const nodeModulesIndex = lines.findIndex(line => line.trim() === 'node_modules/**');

  if (nodeModulesIndex === -1) {
    console.error('Could not find node_modules/** in .vscodeignore');
    process.exit(1);
  }

  // Build new exclusion list
  const exclusions = Array.from(allDeps)
    .sort()
    .map(dep => `!node_modules/${dep}/**`);

  // Replace the exclusion section
  const newLines = [
    ...lines.slice(0, nodeModulesIndex + 1),
    ...exclusions,
    ...lines.slice(nodeModulesIndex + 1).filter(line =>
      !line.startsWith('!node_modules/')
    )
  ];

  fs.writeFileSync(vscodeignorePath, newLines.join('\n'));
  console.log(`\n✅ Updated .vscodeignore with ${exclusions.length} external dependencies`);
  console.log('   (Other dependencies will be bundled in extension.js)');
}

main();
