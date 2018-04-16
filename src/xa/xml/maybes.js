import * as _ from 'lodash';

function maybe_find_one(pn, xp, attrs = [], fn = null) {
  let rv = pn.find(xp)[0];

  if (rv) {
    attrs = _.reduce(attrs, (o, k) => {
      const attr = rv.attr(k);
      return attr ? _.set(o, k, attr.value()) : o
    }, {})
  }
  if (rv && fn) {
    rv = fn(rv, attrs)
  }

  return rv;
}

function maybe_find_many(pn, xp, fn) {
  let rv = pn.find(xp);
  if (rv && _.some(rv, (r)=>!!r) && fn) {
    rv = fn(rv);
  }

  return rv;
}

function maybe_find_list(pn, xps, fn) {
  let rv = _.map(xps, (xp) => {
    pn.find(xp);
  });

  rv = _.compact(rv);

  if (rv && _.some(rv, (r)=>!!r) && fn) {
    rv = fn(rv);
  }

  return rv;
}

function maybe_find_set(pn, xp_set, fn = null) {
  let rv = _.reduce(Object.keys(xp_set), (o, k) => {
    maybe_find_one(pn, xp_set[k], null, (n) => {
      o = _.merge(o, {[k]: n});
    });
    return o;
  }, {});

  if (_.some(rv, (r)=>!!r) && fn) {
    rv = fn(rv);
  }

  return rv;
}

function maybe_find_set_text(pn, xp_set, fn = null) {
  let rv = {};
  maybe_find_set(pn, xp_set, (s) => {
    rv = _.reduce(s, (o, v, k) => {
      return _.merge(o, { [k]: v.text() });
    }, {});
  });

  if (_.some(rv, (r)=>!!r) && fn) {
    rv = fn(rv);
  }

  return rv;
}

function maybe_find_one_text(pn, xp, attrs = [], fn = null) {
  return maybe_find_one(pn, xp, attrs, (n, attrs) => {
    let rv = n.text();
    if (fn) {
      rv = fn(rv, attrs);
    }

    return rv;
  });
}

function maybe_find_list_text(pn, xps, fn = null) {
  return maybe_find_list(pn, xps, (ns) => {
    let rv = _.map(ns, (n) => n.text);

    if (fn) {
      rv = fn(rv);
    }

    return rv;
  });
}

function maybe_find_one_tagged_text(pn, xp, fn = null) {
  return maybe_find_one(pn, xp, ['languageID'], (n, attrs) => {
    let rv = _.tap({text: n.text()}, (o) => {
      if (attrs.languageID) {
        o.language = attrs.languageID;
      }
    });

    if (fn) {
      rv = fn(rv);
    }

    return rv;
  });
}

function maybe_find_one_int(pn, xp, attrs = [], fn = null) {
  return maybe_find_one(pn, xp, attrs, (n, attrs) => {
    let rv = _.toInteger(n.text())

    if (fn) {
      rv = fn(rv, attrs);
    }

    return rv;
  });
}

function maybe_find_one_convert(sym, pn, xp, fn = null) {
  return maybe_find_one(pn, xp, null, (n) => {
    let rv = sym(n);

    if (rv && _.some(rv, (r)=>!!r) && fn) {
      rv = fn(rv);
    }

    return rv;
  });
}

function maybe_find_many_convert(sym, pn, xp, fn = null) {
  return maybe_find_many(pn, xp, (ns) => {
    let rv = _.map(ns, (n) => sym(n));

    if (rv && _.some(rv, (r)=>!!r) && fn) {
      rv = fn(rv);
    }

    return rv;
  });
}

export {
  maybe_find_one,
  maybe_find_many,
  maybe_find_list,
  maybe_find_set,
  maybe_find_set_text,
  maybe_find_one_text,
  maybe_find_list_text,
  maybe_find_one_tagged_text,
  maybe_find_one_int,
  maybe_find_one_convert,
  maybe_find_many_convert,
};