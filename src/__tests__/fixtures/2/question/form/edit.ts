export const self = 'https://api.example.com/question/form/edit';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
    ],
    items: [
        {
            type: '//types/form/select',
            name: 'type',
            label: 'Question Type',
            description: '',
            required: true,
            items: [
                {
                    type: '//types/form/enum',
                    value: '//enum/question/text',
                    label: 'text',
                    name: 'text',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/text/address',
                    label: 'address',
                    name: 'address',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/text/tel',
                    label: 'tel',
                    name: 'tel',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/text/email',
                    label: 'email',
                    name: 'email',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/text/number',
                    label: 'number',
                    name: 'number',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/date',
                    label: 'date',
                    name: 'date',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/select/single',
                    label: 'singleSelect',
                    name: 'singleSelect',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/declaration',
                    label: 'declaration',
                    name: 'declaration',
                },
                {
                    type: '//types/form/enum',
                    value: '//enum/question/accept',
                    label: 'accept',
                    name: 'accept',
                },
            ],
        },
        {
            type: '//types/form/text',
            name: 'name',
            label: 'Field 1',
            description: 'Name of the field',
            maxlength: 255,
        },
        {
            type: '//types/form/text',
            name: 'description',
            label: 'Field 2',
            description: 'Description',
            maxlength: 255,
        },
        {
            type: '//types/form/text',
            name: 'instructions',
            label: 'Field 3',
            description: 'Often instructions are here',
            maxlength: 255,
        },
        {
            type: '//types/form/text',
            name: 'headers',
            label: 'Field 4',
            description: 'These can be headers',
            maxlength: 255,
        },
    ],
};
