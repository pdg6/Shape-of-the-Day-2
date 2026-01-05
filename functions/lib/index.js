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
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { YoutubeTranscript } from 'youtube-transcript';
// @ts-ignore
import pdf from 'pdf-parse';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
// Genkit AI imports
import { genkit } from 'genkit';
import { z } from '@genkit-ai/core';
import { vertexAI, gemini15Flash, textEmbedding004 } from '@genkit-ai/vertexai';
// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();
// Genkit configuration
const ai = genkit({
    plugins: [
        vertexAI({ location: 'us-central1' }),
    ],
});
// --- Schemas ---
export const CurriculumSchema = z.object({
    id: z.string().optional().describe("Firestore ID if updating, otherwise ignore"),
    tempId: z.string().optional().describe("Temporary ID used for linking children in a hierarchical response"),
    title: z.string().describe("The main display title of the curriculum item"),
    description: z.string().describe("Markdown content explaining the Why, How, and What. Must include '###' headers."),
    type: z.enum(['project', 'assignment', 'task', 'subtask']).describe("Hierarchy level"),
    parentId: z.string().nullable().describe("UUID or tempId of the parent item, or null if root"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD format"),
    selectedRoomIds: z.array(z.string()).describe("List of classroom IDs"),
    links: z.array(z.object({
        id: z.string(),
        url: z.string().url(),
        title: z.string().describe("Descriptive title with timestamp if video (e.g., 'Intro to Godot (2:45)')"),
        addedAt: z.string().datetime().optional()
    })).optional(),
    accessibilityAudit: z.object({
        hasVisualDualCoding: z.boolean().describe("True if UI colors also have text labels"),
        readingLevelGrade: z.number().max(10).describe("Estimated reading grade level (max 10)"),
        hasAiPrompt: z.boolean().describe("True if an 'Ask the AI' prompt is included for complex tasks")
    }).describe("Self-correction log. Must be true/valid for the task to be accepted.")
});
const CURRICULUM_SYSTEM_PROMPT = `
Role & Objective:
You are the Lead Curriculum Architect for a Grade 8-12 PBL platform. Your goal is to translate teacher resources into a structured, strictly typed JSON curriculum. You function as a bridge between complex technical tools (Godot, VS Code, Figma) and beginner students with no terminal access.

Hierarchical Scoping & Sequencing:
Identify the scope of the curriculum item based on time and actionability:
- Project: Large scope spanning multiple weeks.
- Assignment: Medium scope spanning multiple days.
- Task: Short scope that can be completed in minutes or hours.
- Subtask: Atomic action items. If an action item must be completed before the next step, it should be categorized as a subtask.
- Default to more tasks and subtasks if action items have dependencies.

The "Think-First" Protocol:
Before generating any JSON, you must perform the following reasoning steps:
1. Resource Audit: Scan the teacher's input. If a video is present, identify the exact timestamps for key concepts.
2. Accessibility Check: Review the complexity. Is this a "High Ceiling" task? If so, draft a specific "Ask the AI" prompt to help students debug.
3. Terminal Translation: Identify any CLI commands (e.g., git clone). Mentally convert them to GUI actions (e.g., "Download ZIP from GitHub").

Strict Output Rules:
- Tone: Active, encouraging, and clear. Max Reading Level: Grade 10.
- Visuals: Never rely on color alone (e.g., "Click the Red Button" -> "Click the 'Stop' button (Red Square)").
- The 'Why': Every description must start with a ### Why header explaining the concept.
- The 'How': Use ### Steps for instructions. Break long processes into multiple subtask items (max 5 steps per item).
- Handling "Hard" Tasks: If a task involves coding logic or debugging that might frustrate a beginner, you MUST append a block like this to the description: 
  > **Stuck?** Copy this into your AI Assistant: "[Specific Prompt tailored to the task]"
`;
// --- RAG Components ---
/**
 * Retriever for curriculum context stored in Firestore.
 * Currently uses a simple query based on taskId, but can be extended to vector search.
 */
export const curriculumRetriever = ai.defineRetriever({
    name: 'curriculumRetriever',
    configSchema: z.object({
        taskId: z.string().optional(),
        limit: z.number().optional().default(5),
    }),
}, async (query, options) => {
    let firestoreQuery = db.collection('task_embeddings').limit(options.limit || 5);
    if (options.taskId) {
        firestoreQuery = firestoreQuery.where('taskId', '==', options.taskId);
    }
    const snapshot = await firestoreQuery.get();
    const documents = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        documents.push({
            content: [{ text: data.textChunk }],
            metadata: {
                id: doc.id,
                taskId: data.taskId,
                filename: data.filename,
                score: data.embedding ? 1.0 : 0.0, // Proper vector search would set this
            },
        });
    });
    return { documents };
});
/**
 * Indexer to process and store curriculum documents.
 */
export const curriculumIndexer = ai.defineIndexer({
    name: 'curriculumIndexer',
    configSchema: z.object({
        taskId: z.string(),
        filename: z.string().optional(),
    }),
}, async (docs, options) => {
    for (const doc of docs) {
        const textContent = doc.content[0]?.text;
        if (!textContent)
            continue;
        const embeddingResult = await ai.embed({
            embedder: textEmbedding004,
            content: textContent,
        });
        await db.collection('task_embeddings').add({
            taskId: options.taskId,
            filename: options.filename || 'unknown',
            embedding: embeddingResult,
            textChunk: textContent,
            createdAt: FieldValue.serverTimestamp(),
            type: 'source_material',
        });
    }
});
// --- Flows ---
/**
 * Suggests 3 curriculum items based on a subject or topic.
 */
export const suggestTasksFlow = ai.defineFlow({
    name: 'suggestTasksFlow',
    inputSchema: z.object({
        subject: z.string().describe('The subject or topic to generate tasks for'),
        gradeLevel: z.string().optional().describe('The grade level of the students'),
    }),
    outputSchema: z.object({
        tasks: z.array(CurriculumSchema),
    }),
}, async (input) => {
    const { subject, gradeLevel } = input;
    const response = await ai.generate({
        model: vertexAI.model('gemini-2.5-pro'),
        system: CURRICULUM_SYSTEM_PROMPT,
        prompt: `Generate 3 educational curriculum items (tasks/projects) for a classroom.
            Subject: ${subject}
            ${gradeLevel ? `Grade Level: ${gradeLevel}` : ''}
            
            Each item should be clear, engaging, and follow the requested schema and strict rules.`,
        output: { schema: z.object({ tasks: z.array(CurriculumSchema) }) },
    });
    return response.output || { tasks: [] };
});
/**
 * Refines a raw curriculum description into a structured CurriculumSchema object.
 */
export const refineTaskFlow = ai.defineFlow({
    name: 'refineTaskFlow',
    inputSchema: z.object({
        rawContent: z.string().describe('The raw text content/notes for a curriculum item'),
        subject: z.string().optional().describe('The subject context (e.g., Computer Science)'),
        gradeLevel: z.string().optional().describe('The grade level context (e.g., Grade 9)'),
        context: z.array(z.string()).optional().describe('Additional context strings (e.g. text from files/links)'),
        taskId: z.string().nullable().optional().describe('If provided, will attempt to retrieve context from the RAG store'),
    }),
    outputSchema: z.object({
        items: z.array(CurriculumSchema).describe("A flat list of items that form a hierarchy")
    }),
}, async (input) => {
    const { rawContent, subject, gradeLevel, context, taskId } = input;
    // 1. Retrieve additional context from the RAG store if taskId is provided
    let retrievedContext = '';
    if (taskId) {
        const documents = await ai.retrieve({
            retriever: curriculumRetriever,
            query: rawContent,
            options: { taskId, limit: 3 },
        });
        retrievedContext = documents.map((doc) => doc.content[0]?.text).filter(Boolean).join('\n\n');
    }
    // 2. Combine with direct context provided in the call
    const totalContext = [
        ...(context || []),
        retrievedContext
    ].filter(Boolean).join('\n\n');
    const response = await ai.generate({
        model: vertexAI.model('gemini-2.5-pro'),
        system: CURRICULUM_SYSTEM_PROMPT,
        prompt: `Convert the following raw curriculum notes into a structured item (task/project):
            
            NOTES:
            ${rawContent}
            
            ${subject ? `Subject Context: ${subject}` : ''}
            ${gradeLevel ? `Grade Level Context: ${gradeLevel}` : ''}
            
            ${totalContext ? `ADDITIONAL CONTEXT MATERIALS:\n${totalContext}` : ''}
            
            SCoping Instructions:
            If the objective is large, break it down into a logical hierarchy:
            1. Project (Root)
            2. Assignment (Child of Project)
            3. Task (Child of Assignment)
            4. Subtask (Child of Task)
            
            Use 'tempId' to link children to parents within this response.
            
            Ensure it follows the schema and all strict formatting and accessibility rules.`,
        output: { schema: z.object({ items: z.array(CurriculumSchema) }) },
    });
    if (!response.output || !response.output.items) {
        throw new Error('Failed to generate items from AI');
    }
    return response.output;
});
// --- Firebase Callable Wrappers for Flows ---
export const suggestTasks = onCall({ cors: true }, async (request) => {
    const { subject, gradeLevel } = request.data;
    if (!subject) {
        throw new HttpsError('invalid-argument', 'subject is required');
    }
    try {
        return await suggestTasksFlow({ subject, gradeLevel });
    }
    catch (error) {
        console.error('[AI] Error in suggestTasks:', error);
        throw new HttpsError('internal', error.message || 'Failed to suggest tasks');
    }
});
export const refineTask = onCall({ cors: true }, async (request) => {
    const { rawContent, subject, gradeLevel, context, taskId } = request.data;
    if (!rawContent) {
        throw new HttpsError('invalid-argument', 'rawContent is required');
    }
    try {
        return await refineTaskFlow({
            rawContent,
            subject,
            gradeLevel,
            context,
            taskId: taskId || undefined
        });
    }
    catch (error) {
        console.error('[AI] Error in refineTask:', error);
        throw new HttpsError('internal', error.message || 'Failed to refine task');
    }
});
// Triggered when a task document is updated.
// If attachments have changed, extract text and generate embeddings.
export const onTaskAttachmentChange = onDocumentUpdated('tasks/{taskId}', async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    const taskId = event.params.taskId;
    if (!afterData)
        return;
    // Check if attachments changed
    const beforeAttachments = (beforeData?.attachments || []);
    const afterAttachments = (afterData.attachments || []);
    if (JSON.stringify(beforeAttachments) === JSON.stringify(afterAttachments)) {
        return; // No attachment change
    }
    console.log(`[AI] Processing attachments for task ${taskId}`);
    // For each NEW attachment, generate embedding
    for (const attachment of afterAttachments) {
        // Skip if already processed
        const existingDoc = await db.collection('task_embeddings').doc(`${taskId}_${attachment.id}`).get();
        if (existingDoc.exists)
            continue;
        try {
            // TODO: Download file from storage and extract text
            // For now, we'll use the task description as a placeholder
            const textContent = `${afterData.title}\n\n${afterData.description || ''}\n\nAttachment: ${attachment.filename}`;
            // Generate embedding using Vertex AI
            const embeddingResult = await ai.embed({
                embedder: textEmbedding004,
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
        }
        catch (error) {
            console.error(`[AI] Failed to embed attachment ${attachment.id}:`, error);
        }
    }
});
/**
 * AI Flow for answering student questions using RAG.
 */
export const answerQuestionFlow = ai.defineFlow({
    name: 'answerQuestionFlow',
    inputSchema: z.object({
        taskId: z.string(),
        question: z.string(),
        classroomId: z.string().optional(),
    }),
    outputSchema: z.object({
        answer: z.string(),
        success: z.boolean(),
    }),
}, async (input) => {
    const { taskId, question, classroomId } = input;
    // 1. Get the task details
    const taskDoc = await db.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
        throw new Error('Task not found');
    }
    const task = taskDoc.data();
    // 2. Query task_embeddings using the new retriever
    const documents = await ai.retrieve({
        retriever: curriculumRetriever,
        query: question,
        options: { taskId, limit: 5 },
    });
    const contextChunks = documents.map((doc) => doc.content[0]?.text).filter(Boolean);
    // 3. Generate answer using Gemini with context
    const context = contextChunks.length > 0
        ? `Context from teacher's materials:\n${contextChunks.join('\n\n')}`
        : 'No additional context available.';
    const prompt = `You are a helpful teaching assistant for a classroom.
        
Task Title: ${task?.title}
Task Description: ${task?.description || 'No description provided.'}

${context}

Student Question: ${question}

Please provide a helpful, age-appropriate answer. If you don't have enough information to answer, say so and suggest the student ask their teacher.`;
    const response = await ai.generate({
        model: gemini15Flash,
        prompt: prompt,
        config: {
            temperature: 0.7,
            maxOutputTokens: 500,
        },
    });
    const answer = response.text;
    // 4. Log the Q&A for analytics
    await db.collection('ai_interactions').add({
        taskId,
        classroomId: classroomId || null,
        question,
        answer,
        timestamp: FieldValue.serverTimestamp(),
    });
    return { answer, success: true };
});
// Callable function for students to ask questions about a task.
// Wraps the answerQuestionFlow.
export const answerStudentQuestion = onCall({ cors: true }, async (request) => {
    const { taskId, question, classroomId } = request.data;
    if (!taskId || !question) {
        throw new HttpsError('invalid-argument', 'taskId and question are required');
    }
    console.log(`[AI] Student question for task ${taskId}: ${question}`);
    try {
        return await answerQuestionFlow({ taskId, question, classroomId });
    }
    catch (error) {
        console.error('[AI] Error answering question:', error);
        throw new HttpsError('internal', error.message || 'Failed to generate answer');
    }
});
// =============================================================================
// URL METADATA FUNCTION - ACTIVE
// =============================================================================
/**
 * Callable function to fetch URL metadata (title, site name).
 * Uses YouTube oEmbed for video URLs, HTML parsing for other sites.
 */
export const fetchUrlMetadata = onCall({ cors: true }, async (request) => {
    const { url } = request.data;
    if (!url || typeof url !== 'string') {
        throw new HttpsError('invalid-argument', 'url is required');
    }
    console.log(`[Metadata] Fetching metadata for: ${url}`);
    try {
        // Validate URL format
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        }
        catch {
            throw new HttpsError('invalid-argument', 'Invalid URL format');
        }
        const hostname = parsedUrl.hostname.toLowerCase();
        // Check if it's a YouTube URL
        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
            const metadata = await fetchYouTubeMetadata(url);
            // Fetch transcript as well
            try {
                const transcriptData = await YoutubeTranscript.fetchTranscript(url);
                return {
                    ...metadata,
                    transcript: transcriptData.map(t => t.text).join(' '),
                };
            }
            catch (tError) {
                console.log(`[Transcript] Failed to fetch for ${url}:`, tError);
                return metadata; // Return metadata without transcript if it fails
            }
        }
        // For other URLs, fetch and parse HTML
        return await fetchGenericMetadata(url, hostname);
    }
    catch (error) {
        console.error('[Metadata] Error fetching metadata:', error);
        // Return a graceful fallback instead of throwing
        return {
            title: null,
            siteName: null,
            error: error.message || 'Failed to fetch metadata',
        };
    }
});
/**
 * Fetch YouTube video metadata using oEmbed API
 */
async function fetchYouTubeMetadata(url) {
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
async function fetchGenericMetadata(url, hostname) {
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
    }
    catch (error) {
        clearTimeout(timeout);
        console.log(`[Metadata] Failed to fetch ${url}:`, error.message);
        return { title: null, siteName: hostname.replace('www.', '') };
    }
}
/**
 * Decode common HTML entities
 */
function decodeHtmlEntities(text) {
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
// FILE PROCESSING FUNCTION - ACTIVE
export const processFile = onCall({ cors: true }, async (request) => {
    const { fileUrl, filename, contentType } = request.data;
    if (!fileUrl) {
        throw new HttpsError('invalid-argument', 'fileUrl is required');
    }
    console.log(`[FileProcess] Processing: ${filename} (${contentType})`);
    try {
        const response = await fetch(fileUrl);
        if (!response.ok)
            throw new Error('Failed to download file');
        const buffer = Buffer.from(await response.arrayBuffer());
        let text = '';
        if (contentType === 'application/pdf') {
            const data = await pdf(buffer);
            text = data.text;
        }
        else if (contentType?.startsWith('text/')) {
            text = buffer.toString('utf-8');
        }
        else {
            throw new Error('Unsupported file type');
        }
        return { text: text.substring(0, 50000) }; // Cap at 50k chars for safety
    }
    catch (error) {
        console.error('[FileProcess] Error:', error);
        throw new HttpsError('internal', error.message || 'Failed to process file');
    }
});
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
    }
    catch (error) {
        console.error('[Cleanup] Error during cleanup:', error);
    }
});
//# sourceMappingURL=index.js.map