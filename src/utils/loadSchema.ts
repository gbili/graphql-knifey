import { readFileSync, readdirSync } from 'fs';
import { gql } from 'graphql-tag';

export default function (absPathToSchemaFile?: string, schemaFileBasename?: string) {
  const pathBackToUserProject = ['utils', 'src', 'build', 'graphql-knifey', 'node_modules', '<user_project_dir>'].map(_ => '/').join('..');

  const dir = absPathToSchemaFile ? absPathToSchemaFile : `${__dirname}${pathBackToUserProject}src/graphql/schema/`;
  const baseSchemaFileName = schemaFileBasename ? schemaFileBasename : 'schema.graphql';
  const getFileContents = (dir: string, filename: string) => `${readFileSync(`${dir}${filename}`, 'utf-8')}`;
  const graphqlFilesOtherThanBaseFile = (f: string) => (f.substring(f.length - '.graphql'.length, f.length) === '.graphql' && f !== baseSchemaFileName)
  const baseSchemaStr = getFileContents(dir, baseSchemaFileName);

  const schemaFilenames = readdirSync(dir).filter(graphqlFilesOtherThanBaseFile);
  const documentSchemaStrings: string[] = schemaFilenames.map(filename => getFileContents(dir, filename));

  const schemaString = [
    baseSchemaStr,
    ...documentSchemaStrings
  ].join("\n");

  console.log("Schema: ", schemaString, `if you want to remove this output, remove console.log in ${__dirname + __filename}`);

  return gql`${schemaString}`;
}