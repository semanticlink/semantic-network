import { Representation } from '../../types/types';

export interface SyncResourceResolver {
    (resource: string | any): Representation;
}
