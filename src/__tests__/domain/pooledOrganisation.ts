import { LinkedRepresentation } from 'semantic-link';
import { PooledResource, PooledResourceResolver, RelName } from '../../sync/pooledResource';
import { CustomLinkRelation } from './customLinkRelation';
import { Question } from './question';


export class PooledOrganisation<T extends LinkedRepresentation> extends PooledResource<T> {

    protected makeResolvers(): Record<RelName, PooledResourceResolver> {
        return {
            [CustomLinkRelation.Question]: this.resolve(CustomLinkRelation.Questions, { pooledResolver: Question.syncPooled }),
            [CustomLinkRelation.Information]: this.resolve(CustomLinkRelation.Information, { readonly: true }),
        };
    }

}

