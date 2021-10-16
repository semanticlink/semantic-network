import { assertThat, match } from 'mismatched';
import { noopResolver, noopResourceResolver, ResourceMergeFactory } from '../representation/resourceMergeFactory';
import { FormRepresentation } from '../interfaces/formRepresentation';
import { DocumentRepresentation } from '../interfaces/document';
import { CollectionRepresentation, LinkedRepresentation } from 'semantic-link';
import { ResourceResolver } from '../interfaces/resourceResolver';
import { FormUtil } from '../utils/formUtil';
import { FieldType } from '../types/formTypes';
import { LinkRelation } from '../linkRelation';
import { MergeOptions } from '../interfaces/mergeOptions';

const addSuffixResolver = (u: string) => u + 'XX';

describe('Resource Merger', () => {
    describe('acceptance', () => {
        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'http://api.example.com/filter/user/113194',
                },
                {
                    rel: 'user',
                    href: 'http://api.example.com/user/97cde947-9edb-4c1a-9c27-5ae3cfb092b4',
                },
            ],
            name: 'Age Group',
            order: 3,
            questionItems: ['http://api.example.com/question/item/627800'],
        };
        const document = {
            links: [
                {
                    rel: 'self',
                    href: 'http://api.example.com/filter/user/113194',
                },
                {
                    rel: 'user',
                    href: 'http://api.example.com/user/97cde947-9edb-4c1a-9c27-5ae3cfb092b4',
                },
            ],
            name: 'Age Group',
            order: 3,
            questionItems: [
                'http://api.example.com/question/item/627801',
                'http://api.example.com/question/item/627802',
                'http://api.example.com/question/item/627803',
            ],
        };
        const form = {
            links: [
                {
                    rel: 'self',
                    href: 'http://api.example.com/filter/user/form/edit',
                },
            ],
            items: [
                {
                    type: FieldType.Select,
                    multiple: true,
                    name: 'questionItems',
                },
                {
                    type: FieldType.Text,
                    multiple: true,
                    name: 'name',
                },
                {
                    type: FieldType.Number,
                    multiple: true,
                    name: 'order',
                },
            ],
        };

        const options = {
            resourceResolver: noopResourceResolver,
            resolver: { ...noopResolver, resolver: addSuffixResolver }, // resolve with changes checked below
        };

        it('object', async () => {
            const actual = await ResourceMergeFactory.editMerge(resource, document, form, options);
            assertThat(actual).is({
                links: match.itIs(undefined),
                name: match.ofType.string(),
                order: 3,
                questionItems: match.array.match([
                    'http://api.example.com/question/item/627801',
                    'http://api.example.com/question/item/627802',
                    'http://api.example.com/question/item/627803',
                ]),
            });
        });

    });

    describe('fields', () => {

        const EMPTY: string[] = [];

        const form = {
            items: [
                {
                    type: 'http://types/text',
                    name: 'title',
                },
                {
                    type: 'http://types/select',
                    name: 'type',
                },
            ],
        };

        test.each([
            ['empty form', {}, EMPTY, EMPTY],
            ['empty form items', { items: EMPTY }, EMPTY, EMPTY],
            ['empty form items with defaults', { items: EMPTY }, ['title'], ['title']],
            ['form items (2)', form, EMPTY, ['title', 'type']],
            ['form items (1)', form, ['other'], ['other', 'title', 'type']],
        ])('%s', (title: string, form: any, defaults: string[], expected: string[]) => {
            const actual = FormUtil.fieldsToAccept(form as FormRepresentation, defaults);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            assertThat(actual).is(expected);
        });
    });

    describe('merge, edit', () => {
        const resource = {
            links: [
                {
                    rel: 'self',
                    href: 'http://example.com',
                },
            ],
            name: 'a name',
        };

        const form = {
            items: [
                {
                    type: 'http://types/text',
                    name: 'name',
                },
            ],
        } as FormRepresentation;

        const document = {
            links: [],
            name: 'Simplest Survey',
            ignored: {},
        };

        it('merge', async () => {
            const merged = await ResourceMergeFactory.editMerge(resource, document, form);
            assertThat(merged).is({
                links: match.itIs(undefined),
                name: match.ofType.string(),
            });
        });


        describe('fields only', () => {
            it('should rewrite 2 fields: one is a resource using resourceResolver and, two, uri mapping resolver', async () => {
                const resource = {
                    links: [
                        { rel: 'self', href: 'http://example.com/user/4199' },
                        { rel: 'role', href: 'http://example.com/role/1' },
                    ],
                    name: 'Simplest Survey',
                };

                const document = {
                    links: [{ rel: LinkRelation.Self, href: 'http://example.com/user/4199' }],
                    name: 'Simplest Survey',
                    role: { // role is a resource object
                        links: [{ rel: LinkRelation.Self, href: 'http://example.com/role/2' }],
                        bla: 1,
                    },
                } as DocumentRepresentation;

                const form = {
                    items: [
                        {
                            type: FieldType.Text,
                            name: 'name',
                        },
                        {
                            id: 'http://example.com/role', // uri to match against as pooled resource
                            type: FieldType.Select, // TODO: needs to be a collection
                            name: 'role',
                            multiple: false,
                        },
                    ],
                } as FormRepresentation;

                const called = jest.fn();
                const options = {
                    resourceResolver: (() => async () => {
                        called();
                        // need to return a 'role' collection
                        return {
                            links: [],
                            items: [
                                {
                                    links: [
                                        { rel: LinkRelation.Self, href: 'http://example.com/role/2' },
                                        {
                                            rel: LinkRelation.Canonical,
                                            href: 'http://example.com/role/2',
                                            title: 'role',
                                        },
                                    ],
                                },
                            ],
                        } as CollectionRepresentation;
                    }) as ResourceResolver,
                    resolver: {
                        ...noopResolver,
                        resolve: addSuffixResolver,
                    }, // resolve with changes checked below
                };

                const result = await ResourceMergeFactory.editMerge(resource, document, form, options);
                expect(called).toHaveBeenCalled();
                assertThat(result).is({
                    links: match.itIs(undefined),
                    name: 'Simplest SurveyXX',
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore under-baked typing from editMerge
                    role: 'http://example.com/role/2XX',
                });
            });
        });

        describe('undefined on no update required', () => {

            const resource = {
                links: [],
                name: 'Simplest Survey',
            };

            const document = { name: 'Simplest Survey' } as DocumentRepresentation;

            const form = {
                items: [
                    {
                        type: FieldType.Text,
                        name: 'name',
                    },
                ],
            } as FormRepresentation;

            test.each([
                ['merge, undefinedWhenNoUpdateRequired, default', { undefinedWhenNoUpdateRequired: true }, undefined],
                ['merge, undefinedWhenNoUpdateRequired, true', { undefinedWhenNoUpdateRequired: true }, undefined],
                ['merge, undefinedWhenNoUpdateRequired, false', { undefinedWhenNoUpdateRequired: false }, document],
            ])('%s', async (title: string, options: MergeOptions, expected: DocumentRepresentation | undefined) => {
                const actual = await ResourceMergeFactory.editMerge(resource, document, form, options);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore correct typing failing on data
                assertThat(actual).is(expected);
            });
        });

        describe('recursive group', () => {
            it('should return arrays on the top-level', async () => {
                const form = {
                    links: [{ rel: 'self', href: 'http://api.example.com/question/logic/item/form/edit' }],
                    items: [
                        {
                            type: 'http://types/text',
                            name: 'order',
                            description: '',
                        },
                        {
                            type: 'http://types/text',
                            name: 'type',
                            description: 'The rule type',
                        },
                        {
                            type: 'http://types/group',
                            name: 'expression',
                            items: [
                                {
                                    type: 'http://types/text',
                                    name: 'type',
                                    description: 'The expression type (not, and, or)',
                                },
                                {
                                    type: 'http://types/group',
                                    multiple: true,
                                    name: 'items',
                                    description: 'The expressions',
                                    items: [
                                        {
                                            type: 'http://types/select',
                                            name: 'question',
                                            multiple: false,
                                            description: 'The question',
                                        },
                                        {
                                            type: 'http://types/select',
                                            name: 'questionItem',
                                            multiple: true,
                                            description: 'The question items',
                                        },
                                    ],
                                },
                            ],
                            description: 'The logic rule as an expression (c.f. a \'##\' style string)',
                        },
                        {
                            type: 'http://types/select',
                            name: 'waitQuestion',
                        },
                    ],
                };

                const resource = {
                    expression: {
                        type: 'http://types.example.com/survey/logic/operator/and',
                        items: [
                            {
                                question: 'http://api.example.com/question/104646',
                                questionItem: [
                                    'http://api.example.com/question/item/695493',
                                ],
                            },
                            {
                                question: 'http://api.example.com/question/104652',
                                questionItem: [
                                    'http://api.example.com/question/item/695508',
                                    'http://api.example.com/question/item/695509',
                                    'http://api.example.com/question/item/695510',
                                ],
                            },
                        ],
                    },
                };

                // set to false so that resource is returned
                const options = { undefinedWhenNoUpdateRequired: false };
                const actual = await ResourceMergeFactory.editMerge(resource as unknown as LinkedRepresentation, resource, form, options);
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore under-baked typings on editMerge
                assertThat(actual).is(resource);
            });
        });
    });

    describe('merge, create', () => {
        describe('fields only', () => {
            it('should look for field in link relations returning undefined in http://types/select returns original value', async () => {
                const document = {
                    links: [{ rel: 'self', href: 'http://example.com/survey/4199' }],
                    name: 'Simplest Survey',
                    title: 'Simplest Survey',
                    state: 'http://types.example.com/survey/state/new',
                    reference: '',
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/text',
                            name: 'title',
                            description: 'The name of the survey',
                        },
                        {
                            type: 'http://types/select',
                            name: 'state',
                            description: 'The type of the resource',
                            items: [
                                { value: 'http://types.example.com/survey/state/new' },
                            ],
                        },
                    ],
                } as FormRepresentation;

                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual).is({
                    title: 'Simplest Survey',
                    state: 'http://types.example.com/survey/state/new',
                });

            });
        });

        describe('fields http://types/group', () => {

            test.each([
                ['single to multiple', { singleMultiple: 'http://api.example.com/question/item/55555' }],
                ['multiple to multiple', {
                    questionItem: [
                        'http://api.example.com/question/item/572444', 'http://api.example.com/question/item/572445'],
                }],
                ['single to single', { question: 'http://api.example.com/question/87869' }],
            ])('http://types/select, value not in form, %s', async (test: string, expected: any) => {

                const document = {
                    expression: {
                        type: 'not',
                        question: 'http://api.example.com/question/87869',
                        questionItem: [
                            'http://api.example.com/question/item/572444',
                            'http://api.example.com/question/item/572445',
                        ],
                        singleMultiple: 'http://api.example.com/question/item/55555',
                    },
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/group',
                            name: 'expression',
                            items: [
                                {
                                    type: 'http://types/text',
                                    name: 'type',
                                    description: 'The expression type (not, and, or)',
                                },
                                {
                                    type: 'http://types/select',
                                    name: 'question',
                                    description: 'The expression type (not, and, or)',
                                },
                                {
                                    type: 'http://types/select',
                                    multiple: true,
                                    name: 'questionItem',
                                    description: 'The question items',
                                },
                                {
                                    type: 'http://types/select',
                                    multiple: true,
                                    name: 'singleMultiple',
                                    description: 'The question items',
                                },
                            ],
                            description: 'The logic rule as an expression (c.f. a \'##\' style string)',
                        },
                    ],
                } as FormRepresentation;

                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual.expression).is(match.obj.has(expected));
            });

            describe('http://types/group, deep recursion', () => {
                it('resolve all http://types/select', async () => {
                    const form = {
                        items: [
                            {
                                type: 'http://types/group',
                                multiple: true,
                                name: 'dataSources',
                                items: [
                                    {
                                        type: 'http://types/text',
                                        name: 'id',
                                        description: 'A unique identifier for this resource',
                                    },
                                    {
                                        type: 'http://types/group',
                                        multiple: true,
                                        name: 'items',
                                        items: [
                                            {
                                                type: 'http://types/select',
                                                name: 'question',
                                                description: 'The mandatory question',
                                                items: [
                                                    { value: 'http://api.example.com/question/96905' },
                                                    { value: 'http://api.example.com/question/969010' },
                                                ],
                                            },
                                            {
                                                type: 'http://types/select',
                                                multiple: true,
                                                name: 'includeQuestionItems',
                                                description: 'The mandatory question',
                                            },
                                            {
                                                type: 'http://types/text',
                                                name: 'offset',
                                                description: 'A optional numberic offset to be applied to the the question item value',
                                            },
                                        ],
                                        description: 'The collection of questions used to query the data source',
                                    },
                                ],
                                description: '',
                            },
                        ],
                    } as FormRepresentation;

                    const document = {
                        dataSources: [
                            {
                                id: 'http://types.example.com/chart/identifier/4',
                                items: [
                                    { question: 'http://api.example.com/question/96905' },
                                    { question: 'http://api.example.com/question/969010' },
                                ],
                            },
                        ],
                    };

                    const actual = await ResourceMergeFactory.createMerge(document, form);
                    assertThat(actual).is({
                        dataSources: [
                            {
                                id: 'http://types.example.com/chart/identifier/4',
                                items: [
                                    { question: 'http://api.example.com/question/96905' },
                                    { question: 'http://api.example.com/question/969010' },
                                ],
                            },
                        ],
                    });
                });
            });

        });

        describe('link relations, mapping to field', () => {

            it('http://types/select, single', async () => {
                const document = {
                    links: [{ rel: 'role', href: 'http://example.com/role/1' }],
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/select',
                            multiple: false,
                            name: 'role',
                            description: 'An optional list of roles to be granted access to the page',
                        },
                    ],
                } as FormRepresentation;

                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual).is({ role: 'http://example.com/role/1' });

            });

            it('http://types/select, multiple returns array', async () => {
                const document = {
                    links: [{ rel: 'role', href: 'http://example.com/role/1' }],
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/select',
                            multiple: true,
                            name: 'role',
                            description: 'An optional list of roles to be granted access to the page',
                        },
                    ],
                } as FormRepresentation;

                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual).is({ role: ['http://example.com/role/1'] });
            });

            it('http://types/collection, multiple', async () => {
                const document = {
                    links: [
                        { rel: 'role', href: 'http://example.com/role/1' },
                        { rel: 'role', href: 'http://example.com/role/2' },
                    ],
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/collection',
                            name: 'role',
                            multiple: true,
                            description: 'An optional list of roles to be granted access to the page',
                        },
                    ],
                } as FormRepresentation;


                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual).is({ role: ['http://example.com/role/1', 'http://example.com/role/2'] });

            });

            it('http://types/collection, single', async () => {
                const document = {
                    links: [
                        { rel: 'role', href: 'http://example.com/role/1' },
                    ],
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/collection',
                            name: 'role',
                            multiple: false,
                            description: 'An optional role to be granted access to the page',
                        },
                    ],
                } as FormRepresentation;


                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual).is({ role: 'http://example.com/role/1' });

            });

            it('camel case attributes to hyphenated link relations', async () => {
                const document = {
                    links: [{ rel: 'question-item', href: 'http://example.com/question-item/1' }],
                };

                const form = {
                    items: [
                        {
                            type: 'http://types/select',
                            name: 'questionItem',
                        },
                    ],
                } as FormRepresentation;

                const actual = await ResourceMergeFactory.createMerge(document, form);
                assertThat(actual).is({ questionItem: 'http://example.com/question-item/1' });
            });
        });
    });

});
