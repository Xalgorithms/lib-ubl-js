'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.maybe_find_many_convert = exports.maybe_find_one_convert = exports.maybe_find_one_int = exports.maybe_find_one_tagged_text = exports.maybe_find_list_text = exports.maybe_find_one_text = exports.maybe_find_set_text = exports.maybe_find_set = exports.maybe_find_list = exports.maybe_find_many = exports.maybe_find_one = undefined;

var _lodash = require('lodash');

var _ = _interopRequireWildcard(_lodash);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function maybe_find_one(pn, xp) {
  var attrs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var nses = compose_namespaces(pn, xp);
  var rv = pn.get(xp, nses);
  if (rv) {
    attrs = _.reduce(attrs, function (o, k) {
      var attr = rv.attr(k);
      return attr ? _.set(o, k, attr.value()) : o;
    }, {});
  }
  return rv && fn ? fn(rv, attrs) : rv;
}

function maybe_find_many(pn, xp, fn) {
  var nses = compose_namespaces(pn, xp);
  var rv = pn.find(xp, nses);

  return rv && _.some(rv, function (r) {
    return !!r;
  }) && fn ? fn(rv) : rv;
}

function compose_namespaces(pn, xp) {
  if (_.includes(xp, ':')) {
    var root = pn.root ? pn.root() : pn;

    return _.reduce(root.namespaces(), function (o, n) {
      return _.merge(o, _defineProperty({}, n.prefix() || 'xmlns', n.href()));
    }, {});
  }
}

function maybe_find_list(pn, xps, fn) {
  var rv = _.reduce(xps, function (els, xp) {
    var nses = compose_namespaces(pn, xp);
    var n = pn.find(xp, nses);
    return n ? _.concat(els, n) : els;
  }, []);

  return rv && _.some(rv, function (r) {
    return !!r;
  }) && fn ? fn(rv) : rv;
}

function maybe_find_set(pn, xp_set) {
  var fn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  var rv = _.reduce(Object.keys(xp_set), function (o, k) {
    maybe_find_one(pn, xp_set[k], null, function (n) {
      o = _.merge(o, _defineProperty({}, k, n));
    });
    return o;
  }, {});

  return _.some(rv, function (r) {
    return !!r;
  }) && fn ? fn(rv) : rv;
}

function maybe_find_set_text(pn, xp_set) {
  var fn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  var rv = {};
  maybe_find_set(pn, xp_set, function (s) {
    rv = _.reduce(s, function (o, v, k) {
      return _.merge(o, _defineProperty({}, k, v.text()));
    }, {});
  });

  return _.some(rv, function (r) {
    return !!r;
  }) && fn ? fn(rv) : rv;
}

function maybe_find_one_text(pn, xp) {
  var attrs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  return maybe_find_one(pn, xp, attrs, function (n, attrs) {
    var rv = n.text();

    return fn ? fn(rv, attrs) : rv;
  });
}

function maybe_find_list_text(pn, xps) {
  var fn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  return maybe_find_list(pn, xps, function (ns) {
    var rv = _.map(ns, function (n) {
      return n.text();
    });

    return fn ? fn(rv) : rv;
  });
}

function maybe_find_one_tagged_text(pn, xp) {
  var fn = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  return maybe_find_one(pn, xp, ['languageID'], function (n, attrs) {
    var rv = _.tap({ text: n.text() }, function (o) {
      if (attrs.languageID) {
        o.language = attrs.languageID;
      }
    });

    return fn ? fn(rv) : rv;
  });
}

function maybe_find_one_int(pn, xp) {
  var attrs = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  return maybe_find_one(pn, xp, attrs, function (n, attrs) {
    var rv = _.toInteger(n.text());

    return fn ? fn(rv, attrs) : rv;
  });
}

function maybe_find_one_convert(sym, pn, xp) {
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  return maybe_find_one(pn, xp, null, function (n) {
    var rv = sym(n);

    return rv && _.some(rv, function (r) {
      return !!r;
    }) && fn ? fn(rv) : rv;
  });
}

function maybe_find_many_convert(sym, pn, xp) {
  var fn = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  return maybe_find_many(pn, xp, function (ns) {
    var rv = _.map(ns, function (n) {
      return sym(n);
    });

    return rv && _.some(rv, function (r) {
      return !!r;
    }) && fn ? fn(rv) : rv;
  });
}

exports.maybe_find_one = maybe_find_one;
exports.maybe_find_many = maybe_find_many;
exports.maybe_find_list = maybe_find_list;
exports.maybe_find_set = maybe_find_set;
exports.maybe_find_set_text = maybe_find_set_text;
exports.maybe_find_one_text = maybe_find_one_text;
exports.maybe_find_list_text = maybe_find_list_text;
exports.maybe_find_one_tagged_text = maybe_find_one_tagged_text;
exports.maybe_find_one_int = maybe_find_one_int;
exports.maybe_find_one_convert = maybe_find_one_convert;
exports.maybe_find_many_convert = maybe_find_many_convert;