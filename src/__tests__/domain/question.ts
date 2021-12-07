import { CollectionRepresentation, LinkedRepresentation, LinkUtil } from 'semantic-link';
import { SyncOptions } from '../../interfaces/sync/syncOptions';
import { LinkRelation } from '../../linkRelation';
import { CustomLinkRelation } from './customLinkRelation';
import { Differencer } from '../../sync/differencer';
import anylogger from 'anylogger';
import { emptyName } from '../../utils/comparators/emptyName';
import { sync } from '../../sync/sync';

const log = anylogger('Question');

export class Question {

    public static async sync(
        resource: CollectionRepresentation,
        document: CollectionRepresentation,
        options?: SyncOptions): Promise<void> {
        if (!document || !resource) {
            throw new Error('Questions are empty');
        }
        log.debug('start update %s', LinkUtil.getUri(resource, LinkRelation.Self));

        await sync({
            resource,
            document,
            options,
            strategies: [
                async syncResult => await sync({ ...syncResult, rel: CustomLinkRelation.Choices }),
            ],
        });
    }

    /**
     * Synchronise on the {@link QuestionRepresentation} its child {@link ChoiceCollection}.
     *
     * The design of choices is such that most question already have a default choice created and that matches
     * requires matching on no name or title. Otherwise, choices are deleted/created unnecessarily.
     */
    public static async syncPooled<T extends LinkedRepresentation>(resource: T, document: T, cacheOptions?: SyncOptions): Promise<void> {
        return await sync({
            resource,
            document,
            rel: CustomLinkRelation.Choices,
            /**
             * Choices are added automatically and as such an empty choice causes problems
             * so we are going to match a choice when name is empty in both
             */
            options: {
                ...cacheOptions,
                comparators: [emptyName, ...Differencer.defaultEqualityOperators],
            },
        });
    }
}
