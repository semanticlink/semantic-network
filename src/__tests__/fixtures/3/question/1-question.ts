import { self as choiceFeedUri } from './1/choice-feed';
import { self as editFormUri } from './form/edit';

export const self = 'https://api.example.com/question/1';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
        {
            rel: 'canonical',
            href: self,
            // pooled resources are keyed off this title
            title: 'question',
        },
        {
            rel: 'organisation',
            href: 'https://api.example.com/organisation/a656927b0f',
        },
        {
            rel: 'choices',
            href: choiceFeedUri,
        },
        {
            rel: 'edit-form',
            href: editFormUri,
        },
    ],
    name: 'Please tell me about yourself (AgainXXXXX)',
    type: '//enum/question/text',
};
