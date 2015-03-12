var cheerio = require('cheerio');
var fs = require('fs');
var minify = require('uglify-js').minify;

$ = cheerio.load(fs.readFileSync('dev.html'));

var files = [];

$('script[src^=js]').each(function (i, el) {
  files.push($(el).attr('src'));
});

console.log(files);

fs.writeFileSync('bundle.js', minify(files).code);
