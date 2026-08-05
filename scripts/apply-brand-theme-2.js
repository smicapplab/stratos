import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '../src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (dirPath.endsWith('.svelte') || dirPath.endsWith('.ts')) {
            callback(path.join(dir, f));
        }
    });
}

const replacements = [
    { regex: /text-blue-700/g, replacement: 'text-brand-primary' },
    { regex: /from-blue-600/g, replacement: 'from-brand-primary' },
    { regex: /to-indigo-600/g, replacement: 'to-brand-accent' },
    { regex: /hover:from-blue-700/g, replacement: 'hover:from-brand-primary hover:opacity-90' },
    { regex: /hover:to-indigo-700/g, replacement: 'hover:to-brand-accent' },
    { regex: /border-blue-200/g, replacement: 'border-brand-primary/30' },
    { regex: /hover:text-blue-700/g, replacement: 'hover:text-brand-primary hover:opacity-90' },
    { regex: /border-blue-800\/50/g, replacement: 'border-brand-primary\/50' },
    { regex: /border-blue-800\/30/g, replacement: 'border-brand-primary\/30' },
    { regex: /border-blue-800/g, replacement: 'border-brand-primary' },
    { regex: /bg-brand-primary\/100\/10/g, replacement: 'bg-brand-primary\/10' },
    { regex: /bg-brand-primary\/100\/20/g, replacement: 'bg-brand-primary\/20' }
];

walkDir(srcDir, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Don't modify app.css or tailwind.config.js this way
    if (filePath.endsWith('app.css') || filePath.endsWith('app.html')) return;
    
    replacements.forEach(r => {
        if (r.regex.test(content)) {
            content = content.replace(r.regex, r.replacement);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${path.relative(srcDir, filePath)}`);
    }
});
