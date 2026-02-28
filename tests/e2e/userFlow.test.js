import { test, expect } from '@playwright/test'

const installLogActionCapture = async (page) => {
  await page.addInitScript(() => {
    window.__capturedActionTypes = []

    const recordActionType = (text) => {
      if (!text || typeof text !== 'string') return
      try {
        const payload = JSON.parse(text)
        if (payload?.actionType && typeof payload.actionType === 'string') {
          window.__capturedActionTypes.push(payload.actionType)
        }
      } catch {
        // ignore non-JSON payloads
      }
    }

    const originalFetch = window.fetch.bind(window)
    window.fetch = (...args) => {
      try {
        const [input, init] = args
        const url = typeof input === 'string' ? input : input?.url || ''
        if (String(url).includes('/api/log-action') && init?.body) {
          if (typeof init.body === 'string') {
            recordActionType(init.body)
          } else if (typeof init.body?.text === 'function') {
            init.body.text().then(recordActionType).catch(() => {})
          }
        }
      } catch {
        // ignore capture errors and preserve normal fetch
      }
      return originalFetch(...args)
    }

    if (typeof navigator.sendBeacon === 'function') {
      const originalSendBeacon = navigator.sendBeacon.bind(navigator)
      navigator.sendBeacon = (url, data) => {
        try {
          const target = typeof url === 'string' ? url : String(url || '')
          if (target.includes('/api/log-action') && data) {
            if (typeof data === 'string') {
              recordActionType(data)
            } else if (typeof data?.text === 'function') {
              data.text().then(recordActionType).catch(() => {})
            }
          }
        } catch {
          // ignore capture errors and preserve normal sendBeacon
        }
        return originalSendBeacon(url, data)
      }
    }
  })
}

const completeOnboarding = async (page, code) => {
  await page.goto('http://localhost:3001')

  await expect(page.getByRole('button', { name: /let's get started/i })).toBeVisible()
  await page.getByRole('button', { name: /let's get started/i }).click()

  await expect(page.getByText('Section Code Verification')).toBeVisible()
  await page.getByPlaceholder('Enter 6-character code').fill(code)
  await page.getByRole('button', { name: /^verify$/i }).click()

  await expect(page.getByText('Welcome to the Alcohol Prevention Training')).toBeVisible()
  await page.getByRole('button', { name: /^continue$/i }).click()

  await page.waitForURL('**/ai-chatbot')
}

test.describe('User Flow E2E', () => {
  test('completes onboarding and enters chatbot', async ({ page }) => {
    await completeOnboarding(page, `E2E-${Date.now()}`)

    await expect(
      page.getByText("Hello! I'm Sky, here to provide guidance on alcohol awareness and healthier choices.")
    ).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('button', { name: /yes, let's start/i })).toBeVisible()
  })

  test('progresses through first questionnaire steps', async ({ page }) => {
    await completeOnboarding(page, `FLOW-${Date.now()}`)

    await page.getByRole('button', { name: /yes, let's start/i }).click()

    await expect(page.getByText('Are you between the ages of 21 and 25?')).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('button', { name: /^yes$/i }).first().click()

    await expect(
      page.getByText('Have you ever had alcohol before, even just a few sips?')
    ).toBeVisible({ timeout: 10000 })
  })

  test('emits key log-action requests during onboarding and questionnaire start', async ({ page }) => {
    await installLogActionCapture(page)

    await completeOnboarding(page, `LOG-${Date.now()}`)
    await page.getByRole('button', { name: /yes, let's start/i }).click()

    await expect(page.getByText('Are you between the ages of 21 and 25?')).toBeVisible({
      timeout: 10000,
    })

    await expect
      .poll(
        async () => {
          const captured = await page.evaluate(() =>
            Array.isArray(window.__capturedActionTypes) ? window.__capturedActionTypes : []
          )
          const seen = new Set(captured)
          return (
            seen.has('code_entered') &&
            seen.has('code_verified') &&
            seen.has('chat_started') &&
            seen.has('questionnaire_started')
          )
        },
        { timeout: 10000 }
      )
      .toBeTruthy()
  })
})

test.describe('Admin Access E2E', () => {
  test('rejects invalid credentials then accepts valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3001/downloadit')

    await expect(page.getByRole('heading', { name: /admin access required/i })).toBeVisible()

    await page.locator('#username').fill('wrong')
    await page.locator('#password').fill('incorrect')
    await page.getByRole('button', { name: /^login$/i }).click()

    await expect(page.getByText('Invalid username or password')).toBeVisible()

    await page.locator('#username').fill('admin')
    await page.locator('#password').fill('grace2024!@#')
    await page.getByRole('button', { name: /^login$/i }).click()

    await expect(page.getByRole('heading', { name: /csv data download center/i })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('button', { name: /merge & download csv/i })).toBeVisible()
  })
})

test.describe('Accessibility Smoke E2E', () => {
  test('home and verification inputs are keyboard reachable and labeled', async ({ page }) => {
    await page.goto('http://localhost:3001')
    const startButton = page.getByRole('button', { name: /let's get started/i })
    await expect(startButton).toBeVisible()
    await startButton.focus()
    await expect(startButton).toBeFocused()
    await page.keyboard.press('Enter')

    await expect(page.getByText('Section Code Verification')).toBeVisible({ timeout: 10000 })

    const codeInput = page.getByPlaceholder('Enter 6-character code')
    await expect(codeInput).toBeVisible()

    const inputId = await codeInput.getAttribute('id')
    expect(inputId).toBe('codeVerification')
  })
})
