const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    console.log('Page loaded successfully for desktop.');
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshot_desktop.png' });
    console.log('Desktop screenshot saved.');

    await page.setViewport({ width: 375, height: 812 });
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshot_mobile.png' });
    console.log('Mobile screenshot saved.');
  } catch (err) {
    console.error('Failed to load page:', err);
  }
  
  await browser.close();
})();
