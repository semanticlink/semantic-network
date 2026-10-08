import { DocumentRepresentation } from '../../interfaces/document';

export function instanceOfDocumentRepresentation(obj: unknown): obj is DocumentRepresentation {
    return obj !== null && typeof obj === 'object' && !Array.isArray(obj);
}
