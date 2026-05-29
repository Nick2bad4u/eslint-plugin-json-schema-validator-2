/**
 * JSON schema object accepted by the validator.
 */
export interface SchemaObject extends Record<string, unknown> {
    $async?: false;
    $id?: string;
    $schema?: string;
}
