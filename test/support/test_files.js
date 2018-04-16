const fs = require('fs');
const libxml = require("libxmljs");

const load_test_file = (index, cb) => {
  load_test_file_content(index, (content) => {
    const doc = libxml.parseXmlString(content, { noblanks: true, noent: true });
    cb(doc);
  });
}

const load_test_file_content = (index, cb) => {
  fs.readFile(__dirname + `/../files/${index}.xml`, 'utf8', function(err, data) {
    if (err) {
      throw err;
    }
    cb(data);
  });
};

export {
  load_test_file,
  load_test_file_content
};
