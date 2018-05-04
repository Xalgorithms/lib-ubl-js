const fs = require("fs");
const chai = require('chai');
const expect = chai.expect;
const should = chai.should();
const libxml = require("libxmljs");

const invoice = require('../../../src/xa/ubl/invoice');

import * as _ from 'lodash';

describe('ubl-js', function () {
  describe('invoice', function () {
    let content = null;

    before(function() {
      content = {
        ubl0: fs.readFileSync('test/files/1.xml', 'utf8'),
        ubl1: fs.readFileSync('test/files/2.xml', 'utf8'),
        ubl2: fs.readFileSync('test/files/3.xml', 'utf8'),
        ubl3: fs.readFileSync('test/files/4.xml', 'utf8'),
        ubl4: fs.readFileSync('test/files/gas_tax_example.xml', 'utf8'),
        ubl5: fs.readFileSync('test/files/all_parties.xml', 'utf8'),
      }
    });

    it('should map namespaces to prefixes that appear in the XML', function () {
      const b = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:CAC="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:CBC="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:CCP="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2" xmlns:CEC="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2" xmlns:ns7="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:SDT="urn:oasis:names:specification:ubl:schema:xsd:SpecializedDatatypes-2" xmlns:UDT="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"></Invoice>';

      const expectations = {
        invoice: 'ns7',
        cac: 'CAC',
        cbc: 'CBC',
        ccp: 'CCP',
        cec: 'CEC',
        sdt: 'SDT',
        udt: 'UDT',
      };

      const doc = libxml.parseXmlString(b);

      _.each(expectations, (s, k) => {
        expect(invoice.ns(doc.root(), k)).to.eql(s);
      });
    });

    it('should quietly fail to parse non-UBL', function () {
      invoice.parse_url('test/files/0.xml', (rv) => {
        expect(rv).to.be.null;
      });
    });

    function with_expectations(expectations, fn) {
      _.each(expectations, (ex, k) => {
        let called = false;
        invoice.parse(content[k], (invoice) => {
          fn(invoice, ex, k);
          called = true;
        });

        expect(called).to.be.true;
      });
    }

    function with_expectations_from_files(tag, fn = null) {
      const exs = _.reduce(Object.keys(content), (o, k) => {
        const p = `test/files/expectations/${k}.${tag}.json`;
        const json = JSON.parse(fs.readFileSync(p, 'utf8'));
        return _.merge(o, {[k]: json});
      }, {});

      with_expectations(exs, fn);
    }

    function with_expectations_match(expectations, k) {
      with_expectations(expectations, (invoice, ex) => {
        console.log(ex);
        // expect(invoice[k]).to.eql(ex);
      });
    }

    describe('should read envelope', function () {

      it('and set document ids', function () {
        const expectations = {
          ubl0: {
            'document_id': '00012b_EA_TEST',
            'version_id': '2.0',
            'customization_id': 'urn:tradeshift.com:ubl-2.0-customizations:2010-06',
          },
          ubl1: {
            'document_id': '00009',
            'version_id': '2.0',
            'customization_id': 'urn:tradeshift.com:ubl-2.0-customizations:2010-06',
          },
          ubl2: {
            'document_id': 'FENDER-111111',
            'version_id': '2.1',
          },
          ubl3: {
            'document_id': 'TOSL108',
            'version_id': '2.1',
          },
          ubl4: {
            'document_id': '1234',
          },
        };
        with_expectations(expectations, (invoice, ex) => {
          expect(_.get(invoice, 'envelope.document_ids', {})).to.eql(ex);
        });
      });

      it('and set supplied dates', function () {
        const expectations = {
          ubl0: {
            'issued': '2016-11-15T01:23:04-04:00',
          },
          ubl1: {
            'issued': '2016-10-25',
          },
          ubl2: {
            'issued': '2016-01-02T01:23:46-04:00',
          },
          ubl3: {
            'issued': '2009-12-15',
            'period': {
              'starts': '2009-11-01',
              'ends': '2009-11-30',
            },
          },
          ubl4: {
            'issued': '2017-05-12',
          },
        };
        with_expectations(expectations, (invoice, ex) => {
          expect(_.get(invoice, 'envelope.issued')).to.eql(ex['issued']);
          expect(_.get(invoice, 'envelope.period')).to.eql(ex['period']);
        });
      });

      it('and set currency', function () {
        const expectations = {
          ubl0: {
            'currency': 'CAD',
          },
          ubl1: {
            'currency': 'USD',
          },
          ubl2: {
            'currency': 'USD',
          },
          ubl3: {
            'currency': 'EUR',
          },
          ubl4: {
            'currency': undefined,
          },
        };
        with_expectations(expectations, (invoice, ex) => {
          expect(_.get(invoice, 'envelope.currency')).to.eql(ex['currency']);
        });
      });

      it('and set parties', function () {
        with_expectations_from_files('parties', (invoice, ex, k) => {
          expect(ex).to.not.be.empty;

          _.each(ex, (v, k) => {
            // expect(_.get(invoice, `envelope.parties.${k}`)).to.eql(v);
          });
        });
      });

      it('should parse line items', function () {
        with_expectations_from_files('items', (invoice, ex, k) => {
          // check each item individually to make debugging easier
          const items = _.get(invoice, 'items', []);
          expect(items.length).to.eql(ex.length);

          _.each(items, (it, i) => {
            expect(it).to.eql(ex[i]);
          });
        });
      });
    });
  });
});
