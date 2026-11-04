const {test,expect}=require('@playwright/test');
const {randomUUID,randomBytes}=require('node:crypto');

test('a new account can register, reject duplicate details, and log in by username or email',async({page})=>{
 const username='signup-'+randomUUID().replaceAll('-','').slice(0,16);
 const email=username+'@example.invalid',password=randomBytes(18).toString('hex');
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const fillSignup=async(name,address)=>{
  await page.goto('/signup.html');
  await page.locator('#username').fill(name);
  await page.locator('#email').fill(address);
  await page.locator('#password').fill(password);
 };
 await fillSignup('invalid username',email);
 expect(await page.locator('#username').evaluate(input=>input.validity.patternMismatch)).toBe(true);
 await page.locator('#username').fill(username);
 expect(await page.locator('#signup-form').evaluate(form=>form.checkValidity())).toBe(true);
 const signup=page.waitForResponse(response=>response.url().endsWith('/api/auth/signup'));
 await page.getByRole('button',{name:'Create account'}).click();
 const created=await signup;expect(created.status()).toBe(200);
 await expect(page).toHaveURL(/login.html$/);

 for(const [name,address] of [[username,'another_'+email],[username+'_other',email]]){
  await fillSignup(name,address);
  const duplicate=page.waitForResponse(response=>response.url().endsWith('/api/auth/signup'));
  await page.getByRole('button',{name:'Create account'}).click();
  expect((await duplicate).status()).toBe(409);
  await expect(page.locator('#auth-message')).toHaveText('That username or email is already in use. Try another or log in.');
 }
 for(const identifier of [username,email]){
  await page.goto('/login.html');
  await page.locator('#username').fill(identifier);
  await page.locator('#password').fill(password);
  await page.getByRole('button',{name:'Log in',exact:true}).click();
  await expect(page).toHaveURL(/index.html$/);
  await expect(page.locator('[data-auth-user]')).toHaveText(username);
  await page.evaluate(()=>localStorage.removeItem('token'));
 }
 expect(errors).toEqual([]);
});
