const fs = require('fs');
const libxml = require("libxmljs");

const maybes = require('./maybes');

const _ = require('lodash');

function load_and_parse_url(url, sym_root_xp, sym_make, fn = null) {
  fs.readFile(url, 'utf8', function(err, data) {
    if (err) {
      throw err;
    }
    load_and_parse(data, sym_root_xp, sym_make, fn = null);
  });
}

function load_and_parse(b, sym_root_xp, sym_make, fn = null) {
  load(b, (doc) => {
    try {
      maybes.maybe_find_one(doc, sym_root_xp(doc), null, (n) => {
        const rv = sym_make(n);

        return (rv && _.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
      });
    }
    catch(error) {
      console.log(error);
      // nothing
    }
  });
}

function load(b, fn = null) {
  const doc = libxml.parseXmlString(b, { noblanks: true, noent: true });
  if (doc && fn) {
    fn(doc);
  }
}

module.exports = {
  load_and_parse_url,
  load_and_parse,
  load,
};