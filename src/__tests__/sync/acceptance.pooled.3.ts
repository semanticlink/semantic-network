import {
    resource as page1Feed,
    self as page1FeedUri,
} from '../fixtures/1/organisation/a65/step/ac5-page-1/step-page-1-feed';
import { resource as page1, self as pageFieldUri } from '../fixtures/3/organisation/a65/step/ac5-page-1';
import { resource as questionStep, self as questionStepUri } from '../fixtures/3/organisation/a65/step/92c-question';
import { resource as question } from '../fixtures/1/question/cf6-question';
import { resource as organisation } from '../fixtures/1/organisation/a65';
import { resource as choiceFeed } from '../fixtures/1/question/cf6/choice-feed';
import { resource as choice } from '../fixtures/1/choice/881-name';
import { self as questionFeedUri } from '../fixtures/3/organisation/a65/question-feed';
import { self as newQuestionUri } from '../fixtures/3/question/1-question';
import { self as stepFeedUri } from '../fixtures/3/organisation/a65/step-feed';
import { self as pageUri } from '../fixtures/3/organisation/a65/step/314-workflow';
import { self as pageFeedUri } from '../fixtures/3/organisation/a65/step/314-workflow/step-pages-feed';
import { LinkedRepresentation, LinkUtil, Uri } from 'semantic-link';
import anylogger from 'anylogger';
import { AxiosResponse } from 'axios';
import { fakeResponseFactory } from '../fixtures/3/fakeResponseFactory';
import { TrackedRepresentation } from '../../types/types';
import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { ResourceQueryOptions } from '../../interfaces/resourceQueryOptions';
import { LinkRelation } from '../../linkRelation';
import { uriMappingResolver } from '../../sync/uriMappingResolver';
import { PooledOrganisation } from '../domain/pooledOrganisation';
import { CustomLinkRelation } from '../domain/customLinkRelation';
import { HttpRequestFactory } from '../../http/httpRequestFactory';
import { assertThat } from 'mismatched';
import { StepRepresentation } from '../domain/interfaces/stepRepresentation';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import { bottleneckLoader } from '../../http/bottleneckLoader';
import { sync } from '../../sync/sync';
import { StepCollection } from '../domain/interfaces/stepCollection';
import { OrganisationRepresentation } from '../domain/interfaces/organisationRepresentation';
import { get as apiGet } from '../../representation/get';

const log = anylogger('Steps Test');

/**
 * Helper to create a {@link LinkedRepresentation} with {@link State}
 */
const makeHydratedResource = <T extends LinkedRepresentation>(document: T): T | TrackedRepresentation<T> =>
    SparseRepresentationFactory.make({ on: document });

describe('Organisation Steps with pooled (new) resources', () => {
    let options: ResourceQueryOptions;
    let resource: OrganisationRepresentation;

    /**
     * Fake POST factory for responding to create requests
     */
    const fakeCreateResponseFactory = <T extends LinkedRepresentation>(resource: T, data: Partial<T>): Partial<AxiosResponse<T>> | never => {
        const uri = LinkUtil.getUri(resource, LinkRelation.Self);
        log.debug('[Fake] POST %s %o', uri, data);

        function factory(uri: Uri | undefined) {
            switch (uri) {
                case stepFeedUri:
                    return pageUri;
                case pageFeedUri:
                    return pageFieldUri;
                case page1FeedUri:
                    return questionStepUri;
                case questionFeedUri:
                    return newQuestionUri;
                default:
                    console.log(`POST not found ${uri}`);
                    throw new Error(`POST not found ${uri}`);
            }
        }

        const location = factory(uri);
        log.debug('[Fake] POST location %s', location);
        return {
            headers: {
                status: '201',
                location,
                statusText: '[Fake] created',
            },
        };
    };

    const post = jest.fn();
    const get = jest.fn();
    const put = jest.fn();
    const del = jest.fn();

    HttpRequestFactory.Instance(
        { postFactory: post, getFactory: get, putFactory: put, deleteFactory: del, loader: bottleneckLoader }, true);


    function verifyMocks(getCount: number, postCount: number, putCount: number, deleteCount: number): void {
        assertThat({
            get: get.mock.calls.length,
            post: post.mock.calls.length,
            put: put.mock.calls.length,
            del: del.mock.calls.length,
        }).is({
            get: getCount,
            post: postCount,
            put: putCount,
            del: deleteCount,
        });
    }

    beforeEach(async () => {
        get.mockImplementation(fakeResponseFactory);
        post.mockImplementation(fakeCreateResponseFactory);
    });

    afterEach(() => {
        get.mockReset();
        post.mockReset();
        del.mockReset();
        put.mockReset();
    });

    describe('sync', () => {
        it('strategy on collection with item, new page and question, 1 created step', async () => {

            resource = makeHydratedResource(organisation);
            const steps = await apiGet<StepCollection>(
                resource,
                {
                    rel: CustomLinkRelation.Steps,
                    includeItems: false,
                });

            // assertThat(resource.steps).is(collectionIsEmpty);
            assertThat(steps?.items.length).is(0);
            assertThat(resource?.steps?.items.length).is(0);

            /*
             * This structure:
             *
             *  - add a new page
             *  - the new page is a question ('field') that already exists in the pooled collection
             */
            const aDocument = {
                ...page1,
                steps: {
                    ...page1Feed,
                    items: [{
                        ...questionStep,
                        field: {
                            ...question,
                            choices: {
                                ...choiceFeed,
                                items: [choice],
                            },
                        },
                    }],
                },
            } as unknown as StepRepresentation;

            const options: SyncOptions & PooledCollectionOptions = {
                resolver: uriMappingResolver,
                /*
                  * Organisation is the 'tenanted' home of the questions that live outside the lifecycle
                  * of the application workflow
                  */
                resourceResolver: new PooledOrganisation(makeHydratedResource(organisation)).resourceResolver,
            };

            await sync({
                resource: resource.steps as StepCollection,
                document: aDocument as unknown as StepCollection, // wrong typing
                options: {
                    batchSize: 1,
                    strategyBatchSize: 1,
                    ...options,
                },
                strategies: [
                    async syncResult => await sync({
                        ...syncResult,
                        rel: CustomLinkRelation.Steps,
                        strategies: [
                            async syncResult => await sync({
                                ...syncResult,
                                rel: CustomLinkRelation.Field
                            })]
                    })],
            });

            const postUris = [
                "https://api.example.com/organisation/a656927b0f/step",
                'https://api.example.com/organisation/a656927b0f/question',
                'https://api.example.com/organisation/a656927b0f/step/314ee4fc57/step',
            ];
            const actualPostUris = post.mock.calls.map(x => LinkUtil.getUri(x[0], LinkRelation.Self));

            const uris = [
                "https://api.example.com/organisation/a656927b0f/step",
                "https://api.example.com/organisation/a656927b0f/step/form/create",
                "https://api.example.com/organisation/a656927b0f/step/314ee4fc57",
                "https://api.example.com/organisation/a656927b0f/step/314ee4fc57/step",
                "https://api.example.com/organisation/a656927b0f/step/form/create",
                "https://api.example.com/organisation/a656927b0f/question",
                "https://api.example.com/question/form/create",
                "https://api.example.com/question/1",
                "https://api.example.com/question/1/choice",
                "https://api.example.com/choice/881e3ed135",
                "https://api.example.com/organisation/a656927b0f/step/ac50e024ff",
            ];
            const actualGetUris = get.mock.calls.map(x => LinkUtil.getUri(x[0], x[1]));

            assertThat(actualGetUris).is(uris);
            assertThat(actualPostUris).is(postUris);
            verifyMocks(11, 3, 0, 0);

        }, 100000);
    });
});
