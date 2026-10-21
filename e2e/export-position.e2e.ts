/**
 * Export position: the game tree menu saves the board at a move, with the rest
 * of the tree, as a new game in the library's Positions folder.
 *
 * See specs/2026-10-21-export-position.md.
 */

import { test, expect } from '@playwright/test';

// Tall enough that the game tree, which shares the sidebar with Moves, shows
// every node (it only renders nodes in view).
test.use({ locale: 'en-US', viewport: { width: 1280, height: 900 } });

test('exports a position from the game tree menu to the Positions folder', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.shudan-goban')).toBeVisible();

  await page.locator('.shudan-vertex[data-x="3"][data-y="3"]').click();
  await page.locator('.shudan-vertex[data-x="15"][data-y="15"]').click();
  await page.locator('.shudan-vertex[data-x="3"][data-y="15"]').click();

  // Root, then one stone per move.
  const stones = page.locator('.react-flow__node-stone');
  await expect(stones).toHaveCount(4);
  await stones.nth(2).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Export position…' }).click();

  const dialog = page.getByRole('dialog', { name: 'Export position' });
  const titleInput = dialog.getByLabel('Title (optional)');
  await expect(titleInput).toBeFocused();
  await titleInput.fill('Opening test');
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  await expect(page.getByText('Position saved to Positions/Opening test')).toBeVisible();
  const folder = page.locator('.library-tree-node', { hasText: 'Positions' });
  await expect(folder).toBeVisible();
  await folder.click();
  const file = page.locator('.library-tree-node', { hasText: 'Opening test' });
  await expect(file).toBeVisible();

  // The source game is still the open one, unchanged.
  await expect(stones).toHaveCount(4);

  // The exported game opens on the position: two setup stones on the root,
  // and the third move is the only continuation.
  await file.dblclick();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(stones).toHaveCount(2);
  await page.keyboard.press('Home');
  await expect(page.locator('.shudan-vertex[data-x="3"][data-y="3"]')).toHaveClass(/shudan-sign_1/);
  await expect(page.locator('.shudan-vertex[data-x="15"][data-y="15"]')).toHaveClass(
    /shudan-sign_-1/
  );
  await expect(page.locator('.shudan-vertex[data-x="3"][data-y="15"]')).toHaveClass(
    /shudan-sign_0/
  );
  await page.screenshot({ path: 'test-results/after-open.png' });
});
