import { DocumentRepresentation } from './document';
import { FormRepresentation } from './formRepresentation';
import { MergeOptions } from './mergeOptions';

export type CreateFormMergeStrategy = {
    (document: DocumentRepresentation, form: FormRepresentation, options?: MergeOptions): Promise<DocumentRepresentation | undefined>;
};

