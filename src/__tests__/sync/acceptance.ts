import { resource as workflow } from '../fixtures/1/organisation/a65/step/314-workflow';
import { resource as workflowPagesFeed } from '../fixtures/1/organisation/a65/step/314-workflow/step-pages-feed';
import { resource as page1Feed } from '../fixtures/1/organisation/a65/step/ac5-page-1/step-page-1-feed';
import { resource as page1 } from '../fixtures/1/organisation/a65/step/ac5-page-1';
import { resource as heading } from '../fixtures/1/organisation/a65/step/ec7-heading';
import { resource as questionStep } from '../fixtures/1/organisation/a65/step/92c-question';
import { resource as question } from '../fixtures/1/question/cf6-question';
import { resource as choicesFeed } from '../fixtures/1/question/cf6/choice-feed';
import { resource as choice } from '../fixtures/1/choice/881-name';
import { resource as infoStep } from '../fixtures/1/organisation/a65/step/b36-info';
import { resource as info } from '../fixtures/1/organisation/a65/information/101';
import { LinkedRepresentation, LinkUtil } from 'semantic-link';
import { fakeResponseFactory } from '../fixtures/1/fakeResponseFactory';
import { SparseRepresentationFactory } from '../../representation/sparseRepresentationFactory';
import { Tracked } from '../../types/types';
import { LinkRelation } from '../../linkRelation';
import { TrackedRepresentationUtil } from '../../utils/trackedRepresentationUtil';
import { Status } from '../../representation/status';
import { StepRepresentation } from '../domain/interfaces/stepRepresentation';
import { CustomLinkRelation } from '../domain/customLinkRelation';
import { Step } from '../domain/step';
import { ApiOptions } from '../../interfaces/apiOptions';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import { uriMappingResolver } from '../../sync/uriMappingResolver';
import { assertThat } from 'mismatched';
import { sync } from '../../sync/sync';


/**
 * Helper to create a {@link LinkedRepresentation} with {@link State}
 */
const makeFromFixture = <T extends LinkedRepresentation>(document: T): Tracked<T> =>
    // note: clone the document for multiple uses
    SparseRepresentationFactory.make({ addStateOn: { ...document } });

describe('Steps', () => {
    it('helper with json fixture returns object with state attached', () => {
        const step = makeFromFixture(workflow as StepRepresentation);
        expect(step).toBeDefined();
        expect(TrackedRepresentationUtil.getState(step).status).toStrictEqual(Status.hydrated);
    });
    describe('root', () => {
        let resource: Tracked<StepRepresentation>;

        /*
          * Mock factories will swap resources based on the uri requested and provide a
          * mock for testing expectations against. These are passed through {@link HttpRequestOptions}
          * although we could also factory up a {@link HttpRequest} with these.
          */

        const get = jest.fn();
        const put = jest.fn();
        const del = jest.fn();
        const post = jest.fn();

        const options: ApiOptions = { getFactory: get, putFactory: put, deleteFactory: del, postFactory: post };

        beforeEach(async () => {
            get.mockImplementation(fakeResponseFactory);
            put.mockResolvedValue({});
            del.mockResolvedValue({});
            post.mockResolvedValue({});

            resource = makeFromFixture({ ...workflow as StepRepresentation });
            await Step.loadStep(resource, options);
        });

        afterEach(async () => {
            // resource = {} as TracStepRepresentation;
            get.mockRestore();
            put.mockRestore();
            del.mockRestore();
            put.mockRestore();
        });

        it('load, defined', () => {
            expect(resource.steps).toBeDefined();
        });

        it('load, one child', () => {
            expect(resource.steps?.items.length).toStrictEqual(1);
        });

        it('load, recursively', () => {

            const calls = [
                ['self', 'https://api.example.com/organisation/a656927b0f/step/314ee4fc57/step'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/ec7a386294'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/92c28454b7'],
                ['self', 'https://api.example.com/organisation/a656927b0f/step/b3666ee92c'],
                ['self', 'https://api.example.com/question/cf6c4b9c7f'],
                ['self', 'https://api.example.com/question/cf6c4b9c7f/choice'],
                ['self', 'https://api.example.com/choice/881e3ed135'],
            ];

            const actualCalls = get.mock.calls.map((x: any) => [x[1], LinkUtil.getUri(x[0], x[1])]);
            assertThat(actualCalls).is(calls);
        });

        describe('sync, first level', () => {
            describe('first level, workflow', () => {
                it('canonical', async () => {
                    await sync({
                        resource,
                        document: { ...workflow } as LinkedRepresentation,
                        rel: LinkRelation.Canonical,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                    });

                    expect(put).toHaveBeenCalledTimes(0);
                });
                it('sync, 1 change', async () => {
                    const aDocument = {
                        ...workflow,
                        description: '',
                        name: 'Picker1',
                    };
                    await sync({
                        resource,
                        document: aDocument as StepRepresentation,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                    });

                    expect(put).toHaveBeenCalledTimes(1);
                });

                it('sync, strategy with Canonical not exists, no failure', async () => {
                    await sync({
                        resource,
                        document: { ...workflow } as LinkedRepresentation,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                        strategies: [
                            syncResult => sync({ ...syncResult, rel: LinkRelation.Canonical }),
                        ],
                    });

                    expect(put).toHaveBeenCalledTimes(0);
                });
            });

            describe('second level, page', () => {
                it('sync, strategy with page, no change', async () => {
                    const aDocument = {
                        ...workflow,
                        steps: {
                            ...page1Feed,
                            items: [
                                page1,
                            ],
                        },
                    };
                    await sync({
                        resource,
                        document: aDocument as LinkedRepresentation,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                        strategies: [
                            syncResult => sync({ ...syncResult, rel: CustomLinkRelation.Steps }),
                        ],
                    });

                    expect(put).toHaveBeenCalledTimes(0);
                });

                it('sync, strategy with page only, update 1 change', async () => {
                    /*
                     * jest spies don't work. Save a copy to reinstate at the bottom
                     */
                    const { name } = page1;

                    const aDocument = {
                        ...workflow,
                        steps: {
                            ...page1Feed,
                            items: [{
                                ...page1,
                                name: 'Something else',
                            }],
                        },
                    };
                    await sync({
                        resource: { ...resource } as LinkedRepresentation,
                        document: aDocument as StepRepresentation,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                        strategies: [
                            syncResult => sync({ ...syncResult, rel: CustomLinkRelation.Steps }),
                        ],
                    });

                    expect(put).toHaveBeenCalledTimes(1);

                    const item = resource.steps?.items[0];
                    if (item) {
                        item.name = name;
                    }
                });
            });

            describe('third level, items', () => {
                it('sync, strategy with page and heading, no change', async () => {
                    const aDocument = {
                        ...workflow,
                        steps: {
                            ...workflowPagesFeed,
                            items: [
                                {
                                    ...page1,
                                    steps: {
                                        ...page1Feed,
                                        items: [
                                            heading,
                                            {
                                                ...questionStep,
                                                field: {
                                                    ...question,
                                                    choices: {
                                                        ...choicesFeed,
                                                        items: [
                                                            choice,
                                                        ],
                                                    },
                                                },
                                            },
                                            {
                                                ...infoStep,
                                                field: info,
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    } as unknown as StepRepresentation;
                    await sync({
                        resource,
                        document: aDocument,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                        strategies: [
                            syncResult => sync({
                                ...syncResult,
                                rel: CustomLinkRelation.Steps,
                                strategies: [
                                    syncResult => sync({ ...syncResult, rel: CustomLinkRelation.Steps }),
                                ],
                            }),
                        ],
                    });

                    expect(put).toHaveBeenCalledTimes(0);
                });
                it('sync, strategy with page and heading, 1 deletion', async () => {
                    const aDocument = {
                        ...workflow,
                        steps: {
                            ...workflowPagesFeed,
                            items: [
                                {
                                    ...page1,
                                    steps: {
                                        ...page1Feed,
                                        items: [
                                            // heading, deleted
                                            questionStep,
                                        ],
                                    },
                                },
                            ],
                        },
                    } as unknown as StepRepresentation;

                    await sync({
                        resource,
                        document: aDocument,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                        strategies: [
                            syncResult => sync({
                                ...syncResult,
                                rel: CustomLinkRelation.Steps,
                                strategies: [
                                    syncResult => sync({ ...syncResult, rel: CustomLinkRelation.Steps }),
                                ],
                            }),
                        ],
                    });

                    expect(put).toHaveBeenCalledTimes(0);
                    expect(del).toHaveBeenCalledTimes(2);
                });

                it('sync, strategy with page and heading, update 1 change', async () => {
                    /*
                     * jest spies don't work. Save a copy to reinstate at the bottom
                     */
                    const { name } = heading;
                    const { name: questionName } = questionStep;

                    const aDocument = {
                        ...workflow,
                        steps: {
                            ...workflowPagesFeed,
                            items: [
                                {
                                    ...page1,
                                    steps: {
                                        ...page1Feed,
                                        items: [
                                            {
                                                ...heading,
                                                name: 'Heading changed',
                                            },
                                            {
                                                ...questionStep,
                                                name: 'Title changed',
                                                field: {
                                                    ...question,
                                                    choices: {
                                                        ...choicesFeed,
                                                        items: [
                                                            choice,
                                                        ],
                                                    },
                                                },
                                            },
                                            {
                                                ...infoStep,
                                                field: info,
                                            },
                                        ],
                                    },
                                },
                            ],
                        },
                    } as unknown as StepRepresentation;
                    await sync({
                        resource,
                        document: aDocument,
                        options: { ...options, resolver: uriMappingResolver } as SyncOptions,
                        strategies: [
                            syncResult => sync({
                                ...syncResult,
                                rel: CustomLinkRelation.Steps,
                                strategies: [
                                    syncResult => sync({
                                        ...syncResult,
                                        rel: CustomLinkRelation.Steps,
                                        strategies: [
                                            syncResult => sync({
                                                ...syncResult,
                                                rel: CustomLinkRelation.Field,
                                                strategies: [
                                                    syncResult => sync({
                                                        ...syncResult,
                                                        rel: CustomLinkRelation.Choices,
                                                    })],
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    });

                    expect(put).toHaveBeenCalledTimes(2);

                    const firstItem = resource.steps?.items[0].steps?.items[0];
                    if (firstItem) {
                        firstItem.name = name;
                    }
                    const secondItem = resource.steps?.items[0].steps?.items[1];
                    if (secondItem) {
                        secondItem.name = questionName;
                    }
                });
            });
        });
    });
});
