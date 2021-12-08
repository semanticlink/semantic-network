import { self as stepFeedUri } from './a65/step-feed';
import { self as questionFeedUri } from './a65/question-feed';

export const self = 'https://api.example.com/organisation/a656927b0f';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'steps',
                href: stepFeedUri,
            },
            {
                rel: 'questions',
                href: questionFeedUri,
            },
        ],
    name: "T's Picking (2)",
    description: 'Just a great place',
    email: 't@example.com',
    phone: '0274852872',
};
