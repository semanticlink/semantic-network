import { CollectionRepresentation } from 'semantic-link';
import { FormRepresentation } from '../../../interfaces/formRepresentation';
import { StepRepresentation } from './stepRepresentation';

export interface StepCollection extends CollectionRepresentation<StepRepresentation> {
    createForm?: FormRepresentation;
}

