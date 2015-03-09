var cheerio = require('cheerio');
var fs = require('fs');

$ = cheerio.load(fs.readFileSync('dev.html'));

$('script[src^=js]').each(function (i, el) {
  console.log(el.attribs.src);
});
