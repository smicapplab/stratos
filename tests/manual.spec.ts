import { test } from '@playwright/test';
import fs from 'fs';

test('Generate User Manual Screenshots', async ({ page }) => {
	// Ensure the screenshots directory exists
	if (!fs.existsSync('manual-src/assets')) {
		fs.mkdirSync('manual-src/assets', { recursive: true });
	}

	// 1. Log in to the application
	await page.goto('/');
	await page.waitForTimeout(500); // let page settle
	await page.screenshot({ path: 'manual-src/assets/01-login.png', fullPage: true });

	await page.fill('input[name="email"]', 'admin@acme.internal');
	await page.fill('input[name="password"]', 'password123');
	await page.click('button[type="submit"]');

	// 2. Wait for dashboard and capture
	await page.waitForURL('**/dashboard*');
	await page.waitForTimeout(1000); // wait for data to load
	await page.screenshot({ path: 'manual-src/assets/02-dashboard.png', fullPage: true });

	// 3. Navigate to a board (find the first board link in the sidebar or dashboard)
	const boardLink = page.locator('a[href^="/boards/"]').first();
	if (await boardLink.count() > 0) {
		await boardLink.click();
		await page.waitForTimeout(1500); // wait for board to load
		await page.screenshot({ path: 'manual-src/assets/03-board.png', fullPage: true });

		// 4. Open a Task Drawer
		const taskCard = page.locator('div.group.cursor-pointer').first();
		if (await taskCard.count() > 0) {
			await taskCard.click();
			await page.waitForTimeout(1000); // wait for drawer animation

			// Full task drawer
			await page.screenshot({ path: 'manual-src/assets/04-task-drawer.png' });
		}
	}
});
