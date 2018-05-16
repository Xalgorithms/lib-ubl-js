const _ = require('lodash');
const parser = require('../xml/parse');
const maybes = require('../xml/maybes');

function ns(n, k) {
  const namespace_urns = {
    invoice: 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2',
    cac:     'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2',
    cbc:     'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2',
    ccp:     'urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2',
    cec:     'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2',
    sdt:     'urn:oasis:names:specification:ubl:schema:xsd:SpecializedDatatypes-2',
    udt:     'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2',
  };

  let nses = _.reduce(n.namespaces(), (o, ns) => {
    return _.merge(o, {[ns.href()]: ns.prefix()})
  }, {});

  nses = _.reduce(namespace_urns, (o, ns_k, k) => {
    return nses[ns_k] ? _.merge(o, { [k]: _.last(nses[ns_k].split(':')) }) : o;
  }, {});

  return nses[k];
}

function parse_url(url, fn = null) {
  parser.load_and_parse_url(url, root_xp, make_invoice, fn)
}

function parse(b, fn = null) {
  parser.load_and_parse(b, root_xp, make_invoice, fn)
}

function root_xp(doc) {
  const n = ns(doc, 'invoice') || 'xmlns';

  return `/${n}:Invoice`;
}

function make_invoice(el) {
  return _.tap({}, (o) => {
    o.envelope = extract_envelope(el);
    o.items = extract_items(el);
  });
}

function extract_envelope(el) {
  return _.tap({}, (o) => {
    const date_set = {
      'date': `${ns(el, 'cbc')}:IssueDate`,
      'time': `${ns(el, 'cbc')}:IssueTime`,
    };
    const period_set = {
      'starts': `${ns(el, 'cac')}:InvoicePeriod/${ns(el, 'cbc')}:StartDate`,
      'ends': `${ns(el, 'cac')}:InvoicePeriod/${ns(el, 'cbc')}:EndDate`,
    };

    o.document_ids = extract_document_ids(el);

    maybes.maybe_find_set_text(el, date_set, (vals) => {
      o.issued = `${vals.date}` + (vals.time ? `T${vals.time}` : '');
    });

    maybes.maybe_find_set_text(el, period_set, (vals) => {
      o.period = vals;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:DocumentCurrencyCode`, null, (text) => {
      o.currency = text;
    });

    maybe_find_parties(el, (parties) => {
      o.parties = parties;
    });
  });
}

function extract_items(el) {
  return maybes.maybe_find_many_convert(extract_item, el, `${ns(el, 'cac')}:InvoiceLine`);
}

function extract_item(el) {
  return _.tap({}, (o) => {
    maybe_find_identifier(el, '.', (id) => {
      o.id = id;
    })
    maybe_find_amount(el, `${ns(el, 'cbc')}:LineExtensionAmount`, (price) => {
      o.total_price = price;
    });
    maybe_find_amount(el, `${ns(el, 'cac')}:ItemPriceExtension/${ns(el, 'cbc')}:Amount`, (price) => {
      o.price = price;
    });
    maybe_find_quantity(el, `${ns(el, 'cbc')}:InvoicedQuantity`, (quantity) => {
      o.quantity = quantity;
    });
    maybe_find_pricing(el, `${ns(el, 'cac')}:Price`, (pricing) => {
      o.pricing = pricing;
    });
  });
}

function maybe_find_parties(el, fn = null) {
  const parties_set = {
    'supplier': `${ns(el, 'cac')}:AccountingSupplierParty/${ns(el, 'cac')}:Party`,
    'customer': `${ns(el, 'cac')}:AccountingCustomerParty/${ns(el, 'cac')}:Party`,
    'payee'   : `${ns(el, 'cac')}:PayeeParty`,
    'buyer'   : `${ns(el, 'cac')}:BuyerCustomerParty/${ns(el, 'cac')}:Party`,
    'seller'  : `${ns(el, 'cac')}:SellerSupplierParty/${ns(el, 'cac')}:Party`,
    'tax'     : `${ns(el, 'cac')}:TaxRepresentativeParty`,
  };

  maybes.maybe_find_set(el, parties_set, (vals) => {
    const res = _.reduce(vals, (parties, el, k) => {
      return _.merge(parties, {[k]: extract_party(el)});
    }, {});

    fn(res);
  });
}

function maybe_find_identifier(pel, xp, fn = null) {
  maybes.maybe_find_one(pel, xp, null, (el) => {
    const yv = extract_identifier(el);

    if (_.some(yv, (y)=>!!y)) {
      fn(yv);
    }
  });
}

function maybe_find_address(pel, xp, fn = null) {
  maybes.maybe_find_one(pel, xp, null, (el) => {
    fn(extract_address(el));
  });
}

function maybe_find_location(pel, xp, fn = null) {
  maybes.maybe_find_one(pel, xp, null, (el) => {
    fn( extract_location(el) );
  });
}

function extract_code(el) {
  /*
    code has attrs:
    languageID, listAgencyID, listAgencyName, listID, listName, listSchemeURI, listURI, listVersionID, listVersionID
    and a value that should become:
    { language_id, agency_ud, agency_name, list_id, list_name, scheme_uri, list_uri, version_id, name, value }
  */
  return _.tap({}, (o) => {
    const attrs_kmap = {
      'languageID'     : 'language_id',
      'listAgencyID'   : 'agency_id',
      'listAgencyName' : 'agency_name',
      'listID'         : 'list_id',
      'listName'       : 'list_name',
      'listSchemeURI'  : 'scheme_uri',
      'listURI'        : 'list_uri',
      'listVersionID'  : 'version_id',
      'name'           : 'name',
    };
    maybe_find_text_with_mapped_attrs(el, `${ns(el, 'cbc')}:ID`, attrs_kmap, (vals) => {
      _.merge(o, vals);
    });
  });
}

function maybe_find_text_with_mapped_attrs(el, xp, attrs_kmap, fn) {
  return maybes.maybe_find_one_text(el, xp, Object.keys(attrs_kmap), (text, vals) => {
    fn( _.merge( {value: text}, transpose_keys(attrs_kmap, vals) ) );
  });
}

function maybe_find_code(el, xp, fn = null) {
  /*
    code has attrs:
    languageID, listAgencyID, listAgencyName, listID, listName, listSchemeURI, listURI, listVersionID, listVersionID
    and a value that should become:
    { language_id, agency_ud, agency_name, list_id, list_name, scheme_uri, list_uri, version_id, name, value }
  */

  const attrs_kmap = {
    'languageID'     : 'language_id',
    'listAgencyID'   : 'agency_id',
    'listAgencyName' : 'agency_name',
    'listID'         : 'list_id',
    'listName'       : 'list_name',
    'listSchemeURI'  : 'scheme_uri',
    'listURI'        : 'list_uri',
    'listVersionID'  : 'version_id',
    'name'           : 'name',
  };
  maybe_find_text_with_mapped_attrs(el, xp, attrs_kmap, fn);
}

function maybe_find_country(pel, fn = null) {
  maybes.maybe_find_one(pel, `${ns(pel, 'cac')}:Country`, null, (el) => {
    fn( extract_country(el) );
  });
}

function maybe_find_subentity(el, fn = null) {
  const yv = _.tap({}, (o) => {
    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:CountrySubentity`, null, (text) => {
      o.name = text;
    });
    maybe_find_code(el, `${ns(el, 'cbc')}:CountrySubentityCode`, (code) => {
      o.code = code;
    });
  });

  if (!_.isEmpty(yv)) {
    fn(yv);
  }
}

function maybe_find_amount(el, xp, fn = null) {
  const attrs_kmap = {
    'currencyID': 'currency_code',
  };

  maybe_find_text_with_mapped_attrs(el, xp, attrs_kmap, fn);
}

function maybe_find_quantity(el, xp, fn = null) {
  const attrs_kmap = {
    'unitCode': 'unit',
  }

  maybe_find_text_with_mapped_attrs(el, xp, attrs_kmap, fn);
}

function maybe_find_pricing(pel, xp, fn = null) {
  let o = {};

  maybes.maybe_find_one(pel, xp, null, (el) => {
    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:OrderableUnitFactorRate`, null, (text) => {
      o.orderable_factor = text;
    });
    maybe_find_amount(el, `${ns(el, 'cbc')}:PriceAmount`, (price) => {
      o.price = price;
    });
    maybe_find_quantity(el, `${ns(el, 'cbc')}:BaseQuantity`, (quantity) => {
      o.quantity = quantity;
    });
  });

  if (!_.isEmpty(o)) {
    fn(o);
  }
}

function extract_document_ids(el) {
  return _.tap({}, (o) => {
    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:ID`, null, (text) => {
      o.document_id = text;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:UBLVersionID`, null, (text) => {
      o.version_id = text;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:CustomizationID`, null, (text) => {
      o.customization_id = text;
    });
  });
}

function extract_identifier(el) {
  /*
    identifier has attrs:
    schemeAgencyID, schemeAgencyName, schemeDataURI, schemeVersionID, schemeID, schemeName, schemeURI
    and a value that should become:
    { agency_id, agency_name, data_uri, version_id, id, name, uri }
  */
  return _.tap({}, (o) => {
    const attrs_kmap = {
      'schemeAgencyID'   : 'agency_id',
      'schemeAgencyName' : 'agency_name',
      'schemeDataURI'    : 'data_uri',
      'schemeVersionID'  : 'version_id',
      'schemeID'         : 'id',
      'schemeURI'        : 'uri',
      'schemeName'       : 'name',
    };

    maybe_find_text_with_mapped_attrs(el, `${ns(el, 'cbc')}:ID`, attrs_kmap, (vals) => {
      _.merge(o, vals);
    });
  });
}

function extract_party(el) {
  return _.tap({}, (o) => {
    maybe_find_identifier(el, `${ns(el, 'cac')}:PartyIdentification`, (id) => {
      o.id = id;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cac')}:PartyName/${ns(el, 'cbc')}:Name`, null, (text) => {
      o.name = text;
    });

    maybe_find_address(el, `${ns(el, 'cac')}:PostalAddress`, (address) => {
      o.address = address;
    });

    maybe_find_location(el, `${ns(el, 'cac')}:PhysicalLocation`, (location) => {
      o.location = location;
    });

    maybes.maybe_find_one(el, `${ns(el, 'cac')}:Person`, null, (el) => {
      o.person = extract_person(el);
    });

    maybes.maybe_find_one(el, `${ns(el, 'cac')}:Contact`, null, (el) => {
      o.contact = extract_contact(el);
    });

    maybe_find_code(el, `${ns(el, 'cbc')}:IndustryClassificationCode`, (code) => {
      o.industry = code;
    });
  });
}

function extract_address(el) {
  return _.tap({}, (o) => {
    maybe_find_code(el, `${ns(el, 'cbc')}:AddressFormatCode`, (code) => {
      o.format = code;
    });

    const address_list = [
      `${ns(el, 'cbc')}:StreetName`,
      `${ns(el, 'cbc')}:AdditionalStreetName`,
    ];

    maybes.maybe_find_list_text(el, address_list, (texts) => {
      const streets = _.filter(texts, (t) => _.size(t));
      if (streets.length) {
        o.street = streets;
      }
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:BuildingNumber`, null, (text) => {
      o.number = text;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:PostalZone`, null, (text) => {
      o.code = text;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:CityName`, null, (text) => {
      o.city = text;
    });

    maybe_find_subentity(el, (e) => {
      o.subentity = e;
    });

    maybe_find_country(el, (country) => {
      o.country = country;
    });
  });
}

function extract_location(el) {
  return _.tap({}, (o) => {
    maybe_find_identifier(el, ".", (id) => {
      o.id = id;
    })
    maybe_find_address(el, `${ns(el, 'cac')}:Address`, (address) => {
      o.address = address;
    });
  });
}

function extract_country(el) {
  return _.tap({}, (o) => {
    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:Name`, null, (text) => {
      o.name = text;
    });
    maybe_find_code(el, `${ns(el, 'cbc')}:IdentificationCode`, (code) => {
      o.code = code;
    });
  });
}

function extract_person(el) {
  return _.tap({}, (o) => {
    const names_list = [
      `${ns(el, 'cbc')}:FirstName`,
      `${ns(el, 'cbc')}:MiddleName`,
      `${ns(el, 'cbc')}:OtherName`,
    ];

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:FamilyName`, null, (text) => {
      o.surname = text;
    });

    maybes.maybe_find_list_text(el, names_list, (texts) => {
      const names = _.filter(texts, (t) => _.size(t));
      if (names.length) {
        o.names = names;
      }
    });
  });
}

function extract_contact(el) {
  return _.tap({}, (o) => {
    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:Name`, null, (text) => {
      o.name = text;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:Telephone`, null, (text) => {
      o.telephone = text;
    });

    maybes.maybe_find_one_text(el, `${ns(el, 'cbc')}:ElectronicMail`, null, (text) => {
      o.email = text;
    });

    maybe_find_identifier(el, '.', (id) => {
      o.id = id;
    });
  });
}

function transpose_keys(kmap, vals) {
  return _.reduce(vals, (o, v, k) => {
    return kmap[k] ? _.merge(o, {[kmap[k]]: v}) : o;
  }, {});
}

export {
  ns,
  parse_url,
  parse,
}