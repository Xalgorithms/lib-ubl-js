const chai = require('chai');
const expect = chai.expect;
const should = chai.should();
const maybes = require('../../../src/xa/xml/maybes');
const load_test_file = require('../../support/test_files').load_test_file;
const _ = require('lodash');

describe('ubl-js', function () {
  describe('maybes', function () {
    it('should locate one child node', function () {
      const expectations = {
        'aa': 'a-aa0',
        'ac': 'a-ac',
        'aa/aab': 'a-aa0-aab',
        'aa/ac': 'a-aa0-ac',
      }
      load_test_file(0, (root_el) => {
        _.each(expectations, (id, xp) => {
          const el = maybes.maybe_find_one(root_el, xp);

          expect(el).to.not.be.null;
          expect(el.attr('id').value()).to.eql(id);

          const rv = maybes.maybe_find_one(root_el, xp, {}, (el) => {
            expect(el.attr('id').value()).to.eql(id);

            return el.attr('id').value();
          });

          expect(rv).to.eql(id);
        });
      });
    });

    it('should locate one child node and yield the text', function () {
      const expectations = {
        'ab': 'A-AB0',
        'ac': 'A-AC',
      }
      load_test_file(0, (root_el) => {
        _.each(expectations, (text, xp) => {
          const t = maybes.maybe_find_one_text(root_el, xp);

          expect(t).to.eql(text);
          const ln = t.length;

          const rv = maybes.maybe_find_one_text(root_el, xp, null, (ac) => {
            expect(ac).to.eql(text)
            return text.length;
          });

          expect(rv).to.eql(ln);
        });
      });
    });

    it('should locate one child node and yield the text converted to number', function () {
      const expectations = {
        'ad': 1,
        'ae': 1234,
      }
      load_test_file(0, (root_el) => {
        _.each(expectations, (i, xp) => {
          const n = maybes.maybe_find_one_int(root_el, xp);

          expect(n).to.eql(i);
          const sq = n * n;

          const rv = maybes.maybe_find_one_int(root_el, xp, null, (ac) => {
            expect(ac).to.eql(n);
            return ac * ac;
          });

          expect(rv).to.eql(sq);
        });
      });
    });

    function convert_el(el) {
      //convert to something which supplies :any?
      return [el.attr('id').value()];
    }

    it('should locate one child node and yield the conversion according to the function', function () {
      const expectations = {
        'aa': 'a-aa0',
        'ac': 'a-ac',
      }
      load_test_file(0, (root_el) => {
        _.each(expectations, (id, xp) => {
          const ac_id = maybes.maybe_find_one_convert(convert_el, root_el, xp);

          expect(ac_id).to.eql([id]);

          maybes.maybe_find_one_convert(convert_el, root_el, xp, (ac_id) => {
            expect(ac_id).to.eql([id]);
          });
        });
      });
    });

    function convert_empty(el) {
      //convert to something which supplies :any?
      return [];
    }

    it('should locate one child node and not yield the conversion if the conversion is empty', function () {
      const expectations = {
        'aa': 'a-aa0',
        'ac': 'a-ac',
      }
      load_test_file(0, (root_el) => {
        _.each(expectations, (id, xp) => {
          const ac_id = maybes.maybe_find_one_convert(convert_empty, root_el, xp);

          expect(ac_id).to.eql([]);

          let called = false;
          maybes.maybe_find_one_convert(convert_empty, root_el, xp, (ac_id) => {
            called = true;
          });

          expect(called).to.eql(false);
        });
      });
    });

    it('should locate one child node with attributes', function () {
      const expectations = {
        'aa': { 'x': 'aa-x', 'y': 'aa-y' },
        'ac': { 'x': 'ac-x', 'y': 'ac-y' },
      };

      load_test_file(0, (root_el) => {
        _.each(expectations, (ex_attrs, xp) => {
          maybes.maybe_find_one(root_el, xp, ['x', 'y'], (el, attrs) => {
            expect(attrs).to.eql(ex_attrs);
          });
        });
      });
    });

    it('should locate all matching children', function () {
      const expectations = {
        'aa/aaa': ['a-aa0-aaa0', 'a-aa0-aaa1'],
        'aa'    : ['a-aa0', 'a-aa1' ],
        'ab'    : ['a-ab0', 'a-ab1' ],
      };

      load_test_file(0, (root_el) => {
        _.each(expectations, (ids, xp) => {
          const els = maybes.maybe_find_many(root_el, xp);

          expect(els).to.not.be.empty;
          expect(els.map( (el) => el.attr('id').value() )).to.eql(ids);

          const ln = els.length;

          const rv = maybes.maybe_find_many(root_el, xp, (els) => {
            expect(els.map( (el) => el.attr('id').value() )).to.eql(ids);
            return els.length;
          });

          expect(rv).to.eql(ln);
        });
      });
    });

    it('should locate via a set of xpaths', function () {
      const expectations = {
        'aa':     { k: 'k0', id: 'a-aa0', },
        'ac':     { k: 'k1', id: 'a-ac', },
        'aa/aab': { k: 'k2', id: 'a-aa0-aab', },
        'aa/ac':  { k: 'k3', id: 'a-aa0-ac', },
      };

      load_test_file(0, (root_el) => {
        const set = _.reduce(Object.keys(expectations), (s, xp) => {
          return  _.merge(s, { [expectations[xp].k]: xp });
        }, {});

        const ex = _.reduce(Object.keys(expectations), (s, xp) => {
          return  _.merge(s, { [expectations[xp].k]: expectations[xp].id });
        }, {});

        const el_set = maybes.maybe_find_set(root_el, set);
        const ac = _.reduce(Object.keys(el_set), (o, k) => {
          return  _.merge(o, { [k]: el_set[k].attr('id').value() });
        }, {});

        expect(ac).to.eql(ex);

        maybes.maybe_find_set(root_el, set, (el_set) => {
          expect(el_set).to.not.be.empty;

          const ac = _.reduce(Object.keys(el_set), (o, k) => {
            return  _.merge(o, { [k]: el_set[k].attr('id').value() });
          }, {});
          expect(ac).to.eql(ex);
        });
      });
    });
  });
});