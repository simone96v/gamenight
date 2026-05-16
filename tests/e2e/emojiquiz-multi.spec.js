// Multiplayer flow (text-input):
// 2 browser contexts → create+join party → vote Emoji Quiz → host start →
// entrambi vedono question phase con lo stesso puzzle (deck sync).

import { test, expect } from '@playwright/test'

test.setTimeout(90_000)

test.describe('Emoji Quiz — multiplayer', () => {
  test('host + client votano Emoji Quiz, host avvia, entrambi vedono lo stesso puzzle', async ({ browser }) => {
    const hostCtx = await browser.newContext()
    const clientCtx = await browser.newContext()
    const host = await hostCtx.newPage()
    const client = await clientCtx.newPage()

    try {
      // HOST: crea party
      await host.goto('/')
      await host.getByText('Crea party', { exact: false }).click()
      await host.locator('button:has([id^="cp-"])').first().click()
      await host.getByPlaceholder(/Es\./).fill('Hostbot')
      await host.getByRole('button', { name: /Crea/i }).click()

      const codeEl = host.locator('text=/^[BCDFGHJKLMNPRSTVWX]{4}$/').first()
      await expect(codeEl).toBeVisible({ timeout: 15_000 })
      const code = (await codeEl.textContent())?.trim()
      expect(code).toMatch(/^[A-Z]{4}$/)

      // CLIENT: join
      await client.goto('/')
      await client.getByText('Ho già un codice', { exact: false }).click()
      await client.locator('input').first().fill(code)
      await client.locator('button:has([id^="cp-"])').nth(1).click()
      await client.getByPlaceholder(/Es\./).fill('Clientbot')
      await client.getByRole('button', { name: /Entra|Join/i }).click()

      await expect(host.getByText('Clientbot')).toBeVisible({ timeout: 10_000 })
      await expect(client.getByText('Hostbot')).toBeVisible({ timeout: 10_000 })

      // Avanzamento ai giochi
      await host.getByRole('button', { name: /Avanti|Pronti|Inizia|Continua|Vota|Giochi/i }).click()
      await expect(host).toHaveURL(/\/games/, { timeout: 10_000 })
      await expect(client).toHaveURL(/\/games/, { timeout: 10_000 })

      // Vote
      await host.getByText('Emoji Quiz').click()
      await client.getByText('Emoji Quiz').click()

      // Lobby
      await expect(host).toHaveURL(/\/emojiquiz-lobby/, { timeout: 15_000 })
      await expect(client).toHaveURL(/\/emojiquiz-lobby/, { timeout: 15_000 })

      // Host avvia
      await host.getByRole('button', { name: /Inizia/i }).click()
      await expect(host).toHaveURL(/\/game\/emojiquiz/, { timeout: 10_000 })
      await expect(client).toHaveURL(/\/game\/emojiquiz/, { timeout: 10_000 })

      // Question phase su entrambi: emoji card + input
      await expect(host.locator('[aria-label*="Difficoltà"]')).toBeVisible({ timeout: 20_000 })
      await expect(client.locator('[aria-label*="Difficoltà"]')).toBeVisible({ timeout: 20_000 })
      await expect(host.getByPlaceholder(/Scrivi il titolo/i)).toBeVisible()
      await expect(client.getByPlaceholder(/Scrivi il titolo/i)).toBeVisible()

      // Sync del deck: host e client mostrano lo stesso emoji
      const hostEmoji = await host.locator('.eq-emoji-puzzle, [aria-label*="Difficoltà"]').first().evaluate(
        (el) => el.parentElement?.textContent || '',
      )
      // Verifica sync via HTML content: stesso puzzle = stesso emoji su entrambe le pagine
      const hostHTML = await host.content()
      const clientHTML = await client.content()
      // Cerca emoji noti del bank
      const knownEmojis = ['🦁👑', '🚢🧊💔', '👻🔫', '🐠🔍', '🦖🏝️', '🤖🌱❤️', '👽📞🏠', '🃏🤡', '❄️👸⛄', '👶🦈', '💃🪩👑', '🌧️💜', '🚀']
      const sharedEmoji = knownEmojis.find((e) => hostHTML.includes(e) && clientHTML.includes(e))
      expect(sharedEmoji, 'host e client devono vedere lo stesso emoji').toBeDefined()
    } finally {
      await hostCtx.close()
      await clientCtx.close()
    }
  })
})
