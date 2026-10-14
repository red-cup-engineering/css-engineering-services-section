import { endpointSchemaFormControls, schemaFields, decodeSchemaFormEntries } from '@red-cup-engineering/web-page-tiling-engine/schema-form';
import { coincides } from '@red-cup-engineering/signcell/cell';

/** A form is a projection of a perceived operation, never a grant of its standing. */
export function operationInputFields(action) {
  const schema = action.input?.schema;
  const controls = endpointSchemaFormControls(schema);
  if (controls === undefined) return [{ name: 'input-body', kind: 'textarea', label: 'Input as JSON', value: '{}', required: true }];
  return schemaFields(controls).map(field => ({ ...field, name: `arg:${field.name}`,
    ...(action.scope !== undefined && field.name === action.locus ? { value: field.kind === 'select' ? JSON.stringify(action.scope) : action.scope } : {}),
  }));
}

/** Decode only the installed/perceived descriptor. Native dispatch still admits schema and authority. */
export function operationCommand(action, entries) {
  const params = new URLSearchParams(entries);
  let input;
  if (params.has('input-body')) input = JSON.parse(params.get('input-body'));
  else {
    const args = [...params].filter(([key]) => key.startsWith('arg:')).map(([key, value]) => [key.slice(4), value]);
    input = decodeSchemaFormEntries(action.input?.schema, args);
    if (input === undefined) throw new TypeError('This operation requires JSON input');
  }
  if (action.scope !== undefined && action.locus !== undefined) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Scoped input must be an object');
    if (Object.hasOwn(input, action.locus) && !coincides(input[action.locus], action.scope)) throw new TypeError(`Input must retain scope ${action.scope}`);
    input = { ...input, [action.locus]: action.scope };
  }
  return `${action.command} ${JSON.stringify(input)}`;
}
