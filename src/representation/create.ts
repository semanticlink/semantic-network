import {
    CollectionRepresentation,
    instanceOfLinkedRepresentation,
    LinkedRepresentation,
    LinkType,
    LinkUtil,
    RelationshipType,
} from 'semantic-link';
import { Tracked } from '../types/types';
import { TrackedRepresentationFactory } from './trackedRepresentationFactory';
import { ResourceQueryOptions } from '../interfaces/resourceQueryOptions';
import { ResourceLinkOptions } from '../interfaces/resourceLinkOptions';
import { HttpRequestOptions } from '../interfaces/httpRequestOptions';
import { ResourceFactoryOptions } from '../interfaces/resourceFactoryOptions';
import { ResourceFetchOptions } from '../interfaces/resourceFetchOptions';
import anylogger from 'anylogger';
import { RepresentationUtil } from '../utils/representationUtil';
import { SparseRepresentationFactory } from './sparseRepresentationFactory';
import { LinkRelation } from '../linkRelation';
import { DocumentRepresentation } from '../interfaces/document';
import { ResourceUpdateOptions } from '../interfaces/resourceUpdateOptions';
import { ResourceMergeOptions } from '../interfaces/resourceAssignOptions';
import { defaultCreateFormStrategy } from './createFormMergeStrategy';
import { ApiUtil } from '../apiUtil';
import { instanceOfCollection } from '../utils/instanceOf/instanceOfCollection';
import { instanceOfForm } from '../utils/instanceOf/instanceOfForm';
import { ResourceCreateOptions } from '../interfaces/resourceCreateOptions';

const log = anylogger('create');

/**
 * A subset of the {@link ApiOptions} that are appropriate for a HTTP POST.
 *
 * @see ApiOptions
 */
export type ApiCreateOptions = ResourceCreateOptions &
    ResourceFactoryOptions &
    ResourceQueryOptions &
    ResourceLinkOptions &
    HttpRequestOptions &
    ResourceFetchOptions;

/**
 *
 * TODO: accept but don't require TrackedRepresentation interface
 *
 * @throws HttpRequestError
 */
export async function create<T extends LinkedRepresentation, TResult extends LinkedRepresentation = T>(
    document: DocumentRepresentation<T> | Tracked<T> | LinkType,
    options?: ApiCreateOptions): Promise<TResult | undefined> {

    if (!document) {
        log.debug('No document provided to create');
        return;
    }

    const {
        createContext,
        rel = LinkRelation.Self,
    } = { ...options };


    if (createContext) {
        if (instanceOfCollection(createContext)) {
            return await createCollectionItem(createContext, document as DocumentRepresentation, options) as TResult;
        } else {
            log.warn('option \'createContext\' options cannot be used outside of a collection, skipping');
            // fall through and keep processing
        }
    }

    if (!instanceOfLinkedRepresentation(document)) {
        const uri = LinkUtil.getUri(document as LinkType, rel);
        if (!uri) {
            log.warn('no uri found on rel \'%s\' on resource create', rel);
        }
        return SparseRepresentationFactory.make({ ...options, uri }) as TResult;
    }


    throw new Error('create options not satisfied');
}

/**
 *
 * @param resource
 * @param document
 * @param options
 * @throws HttpRequestError
 */
async function createCollectionItem<T extends LinkedRepresentation>(
    resource: CollectionRepresentation<T>,
    document: DocumentRepresentation<T>,
    options?: ResourceUpdateOptions &
        ResourceLinkOptions &
        HttpRequestOptions &
        ResourceMergeOptions &
        ResourceFetchOptions): Promise<T | undefined> {

    const {
        mergeStrategy = defaultCreateFormStrategy,
        formRel = [LinkRelation.CreateForm, LinkRelation.SearchForm] as RelationshipType,
        throwOnCreateError,
    } = { ...options };

    const form = await ApiUtil.get(resource as unknown as Tracked<T>, {
        ...options,
        rel: formRel,
    }) /*as FormRepresentation*/;

    if (instanceOfForm(form)) {
        try {
            const mergedDocument = await mergeStrategy(document, form, options);

            if (mergedDocument) {

                /*
                 * Choose where to get the uri from in cascading order:
                 *  - form with submit, use submit href on the form
                 *  - otherwise, Self link on the collection itself
                 */
                const hasSubmitRel = LinkUtil.matches(form, LinkRelation.Submit);
                const contextResource = hasSubmitRel ? form : resource;
                const rel = hasSubmitRel ? LinkRelation.Submit : LinkRelation.Self;

                const item = await TrackedRepresentationFactory.create(
                    contextResource as unknown as Tracked<T>,
                    mergedDocument,
                    { ...options, rel });

                // 201 will return an item compared with 200, 202
                if (item) {
                    RepresentationUtil.addItemToCollection(resource, item);
                    return item as T;
                } // drop through and return undefined

            } else {
                log.info('No create required %s', LinkUtil.getUri(resource, LinkRelation.Self));
            }
        } catch (e) {
            if (typeof e === 'string') {
                log.error('[Merge] unknown create error %s', e);
            } else {
                log.error('[Merge] unknown create error %o', e);
            }

            if (throwOnCreateError) {
                throw e;
            }
        }
    } else {
        log.info('Create not possible - resource has no form %s', LinkUtil.getUri(resource, LinkRelation.Self));
    }
}

