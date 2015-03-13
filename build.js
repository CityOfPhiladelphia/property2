var cheerio = require('cheerio');
var fs = require('fs');
var minify = require('uglify-js').minify;

$ = cheerio.load(fs.readFileSync('dev.html'));

process.stdout.write('JS files sourced in dev.html... ');
var files = [];
$('script[src^=js]').each(function (i, el) {
  var file = $(el).attr('src');
  process.stdout.write(file + ' ');
  files.push(file);
});

process.stdout.write('\nConcatenating and minifying... ');
fs.writeFileSync('bundle.js', minify(files).code);
process.stdout.write('bundle.js\n');
