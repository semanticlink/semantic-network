import { self as parentStepsUri } from './314-workflow/step-pages-feed';
import { self as editUri } from './form/edit';
import { self as stepsUri } from './ac5-page-1/step-page-1-feed';

export const self = 'https://api.example.com/organisation/a656927b0f/step/314ee4fc57';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
        {
            rel: 'up',
            href: stepsUri,
        },
        {
            rel: 'steps',
            href: parentStepsUri,
        },
        {
            rel: 'edit-form',
            href: editUri,
        },
    ],
    name: 'Picker',
    description: 'Onboarding a picker in the winter season',
    order: 2,
    type: '//enum/step/section/page',
};
