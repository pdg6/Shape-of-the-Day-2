/**
 * AI Service - Client-side utilities for calling AI Cloud Functions
 * 
 * This module provides typed wrappers around Firebase Cloud Functions
 * for AI-powered features like task generation and student Q&A.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

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
 * Response from the generateSchedule Cloud Function (placeholder)
 */
interface GenerateScheduleResponse {
    tasks: {
        title: string;
        description: string;
        type: 'project' | 'assignment' | 'task' | 'subtask';
        duration?: number;
    }[];
    success: boolean;
}

/**
 * Generates a lesson schedule using AI based on uploaded materials.
 * 
 * @param topic - The topic or prompt for generation
 * @param sourceMaterialIds - IDs of attachments to use as context
 * @param durationMinutes - Target duration for the lesson
 * @returns Array of suggested tasks
 */
export const generateLessonSchedule = async (
    topic: string,
    sourceMaterialIds: string[],
    durationMinutes: number
): Promise<GenerateScheduleResponse['tasks']> => {
    try {
        const generateSchedule = httpsCallable<
            { topic: string; sourceMaterialIds: string[]; durationMinutes: number },
            GenerateScheduleResponse
        >(functions, 'generateSchedule');

        const result = await generateSchedule({ topic, sourceMaterialIds, durationMinutes });

        if (result.data.success) {
            return result.data.tasks;
        } else {
            throw new Error('AI failed to generate schedule');
        }
    } catch (error) {
        console.error('[AI Service] Error generating schedule:', error);
        throw error;
    }
};

/**
 * Checks if AI features are available (Cloud Functions deployed)
 * This is a simple health check that can be used to conditionally show AI buttons
 */
export const isAIAvailable = async (): Promise<boolean> => {
    // In production, this would ping a health endpoint
    // For now, we assume AI is available if functions are configured
    try {
        // Check if functions are initialized
        return functions !== undefined;
    } catch {
        return false;
    }
};
