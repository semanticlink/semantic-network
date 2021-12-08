import { self as createFormUri } from '../form/create';

/**
 * A workflow that has no steps
 */
export const self = 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff/step';
export const resource = {
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
    items: [],
};
