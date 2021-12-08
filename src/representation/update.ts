import { instanceOfUriList } from '../utils/instanceOf';
import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { ResourceUpdateOptions } from '../interfaces/ResourceUpdateOptions';
import anylogger from 'anylogger';
import { LinkRelation } from '../linkRelation';
import { defaultEditFormStrategy } from './editFormMergeStrategy';
import { get } from './get';
import { TrackedRepresentation } from '../types/types';
import { DocumentRepresentation } from '../interfaces/document';
import { TrackedRepresentationFactory } from './trackedRepresentationFactory';
import { ResourceLinkOptions } from '../interfaces/resourceLinkOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { ResourceMergeOptions } from '../interfaces/resourceAssignOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import { instanceOfForm } from '../utils/instanceOf/instanceOfForm';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';

const log = anylogger('Update');

/**
 *
 * TODO: accept but don't require TrackedRepresentation interface
 * @param resource
 * @param document
 * @param options
 */
export async function update<T extends LinkedRepresentation>(
    resource: T | TrackedRepresentation<T>,
    document: T | DocumentRepresentation<T>,
    options?: ResourceUpdateOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceMergeOptions &
        ResourceFetchOptions): Promise<T> {

    // PATCH
    if (instanceOfCollection(resource)) {
        if (!instanceOfUriList(document)) {
            console.log(resource, document, options);
            throw new Error('To update a collection, a document of type UriList must be supplied');
        }
        throw new Error('Update collection not implemented');
    }

    // PUT
    // update a single resource
    return updateSingleton(resource, document, options);
}

async function updateSingleton<T extends LinkedRepresentation>(
    resource: T | TrackedRepresentation<T>,
    document: T | DocumentRepresentation<T>,
    options?: ResourceUpdateOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceMergeOptions &
        ResourceFetchOptions): Promise<T> {

    if (!document) {
        log.debug('No document provided to update for resource %s', LinkUtil.getUri(resource, LinkRelation.Self));
        return resource;
    }

    const {
        mergeStrategy = defaultEditFormStrategy,
        formRel = LinkRelation.EditForm,
    } = { ...options };

    const form = await get(resource, { ...options, rel: formRel });

    if (instanceOfForm(form)) {
        try {
            const merged = await mergeStrategy(resource, document, form, options);

            if (merged) {
                await TrackedRepresentationFactory.update(resource, document, options);
            } else {
                log.info('No update required %s', LinkUtil.getUri(resource, LinkRelation.Self));
            }
        } catch (e) {
            if (typeof e === 'string') {
                log.error('Unknown (merge) update error %s', e);
            } else {
                log.error('Unknown (merge) update error %o', e);
            }
        }
    } else {
        log.info('Update not possible - resource has no edit form %s', LinkUtil.getUri(resource, LinkRelation.Self));
    }
    return resource;
}
