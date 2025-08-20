import puppeteer , { CookieParam }from 'rebrowser-puppeteer-core';


import * as fs from 'fs'
import path from 'path';
// interface Cookie {
//   name: string;
//   value: string;
//   domain: string;
//   path: string;
//   expires?: number;
//   httpOnly: boolean;
//   secure: boolean;
//   sameSite?: 'Strict' | 'Lax' | 'None';
// }

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
    return cookies
} ;


const cookies=get_cookies("cookies.txt");

(async()=>{
const browser = await puppeteer.launch({executablePath:"/usr/bin/brave",
      defaultViewport: null,
        args: [
            //         '--disable-features=IsolateOrigins,site-per-process',
            // '--disable-site-isolation-trials',
            // '--no-sandbox',
            // '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
              '--lang=en-US',
      `--timezone="Asia/Shanghai"`,
    ]
    
}

);
await browser.setCookie(...cookies);
const page= await browser.newPage()
// const UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
// // await page.evaluateOnNewDocument(() => {
// //     // Pass WebDriver check
// //     Object.defineProperty(navigator, 'webdriver', {
// //       get: () => false,
// //     });})
// // Then for each page:
// await page.setUserAgent(UA);
// await page.evaluateOnNewDocument(() => {
//   Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// });
// await page.goto("https://bot-detector.rebrowser.net")
const promise= page.goto("https://www.qimai.cn/app/appstatus/appid/370070561/country/cn")
const resp=await waitForAppStatusReques(page)



console.log(resp)
}
)()
async function waitForAppStatusReques(page) {
  return new Promise((resolve, reject) => {
    // This code runs immediately when the function is called
    
    // Set up timeout (will reject if no response in 30 seconds)
    const timeout = setTimeout(() => {
      page.off('response', onResponse);  // Clean up
      reject(new Error('Timeout waiting for API response'));
    }, 300000);

    // Define what to do when we get a response
    const onResponse = async (response) => {
      if (response.url().includes('/app/appStatusList')) {
        clearTimeout(timeout);  // Cancel the timeout
        page.off('response', onResponse);  // Clean up
        
        try {
          const data = await response.json();
          resolve(data);  // Success! Return the data
        } catch (error) {
          const text = await response.text();
          resolve(text);  // Success! Return the text
        }
      }
    };

    // Start listening for responses
    page.on('response', onResponse);

  });
}
async function get_resp_log_and_mv(page){

}