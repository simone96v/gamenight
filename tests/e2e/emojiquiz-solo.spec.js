// Solo flow (text-input):
// home → solo setup → games list → emoji quiz lobby → Inizia → countdown → question.

import { test, expect } from '@playwright/test'

test.describe('Emoji Quiz — single-player', () => {
  test('compare in lista solo, lobby parte, atterra su question phase con input + hint', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Gioca da solo', { exact: false }).click()

    await page.locator('button:has([id^="cp-"])').first().click()
    await page.getByPlaceholder(/Es\./).fill('Testbot')
    await page.getByRole('button', { name: /Scegli il gioco/i }).click()

    await expect(page).toHaveURL(/\/solo\/games/)
    await page.getByText('Emoji Quiz').click()

    await expect(page).toHaveURL(/\/emojiquiz-lobby/)
    await page.getByRole('button', { name: /Inizia/i }).click()

    await expect(page).toHaveURL(/\/game\/emojiquiz/, { timeout: 10_000 })

    // Question phase: emoji card + input + bottoni
    await expect(page.locator('[aria-label*="Difficoltà"]')).toBeVisible({ timeout: 20_000 })
    const input = page.getByPlaceholder(/Scrivi il titolo/i)
    await expect(input).toBeVisible()
    await expect(page.getByRole('button', { name: /^Indovina$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Usa un indizio/i })).toBeVisible()

    // Test indizio: clicco → il bottone diventa "Indizio usato"
    await page.getByRole('button', { name: /Usa un indizio/i }).click()
    await expect(page.getByRole('button', { name: /Indizio usato/i })).toBeVisible({ timeout: 3_000 })

    // Test guess sbagliato: input shake/flash
    await input.fill('xxxxxxx')
    await page.getByRole('button', { name: /^Indovina$/ }).click()
    // Dopo guess sbagliato l'input è svuotato
    await expect(input).toHaveValue('')
  })
})
