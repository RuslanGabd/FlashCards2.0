const {test,expect}=require('@playwright/test');
const {randomUUID,randomBytes}=require('node:crypto');
let token;
test.beforeAll(async({request})=>{
 const username='editor_'+randomUUID().replaceAll('-','').slice(0,16),password=randomBytes(18).toString('hex');
 expect((await request.post('/api/auth/signup',{data:{username,email:username+'@example.invalid',password}})).status()).toBe(200);
 token=(await(await request.post('/api/auth/login',{data:{username,password}})).json()).token;
});
const headers=()=>({Authorization:'Bearer '+token});
async function create(request,title){
 const response=await request.post('/api/sets',{headers:headers(),data:{title,public:false,language:'en',cards:[{term:title,definition:'meaning'}]}});
 expect(response.status()).toBe(200);return (await response.json()).id;
}
async function signIn(page){await page.goto('/index.html');await page.evaluate(value=>localStorage.setItem('token',value),token)}
async function assertTitle(request,id,title){expect((await(await request.get('/api/sets/'+id,{headers:headers()})).json()).title).toBe(title)}
test('two editor tabs save only their own remote collection',async({page,context,request})=>{
 const a=await create(request,'Tab A'),b=await create(request,'Tab B');await signIn(page);
 await page.goto('/edit-set.html?setId='+a);await expect(page.locator('#set-title')).toHaveValue('Tab A');
 const other=await context.newPage();await other.goto('/edit-set.html?setId='+b);await expect(other.locator('#set-title')).toHaveValue('Tab B');
 await page.locator('#set-title').fill('Edited A');await page.locator('#create-button').click();
 await expect(page.locator('#save-status')).toHaveText('Saved to your account.');
 await assertTitle(request,a,'Edited A');await assertTitle(request,b,'Tab B');
 await other.locator('#set-title').fill('Edited B');await other.locator('#done-button').click();
 await expect(other.locator('#save-status')).toHaveText('Saved to your account.');
 await assertTitle(request,a,'Edited A');await assertTitle(request,b,'Edited B');
});
test('failed loading blocks writes and retry restores the requested target',async({page,request})=>{
 const a=await create(request,'Previous'),b=await create(request,'Requested');await signIn(page);
 await page.goto('/edit-set.html?setId='+a);await expect(page.locator('#set-title')).toHaveValue('Previous');
 let failed=true,writes=0;
 page.on('request',request=>{if(['POST','PUT'].includes(request.method())&&new URL(request.url()).pathname.startsWith('/api/sets'))writes++});
 await page.route('**/api/sets/'+b,route=>failed?route.fulfill({status:503,json:{message:'Unavailable'}}):route.continue());
 await page.goto('/edit-set.html?setId='+b);
 await expect(page.locator('#save-status')).toContainText('Could not load this set');
 await expect(page.locator('#set-title')).toBeDisabled();await expect(page.locator('#create-button')).toBeDisabled();
 await page.evaluate(()=>performSave(false));expect(writes).toBe(0);
 await assertTitle(request,a,'Previous');
 failed=false;await page.locator('#retry-load-set').click();
 await expect(page.locator('#set-title')).toHaveValue('Requested');await expect(page.locator('#create-button')).toBeEnabled();
 await page.locator('#set-title').fill('After retry');await page.locator('#create-button').click();
 await expect(page.locator('#save-status')).toHaveText('Saved to your account.');
 await assertTitle(request,a,'Previous');await assertTitle(request,b,'After retry');
});
test('slow loading cannot save the previous draft before the requested set arrives',async({page,request})=>{
 const id=await create(request,'Slow set');await signIn(page);
 let release;const gate=new Promise(resolve=>{release=resolve});
 await page.route('**/api/sets/'+id,async route=>{await gate;await route.continue()});
 await page.goto('/edit-set.html?setId='+id);
 try{
  await expect(page.locator('#save-status')).toHaveText('Loading set…');
  await expect(page.locator('#done-button')).toBeDisabled();await expect(page.locator('#set-title')).toBeDisabled();
  await page.evaluate(()=>performSave(false));
 }finally{release()}
 await expect(page.locator('#set-title')).toHaveValue('Slow set');await expect(page.locator('#done-button')).toBeEnabled();
 await assertTitle(request,id,'Slow set');
});
test('two guest editor tabs retain their own local collection IDs',async({page,context})=>{
 await page.goto('/index.html');await page.evaluate(()=>localStorage.setItem('words-up-local-sets',JSON.stringify(
  ['a','b'].map(id=>({id,title:id,cards:[{term:id,definition:'meaning'}],language:'en'}))
 )));
 await page.goto('/edit-set.html?localSetId=a');await expect(page.locator('#set-title')).toHaveValue('a');
 const other=await context.newPage();await other.goto('/edit-set.html?localSetId=b');await expect(other.locator('#set-title')).toHaveValue('b');
 await page.locator('#set-title').fill('Local A');await page.locator('#create-button').click();
 await expect(page.locator('#save-status')).toContainText('this browser only');
 const sets=await page.evaluate(()=>JSON.parse(localStorage.getItem('words-up-local-sets')));
 expect(sets.find(set=>set.id==='a').title).toBe('Local A');expect(sets.find(set=>set.id==='b').title).toBe('b');
});
