export const self = 'https://api.example.com/question/form/create';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
    ],
    items: [
        {
            type: '//types/select',
            name: 'type',
            label: 'Question Type',
            description: '',
            required: true,
            items: [
                {
                    type: '//types/enum',
                    value: '//enum/question/text',
                    label: 'text',
                    name: 'text',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/text/address',
                    label: 'address',
                    name: 'address',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/text/tel',
                    label: 'tel',
                    name: 'tel',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/text/email',
                    label: 'email',
                    name: 'email',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/text/number',
                    label: 'number',
                    name: 'number',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/date',
                    label: 'date',
                    name: 'date',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/select/single',
                    label: 'singleSelect',
                    name: 'singleSelect',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/declaration',
                    label: 'declaration',
                    name: 'declaration',
                },
                {
                    type: '//types/enum',
                    value: '//enum/question/accept',
                    label: 'accept',
                    name: 'accept',
                },
            ],
        },
        {
            type: '//types/text',
            name: 'name',
            label: 'Field 1',
            description: 'Name of the field',
            maxlength: 255,
        },
        {
            type: '//types/text',
            name: 'description',
            label: 'Field 2',
            description: 'Description',
            maxlength: 255,
        },
        {
            type: '//types/text',
            name: 'instructions',
            label: 'Field 3',
            description: 'Often instructions are here',
            maxlength: 255,
        },
        {
            type: '//types/text',
            name: 'headers',
            label: 'Field 4',
            description: 'These can be headers',
            maxlength: 255,
        },
    ],
};
