import { LinkedRepresentation, LinkUtil, RelationshipType } from 'semantic-link';
import { resource as workflow, self as workflowUri } from './organisation/a65/step/314-workflow';
import { resource as pageOne, self as pageOneUri } from './organisation/a65/step/ac5-page-1';
import { resource as pagesFeed, self as pagesFeedUri } from './organisation/a65/step/314-workflow/step-pages-feed';
import { resource as pageFeed, self as pageFeedUri } from './organisation/a65/step/ac5-page-1/step-page-1-feed';
import { resource as createForm, self as createFormUri } from './organisation/a65/step/form/create';
import { resource as questionStep, self as questionStepUri } from './organisation/a65/step/92c-question';
import { resource as question, self as questionUri } from './question/1-question';
import { resource as questionFeed, self as questionFeedUri } from './organisation/a65/question-feed';
import { resource as questionEditForm, self as questionEditFormUri } from './question/form/edit';
import { resource as questionCreateForm, self as questionCreateFormUri } from './question/form/create';
import { resource as choices, self as choicesUri } from './question/1/choice-feed';
import { resource as choice1, self as choice1Uri } from './choice/881-name';
import { resource as choiceEditForm, self as choiceEditFormUri } from './choice/form/edit';
import { resource as workflowFeed, self as workflowFeedUri } from './organisation/a65/step-feed';

import { AxiosResponse } from 'axios';
import anylogger from 'anylogger';

const log = anylogger('Fakes');
let count = 1;

/**
 * Return a fake of an across-the-wire representation
 */
export const fakeResponseFactory = <T extends LinkedRepresentation>(resource: T, rel: RelationshipType): Partial<AxiosResponse<T>> | never => {
    const uri = LinkUtil.getUri(resource, rel);

    log.debug('[Fake] %s GET \'%s\' %s', count++, rel, uri);

    /**
     * Wiring up the representations requires a good understanding of the network
     * of data structure.
     *
     * The design here is that sample of should be able to cut-and-paste from the
     * api client into the files and reused (most of the time).
     *
     * The effect of this is that the uris look complicated/verbose. The alternative
     * is to handcraft each representation which is either tedious or a lot of factory method
     * which in themselves need design (and testing).
     *
     * Bottom line. These are acceptance tests, they are reasonably brittle but should
     * show that the main working are in place. And not cost too much. Apologies in advance.
     */
    function factory(uri: string): T {
        switch (uri) {
            case workflowUri:
                return workflow as unknown as T;
            case pageOneUri:
                return pageOne as unknown as T;
            case pagesFeedUri:
                return pagesFeed as unknown as T;
            case pageFeedUri:
                return pageFeed as unknown as T;
            case createFormUri:
                return createForm as unknown as T;
            case questionStepUri:
                return questionStep as unknown as T;
            case questionUri:
                return question as unknown as T;
            case questionEditFormUri:
                return questionEditForm as unknown as T;
            case questionCreateFormUri:
                return questionCreateForm as unknown as T;
            case questionFeedUri:
                return questionFeed as unknown as T;
            case choicesUri:
                return choices as unknown as T;
            case choice1Uri:
                return choice1 as unknown as T;
            case choiceEditFormUri:
                return choiceEditForm as unknown as T;
            case workflowFeedUri:
                return workflowFeed as unknown as T;
             default:
                throw new Error(`Fake not found: ${uri}`);
        }
    }

    if (uri) {
        return { data: { ...factory(uri) } };
    } else {
        throw new Error('Not found');
    }
};
