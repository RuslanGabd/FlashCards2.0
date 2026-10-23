const {test,expect}=require('@playwright/test');
const {randomUUID,randomBytes}=require('node:crypto');
const username='e2e_'+randomUUID().slice(0,8), password=randomBytes(18).toString('hex');
let token;
const card=(term='bonjour')=>({term,definition:'привет',exampleSentence:'Bonjour, mon ami.'});
async function signedIn(page){await page.goto('/index.html');await page.evaluate(t=>localStorage.setItem('token',t),token);}
async function fillSet(page){
 await page.goto('/edit-set.html?new=1');
 await page.locator('.suggestions-toggle').click();
 await page.locator('#set-title').fill('E2E collection');
 await page.locator('input[data-card-index="0"][data-field="term"]').fill('bonjour');
 await page.locator('input[data-card-index="0"][data-field="definition"]').fill('привет');
 await page.locator('[data-action="delete"][data-index="1"]').click();
}
test.beforeAll(async({request})=>{
 const signup=await request.post('/api/auth/signup',{data:{username,email:username+'@example.invalid',password}});expect(signup.status()).toBe(200);
 const login=await request.post('/api/auth/login',{data:{username,password}});token=(await login.json()).token;
});
test('new draft survives reload and guest save remains explicitly local',async({page})=>{
 await fillSet(page);await expect(page).not.toHaveURL(/new=/);
 await page.reload();await expect(page.locator('#set-title')).toHaveValue('E2E collection');
 await page.locator('#create-button').click();await expect(page.locator('#save-status')).toContainText('this browser only');
 await expect(page).toHaveURL(/localSetId=/);
 await page.locator('#create-practice-button').click();await expect(page).toHaveURL(/flashcards.html\?localSetId=/);
 await expect(page.locator('#flash-card-face')).toHaveText('bonjour');
});
test('all study modes and editing retain the selected remote collection',async({page,request})=>{
 const response=await request.post('/api/sets',{headers:{Authorization:'Bearer '+token},data:{title:'Selected remote collection',public:true,language:'fr',cards:[card()]}});
 expect(response.status()).toBe(200);const {id}=await response.json();
 await signedIn(page);await page.evaluate(()=>localStorage.setItem('words-up-editor-draft',JSON.stringify({meta:{title:'Wrong local collection'},cards:[{term:'wrong-word',definition:'wrong'}]})));
 await page.goto('/flashcards.html?setId='+id);await expect(page.locator('#flash-card-face')).toHaveText('bonjour');
 await page.locator('a.mode-tile').filter({hasText:'Test'}).click();await expect(page).toHaveURL(new RegExp('practice.html\\?setId='+id));
 await expect(page.locator('#practice-question')).toHaveText('bonjour');
 await page.getByRole('link',{name:'Match',exact:true}).click();await expect(page).toHaveURL(new RegExp('match.html\\?setId='+id));
 await expect(page.locator('.match-tile')).toHaveCount(2);
 await page.getByRole('link',{name:'Edit set',exact:true}).click();await expect(page).toHaveURL(new RegExp('edit-set.html\\?setId='+id));
 await expect(page.locator('#set-title')).toHaveValue('Selected remote collection');
});
test('card image and diagram survive account save and a fresh browser context',async({page,browser})=>{
 await signedIn(page);await fillSet(page);
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=2;c.height=2;const x=c.getContext('2d');x.fillStyle='#244c3f';x.fillRect(0,0,2,2);return c.toDataURL('image/png').split(',')[1]});
 const image={name:'test.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
 const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="image"]').click();await(await chooser).setFiles(image);
 await expect(page.locator('.image-drop.has-image')).toHaveCount(1);
 await page.locator('#diagram-input').setInputFiles(image);await expect(page.locator('#diagram-preview')).toBeVisible();
 await page.locator('#create-button').click();await expect(page.locator('#save-status')).toHaveText('Saved to your account.');
 const savedURL=page.url();const id=new URL(savedURL).searchParams.get('setId');expect(id).toBeTruthy();
 const other=await browser.newContext();const fresh=await other.newPage();await fresh.goto(new URL('/index.html',savedURL).href);
 await fresh.evaluate(t=>localStorage.setItem('token',t),token);await fresh.goto(savedURL);
 await expect(fresh.locator('.image-drop.has-image')).toHaveCount(1);await expect(fresh.locator('#diagram-preview img')).toBeVisible();
 await fresh.goto(new URL('/flashcards.html?setId='+id,savedURL).href);await expect(fresh.locator('#study-card-image')).toBeVisible();
 await other.close();
});
test('server save failure keeps the draft without claiming a successful account save',async({page})=>{
 await signedIn(page);await fillSet(page);
 await page.route('**/api/sets',r=>r.fulfill({status:503,json:{message:'Sign-in service unavailable'}}));
 await page.locator('#create-button').click();await expect(page.locator('#save-status')).toContainText('Not saved online');
 expect(await page.evaluate(()=>localStorage.getItem('words-up-current-remote-set-id'))).toBeNull();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('words-up-editor-draft')).meta.title)).toBe('E2E collection');
 await expect(page).not.toHaveURL(/setId=/);
});
test('incorrect login is readable and successful login still works',async({page})=>{
 await page.goto('/login.html');await page.locator('#username').fill(username);await page.locator('#password').fill('incorrect');
 await page.locator('button[type="submit"]').click();await expect(page.locator('#auth-message')).toHaveText('Incorrect username or password. Please try again.');
 await page.locator('#password').fill(password);await expect(page.locator('#auth-message')).toBeEmpty();
 await page.locator('button[type="submit"]').click();await expect(page).toHaveURL(/index.html/);
 await expect(page.locator('[data-auth-user]')).toHaveText(username);
});
test('logout revokes server sessions and clears the browser token',async({page,request})=>{
 await signedIn(page);await page.reload();await page.getByRole('button',{name:'Log out',exact:true}).click();
 await expect(page.locator('[data-auth-guest]').first()).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('token'))).toBeNull();
 expect((await request.get('/api/sets/me',{headers:{Authorization:'Bearer '+token}})).status()).toBe(401);
});
