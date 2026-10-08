import { Uri } from 'semantic-link';

export function instanceOfUriListValue(obj: unknown): obj is Uri[] {
    return Array.isArray(obj) && obj.every(value => typeof value === 'string');
}
