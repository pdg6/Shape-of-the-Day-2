/**
 * Firebase Cloud Functions - Shape of the Day AI Agents
 * 
 * Entry point for all Cloud Functions.
 * Exports:
 * - onTaskAttachmentChange: Ingests new attachments into Vector DB
 * - answerStudentQuestion: Callable function for AI Q&A
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { textEmbeddingGecko001, gemini15Flash } from '@genkit-ai/googleai';
import { embed, generate } from '@genkit-ai/ai';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();

// Configure Genkit with Google AI
configureGenkit({
    plugins: [googleAI()],
    logLevel: 'info',
    enableTracingAndMetrics: true,
});

/**
 * Triggered when a task document is updated.
 * If attachments have changed, extract text and generate embeddings.
 */
export const onTaskAttachmentChange = onDocumentUpdated(
    'tasks/{taskId}',
    async (event) => {
        const beforeData = event.data?.before.data();
        const afterData = event.data?.after.data();
        const taskId = event.params.taskId;

        if (!afterData) return;

        // Check if attachments changed
        const beforeAttachments = beforeData?.attachments || [];
        const afterAttachments = afterData.attachments || [];

        if (JSON.stringify(beforeAttachments) === JSON.stringify(afterAttachments)) {
            return; // No attachment change
        }

        console.log(`[AI] Processing attachments for task ${taskId}`);

        // For each NEW attachment, generate embedding
        for (const attachment of afterAttachments) {
            // Skip if already processed
            const existingDoc = await db.collection('task_embeddings').doc(`${taskId}_${attachment.id}`).get();
            if (existingDoc.exists) continue;

            try {
                // TODO: Download file from storage and extract text
                // For now, we'll use the task description as a placeholder
                const textContent = `${afterData.title}\n\n${afterData.description || ''}\n\nAttachment: ${attachment.filename}`;

                // Generate embedding using Gemini
                const embeddingResult = await embed({
                    embedder: textEmbeddingGecko001,
                    content: textContent,
                });

                // Store in task_embeddings collection
                await db.collection('task_embeddings').doc(`${taskId}_${attachment.id}`).set({
                    taskId: taskId,
                    attachmentId: attachment.id,
                    filename: attachment.filename,
                    embedding: embeddingResult,
                    textChunk: textContent.substring(0, 1000), // Store first 1000 chars for reference
                    createdAt: FieldValue.serverTimestamp(),
                    type: 'source_material',
                });

                console.log(`[AI] Embedded attachment ${attachment.id} for task ${taskId}`);
            } catch (error) {
                console.error(`[AI] Failed to embed attachment ${attachment.id}:`, error);
            }
        }
    }
);

/**
 * Callable function for students to ask questions about a task.
 * Uses RAG to find relevant materials and generate an answer.
 */
export const answerStudentQuestion = onCall(
    { cors: true },
    async (request) => {
        const { taskId, question, classroomId } = request.data;

        if (!taskId || !question) {
            throw new HttpsError('invalid-argument', 'taskId and question are required');
        }

        console.log(`[AI] Student question for task ${taskId}: ${question}`);

        try {
            // 1. Get the task details
            const taskDoc = await db.collection('tasks').doc(taskId).get();
            if (!taskDoc.exists) {
                throw new HttpsError('not-found', 'Task not found');
            }
            const task = taskDoc.data();

            // 2. Generate embedding for the question
            const questionEmbedding = await embed({
                embedder: textEmbeddingGecko001,
                content: question,
            });

            // 3. Query task_embeddings for similar content (Vector Search)
            // Note: This requires Firestore Vector Search to be enabled
            // For now, we'll use a simpler approach - get all embeddings for this task
            const embeddingsSnapshot = await db
                .collection('task_embeddings')
                .where('taskId', '==', taskId)
                .limit(5)
                .get();

            const contextChunks: string[] = [];
            embeddingsSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.textChunk) {
                    contextChunks.push(data.textChunk);
                }
            });

            // 4. Generate answer using Gemini with context
            const context = contextChunks.length > 0
                ? `Context from teacher's materials:\n${contextChunks.join('\n\n')}`
                : 'No additional context available.';

            const prompt = `You are a helpful teaching assistant for a classroom.
            
Task Title: ${task?.title}
Task Description: ${task?.description || 'No description provided.'}

${context}

Student Question: ${question}

Please provide a helpful, age-appropriate answer. If you don't have enough information to answer, say so and suggest the student ask their teacher.`;

            const response = await generate({
                model: gemini15Flash,
                prompt: prompt,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 500,
                },
            });

            const answer = response.text();

            // 5. Log the Q&A for analytics (optional)
            await db.collection('ai_interactions').add({
                taskId,
                classroomId,
                question,
                answer,
                timestamp: FieldValue.serverTimestamp(),
            });

            return { answer, success: true };
        } catch (error) {
            console.error('[AI] Error answering question:', error);
            throw new HttpsError('internal', 'Failed to generate answer');
        }
    }
);
