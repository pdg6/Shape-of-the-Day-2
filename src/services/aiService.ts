/**
 * AI Service - Client-side utilities for calling AI Cloud Functions
 * 
 * This module provides typed wrappers around Firebase Cloud Functions
 * for AI-powered features like task generation and student Q&A.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';
import { Task } from '../types';

// Initialize Functions
const functions = getFunctions(app);

/**
 * Response from the answerStudentQuestion Cloud Function
 */
interface AnswerQuestionResponse {
    answer: string;
    success: boolean;
}

/**
 * Asks the AI Teaching Assistant a question about a task.
 * Uses RAG to find relevant materials from the teacher's uploaded content.
 * 
 * @param taskId - The ID of the task the question is about
 * @param question - The student's question
 * @param classroomId - The classroom context (for logging)
 * @returns The AI-generated answer
 */
export const askAIQuestion = async (
    taskId: string,
    question: string,
    classroomId: string
): Promise<string> => {
    try {
        const answerQuestion = httpsCallable<
            { taskId: string; question: string; classroomId: string },
            AnswerQuestionResponse
        >(functions, 'answerStudentQuestion');

        const result = await answerQuestion({ taskId, question, classroomId });

        if (result.data.success) {
            return result.data.answer;
        } else {
            throw new Error('AI failed to generate answer');
        }
    } catch (error) {
        console.error('[AI Service] Error asking question:', error);
        throw error;
    }
};

/**
 * Input for the suggestTasks Cloud Function
 */
export interface SuggestTasksInput {
    subject: string;
    gradeLevel?: string;
}

/**
 * Input for the refineTask Cloud Function
 */
export interface RefineTaskInput {
    rawContent: string;
    subject?: string;
    gradeLevel?: string;
    context?: string[];
    taskId?: string;
    existingItems?: any[];
}

/**
 * Response from the refineTask Cloud Function
 */
export interface RefineTaskResponse {
    items: Task[];
    thoughts?: string;
}

/**
 * Refines raw teacher notes into structured curriculum items using Genkit.
 * 
 * @param input - The refinement parameters
 * @returns Array of structured Task items
 */
export const refineTask = async (input: RefineTaskInput): Promise<RefineTaskResponse> => {
    try {
        const refineTaskFn = httpsCallable<RefineTaskInput, RefineTaskResponse>(functions, 'refineTask');
        const result = await refineTaskFn(input);
        return result.data;
    } catch (error) {
        console.error('[AI Service] Error refining task:', error);
        throw error;
    }
};

/**
 * Suggests curriculum items based on subject/grade.
 */
export const suggestTasks = async (subject: string, gradeLevel?: string): Promise<{ tasks: Task[], thoughts?: string }> => {
    try {
        const suggestTasksFn = httpsCallable<{ subject: string; gradeLevel?: string }, { tasks: Task[], thoughts?: string }>(functions, 'suggestTasks');
        const result = await suggestTasksFn({ subject, gradeLevel });
        return result.data;
    } catch (error) {
        console.error('[AI Service] Error suggesting tasks:', error);
        throw error;
    }
};

/**
 * Input for the processFile Cloud Function
 */
export interface ProcessFileInput {
    fileUrl: string;
    filename: string;
    contentType: string;
    taskId?: string;
}

/**
 * Processes an uploaded file to extract its text content for AI context.
 */
export const processFileContent = async (input: ProcessFileInput): Promise<string> => {
    try {
        const processFileFn = httpsCallable<ProcessFileInput, { text: string }>(functions, 'processFile');
        const result = await processFileFn(input);
        return result.data.text;
    } catch (error) {
        console.error('[AI Service] Error processing file:', error);
        throw error;
    }
};

/**
 * Fetches metadata (title, transcript) from a URL for AI context.
 */
export interface UrlMetadataResponse {
    title: string | null;
    siteName: string | null;
    transcript?: string;
    error?: string;
}

export const fetchUrlMetadata = async (url: string): Promise<UrlMetadataResponse> => {
    try {
        const fetchUrlMetadataFn = httpsCallable<{ url: string }, UrlMetadataResponse>(functions, 'fetchUrlMetadata');
        const result = await fetchUrlMetadataFn({ url });
        return result.data;
    } catch (error) {
        console.error('[AI Service] Error fetching URL metadata:', error);
        throw error;
    }
};

/**
 * Interface for classroom struggle analysis.
 */
export interface StruggleAnalysis {
    summary: string;
    topStruggles: string[];
    suggestions: string[];
}

/**
 * Analyzes student struggles in a classroom.
 */
export const analyzeStruggles = async (
    classroomId: string,
    taskIds?: string[],
    subject?: string,
    gradeLevel?: string
): Promise<StruggleAnalysis> => {
    try {
        const analyzeStrugglesFn = httpsCallable<{
            classroomId: string;
            taskIds?: string[];
            subject?: string;
            gradeLevel?: string;
        }, StruggleAnalysis>(functions, 'analyzeStruggles');
        const result = await analyzeStrugglesFn({ classroomId, taskIds, subject, gradeLevel });
        return result.data;
    } catch (error) {
        console.error('[AI Service] Error analyzing struggles:', error);
        throw error;
    }
};

/**
 * Suggests scaffolding tasks based on class struggles.
 */
export const suggestScaffolding = async (
    classroomId: string,
    struggleSummary?: string,
    subject?: string,
    gradeLevel?: string
): Promise<{ suggestedTasks: Task[], thoughts?: string }> => {
    try {
        const suggestScaffoldingFn = httpsCallable<{
            classroomId: string;
            struggleSummary?: string;
            subject?: string;
            gradeLevel?: string;
        }, { suggestedTasks: Task[], thoughts?: string }>(functions, 'suggestScaffolding');
        const result = await suggestScaffoldingFn({ classroomId, struggleSummary, subject, gradeLevel });
        return result.data;
    } catch (error) {
        console.error('[AI Service] Error suggesting scaffolding:', error);
        throw error;
    }
};

/**
 * Expands task instructions into granular steps for student support.
 */
export const expandTaskInstructions = async (taskId: string, currentInstructions: string[]): Promise<string[]> => {
    try {
        const expandTaskInstructionsFn = httpsCallable<{ taskId: string; currentInstructions: string[] }, { expandedInstructions: string[] }>(functions, 'expandTaskInstructions');
        const result = await expandTaskInstructionsFn({ taskId, currentInstructions });
        return result.data.expandedInstructions;
    } catch (error) {
        console.error('[AI Service] Error expanding instructions:', error);
        throw error;
    }
};



/**
 * Checks if AI features are available (Cloud Functions deployed)
 */
export const isAIAvailable = async (): Promise<boolean> => {
    try {
        return functions !== undefined;
    } catch {
        return false;
    }
};
