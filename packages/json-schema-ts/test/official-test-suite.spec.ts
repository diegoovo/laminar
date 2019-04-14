import { Schema } from '@ovotech/json-schema';
import { readdirSync, readFileSync } from 'fs';
import nock = require('nock');
import { join } from 'path';
import { convert } from '../src';

interface Test {
  description: string;
  data: any;
  valid: boolean;
}

interface Suite {
  description: string;
  schema: Schema;
  tests: Test[];
}

const testSuiteFolder = join(__dirname, '../../../json-schema-test-suite');

nock('http://localhost:1234')
  .persist()
  .get('/integer.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/integer.json'))
  .get('/subSchemas.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/subSchemas.json'))
  .get('/folder/folderInteger.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/folder/folderInteger.json'))
  .get('/name.json')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/name.json'));

nock('http://json-schema.org')
  .persist()
  .get('/draft-04/schema')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/draft-4-schema.json'))
  .get('/draft-06/schema')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/draft-6-schema.json'))
  .get('/draft-07/schema')
  .replyWithFile(200, join(testSuiteFolder, 'remotes/draft-7-schema.json'));

const testFolders = ['draft4', 'draft6', 'draft7'];

for (const testFolder of testFolders) {
  const testFiles = readdirSync(join(testSuiteFolder, testFolder))
    .filter(file => file.endsWith('.json'))
    .map<[string, Suite[]]>(file => [
      file,
      JSON.parse(String(readFileSync(join(testSuiteFolder, testFolder, file)))),
    ]);

  for (const [name, suites] of testFiles) {
    describe(`${testFolder} ${name}`, () => {
      it.each<[string, Suite]>(suites.map(suite => [suite.description, suite]))(
        'Test %s',
        async (description, suite) => {
          expect(await convert(suite.schema)).toMatchSnapshot();
        },
      );
    });
  }
}
