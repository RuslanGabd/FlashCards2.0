const {test,expect}=require('@playwright/test');
test('malformed and incorrectly typed preferences do not break studying',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [favorites,settings] of [['broken','[]'],['{}','null'],['[42,null,"bonjour"]','broken'],
  ['[]','{"starredOnly":"false","frontSide":[],"englishSpeed":{}}']]){
  await page.goto('/index.html');await page.evaluate(({favorites,settings})=>{
   localStorage.setItem('words-up-favorite-terms',favorites);localStorage.setItem('words-up-flash-settings',settings);
   localStorage.setItem('words-up-editor-draft',JSON.stringify({meta:{title:'Draft'},cards:[{term:'bonjour',definition:'привет'}]}));
  },{favorites,settings});
  await page.goto('/flashcards.html');await expect(page.locator('#flash-card-face')).toHaveText('bonjour');
  await page.locator('#flip-card-button').click();await expect(page.locator('#flash-card-face')).toHaveText('привет');
 }
 expect(errors).toEqual([]);
});
test('public flashcards remain usable when browser storage is unavailable',async({page})=>{
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Unavailable','SecurityError')}}));
 await page.route('**/api/sets/901/study',route=>route.fulfill({json:{id:901,title:'Public',language:'en',public:true}}));
 await page.route('**/api/flashcards/set/901',route=>route.fulfill({json:[{id:9001,term:'hello',definition:'привет'}]}));
 await page.goto('/flashcards.html?setId=901');await expect(page.locator('#flash-card-face')).toHaveText('hello');
 await page.locator('#favorite-button').click();await page.locator('#flip-card-button').click();
 await expect(page.locator('#flash-card-face')).toHaveText('привет');expect(errors).toEqual([]);
});
test('AI failure leaves the dialog open and local extraction requires an explicit choice',async({page})=>{
 await page.route('**/api/ai/create-set',route=>route.fulfill({status:502,json:{message:'Unavailable'}}));
 await page.goto('/index.html');await page.locator('#open-ai-create-button').click();
 await page.locator('#ai-source-text').fill('Curiosity');await page.locator('#generate-ai-set').click();
 await expect(page.locator('#ai-generation-message')).toContainText('AI generation is unavailable');
 await expect(page.locator('#ai-create-dialog')).toBeVisible();await expect(page).toHaveURL(/index.html$/);
 await page.locator('#extract-local-words').click();await expect(page).toHaveURL(/edit-set.html$/);
 await expect(page.locator('input[data-field="term"]')).toHaveValue('curiosity');
 await expect(page.locator('input[data-field="definition"]')).toHaveValue('');
 await page.locator('#create-button').click();await expect(page.locator('#save-status')).toContainText('both a term and a definition');
 expect(await page.evaluate(()=>localStorage.getItem('words-up-current-local-set-id'))).toBeNull();
});
test('successful AI generation still opens complete cards in the editor',async({page})=>{
 await page.route('**/api/ai/create-set',route=>route.fulfill({json:{title:'AI result',description:'Generated cards',cards:[{term:'bonjour',definition:'привет'}]}}));
 await page.goto('/index.html');await page.locator('#open-ai-create-button').click();
 await page.locator('#ai-source-text').fill('Bonjour');await page.locator('#generate-ai-set').click();
 await expect(page).toHaveURL(/edit-set.html$/);await expect(page.locator('#set-title')).toHaveValue('AI result');
 await expect(page.locator('input[data-field="definition"]')).toHaveValue('привет');
});
