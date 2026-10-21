/**
 * Moves tab: lists the current branch with its annotation marks, sets marks on
 * the current move, jumps between marked moves and can badge every marked
 * stone on the board.
 *
 * See specs/2026-10-21-moves-list.md.
 */

import { test, expect } from '@playwright/test';

test.use({ locale: 'en-US' });

test('lists moves with marks, sets marks and jumps between them', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.shudan-goban')).toBeVisible();

  for (const [x, y] of [
    [3, 3],
    [15, 15],
    [3, 15],
    [15, 3],
  ]) {
    await page.locator(`.shudan-vertex[data-x="${x}"][data-y="${y}"]`).click();
  }

  await page.getByRole('tab', { name: 'Moves' }).click();
  const list = page.getByRole('list', { name: 'Moves' });
  const rows = list.getByRole('button');
  await expect(rows).toHaveCount(5);
  await expect(rows.nth(4)).toHaveAttribute('aria-current', 'true');
  await expect(rows.nth(1)).toContainText('D16');

  // Picker on the current (4th) move, then on the 2nd via its row.
  const tab = page.locator('.moves-tab');
  const picker = tab.getByRole('group', { name: 'Mark move' });
  await picker.getByRole('button', { name: 'Bad move', exact: true }).click();
  await expect(rows.nth(4).locator('.moves-tab-badge')).toHaveText('?');

  await rows.nth(2).click();
  await expect(rows.nth(2)).toHaveAttribute('aria-current', 'true');
  await picker.getByRole('button', { name: 'Good move', exact: true }).click();
  await tab
    .getByRole('group', { name: 'Mark position' })
    .getByRole('button', { name: 'Good for White', exact: true })
    .click();
  await expect(rows.nth(2).locator('.moves-tab-badge')).toHaveText(['!', '+W']);
  await expect(picker.getByRole('button', { name: 'Good move', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  // Previous/Next mark.
  await page.getByRole('button', { name: 'Next mark' }).click();
  await expect(rows.nth(4)).toHaveAttribute('aria-current', 'true');
  await expect(page.getByRole('button', { name: 'Next mark' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous mark' }).click();
  await expect(rows.nth(2)).toHaveAttribute('aria-current', 'true');

  // Only the current move is badged until "All marks on board" is on.
  await page.getByRole('button', { name: 'Next mark' }).click();
  await expect(page.locator('.shudan-annotation-badge')).toHaveCount(1);
  await page.getByRole('button', { name: 'All marks on board' }).click();
  await expect(page.locator('.shudan-annotation-badge')).toHaveCount(2);
  await expect(
    page.locator('.shudan-vertex[data-x="15"][data-y="15"] .shudan-annotation-badge')
  ).toHaveText('!');

  // Marked only.
  await page.getByRole('button', { name: 'Marked only' }).click();
  await expect(rows).toHaveCount(2);

  // The comment panel has the same buttons for the current node.
  const commentBar = page.locator('.comment-mark-bar');
  await commentBar.getByRole('button', { name: 'Interesting move' }).click();
  await expect(rows.nth(1).locator('.moves-tab-badge')).toHaveText('!?');
  await expect(
    page.locator('.shudan-vertex[data-x="15"][data-y="3"] .shudan-annotation-badge')
  ).toHaveText('!?');
  await commentBar.getByRole('button', { name: 'Mark position' }).click();
  await page
    .locator('.annotation-mark-popover')
    .getByRole('button', { name: 'Unclear position' })
    .click();
  await expect(commentBar.getByRole('button', { name: 'Mark position' })).toHaveText('∞');
  await expect(rows.nth(1).locator('.moves-tab-badge')).toHaveText(['!?', '∞']);
  await expect(picker.getByRole('button', { name: 'Interesting move' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});
