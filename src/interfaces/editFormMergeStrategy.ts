import { LinkedRepresentation } from 'semantic-link';
import { Tracked } from '../types/types';
import { DocumentRepresentation } from './document';
import { FormRepresentation } from './formRepresentation';
import { MergeOptions } from './mergeOptions';

export type EditFormMergeStrategy = {
    <U extends LinkedRepresentation = LinkedRepresentation,
        T extends U = Tracked<U>>
    (resource: T, document: T | DocumentRepresentation<T>, form: FormRepresentation, options?: MergeOptions): Promise<T | undefined>;
};



