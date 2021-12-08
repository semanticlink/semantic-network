import { self as questionFeedUri } from '../../question-feed';

export const self = 'https://api.example.com/organisation/a656927b0f/step/form/create';
export const resource =
    {
        links: [
            {
                rel: 'self',
                href: self,
            },
        ],
        items: [
            {
                type: '//types/select',
                name: 'field',
                label: 'Type',
                description: 'Choose only one type and then potentially many from there where there is a list (eg declarations, questions)',
                required: true,
                items: [
                    {
                        id: questionFeedUri,
                        type: '//types/collection',
                        multiple: true,
                        name: 'question',
                        label: 'Questions',
                        description: 'Questions that have been created on this organisation',
                        items: null,
                    },
                    {
                        id: 'https://api.example.com/organisation/a656927b0f/information/template',
                        type: '//types/collection',
                        multiple: true,
                        name: 'information',
                        label: 'Information',
                        description: 'Information available on the organisation (eg job or personal information',
                        items: null,
                    },
                    {
                        id: 'https://api.example.com/organisation/a656927b0f/template',
                        type: '//types/collection',
                        multiple: true,
                        name: 'template',
                        label: 'Document Template',
                        description: 'Existing document templates on the organisation',
                        items: null,
                    },
                    {
                        type: '//types/enum',
                        value: '//enum/step/section/page',
                        label: 'Page',
                        name: 'sectionPage',
                        description: '',
                        order: 5,
                    },
                    {
                        type: '//types/enum',
                        value: '//enum/step/section/heading',
                        label: 'Section Heading',
                        name: 'sectionHeading',
                        description: '',
                        order: 6,
                    },
                    {
                        type: '//types/enum',
                        value: '//enum/step/section/image',
                        label: 'Section Image',
                        name: 'sectionImage',
                        description: '',
                        order: 7,
                    },
                    {
                        type: '//types/enum',
                        value: '//enum/step/section/video',
                        label: 'Section Video',
                        name: 'sectionVideo',
                        description: '',
                        order: 8,
                    },
                ],
            },
            {
                type: '//types/text',
                name: 'name',
                label: 'Field Two',
                description: 'Usage depends on type',
                maxlength: 255,
            },
            {
                type: '//types/text',
                name: 'description',
                label: 'Field One',
                description: 'Usage depends on type',
                maxlength: 255,
            },
            {
                type: '//types/number',
                name: 'order',
                label: 'Order',
                description: 'Left empty this is added to the end of the collection—others will be inserted',
            },
        ],
    };
