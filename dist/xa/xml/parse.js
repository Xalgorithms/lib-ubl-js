'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.load = exports.load_and_parse = exports.load_and_parse_url = undefined;

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var fs = require('fs');
var libxml = require("libxmljs");

var maybes = require('./maybes');

function load_and_parse_url(url, sym_root_xp, sym_make) {
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  fs.readFile(url, 'utf8', function (err, data) {
    if (err) {
      throw err;
    }
    load_and_parse(data, sym_root_xp, sym_make, fn = null);
  });
}

function load_and_parse(b, sym_root_xp, sym_make) {
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  load(b, function (doc) {
    try {
      maybes.maybe_find_one(doc, sym_root_xp(doc), null, function (n) {
        var rv = sym_make(n);

        return rv && _.some(rv, function (r) {
          return !!r;
        }) && fn ? fn(rv) : rv;
      });
    } catch (error) {
      console.log(error);
      // nothing
    }
  });
}

function load(b) {
  var fn = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  var doc = libxml.parseXmlString(b, { noblanks: true, noent: true });
  if (doc && fn) {
    fn(doc);
  }
}

exports.load_and_parse_url = load_and_parse_url;
exports.load_and_parse = load_and_parse;
exports.load = load;