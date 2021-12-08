// import { self as workflowUri } from './step/314-workflow';

export const self = 'https://api.example.com/organisation/a656927b0f/step';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'up',
                href: 'https://api.example.com/organisation/a656927b0f',
            },
            {
                rel: 'create-form',
                href: 'https://api.example.com/organisation/a656927b0f/step/form/create',
            },
        ],
    items: [
        /*
        {
            id: workflowUri,
            title: 'Picker',
        },
        */
    ],
};
