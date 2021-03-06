// Copyright 2018 Hayk Pilosyan <hayk.pilos@gmail.com>

// This file is part of Lichen, a functional component of an Internet
// of Rules (IoR).

// ACKNOWLEDGEMENTS
// Funds: Xalgorithms Foundation
// Collaborators: Don Kelly, Joseph Potvin and Bill Olders.

// Licensed under the Apache License, Version 2.0 (the "License"); you
// may not use this file except in compliance with the License. You may
// obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License.

const _ = require('lodash');

function maybe_find_one(pn, xp, attrs = [], fn = null) {
  const nses = compose_namespaces(pn, xp);
  const rv = pn.get(xp, nses);
  if (rv) {
    attrs = _.reduce(attrs, (o, k) => {
      const attr = rv.attr(k);
      return attr ? _.set(o, k, attr.value()) : o
    }, {})
  }
  return (rv && fn) ? fn(rv, attrs) : rv;
}

function maybe_find_many(pn, xp, fn) {
  const nses = compose_namespaces(pn, xp);
  const rv = pn.find(xp, nses);

  return (rv && _.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
}

function compose_namespaces(pn, xp) {
  if (_.includes(xp, ':')) {
    const root = pn.root ? pn.root() : pn;

    return _.reduce(root.namespaces(), (o, n) => {
      return _.merge(o, {[n.prefix() || 'xmlns']: n.href()})
    }, {});
  }
}

function maybe_find_list(pn, xps, fn) {
  const rv = _.reduce(xps, (els, xp) => {
    const nses = compose_namespaces(pn, xp);
    const n = pn.find(xp, nses);
    return n ? _.concat(els, n) : els;
  }, []);

  return (rv && _.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
}

function maybe_find_set(pn, xp_set, fn = null) {
  const rv = _.reduce(Object.keys(xp_set), (o, k) => {
    maybe_find_one(pn, xp_set[k], null, (n) => {
      o = _.merge(o, {[k]: n});
    });
    return o;
  }, {});

  return (_.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
}

function maybe_find_set_text(pn, xp_set, fn = null) {
  let rv = {};
  maybe_find_set(pn, xp_set, (s) => {
    rv = _.reduce(s, (o, v, k) => {
      return _.merge(o, { [k]: v.text() });
    }, {});
  });

  return (_.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
}

function maybe_find_one_text(pn, xp, attrs = [], fn = null) {
  return maybe_find_one(pn, xp, attrs, (n, attrs) => {
    const rv = n.text();

    return fn ? fn(rv, attrs) : rv;
  });
}

function maybe_find_list_text(pn, xps, fn = null) {
  return maybe_find_list(pn, xps, (ns) => {
    const rv = _.map(ns, (n) => n.text());

    return fn ? fn(rv) : rv;
  });
}

function maybe_find_one_tagged_text(pn, xp, fn = null) {
  return maybe_find_one(pn, xp, ['languageID'], (n, attrs) => {
    const rv = _.tap({text: n.text()}, (o) => {
      if (attrs.languageID) {
        o.language = attrs.languageID;
      }
    });

    return fn ? fn(rv) : rv;
  });
}

function maybe_find_one_int(pn, xp, attrs = [], fn = null) {
  return maybe_find_one(pn, xp, attrs, (n, attrs) => {
    const rv = _.toInteger(n.text())

    return fn ? fn(rv, attrs) : rv;
  });
}

function maybe_find_one_convert(sym, pn, xp, fn = null) {
  return maybe_find_one(pn, xp, null, (n) => {
    const rv = sym(n);

    return (rv && _.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
  });
}

function maybe_find_many_convert(sym, pn, xp, fn = null) {
  return maybe_find_many(pn, xp, (ns) => {
    const rv = _.map(ns, (n) => sym(n));

    return (rv && _.some(rv, (r)=>!!r) && fn) ? fn(rv) : rv;
  });
}

module.exports = {
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