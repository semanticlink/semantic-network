import {
    resource as page1Feed,
    self as page1FeedUri,
} from '../fixtures/1/organisation/a65/step/ac5-page-1/step-page-1-feed';
import { resource as page1 } from '../fixtures/1/organisation/a65/step/ac5-page-1';
import { resource as questionStep, self as questionStepUri } from '../fixtures/1/organisation/a65/step/92c-question';
import { resource as question } from '../fixtures/1/question/cf6-question';
import { resource as organisation } from '../fixtures/1/organisation/a65';
import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { fakeResponseFactory } from '../fixtures/1/fakeResponseFactory';
import anylogger from 'anylogger';
import { AxiosResponse } from 'axios';
import { Tracked } from '../../types/types';
import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { ResourceQueryOptions } from '../../interfaces/resourceQueryOptions';
import { StepRepresentation } from '../domain/interfaces/stepRepresentation';
import { LinkRelation } from '../../linkRelation';
import { Step } from '../domain/step';
import { uriMappingResolver } from '../../sync/uriMappingResolver';
import { HttpRequestFactory } from '../../http/httpRequestFactory';
import { assertThat } from 'mismatched';
import { PooledOrganisation } from '../domain/pooledOrganisation';
import { CustomLinkRelation } from '../domain/customLinkRelation';
import { PooledCollectionOptions } from '../../interfaces/pooledCollectionOptions';
import { bottleneckLoader } from '../../http/bottleneckLoader';
import { sync } from '../../sync/sync';

const log = anylogger('Steps Test');
/**
 * Helper to create a {@link LinkedRepresentation} with {@link State}
 */
const makeHydratedResource = <T extends LinkedRepresentation>(document: T): T | Tracked<T> =>
    SparseRepresentationFactory.make({ addStateOn: document  });

describe('Steps with pooled resources', () => {
    let options: ResourceQueryOptions;
    let resource: StepRepresentation;

    /**
     * Fake POST factory for responding to create requests
     */
    const fakeCreateResponseFactory = <T extends LinkedRepresentation>(resource: T, data: Partial<T>): Partial<AxiosResponse<T>> | never => {
        let location;
        const uri = LinkUtil.getUri(resource, LinkRelation.Self);
        log.debug('[Fake] POST %s %o', uri, data);
        switch (uri) {
            case page1FeedUri:
                location = questionStepUri;
                break;
            default:
                throw new Error(`POST not found ${uri}`);
        }
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

        /*
         * Load up a workflow, however, remove all the steps.
         *
         * Note: rather than less GET requests with a new data set, we'll remove the steps manually
         */
        resource = makeHydratedResource<StepRepresentation>(page1);
        await Step.loadStep(resource, options);

        // clear out all steps so that we can practice adding a new one
        if (resource.steps) {
            resource.steps.items = [];
        }
    });

    afterEach(() => {
        get.mockReset();
        put.mockReset();
        post.mockReset();
        del.mockReset();
    });


    describe('sync', () => {
        it('strategy with page and question, 1 created step with existing pooled question', async () => {
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
                        field: question,
                    }],
                },
            } as unknown as StepRepresentation;

            const resolvers: PooledCollectionOptions = {
                resolver: uriMappingResolver,
                /*
                  * Organisation is the 'tenanted' home of the questions that live outside the lifecycle
                  * of the application workflow
                  */
                resourceResolver: new PooledOrganisation(makeHydratedResource(organisation)).resourceResolver,
            };

            await sync({
                resource,
                document: aDocument,
                rel: CustomLinkRelation.Steps,
                options: { ...options, ...resolvers },
                strategies: [syncResult => sync({ ...syncResult, rel: CustomLinkRelation.Field })],
            });

            /*
             * Expect only that the 'step' is created (and not the 'question')
             */
            verifyMocks(12, 0, 0, 2);

            /* list of out the requests to aid understanding (rather than overwhelm!) */
            const uris = [
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ec7a386294'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/92c28454b7'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/b3666ee92c'],
                ['self', 'https://api.example.com/question/cf6c4b9c7f'],
                ['self', 'https://api.example.com/question/cf6c4b9c7f/choice'],
                ['self', 'https://api.example.com/choice/881e3ed135'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/92c28454b7'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/form/edit'],
                ['self', 'https://api.example.com/question/cf6c4b9c7f'],
                ['self', 'https://api.example.com/question/form/edit'],
            ];

            const actualUris = get.mock.calls.map(x => [x[1], LinkUtil.getUri(x[0], x[1])]);
            assertThat(actualUris).is(uris);
        });
    });
})
;
