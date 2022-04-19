import { EditMergeOptions } from './editMergeOptions';
import { RelationshipType } from 'semantic-link';
import { EditFormMergeStrategy } from './editFormMergeStrategy';

export type ResourceUpdateOptions = EditMergeOptions
    & {

    /**
     * On resource updated, merge the new document into the existing resource.
     *
     * @default: {@link defaultEditFormStrategy} - merge only values denoted in the form
     */
    readonly makePutRepresentationStrategy?: EditFormMergeStrategy;

    /**
     * The link relation on the resource used to determine the edit form resource.
     *
     * @default: {@link LinkRelation.EditForm}
     */
    readonly formRel?: RelationshipType;
};

