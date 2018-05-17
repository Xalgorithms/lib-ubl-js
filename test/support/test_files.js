// Copyright 2018 Hayk Pilosyan <hayk.pilos@gmail.com>

// Licensed under the Apache License, Version 2.0 (the "License"); you
// may not use this file except in compliance with the License. You may
// obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
// implied. See the License for the specific language governing
// permissions and limitations under the License.

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
