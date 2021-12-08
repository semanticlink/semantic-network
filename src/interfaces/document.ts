import { FormRepresentation } from './formRepresentation';
import { FormFieldName, FormFieldReturnType } from '../types/types';
import { LinkedRepresentation } from 'semantic-link';

export type PickFromForm<T = LinkedRepresentation extends LinkedRepresentation ? LinkedRepresentation : Partial<LinkedRepresentation>,
    TForm extends FormRepresentation = FormRepresentation> =
    {
        [K in FormFieldName<TForm>]?: FormFieldReturnType<T, K>;
    };

type IndexType = { [key: string]: unknown };

/**
 * A document should only have fields (index keys) that are specified in a form from the field names and populate the
 * values with types from the linked representation
 *
 * Document is a specific version for representations of {@link Pick} based on a {@link FormRepresentation}. However,
 */
export type DocumentRepresentation<T extends LinkedRepresentation | Partial<T> | Extract<T, T> = LinkedRepresentation> =
    (T & IndexType) |
    IndexType;
