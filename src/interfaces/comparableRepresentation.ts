import { LinkedRepresentation } from 'semantic-link';

export type ComparableRepresentation = LinkedRepresentation & { name?: string, id?: string }
