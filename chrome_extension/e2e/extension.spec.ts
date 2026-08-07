import { expect, test } from '@playwright/test'

test('extension s\'installe correctement', async ({ page }) => {
  await page.goto('chrome-extension://[ID]/src/options/index.html')
  
  await expect(page.locator('h1')).toContainText('Hello world from Options!')
}) 