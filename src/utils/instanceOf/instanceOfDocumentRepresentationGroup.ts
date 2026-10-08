import { DocumentRepresentation } from '../../interfaces/document';
import { instanceOfDocumentRepresentation } from './instanceOfDocumentRepresentation';

export function instanceOfDocumentRepresentationGroup(obj: unknown): obj is DocumentRepresentation[] {
    return Array.isArray(obj) && obj.every(value => instanceOfDocumentRepresentation(value));
}
