import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_DIR = path.resolve(__dirname, '../manual-src/markdown');
const SCREENSHOTS_DIR = path.resolve(__dirname, '../manual-src/screenshots');
const OUT_DIR = path.resolve(__dirname, '../static/manual');
const OUT_ASSETS_DIR = path.resolve(__dirname, '../static/manual/assets');

console.log('Building User Manual...');

// 1. Cleanup old static manual directory
if (fs.existsSync(OUT_DIR)) {
	console.log('Cleaning up old manual directory...');
	fs.rmSync(OUT_DIR, { recursive: true, force: true });
}

// 2. Create output directories
fs.mkdirSync(OUT_ASSETS_DIR, { recursive: true });

// 3. Copy screenshots to static assets
if (fs.existsSync(SCREENSHOTS_DIR)) {
	const files = fs.readdirSync(SCREENSHOTS_DIR);
	for (const file of files) {
		fs.copyFileSync(
			path.join(SCREENSHOTS_DIR, file),
			path.join(OUT_ASSETS_DIR, file)
		);
	}
	console.log(`Copied ${files.length} screenshots.`);
}

// 4. Read markdown files and convert
let combinedHtml = '';
let tableOfContents = '<ul>';

if (fs.existsSync(SRC_DIR)) {
	const mdFiles = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.md')).sort();
	
	for (const file of mdFiles) {
		const filePath = path.join(SRC_DIR, file);
		const content = fs.readFileSync(filePath, 'utf-8');
		const html = marked.parse(content);
		
		// Add to combined HTML (you could also generate separate pages)
		combinedHtml += `<div class="manual-section">${html}</div><hr/>`;
		
		// Very simple TOC based on filename
		const sectionName = file.replace('.md', '').replace(/^\d+-/, '').replace(/-/g, ' ');
		tableOfContents += `<li><a href="#">${sectionName}</a></li>`;
	}
	tableOfContents += '</ul>';
}

// 5. Wrap in an HTML template
const finalHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stratos User Manual</title>
    <style>
        :root {
            --bg-color: #f8fafc;
            --text-color: #0f172a;
            --sidebar-bg: #ffffff;
            --border-color: #e2e8f0;
            --primary: #2563eb;
        }
        body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            margin: 0; 
            display: flex;
            background-color: var(--bg-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        .sidebar {
            width: 250px;
            background: var(--sidebar-bg);
            border-right: 1px solid var(--border-color);
            height: 100vh;
            padding: 2rem 1rem;
            position: fixed;
            overflow-y: auto;
        }
        .sidebar h2 {
            font-size: 1.25rem;
            margin-top: 0;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border-color);
        }
        .sidebar ul {
            list-style: none;
            padding: 0;
        }
        .sidebar li {
            margin-bottom: 0.5rem;
            text-transform: capitalize;
        }
        .sidebar a {
            text-decoration: none;
            color: var(--text-color);
            font-weight: 500;
        }
        .sidebar a:hover {
            color: var(--primary);
        }
        .content {
            margin-left: 250px;
            padding: 3rem 4rem;
            max-width: 900px;
            width: 100%;
        }
        .content img { 
            max-width: 100%; 
            border: 1px solid var(--border-color); 
            border-radius: 8px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); 
            margin: 1.5rem 0; 
        }
        .content h1, .content h2, .content h3 { 
            color: #111; 
            margin-top: 2rem;
        }
        hr {
            border: 0;
            border-top: 1px solid var(--border-color);
            margin: 3rem 0;
        }
    </style>
</head>
<body>
    <div class="sidebar">
        <h2>Stratos Manual</h2>
        ${tableOfContents}
    </div>
    <div class="content">
        ${combinedHtml}
    </div>
</body>
</html>
`;

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), finalHtml);
console.log('User manual generated successfully at static/manual/index.html');
