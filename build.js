var cheerio = require('cheerio');
var fs = require('fs');
var minify = require('uglify-js').minify;

var devFile = 'dev.html';
var jsFile = 'bundle.js';
var prodFile = 'index.html';

process.stdout.write('Loading dev file... ');
var $ = cheerio.load(fs.readFileSync(devFile), {decodeEntities: false});
process.stdout.write(devFile);

process.stdout.write('\nCollecting JS files sourced in dev file...');
var files = [];
$('script[src^=js]').each(function (i, el) {
  var $el = $(el);
  var file = $el.attr('src');
  process.stdout.write(' ' + file);
  files.push(file);
  if (i === 0) $el.attr('src', jsFile);
  else $el.remove();
});

process.stdout.write('\nConcatenating and minifying JS... ');
fs.writeFileSync(jsFile, minify(files).code);
process.stdout.write(jsFile);

process.stdout.write('\nCopying dev file with replaced script tags... ');
fs.writeFileSync(prodFile, $.html().replace(/^ *\n/gm, ''), 'utf8');
process.stdout.write(prodFile + '\n');
