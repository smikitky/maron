const md = require('markdown-it')({ html: true });
const fs = require('fs').promises;
const path = require('path');

const main = async () => {
  const mdContent = await fs.readFile('./out/index.md', 'utf8');
  const html = md.render(mdContent);
  const withHeaders = `<!doctype html><html><link rel='stylesheet' href='style.css'>\n${html}</html>`;
  await fs.writeFile('out/index.html', withHeaders, 'utf8');
  await fs.copyFile(path.join(__dirname, 'styles.css'), './out');
  console.log('Wrote: out/index.html');
};

main();
