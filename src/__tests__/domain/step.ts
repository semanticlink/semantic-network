import { StepCollection } from './interfaces/stepCollection';
import { CustomLinkRelation } from './customLinkRelation';
import anylogger from 'anylogger';
import { ApiUtil } from '../../apiUtil';
import { ResourceQueryOptions } from '../../interfaces/resourceQueryOptions';
import { StepType } from './interfaces/stepType';
import { StepRepresentation } from './interfaces/stepRepresentation';
import { Nullable } from '../../types/types';
import { QuestionRepresentation } from './interfaces/questionRepresentation';
import { ChoiceCollection } from './interfaces/choiceCollection';

const log = anylogger('Step');

export class Step {

    /**
     * Return steps collection with items hydrated
     */
    public static async getSteps(step: StepRepresentation, options?: ResourceQueryOptions): Promise<Nullable<StepCollection>> {
        return await ApiUtil.get(step, { ...options, includeItems: true, rel: CustomLinkRelation.Steps });
    }

    public static async getQuestion(sections: StepRepresentation, options?: ResourceQueryOptions): Promise<Nullable<QuestionRepresentation>> {
        return await ApiUtil.get(sections, { ...options, rel: CustomLinkRelation.Field });
    }

    public static async getChoices(questions: QuestionRepresentation, options?: ResourceQueryOptions): Promise<Nullable<ChoiceCollection>> {
        return await ApiUtil.get(questions, { includeItems: true, ...options, rel: CustomLinkRelation.Choices });
    }

    /**
     * Takes all steps (level: workflow, page or item), recursively hydrates each type (simple types and complex types)
     */
    public static async loadStep(step: StepRepresentation, options?: ResourceQueryOptions): Promise<void> {
        log.debug('loading page: %s', step.name);
        const steps = await Step.getSteps(step, options);
        if (steps?.items) {
            for (const item of steps.items) {
                await this.loadType(item, options);
            }
        }
    }

    private static async loadType(step: StepRepresentation, options?: ResourceQueryOptions): Promise<void> {
        log.debug('loading type \'%s\': \'%s\'', step.type, step.name || '');
        switch (step.type) {
            case StepType.question:
                await this.loadQuestionWithChoices(step, options);
                return;
            case StepType.page:
                await this.loadStep(step, options);
                return;
            case StepType.image:
            case StepType.video:
            case StepType.heading:
                return;
            default:
                log.warn('Not implemented %s', step.type);
        }
    }


    private static async loadQuestionWithChoices(step: StepRepresentation, options?: ResourceQueryOptions): Promise<void> {
        const questions = await Step.getQuestion(step, options);
        if (questions) {
            await Step.getChoices(questions, options);
        }
    }


}
