import { LinkedRepresentation } from 'semantic-link';
import { Tracked } from '../types/types';

export type ComparableRepresentation = LinkedRepresentation & { name?: string, id?: string }
