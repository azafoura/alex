import puppeteer , { CookieParam }from 'rebrowser-puppeteer-core';
import * as fs from 'fs'
import path from "path"
import {monitorEventLoopDelay} from "node:perf_hooks";
var Success=0;
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
const read_csv= async ()=>{
  const data= await fs.promises.readFile("many_pages.csv", {encoding:"utf-8"});
  const list= data.split("\n")
  return list
}
function storeInWhitelist(id, data: any) {
  const filename = path.join(process.cwd(), 'data', 'many_pages', `${id}.json`);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Success data stored for ID: ${id}`);
  console.log(`total sucess so far ${++Success}`)
}
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

async function Monitor_requests_and_click(page,ide) {
      var allPagesData = [];

  // const max_request_number=0
 page.goto(`https://www.qimai.cn/app/appstatus/appid/${ide}/country/cn/`)
  // Helper function to wait for the next specific response
  const waitForAppStatusListResponse = () => {
    return page.waitForResponse(response =>
      response.url().includes('/app/appStatusList') && response.ok()
    );
  };

  // 1. Wait for the first response (assuming the action that triggers it was just performed)
  const firstResponse = await waitForAppStatusListResponse();
  const firstResponseData = await firstResponse.json();

  if (firstResponseData.banip) {
    console.log("IPBAN!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    await page.close();
    throw new Error("IP Banned");
  }

  allPagesData.push(firstResponseData);
  const max_request_number = firstResponseData["maxPage"] || 1;
  console.log(`Total pages to scrape: ${firstResponseData[ide]?.["maxPage"]}`);

  // 2. Loop for the remaining pages
  for (let currentPage = 2; currentPage <= max_request_number; currentPage++) {
    console.log(`Getting page ${currentPage}...`);
  const btn=  await   page.$('li.ivu-page-next')
    btn.click()
    // Use Promise.all to click and wait for the response simultaneously
    const [nextResponse] = await Promise.all([
      waitForAppStatusListResponse(),
      // IMPORTANT: Replace 'selector-for-next-button' with the actual selector
    ]);

    const nextResponseData = await nextResponse.json();

    if (nextResponseData.banip) {
      console.log("IPBAN!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      await page.close();
      throw new Error("IP Banned during pagination");
    }

    allPagesData.push(nextResponseData);
  }

  console.log("Finished collecting all page data.");
  return allPagesData;






}
(async()=>{

  const liste=await read_csv()
  console.log(liste.length)
  const top_number_of_pages:number =5


const browser = await puppeteer.launch({executablePath:"/usr/bin/brave",
  headless:false,
      defaultViewport: null,
        args: [
        '--disable-blink-features=AutomationControlled',
        '--lang=en-US',
        `--timezone="Asia/Shanghai"`,
    ]}
);

await browser.setCookie(...cookies);
const page= await browser.newPage()
function recursiv(page) {

    const ide = liste.shift()
    Monitor_requests_and_click(page, ide)
        .then((data) => {
            storeInWhitelist(ide,data)
        })
        .catch(()=>{console.log("EROR")})
        .finally(()=>{recursiv(page)})
}
recursiv(page)
})()