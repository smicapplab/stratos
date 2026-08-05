#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

console.log('==> Verifying Node container bundle budgets...');

const buildDir = path.join(__dirname, '../stratos/.svelte-kit/output');
if (!fs.existsSync(buildDir)) {
	console.log('⚠️ Build output directory not found. Please run scripts/build-review.sh first.');
	process.exit(0);
}

function getDirSize(dirPath) {
	let totalSize = 0;
	const files = fs.readdirSync(dirPath);
	for (const file of files) {
		const filePath = path.join(dirPath, file);
		const stat = fs.statSync(filePath);
		if (stat.isDirectory()) {
			totalSize += getDirSize(filePath);
		} else {
			totalSize += stat.size;
		}
	}
	return totalSize;
}

const totalBytes = getDirSize(buildDir);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
const MAX_BUDGET_MB = 150;

console.log(`Total SvelteKit server build output size: ${totalMB} MB`);

if (totalBytes > MAX_BUDGET_MB * 1024 * 1024) {
	console.error(`❌ ERROR: Server bundle exceeds limit of ${MAX_BUDGET_MB} MB!`);
	process.exit(1);
}

console.log('✅ Bundle budget check passed.');
