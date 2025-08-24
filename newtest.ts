import puppeteer , { CookieParam }from 'rebrowser-puppeteer-core';
import fs from 'fs';
function get_cookies(filepath:string):any {
    const filecontent = fs.readFileSync(filepath,"utf-8")
    const lines = filecontent.split("\n")
    const cookies :CookieParam[]= [];
    lines.forEach(line =>{
        if(line.startsWith("#") || !line.trim()) return;
        const parts=line.split("\t")
        const cookie : CookieParam  = {
        name: parts[5],
        value: parts[6],
        domain: parts[0],
        path: parts[2],
        expires: parseInt(parts[4]),
        httpOnly: parts[3] === 'TRUE',
        secure: parts[1] === 'TRUE'


        }
        cookies.push(cookie)


    } )
    return cookies}
const cookies=get_cookies("cookies.txt");


 

async function waitForAppStatusReques(page, ide): Promise<[string, any]> {
  ide = ide.trim();
  page.setDefaultTimeout(100000);
  page.setDefaultNavigationTimeout(100000);

  // Store request handler as a named function so we can remove it later
  const requestHandler = (request) => {
    const url = request.url();
    const resourceType = request.resourceType();

    if (url.includes('/app/appStatusList') ||
        url.includes('/appstatus/appid') ||
        resourceType === 'document' ||
        resourceType === 'script' ||
        resourceType === 'xhr' ||
        resourceType === 'fetch' ||
        resourceType === 'stylesheet' ||
        resourceType === 'websocket') {
      request.continue();
    } else {
      console.log(`Blocking: ${resourceType} - ${url}`);
      request.abort();
    }
  };

  // Enable request interception
  await page.setRequestInterception(true);
  page.on('request', requestHandler);

  return new Promise<[string, any]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      console.log("Timeout waiting for appStatusList response");
      page.off('response', onResponse);
      reject([ide, "timeout_err"]);
    }, 300000);

    const onResponse = async (response) => {
      const url = response.url();
      console.log(`Response received: ${url}`);

      if (url.includes('/app/appStatusList')) {
        clearTimeout(timeout);
        page.off('response', onResponse);

        // IMPORTANT: Remove request handler BEFORE disabling interception
        page.off('request', requestHandler);
        await page.setRequestInterception(false);

        console.log("Got target response! Cleaning up...");

        if (response.ok()) {
          try {
            const data = await response.json();
            if ('banip' in data) {
              console.log("IPBAN detected!");
              await page.close();
              reject([ide, "banip"]);
            }

            const data_dict = {[ide]: data};
            console.log("SUCCESS: Got appStatusList data!");

            // Resolve before closing
            resolve([ide, data_dict]);
          } catch (error) {
            console.error("Error parsing response:", error);
            reject([ide, "catcherr"]);
          }
        } else {
          console.error("Response not OK:", response.status());
          reject([ide, "elseerr"]);
        }
      }
    };

    page.on('response', onResponse);

    // Navigate after setting up listeners
    console.log(`Navigating to: https://www.qimai.cn/app/appstatus/appid//country/cn/`);
    page.goto(`https://www.qimai.cn/app/appstatus/appid/1599863912/country/cn/`, {
      waitUntil: 'networkidle2'
    }).catch(err => {
      clearTimeout(timeout);
      page.off('response', onResponse);
      page.off('request', requestHandler);
      reject([ide, "goterr"]);
    });
  });
}

(async() => {
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/brave",
    headless: false,
    defaultViewport: null,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--lang=en-US',
      `--timezone="Asia/Shanghai"`,
    ]
  });
  await browser.setCookie(...cookies);

  const page = await browser.newPage();

  // Set cookies before navigation
  console.log("Setting cookies...");
  await browser.setCookie(...cookies);

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  try {
    const result = await waitForAppStatusReques(page, "1599863912");
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
})();