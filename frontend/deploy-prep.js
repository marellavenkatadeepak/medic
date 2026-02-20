const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');
const nextDir = path.join(outDir, '_next');
const assetsDir = path.join(outDir, 'assets');

// 1. Rename _next to assets
if (fs.existsSync(nextDir)) {
    console.log('Renaming _next to assets...');
    fs.renameSync(nextDir, assetsDir);
} else if (fs.existsSync(assetsDir)) {
    console.log('_next already renamed to assets.');
} else {
    console.log('Warning: neither _next nor assets directory found.');
}

// 2. Replace /_next/ with /assets/ in all HTML files
function replaceInFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/\/_next\//g, '/assets/');
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.match(/\.(html|js|css|json)$/)) {
            replaceInFile(fullPath);
        }
    }
}

console.log('Replacing paths in HTML files...');
if (fs.existsSync(outDir)) {
    processDirectory(outDir);
} else {
    console.error('Error: out directory not found.');
}

// 3. Remove Next.js specific files that trigger framework detection
const filesToRemove = [
    'routes-manifest.json',
    'prerender-manifest.json',
    'middleware-manifest.json',
    'react-loadable-manifest.json',
    'build-manifest.json'
];

console.log('Removing Next.js manifest files...');
filesToRemove.forEach(file => {
    const filePath = path.join(outDir, file);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Removed: ${file}`);
    }
});

console.log('Done.');
