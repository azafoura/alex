import puppeteer , { CookieParam }from 'rebrowser-puppeteer-core';


import * as fs from 'fs'
import path from "path";
const read_csv= async ()=>{
  const data= await fs.promises.readFile("first_column_only.csv", {encoding:"utf-8"});
  const list= data.split("\n").slice(1)
  return list

 
}
const DATA_DIR = path.join(__dirname, 'data');
const BLACKLIST_FILE = path.join(DATA_DIR, 'blacklist.json');
const WHITELIST_FILE = path.join(DATA_DIR, 'whitelist.json');
// Store successful response in whitelist directory
function storeInWhitelist(id, data: any) {
  const filename = path.join(process.cwd(), 'data', 'whitelist', `${id}.json`);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Success data stored for ID: ${id}`);
}

// Store failed response in blacklist directory
function storeInBlacklist(id: string,data) {
  const filename = path.join(process.cwd(), 'data', 'blacklist', `${id}.txt`);
  fs.writeFileSync(filename, data);
  console.log(`Failure data stored for ID: ${id}`);
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
async function waitForAppStatusReques(page,ide):Promise<[string, any]>  {
  return new Promise((resolve, reject) => {
    // This code runs immediately when the function is called
    
    // Set up timeout (will reject if no response in 30 seconds)
    const timeout = setTimeout(() => {
      page.off('response', onResponse);  // Clean up
      reject([ide,"timeout_err"]);
    }, 300000);

    // Define what to do when we get a response
    const onResponse = async (response) => {
      if (response.url().includes('/app/appStatusList')) {
        clearTimeout(timeout);  // Cancel the timeout
        page.off('response', onResponse);
          // Clean up
        if (response.ok()){
        try {
          
          const data = await response.json();
          const data_dict = {[ide]:data}
          resolve([ide,data_dict ]);  // Success! Return the data
        } catch (error) {clearTimeout(timeout);
                page.off('response', onResponse);
          reject([ide,"catcherr"])
        }}
        else{clearTimeout(timeout);
                page.off('response', onResponse);
                reject([ide,"elseerr"])}
        
      }
    };
    console.log(ide)
    const promise= page.goto(`https://www.qimai.cn/app/appstatus/appid/${ide}/country/cn/`)
    .catch(()=>{                clearTimeout(timeout);
                page.off('response', onResponse);
                reject([ide,"goterr"])})

    // Start listening for responses
    page.on('response', onResponse);

  });
}
const cookies=get_cookies("cookies.txt");
const max_errors:number =7;
(async()=>{
  var errors:number=0;
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
function recursiv(page){
  console.log(`processing ${page}`)
  
  if (errors<10){
    const nextelem= liste.shift()
  waitForAppStatusReques(page,nextelem)
.then(([x,y])=> {storeInWhitelist(x,y)})
.catch(([x,y])=>{storeInBlacklist(x,y);errors++})
.finally(()=>{recursiv(page)})}
  else{page.close()}
  }
  
await browser.setCookie(...cookies);
const page= await browser.newPage()
const page2= await browser.newPage()
const page3= await browser.newPage()
const page4= await browser.newPage()
const page5= await browser.newPage()

recursiv(page)
recursiv(page2)
recursiv(page3)
recursiv(page4)
recursiv(page5)


}
)()