const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const files = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'sw.js'];

fs.mkdirSync(web, { recursive: true });
for (const file of files) fs.copyFileSync(path.join(root, file), path.join(web, file));
const dataSource = path.join(root, 'data');
const dataTarget = path.join(web, 'data');
if (fs.existsSync(dataSource)) fs.cpSync(dataSource, dataTarget, { recursive: true });
if (fs.existsSync(path.join(web, 'data', 'research'))) fs.rmSync(path.join(web, 'data', 'research'), { recursive: true, force: true });
fs.cpSync(path.join(root, 'icons'), path.join(web, 'icons'), { recursive: true });
const androidPublic = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');
if (fs.existsSync(path.join(root, 'android')) && fs.existsSync(androidPublic)) {
  if (fs.existsSync(path.join(androidPublic, 'data', 'research'))) fs.rmSync(path.join(androidPublic, 'data', 'research'), { recursive: true, force: true });
  fs.cpSync(web, androidPublic, { recursive: true, force: true });
  console.log(`Prepared Capacitor web assets in ${web} and synced Android assets in ${androidPublic}`);
} else {
  console.log(`Prepared Capacitor web assets in ${web}`);
}
