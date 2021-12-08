export const self = 'https://api.example.com/choice/form/edit';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
    ],
    items: [
        {
            type: '//types/text',
            name: 'name',
            label: '',
            description: '',
            maxlength: 255,
        },
    ],
};
