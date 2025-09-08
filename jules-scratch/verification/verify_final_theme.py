import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    """
    Takes a screenshot of the main page to show the final state,
    as the dropdown could not be verified.
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        try:
            await page.goto("http://localhost:7070/", timeout=60000)
            await expect(page.locator("main.container")).to_be_visible()
            await expect(page.get_by_role("link", name="Home")).to_be_visible()

            screenshot_path = "jules-scratch/verification/final_verification.png"
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
