import { LinkedRepresentation } from 'semantic-link';
import { StepCollection } from './stepCollection';

export interface OrganisationRepresentation extends LinkedRepresentation {
    steps?: StepCollection;
}
