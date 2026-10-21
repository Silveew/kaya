/**
 * Annotation marks: the game tree menu and the Alt/Option shortcuts set SGF
 * move marks (TE/BM/IT/DO) and position marks (GB/GW/DM/UC), shown as badges
 * in the tree and on the board.
 *
 * See specs/2026-10-21-annotation-marks.md.
 */

import { test, expect } from '@playwright/test';

// Tall enough that the game tree, which shares the sidebar with Moves, shows
// every node (it only renders nodes in view).
test.use({ locale: 'en-US', viewport: { width: 1280, height: 900 } });

test('sets, shows and clears marks from the tree menu and shortcuts', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.shudan-goban')).toBeVisible();

  await page.locator('.shudan-vertex[data-x="3"][data-y="3"]').click();
  await page.locator('.shudan-vertex[data-x="15"][data-y="15"]').click();

  const stones = page.locator('.react-flow__node-stone');
  await expect(stones).toHaveCount(3);

  // Tree menu: Mark move › Very good move.
  await stones.nth(1).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Mark move' }).click();
  await expect(page.getByRole('menu', { name: 'Mark move' })).toBeVisible();
  await page.getByRole('menuitemradio', { name: 'Very good move (tesuji)' }).click();

  await expect(stones.nth(1).locator('.gametree-move-mark')).toHaveText('!!');
  await expect(
    page.locator('.shudan-vertex[data-x="3"][data-y="3"] .shudan-annotation-badge')
  ).toHaveText('!!');

  // Position mark from the second submenu, opened with the keyboard.
  await stones.nth(1).click({ button: 'right' });
  const markPosition = page.getByRole('menuitem', { name: 'Mark position' });
  await markPosition.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('menuitemradio', { name: 'Good for Black' }).first()).toBeFocused();
  await page.keyboard.press('Enter');

  // The menu shows both marks as checked when reopened.
  await stones.nth(1).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Mark move' }).hover();
  await expect(
    page.getByRole('menuitemradio', { name: 'Very good move (tesuji)' })
  ).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');

  // Shortcut on the current move (the second one): Alt+3 = doubtful.
  await stones.nth(2).click();
  await page.keyboard.press('Alt+Digit3');
  await expect(stones.nth(2).locator('.gametree-move-mark')).toHaveText('?!');
  await expect(
    page.locator('.shudan-vertex[data-x="15"][data-y="15"] .shudan-annotation-badge')
  ).toHaveText('?!');

  // Same shortcut again clears it.
  await page.keyboard.press('Alt+Digit3');
  await expect(stones.nth(2).locator('.gametree-move-mark')).toHaveCount(0);

  // The first move's mark survives, and only the current move shows on the board.
  await expect(stones.nth(1).locator('.gametree-move-mark')).toHaveText('!!');
  await expect(page.locator('.shudan-annotation-badge')).toHaveCount(0);

  // The root plays no move, so Mark move is disabled there.
  await stones.nth(0).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Mark move' })).toBeDisabled();
});
