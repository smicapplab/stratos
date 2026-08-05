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
    { regex: /bg-blue-600/g, replacement: 'bg-brand-primary' },
    { regex: /hover:bg-blue-700/g, replacement: 'hover:opacity-90' },
    { regex: /text-blue-600/g, replacement: 'text-brand-primary' },
    { regex: /text-blue-500/g, replacement: 'text-brand-primary' },
    { regex: /text-blue-400/g, replacement: 'text-brand-primary' },
    { regex: /border-blue-500/g, replacement: 'border-brand-primary' },
    { regex: /ring-blue-500\/50/g, replacement: 'ring-brand-primary/50' },
    { regex: /ring-blue-500/g, replacement: 'ring-brand-primary' },
    { regex: /bg-blue-50/g, replacement: 'bg-brand-primary/10' },
    { regex: /bg-blue-900\/20/g, replacement: 'bg-brand-primary/20' },
    { regex: /bg-blue-900\/30/g, replacement: 'bg-brand-primary/30' },
    { regex: /bg-blue-900\/40/g, replacement: 'bg-brand-primary/40' },
    { regex: /shadow-blue-500\/10/g, replacement: 'shadow-brand-primary/10' },
    { regex: /shadow-blue-500\/20/g, replacement: 'shadow-brand-primary/20' },
    { regex: /shadow-blue-500\/30/g, replacement: 'shadow-brand-primary/30' },
    { regex: /bg-blue-100/g, replacement: 'bg-brand-primary/20' },
    { regex: /hover:text-blue-600/g, replacement: 'hover:text-brand-primary' },
    { regex: /hover:text-blue-500/g, replacement: 'hover:text-brand-primary' },
    { regex: /hover:text-blue-400/g, replacement: 'hover:text-brand-primary' },
    { regex: /focus:ring-blue-500/g, replacement: 'focus:ring-brand-primary' },
    { regex: /focus:border-blue-500/g, replacement: 'focus:border-brand-primary' },
    { regex: /group-hover:text-blue-600/g, replacement: 'group-hover:text-brand-primary' },
    { regex: /group-hover:text-blue-400/g, replacement: 'group-hover:text-brand-primary' },
    { regex: /hover:bg-blue-50/g, replacement: 'hover:bg-brand-primary/10' },
    { regex: /dark:text-blue-500/g, replacement: 'dark:text-brand-primary' },
    { regex: /dark:text-blue-400/g, replacement: 'dark:text-brand-primary' },
    { regex: /dark:bg-blue-500\/10/g, replacement: 'dark:bg-brand-primary/10' },
    { regex: /dark:hover:text-blue-400/g, replacement: 'dark:hover:text-brand-primary' }
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
