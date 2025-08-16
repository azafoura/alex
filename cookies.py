import json

def transform_chrome_cookies_to_playwright(chrome_cookies):
    playwright_cookies = []
    
    for cookie in chrome_cookies:
        # Basic fields
        pc = {
            "name": cookie["name"],
            "value": cookie["value"],
            "domain": cookie["domain"],
            "path": cookie.get("path", "/"),
            "secure": False,
            "httpOnly": False,
        }

        # Convert session to expirationDate if available
        if not cookie.get("session", True) and "expirationDate" in cookie:
            pc["expires"] = cookie["expirationDate"]

        # Force a reasonable default for sameSite
        pc["sameSite"] = "Lax"

        playwright_cookies.append(pc)

    return playwright_cookies

# Example usage
if __name__ == "__main__":
    # Load cookies from a file (optional)
    with open("chrome_cookies.json", "r", encoding="utf-8") as f:
        chrome_cookies = json.load(f)

    playwright_cookies = transform_chrome_cookies_to_playwright(chrome_cookies)

    with open("playwright_cookies.json", "w", encoding="utf-8") as f:
        json.dump(playwright_cookies, f, indent=4)

    print("✅ Transformed cookies saved to playwright_cookies.json")
