import { self as itemUri } from '../ac5-page-1';
import { self as createFormUri } from '../form/create';

export const self = 'https://api.example.com/organisation/a656927b0f/step/314ee4fc57/step';
export const resource =
    {
        links:
            [
                {
                    rel: 'self',
                    href: self,
                },
                {
                    rel: 'create-form',
                    href: createFormUri,
                },
            ],
        items: [
            {
                id: itemUri,
                title: 'About you',
            },
        ],
    };
