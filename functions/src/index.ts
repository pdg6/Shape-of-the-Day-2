/**
 * Firebase Cloud Functions - Shape of the Day AI Agents
 * 
 * Entry point for all Cloud Functions.
 * Exports:
 * - onTaskAttachmentChange: Ingests new attachments into Vector DB (disabled - needs Genkit setup)
 * - answerStudentQuestion: Callable function for AI Q&A (disabled - needs Genkit setup)
 * - fetchUrlMetadata: Fetches webpage titles for link resources
 */

// Disabled imports - used by AI functions that are currently disabled
// import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// import { getStorage } from 'firebase-admin/storage';

// Genkit AI imports - disabled until Genkit is properly configured
// import { configureGenkit } from '@genkit-ai/core';
// import { googleAI } from '@genkit-ai/googleai';
// import { textEmbeddingGecko001, gemini15Flash } from '@genkit-ai/googleai';
// import { embed, generate } from '@genkit-ai/ai';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
// const storage = getStorage();

// Genkit configuration - disabled until properly set up
// configureGenkit({
//     plugins: [googleAI()],
//     logLevel: 'info',
//     enableTracingAndMetrics: true,
// });

// =============================================================================
// AI FUNCTIONS - DISABLED UNTIL GENKIT IS PROPERLY CONFIGURED
// =============================================================================
// The following functions require Genkit AI to be properly set up.
// Uncomment them once you have configured the Genkit dependencies.
// =============================================================================

/*
// Triggered when a task document is updated.
// If attachments have changed, extract text and generate embeddings.
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

// Callable function for students to ask questions about a task.
// Uses RAG to find relevant materials and generate an answer.
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
*/

// =============================================================================
// URL METADATA FUNCTION - ACTIVE
// =============================================================================

/**
 * Callable function to fetch URL metadata (title, site name).
 * Uses YouTube oEmbed for video URLs, HTML parsing for other sites.
 */
export const fetchUrlMetadata = onCall(
    { cors: true },
    async (request) => {
        const { url } = request.data;

        if (!url || typeof url !== 'string') {
            throw new HttpsError('invalid-argument', 'url is required');
        }

        console.log(`[Metadata] Fetching metadata for: ${url}`);

        try {
            // Validate URL format
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(url);
            } catch {
                throw new HttpsError('invalid-argument', 'Invalid URL format');
            }

            const hostname = parsedUrl.hostname.toLowerCase();

            // Check if it's a YouTube URL
            if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
                return await fetchYouTubeMetadata(url);
            }

            // For other URLs, fetch and parse HTML
            return await fetchGenericMetadata(url, hostname);
        } catch (error: any) {
            console.error('[Metadata] Error fetching metadata:', error);
            // Return a graceful fallback instead of throwing
            return {
                title: null,
                siteName: null,
                error: error.message || 'Failed to fetch metadata',
            };
        }
    }
);

/**
 * Fetch YouTube video metadata using oEmbed API
 */
async function fetchYouTubeMetadata(url: string): Promise<{ title: string | null; siteName: string }> {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

    const response = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShapeOfTheDay/1.0)' },
    });

    if (!response.ok) {
        console.log(`[Metadata] YouTube oEmbed failed with status ${response.status}`);
        return { title: null, siteName: 'YouTube' };
    }

    const data = await response.json();
    return {
        title: data.title || null,
        siteName: 'YouTube',
    };
}

/**
 * Fetch generic webpage metadata by parsing HTML
 */
async function fetchGenericMetadata(url: string, hostname: string): Promise<{ title: string | null; siteName: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ShapeOfTheDay/1.0)',
                'Accept': 'text/html',
            },
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return { title: null, siteName: hostname.replace('www.', '') };
        }

        const html = await response.text();

        // Try to extract og:title first
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);

        if (ogTitleMatch && ogTitleMatch[1]) {
            return { title: decodeHtmlEntities(ogTitleMatch[1]), siteName: hostname.replace('www.', '') };
        }

        // Fall back to <title> tag
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
            return { title: decodeHtmlEntities(titleMatch[1].trim()), siteName: hostname.replace('www.', '') };
        }

        return { title: null, siteName: hostname.replace('www.', '') };
    } catch (error: any) {
        clearTimeout(timeout);
        console.log(`[Metadata] Failed to fetch ${url}:`, error.message);
        return { title: null, siteName: hostname.replace('www.', '') };
    }
}

/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}
// =============================================================================
// MAINTENANCE FUNCTIONS - ACTIVE
// =============================================================================

/**
 * Scheduled function to clean up inactive students.
 * Runs every 30 minutes.
 * Deletes student documents from classrooms/{classId}/live_students if lastSeen is > 2 hours old.
 */
export const cleanupInactiveStudents = onSchedule('every 30 minutes', async (event) => {
    console.log('[Cleanup] Starting inactive student cleanup');

    // 2 hours ago
    const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000);
    let totalDeleted = 0;

    try {
        // 1. Query all inactive students across ALL classrooms using Collection Group query
        // This is significantly more efficient than iterating through classrooms (N+1 query pattern)
        const inactiveSnapshot = await db.collectionGroup('live_students')
            .where('lastSeen', '<', threshold)
            .get();

        if (inactiveSnapshot.empty) {
            console.log('[Cleanup] No inactive students found');
            return;
        }

        console.log(`[Cleanup] Found ${inactiveSnapshot.size} inactive students to remove`);

        // 2. Batch delete (limit 500 per batch for Firestore safety)
        const batch = db.batch();
        inactiveSnapshot.forEach(doc => {
            batch.delete(doc.ref);
            totalDeleted++;
        });
        await batch.commit();

        console.log(`[Cleanup] Finished. Total students deleted: ${totalDeleted}`);
    } catch (error) {
        console.error('[Cleanup] Error during cleanup:', error);
    }
});
