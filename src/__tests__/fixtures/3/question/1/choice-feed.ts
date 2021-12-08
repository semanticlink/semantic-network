import { self as choiceUri } from '../../choice/881-name';
import { self as formUri } from '../../choice/form/edit';

export const self = 'https://api.example.com/question/1/choice';
export const resource = {
    links: [
        {
            rel: 'self',
            href: self,
        },
        {
            rel: 'up',
            href: 'https://api.example.com/question/cf6c4b9c7f',
        },
        {
            rel: 'create-form',
            href: formUri,
        },
    ],
    items: [
        {
            id: choiceUri,
            title: 'Name',
        },
    ],
};
