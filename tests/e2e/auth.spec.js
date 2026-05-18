// Test E2E del flusso auth (UI level).
// Nota: NON eseguiamo signup/login reali contro Supabase per non inquinare
// auth.users del progetto produzione. I test verificano:
// - presenza/visibilità dei bottoni e link
// - gate di /create e /profile per gli utenti guest
// - form validation e toggle signin/signup
// - presenza link "Password dimenticata?" in signin e assenza in signup
//
// Per tester il signup reale serve un progetto Supabase di staging.

import { test, expect } from '@playwright/test'

test.describe('Auth — UI flow', () => {
  test('guest sulla home vede il bottone "Accedi" in top-right', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Accedi/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Blob Party/i })).toBeVisible()
  })

  test('click su "Accedi" naviga a /login', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Accedi/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /Accedi/i })).toBeVisible()
  })

  test('LoginScreen: mostra email/password in modalità signin', async ({ page }) => {
    await page.goto('/login')
    // Campi email + password (no display_name in signin)
    await expect(page.getByPlaceholder(/mario@example\.com/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Almeno 6 caratteri/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Es\. Marco/i)).not.toBeVisible()
    // Password dimenticata visibile solo in signin
    await expect(page.getByRole('button', { name: /Password dimenticata\?/i })).toBeVisible()
    // Bottone Google nascosto (feature flag GOOGLE_AUTH_ENABLED=false finché
    // OAuth non è configurato lato Supabase + Google Cloud Console).
    await expect(page.getByRole('button', { name: /Accedi con Google/i })).not.toBeVisible()
  })

  test('LoginScreen: toggle a signup mostra display_name e nasconde "Password dimenticata"', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Non hai un account/i }).click()
    await expect(page.getByPlaceholder(/Es\. Marco/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Password dimenticata\?/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /Crea account/i })).toBeVisible()
  })

  test('LoginScreen: submit disabilitato se password < 6 caratteri', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder(/mario@example\.com/i).fill('test@example.com')
    await page.getByPlaceholder(/Almeno 6 caratteri/i).fill('123')
    const submitBtn = page.getByRole('button', { name: /^Accedi$/ })
    await expect(submitBtn).toBeDisabled()
    await page.getByPlaceholder(/Almeno 6 caratteri/i).fill('123456')
    await expect(submitBtn).toBeEnabled()
  })

  test('LoginScreen: "Password dimenticata" senza email mostra warning', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Password dimenticata\?/i }).click()
    await expect(page.getByText(/Inserisci la tua email/i)).toBeVisible()
  })

  test('gate /create: guest viene reindirizzato a /login?next=/create', async ({ page }) => {
    await page.goto('/create')
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)create/)
  })

  test('gate /profile: guest viene reindirizzato a /login?next=/profile', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)profile/)
  })

  test('bottone "Continua come ospite" torna alla home', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Continua come ospite/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('home: HomeScreen mostra solo i CTA pubblici per guest', async ({ page }) => {
    await page.goto('/')
    // CTA cards
    await expect(page.getByRole('button', { name: /Crea party/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gioca da solo/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ho già un codice/i })).toBeVisible()
  })

  test('click su "Crea party" dalla home porta su /login (gate auth)', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Crea party/i }).click()
    // Il navigate gate è async (useEffect su authStatus): aspettiamo l'URL finale.
    await expect(page).toHaveURL(/\/login\?next=(%2F|\/)create/)
  })

  test('LoginScreen: indietro torna alla home', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /Indietro/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('ResetPasswordScreen: senza sessione redirige a /login dopo 2s', async ({ page }) => {
    await page.goto('/auth/reset')
    // Mostra il fallback "Link scaduto" e poi redirige.
    await expect(page.getByText(/Link scaduto/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })
  })
})
