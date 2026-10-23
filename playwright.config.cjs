const {defineConfig}=require('@playwright/test');
module.exports=defineConfig({
 testDir:'tests/e2e', workers:1, fullyParallel:false, timeout:30000,
 use:{baseURL:process.env.E2E_BASE_URL||'http://127.0.0.1:8099',
  headless:true, viewport:{width:1440,height:1000},
  launchOptions:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}},
 reporter:process.env.CI?'github':'list',
});
