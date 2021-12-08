export const self = 'https://api.example.com/organisation/a656927b0f/step/form/edit';
export const resource =
    {
        links:
            [
                {
                    rel: 'self',
                    href: self,
                },
            ],
        items: [
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
