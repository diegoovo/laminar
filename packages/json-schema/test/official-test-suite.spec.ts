import { readdirSync, readFileSync } from 'fs';
import nock = require('nock');
import { join } from 'path';
import { Schema, validate } from '../src';

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

expect.extend({
  async toValidateAgainstSchema(data, schema) {
    const result = await validate(schema, data);
    const pass = result.valid;
    return {
      pass,
      message: pass
        ? () =>
            `Expected data:\n` +
            this.utils.printExpected(data) +
            `\nTo not be valid against schema:\n` +
            this.utils.printExpected(schema)
        : () =>
            `Expected data:\n` +
            this.utils.printExpected(data) +
            `\nTo be valid against schema:\n` +
            this.utils.printExpected(schema) +
            `but got errors:\n` +
            this.utils.printReceived(result.errors),
    };
  },
});

for (const testFolder of testFolders) {
  const testFiles = readdirSync(join(testSuiteFolder, testFolder))
    .filter(file => file.endsWith('.json'))
    .map<[string, Suite[]]>(file => [
      file,
      JSON.parse(String(readFileSync(join(testSuiteFolder, testFolder, file)))),
    ]);

  for (const [name, suites] of testFiles) {
    describe(`${testFolder} ${name}`, () => {
      for (const suite of suites) {
        const tests = suite.tests.map<[string, any, boolean]>(test => [
          test.description,
          test.data,
          test.valid,
        ]);

        it.each<[string, any, boolean]>(tests)(
          `Should test ${suite.description}: %s`,
          async (testName, data, expected) => {
            if (expected) {
              await (expect as any)(data).toValidateAgainstSchema(suite.schema);
            } else {
              await (expect as any)(data).not.toValidateAgainstSchema(suite.schema);
            }
          },
        );
      }
    });
  }
}
