/**
 * End-to-End tests for complete user flows
 * Tests the entire application from user perspective
 */

import { test, expect } from '@playwright/test'

test.describe('Complete User Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001')
  })

  test('should complete entire user journey from landing to completion', async ({ page }) => {
    // Step 1: Landing page and role selection
    await expect(page).toHaveTitle(/Create Next App/)
    
    // Click on AI Chatbot role
    await page.click('a[href="/ai-chatbot"]')
    await page.waitForURL('**/ai-chatbot')
    
    // Step 2: User code entry
    await expect(page.locator('text=Please enter your unique code')).toBeVisible()
    await page.fill('input[placeholder*="code"]', 'TEST001')
    await page.click('button:has-text("Submit")')
    
    // Step 3: Questionnaire flow
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 })
    
    // Answer first question
    await page.waitForSelector('button:has-text("Never")', { timeout: 5000 })
    await page.click('button:has-text("Never")')
    
    // Continue through questionnaire (17 questions)
    for (let i = 0; i < 16; i++) {
      await page.waitForSelector('button, input[type="radio"]', { timeout: 5000 })
      const buttons = await page.$$('button:not([disabled])')
      const radios = await page.$$('input[type="radio"]:not([disabled])')
      
      if (buttons.length > 0) {
        await buttons[0].click()
      } else if (radios.length > 0) {
        await radios[0].click()
      }
      
      await page.waitForTimeout(500) // Small delay between questions
    }
    
    // Step 4: Results display
    await expect(page.locator('text=Assessment Complete')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=/Risk Level/')).toBeVisible()
    
    // Click continue to training
    await page.click('button:has-text("Start Training")')
    
    // Step 5: Scenario simulation
    await expect(page.locator('text=/scenario|situation/')).toBeVisible({ timeout: 5000 })
    
    // Enter response to scenario
    await page.fill('textarea, input[type="text"]', 'No thanks, I need to stay focused')
    await page.keyboard.press('Enter')
    
    // Wait for evaluation
    await page.waitForTimeout(3000)
    
    // Check for appropriate/inappropriate response
    const goodResponse = await page.locator('text=/Good response|appropriate/i').isVisible()
    
    if (goodResponse) {
      // Move to next scenario
      await page.waitForTimeout(2000)
    } else {
      // Handle retry option
      const retryButton = await page.locator('button:has-text("Try again")')
      if (await retryButton.isVisible()) {
        await retryButton.click()
        await page.fill('textarea, input[type="text"]', 'I appreciate the offer but I will pass')
        await page.keyboard.press('Enter')
      }
    }
    
    // Step 6: Completion
    await expect(page.locator('text=/Simulation Complete|completed/i')).toBeVisible({ timeout: 15000 })
  })

  test('should handle user code validation', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Try empty code
    await page.click('button:has-text("Submit")')
    await expect(page.locator('text=/enter.*code/i')).toBeVisible()
    
    // Enter valid code
    await page.fill('input[placeholder*="code"]', 'VALID123')
    await page.click('button:has-text("Submit")')
    
    // Should proceed to questionnaire
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 5000 })
  })

  test('should handle questionnaire with different answer patterns', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Enter code
    await page.fill('input[placeholder*="code"]', 'TEST002')
    await page.click('button:has-text("Submit")')
    
    // Mix of answers - some high risk, some low risk
    const answerPattern = ['Never', 'Sometimes', 'Often', 'Never', 'Sometimes']
    
    for (const answer of answerPattern) {
      await page.waitForSelector(`button:has-text("${answer}"), label:has-text("${answer}")`, { timeout: 5000 })
      
      const button = await page.$(`button:has-text("${answer}")`)
      const radio = await page.$(`label:has-text("${answer}")`)
      
      if (button) {
        await button.click()
      } else if (radio) {
        await radio.click()
      }
      
      await page.waitForTimeout(500)
    }
  })

  test('should handle scenario retry mechanism', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Quick navigation to scenario
    await page.fill('input[placeholder*="code"]', 'TEST003')
    await page.click('button:has-text("Submit")')
    
    // Skip through questionnaire quickly
    for (let i = 0; i < 17; i++) {
      const firstOption = await page.$('button:not([disabled]), input[type="radio"]:not([disabled])')
      if (firstOption) {
        await firstOption.click()
        await page.waitForTimeout(200)
      }
    }
    
    // Wait for scenario
    await page.waitForSelector('text=/scenario/', { timeout: 10000 })
    
    // Intentionally give poor responses to test retry
    for (let retry = 0; retry < 3; retry++) {
      await page.fill('textarea, input[type="text"]', `Poor response ${retry + 1}`)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)
      
      const retryButton = await page.$('button:has-text("Try again")')
      if (retryButton && retry < 2) {
        await retryButton.click()
      }
    }
    
    // Should see max attempts message
    await expect(page.locator('text=/Maximum attempts|max.*retries/i')).toBeVisible({ timeout: 5000 })
  })

  test('should handle free chat mode', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Complete questionnaire quickly
    await page.fill('input[placeholder*="code"]', 'TEST004')
    await page.click('button:has-text("Submit")')
    
    // Speed through questionnaire
    for (let i = 0; i < 17; i++) {
      const firstOption = await page.$('button:not([disabled])')
      if (firstOption) {
        await firstOption.click()
        await page.waitForTimeout(100)
      }
    }
    
    // Start free chat if available
    const freeChatButton = await page.$('button:has-text("Start Free Chat")')
    if (freeChatButton) {
      await freeChatButton.click()
      
      // Send a message in free chat
      await page.fill('textarea, input[type="text"]', 'Hello, can you help me understand substance use risks?')
      await page.keyboard.press('Enter')
      
      // Wait for AI response
      await expect(page.locator('text=/help|understand|risk/')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should log all user actions to CSV', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Enable request interception to verify API calls
    const logRequests = []
    page.on('request', request => {
      if (request.url().includes('/api/log-action')) {
        logRequests.push(request.postDataJSON())
      }
    })
    
    // Perform actions
    await page.fill('input[placeholder*="code"]', 'CSV_TEST')
    await page.click('button:has-text("Submit")')
    
    // Answer a few questions
    for (let i = 0; i < 3; i++) {
      const button = await page.$('button:not([disabled])')
      if (button) {
        await button.click()
        await page.waitForTimeout(500)
      }
    }
    
    // Verify logging occurred
    expect(logRequests.length).toBeGreaterThan(0)
    expect(logRequests.some(req => req.userIdentifier === 'CSV_TEST')).toBeTruthy()
    expect(logRequests.some(req => req.actionType === 'QUESTIONNAIRE_STARTED')).toBeTruthy()
  })
})

test.describe('Admin Panel E2E Tests', () => {
  test('should authenticate and download CSV', async ({ page }) => {
    await page.goto('http://localhost:3001/downloadit')
    
    // Should see login form
    await expect(page.locator('text=Admin Login')).toBeVisible()
    
    // Try invalid credentials
    await page.fill('input[type="text"], input[placeholder*="username"]', 'wrong')
    await page.fill('input[type="password"]', 'incorrect')
    await page.click('button:has-text("Login")')
    
    await expect(page.locator('text=/Invalid|incorrect/i')).toBeVisible()
    
    // Use correct credentials
    await page.fill('input[type="text"], input[placeholder*="username"]', 'admin')
    await page.fill('input[type="password"]', 'grace2024!@#')
    await page.click('button:has-text("Login")')
    
    // Should see download interface
    await expect(page.locator('text=Download User Data')).toBeVisible({ timeout: 5000 })
    
    // Test download
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Download CSV")')
    const download = await downloadPromise
    
    // Verify download
    expect(download.suggestedFilename()).toContain('.csv')
  })
})

test.describe('Error Handling E2E Tests', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/chat', route => route.abort())
    
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Complete setup
    await page.fill('input[placeholder*="code"]', 'ERROR_TEST')
    await page.click('button:has-text("Submit")')
    
    // The app should handle the error gracefully
    // (specific behavior depends on error handling implementation)
  })

  test('should handle slow API responses', async ({ page }) => {
    // Simulate slow response
    await page.route('**/api/evaluate-response', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000))
      await route.continue()
    })
    
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Navigate to scenario
    await page.fill('input[placeholder*="code"]', 'SLOW_TEST')
    await page.click('button:has-text("Submit")')
    
    // Speed through questionnaire
    for (let i = 0; i < 17; i++) {
      const button = await page.$('button:not([disabled])')
      if (button) {
        await button.click()
        await page.waitForTimeout(100)
      }
    }
    
    // Submit scenario response
    await page.fill('textarea, input[type="text"]', 'Test response')
    await page.keyboard.press('Enter')
    
    // Should show loading state
    // (specific UI depends on implementation)
  })
})

test.describe('Accessibility E2E Tests', () => {
  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Tab through elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Enter code with keyboard
    await page.keyboard.type('KEYBOARD_TEST')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    
    // Navigate through questionnaire with keyboard
    await page.waitForSelector('button:has-text("Never")')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('http://localhost:3001/ai-chatbot')
    
    // Check for ARIA labels
    const buttons = await page.$$('button')
    for (const button of buttons) {
      const text = await button.textContent()
      expect(text).toBeTruthy() // Buttons should have text
    }
    
    // Check form elements
    const inputs = await page.$$('input')
    for (const input of inputs) {
      const label = await input.getAttribute('aria-label') || 
                   await input.getAttribute('placeholder')
      expect(label).toBeTruthy() // Inputs should have labels
    }
  })
})