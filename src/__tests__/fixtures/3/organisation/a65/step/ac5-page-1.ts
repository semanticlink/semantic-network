import { self as editUri } from './form/edit';
import { self as stepsUri } from './ac5-page-1/step-page-1-feed';
import { self as parentStepsUri } from './314-workflow/step-pages-feed';
import { StepType } from '../../../../../domain/interfaces/stepType';

export const self = 'https://api.example.com/organisation/a656927b0f/step/ac50e024ff';
export const resource = {
    links:
        [
            {
                rel: 'self',
                href: self,
            },
            {
                rel: 'up',
                href: parentStepsUri,
            },
            {
                rel: 'steps',
                href: stepsUri,
            },
            {
                rel: 'edit-form',
                href: editUri,
            },
        ],
    name: 'About you',
    description: 'Basic information that is required',
    order: 1,
    type: StepType.page,
};
