import {
  childOptions,
  CombineResults,
  HasError,
  isJsonSchema,
  isObject,
  NoErrors,
  validateSchema,
} from '../helpers';
import { Validator } from '../types';

export const validateDependencies: Validator = (schema, value, options) => {
  if (isJsonSchema(schema) && schema.dependencies && isObject(value)) {
    return CombineResults(
      Object.entries(schema.dependencies)
        .filter(([key]) => key in value)
        .map(([key, dependency]) => {
          if (Array.isArray(dependency)) {
            const missing = dependency.filter(item => !Object.keys(value).includes(item));
            return missing.length > 0
              ? HasError('dependencies', `${options.name}.${key}`, missing)
              : NoErrors;
          } else {
            return validateSchema(dependency, value, childOptions(key, options));
          }
        }, []),
    );
  }
  return NoErrors;
};