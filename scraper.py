import asyncio
import csv
import json
import os
import pandas as pd
import random
import shutil
import time
from datetime import datetime
from playwright.async_api import async_playwright, Playwright, TimeoutError as PlaywrightTimeoutError
from typing import List, Dict, Any, Optional

# Define constants
CSV_FOLDER = "csv data"
APPID_CSV = "app_ids_final.csv"
BASE_URL = "https://www.qimai.cn/app/version/appid/{}/country/cn"
EXPORT_BUTTON_TEXT = "导出数据"

# Ensure csv data folder exists
if not os.path.exists(CSV_FOLDER):
    os.makedirs(CSV_FOLDER)

# Load authentication cookies from playwright_cookies.json
def load_cookies_from_file():
    try:
        with open("playwright_cookies.json", "r", encoding="utf-8") as f:
            cookies = json.load(f)
            print(f"Loaded {len(cookies)} cookies from playwright_cookies.json")
            return cookies
    except Exception as e:
        print(f"Error loading cookies from playwright_cookies.json: {e}")
        print("Please make sure the cookies file exists and is properly formatted")
        return []
        
# Authentication cookies for qimai.cn
COOKIES = load_cookies_from_file()

async def random_sleep(min_sec=1.5, max_sec=3.5):
    """Sleep for a random amount of time between min_sec and max_sec seconds"""
    sleep_time = random.uniform(min_sec, max_sec)
    await asyncio.sleep(sleep_time)
    return sleep_time

def get_app_ids_without_filename() -> List[str]:
    """Read appid.csv and return list of app_ids that don't have a filename"""
    app_ids = []
    
    try:
        df = pd.read_csv(APPID_CSV)
        
        # Clean column names (remove whitespace)
        df.columns = [col.strip() for col in df.columns]
        
        # Filter rows where filename is empty/NaN
        filtered_df = df[df['filename'].isna() | (df['filename'] == '')]
        
        # Get the app_ids as a list
        app_ids = filtered_df['app_id'].astype(str).tolist()
        print(f"Found {len(app_ids)} app IDs to process")
        
    except Exception as e:
        print(f"Error reading {APPID_CSV}: {e}")
    
    return app_ids

def update_appid_csv(app_id: str, filename: str):
    """Update the appid.csv file with the filename for the given app_id"""
    try:
        df = pd.read_csv(APPID_CSV)
        
        # Clean column names
        df.columns = [col.strip() for col in df.columns]
        
        # Find the row with the matching app_id and update the filename
        df.loc[df['app_id'].astype(str) == str(app_id), 'filename'] = filename
        
        # Save the updated DataFrame back to the CSV file
        df.to_csv(APPID_CSV, index=False)
        print(f"Updated {APPID_CSV} for app_id {app_id} with filename {filename}")
    
    except Exception as e:
        print(f"Error updating {APPID_CSV}: {e}")

async def setup_browser(playwright: Playwright):
    """Setup and return a browser instance with stealth features"""
    # Launch the browser with stealth options to avoid detection
    browser = await playwright.chromium.launch(
        headless=False,  # Set to True for production
        slow_mo=50,  # Add slight delay between actions
        args=[
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-site-isolation-trials',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    )
    
    # Create a context with additional options to avoid detection
    context = await browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        has_touch=False,
        java_script_enabled=True,
        locale='en-US',
        timezone_id='Asia/Shanghai',
        permissions=['geolocation'],
        accept_downloads=True  # Enable file downloads
    )
      # Set up some evasions via JavaScript
    await context.add_init_script("""
        // Pass WebDriver check
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
        
        // Pass Chrome check
        window.chrome = {
            runtime: {},
        };
        
        // Pass Notifications check
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
                Promise.resolve({ state: Notification.permission }) :
                originalQuery(parameters)
        );
    """)
    
    return browser, context

async def load_cookies(context):
    """Load authentication cookies into the browser context"""
    print("Setting up authentication...")
    
    # First navigate to the main site
    page = await context.new_page()
    await page.goto("https://www.qimai.cn/")
    await random_sleep(2, 3)
    
    # Clear existing cookies
    await context.clear_cookies()
    await random_sleep(1, 2)
    
    # Add authentication cookies
    await context.add_cookies(COOKIES)
    
    # Refresh the page to apply cookies
    await page.reload()
    await random_sleep(3, 4)
    
    print("Authentication cookies set")
    return page

async def extract_app_name(page, app_id) -> str:
    """Try to extract the app name from the page"""
    selectors = [
        '.app-title',
        '.app-info .title',
        'h1.app-name',
        '.app-header .name',
        '.header-title',
        '.title-text'
    ]
    
    for selector in selectors:
        try:
            if await page.locator(selector).count() > 0:
                app_name = await page.locator(selector).first.text_content()
                if app_name and len(app_name.strip()) > 0:
                    # Clean the app name for filename use - improved cleaning
                    app_name = app_name.strip()
                    
                    # Replace newlines and excess whitespace
                    app_name = ' '.join(app_name.split())
                    
                    # Limit length to avoid extremely long filenames
                    if len(app_name) > 50:
                        app_name = app_name[:50]
                    
                    # Replace characters that might cause issues in filenames
                    for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\n', '\r', '\t']:
                        app_name = app_name.replace(char, '_')
                    
                    print(f"Found app name: {app_name}")
                    return app_name
        except Exception:
            continue
    
    # Try a more generic approach if specific selectors fail
    try:
        # Look for any header or title element
        for selector in ['h1', '.title', '.name', '.header', '.app']:
            elements = await page.query_selector_all(selector)
            for element in elements:
                try:
                    app_name = await element.text_content()
                    if app_name and len(app_name.strip()) > 2:
                        # Clean name with improved cleaning
                        app_name = app_name.strip()
                        app_name = ' '.join(app_name.split())
                        
                        if len(app_name) > 50:
                            app_name = app_name[:50]
                            
                        for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\n', '\r', '\t']:
                            app_name = app_name.replace(char, '_')
                            
                        print(f"Found possible app name: {app_name}")
                        return app_name
                except:
                    continue
    except Exception:
        pass
    
    return f"app_{app_id}"

async def process_app_id(page, app_id: str, download_path: str):
    """Process a single app ID: visit page, extract name, download CSV"""
    url = BASE_URL.format(app_id)
    print(f"\nProcessing app_id: {app_id}")
    print(f"Navigating to: {url}")
    
    try:
        # Navigate to the app version page
        await page.goto(url, wait_until="networkidle")
        await random_sleep(3, 5)
          # Get app name
        app_name = await extract_app_name(page, app_id)
        if not app_name:
            app_name = f"app_{app_id}"
        
        # Find the export button using text
        await page.get_by_text("导出数据").wait_for(timeout=5000)
        export_button = page.get_by_text("导出数据")
        if not export_button:
            print("Export button not found")
            return False
        
        # Generate filename for saving
        new_filename = f"{app_id}_{app_name}.csv"
        destination = os.path.join(CSV_FOLDER, new_filename)
        
        # Check if destination already exists
        if os.path.exists(destination):
            base, ext = os.path.splitext(destination)
            i = 1
            while os.path.exists(f"{base}_{i}{ext}"):
                i += 1
            destination = f"{base}_{i}{ext}"
            new_filename = os.path.basename(destination)
        
        # Simple implementation following exactly the Playwright docs
        print("Waiting for download...")
        
        # Start waiting for the download before clicking
        async with page.expect_download() as download_info:
            # Click the export button to initiate download
            await export_button.click()
            print("Export button clicked")
            
        # Wait for the download to complete and get the download object
        download = await download_info.value
        # Fix: access suggested_filename as a property, not a method
        print(f"Download started: {download.suggested_filename}")
        
        # Save the downloaded file to the destination
        await download.save_as(destination)
        print(f"File saved to: {destination}")
        
        # Update CSV with the new filename
        update_appid_csv(app_id, new_filename)
        return True
        
    except Exception as e:
        print(f"Error processing app_id {app_id}: {e}")
        await page.screenshot(path=f"error_{app_id}.png")
        update_appid_csv(app_id, "No data found")
        return False

async def process_app_ids(app_ids: List[str], batch_size=5):
    """Process app IDs in batches using Playwright"""
    async with async_playwright() as playwright:
        browser, context = await setup_browser(playwright)
        
        try:
            # Set up downloads folder
            download_path = os.path.join(os.path.expanduser("~"), "Downloads")
            
            # Load cookies and get initial page
            page = await load_cookies(context)
            
            # Process app IDs in batches
            for i in range(0, len(app_ids), batch_size):
                batch = app_ids[i:i+batch_size]
                print(f"Processing batch {i//batch_size + 1} with {len(batch)} app IDs")
                
                # Process each app ID in the batch
                for app_id in batch:
                    success = await process_app_id(page, app_id, download_path)
                    
                    # Add random wait between requests to avoid rate limiting
                    wait_time = await random_sleep(4, 7)
                    print(f"Waiting {wait_time:.2f} seconds before next request...")
                
                # Add longer wait between batches
                if i + batch_size < len(app_ids):
                    wait_time = random.uniform(10, 15)
                    print(f"Waiting {wait_time:.2f} seconds before next batch...")
                    await asyncio.sleep(wait_time)
        
        finally:
            # Close the browser
            await browser.close()

async def main():
    # Get list of app_ids that need processing
    app_ids = get_app_ids_without_filename()
    
    if not app_ids:
        print("No app IDs to process. Exiting.")
        return
    
    # Process the app IDs
    await process_app_ids(app_ids)

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())