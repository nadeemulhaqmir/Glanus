const fs = require('fs');
const path = require('path');

const directory = '/Users/hkhalid/Codebases/Glanus';

const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
                results = results.concat(walk(file));
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
};

const files = walk(directory);
let modified = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;

    // GREEN -> health-good
    newContent = newContent.replace(/bg-green-400/g, 'bg-health-good');
    newContent = newContent.replace(/bg-green-500/g, 'bg-health-good');
    newContent = newContent.replace(/bg-green-600/g, 'bg-health-good');
    newContent = newContent.replace(/bg-green-700/g, 'bg-health-good/80');
    newContent = newContent.replace(/text-green-400/g, 'text-health-good');
    newContent = newContent.replace(/text-green-600/g, 'text-health-good');
    newContent = newContent.replace(/border-green-500/g, 'border-health-good');
    newContent = newContent.replace(/text-green-900/g, 'text-health-good');
    
    // RED -> health-critical / destructive
    newContent = newContent.replace(/bg-red-400/g, 'bg-health-critical');
    newContent = newContent.replace(/bg-red-500/g, 'bg-health-critical');
    // Button reds
    newContent = newContent.replace(/bg-red-600/g, 'bg-destructive'); 
    newContent = newContent.replace(/bg-red-700/g, 'bg-destructive/80');
    newContent = newContent.replace(/hover:bg-red-700/g, 'hover:bg-destructive/80');
    newContent = newContent.replace(/hover:bg-red-500/g, 'hover:bg-health-critical');
    
    newContent = newContent.replace(/text-red-400/g, 'text-health-critical');
    newContent = newContent.replace(/text-red-600/g, 'text-health-critical');
    newContent = newContent.replace(/border-red-500/g, 'border-health-critical');

    // YELLOW/ORANGE -> health-warn
    newContent = newContent.replace(/bg-yellow-400/g, 'bg-health-warn');
    newContent = newContent.replace(/bg-yellow-500/g, 'bg-health-warn');
    newContent = newContent.replace(/text-yellow-400/g, 'text-health-warn');
    newContent = newContent.replace(/border-yellow-500/g, 'border-health-warn');
    
    newContent = newContent.replace(/bg-orange-400/g, 'bg-health-warn');
    newContent = newContent.replace(/bg-orange-500/g, 'bg-health-warn');
    newContent = newContent.replace(/text-orange-400/g, 'text-health-warn');
    newContent = newContent.replace(/border-orange-500/g, 'border-health-warn');
    
    // Catch-all blue stragglers
    newContent = newContent.replace(/bg-blue-400/g, 'bg-nerve');
    newContent = newContent.replace(/bg-blue-500/g, 'bg-nerve');
    newContent = newContent.replace(/bg-blue-600/g, 'bg-nerve');
    newContent = newContent.replace(/text-blue-400/g, 'text-nerve/90');
    newContent = newContent.replace(/border-blue-500/g, 'border-nerve');
    newContent = newContent.replace(/hover:text-blue-200/g, 'hover:text-white');

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        modified++;
    }
});

console.log(`Updated ${modified} files.`);
