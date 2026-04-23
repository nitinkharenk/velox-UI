const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('CONSOLE:', msg.text()));
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    </head>
    <body>
      <div id="output">Running...</div>
      <script type="text/babel" data-presets="react,typescript">
        window.onerror = (e) => { document.getElementById('output').textContent = e.message || e; };
        try {
          const foo = <div />;
          document.getElementById('output').textContent = "SUCCESS";
        } catch (e) {
          document.getElementById('output').textContent = "ERROR: " + e.message;
        }
      </script>
    </body>
    </html>
  `, { waitUntil: 'networkidle0' });
  
  const content = await page.$eval('#output', el => el.textContent);
  console.log("FINAL OUTPUT:", content);
  
  await browser.close();
})();
