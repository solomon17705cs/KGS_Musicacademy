const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const WEB = __dirname;

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${path.basename(src)}`);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(path.join(DIST, 'pwa-icons'));

  const iconFiles = fs.readdirSync(path.join(WEB, 'pwa-icons'));
  for (const file of iconFiles) {
    copyFile(
      path.join(WEB, 'pwa-icons', file),
      path.join(DIST, 'pwa-icons', file)
    );
  }

  copyFile(path.join(WEB, 'manifest.json'), path.join(DIST, 'manifest.json'));
  copyFile(path.join(WEB, 'sw.js'), path.join(DIST, 'sw.js'));
  copyFile(path.join(WEB, '.htaccess'), path.join(DIST, '.htaccess'));
  copyFile(path.join(WEB, 'favicon.ico'), path.join(DIST, 'favicon.ico'));

  const indexPath = path.join(DIST, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');

  html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, user-scalable=no" />'
  );

  html = html.replace('href="/favicon.ico"', 'href="favicon.ico"');
  html = html.replace('src="/_expo/', 'src="_expo/');

  const pwaTags = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="KGS Music Academy" />
    <link rel="apple-touch-icon" href="pwa-icons/icon-180.png" />
    <link rel="apple-touch-icon" sizes="152x152" href="pwa-icons/icon-152.png" />
    <link rel="apple-touch-icon" sizes="167x167" href="pwa-icons/icon-167.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="pwa-icons/icon-180.png" />
    <link rel="apple-touch-icon" sizes="192x192" href="pwa-icons/icon-192.png" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#1e40af" />
    <meta name="msapplication-TileColor" content="#1e40af" />
    <link rel="manifest" href="manifest.json" />
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('sw.js').catch(function() {});
        });
      }
    </script>`;

  html = html.replace('</head>', `${pwaTags}\n</head>`);

  fs.writeFileSync(indexPath, html);
  console.log('Updated index.html with PWA meta tags');
  console.log('\nPWA setup complete!');
}

main();
