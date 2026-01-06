/**
 * Firebase Cloud Functions - Shape of the Day AI Agents
 * 
 * Entry point for all Cloud Functions.
 */
import * as dotenv from 'dotenv';
dotenv.config();

/**
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
import { googleAI } from '@genkit-ai/google-genai';
import { GoogleGenAI } from '@google/genai';

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();
const storage = getStorage();

// Project configuration from environment
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'shape-of-the-day';
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

// Initialize New Google Gen AI SDK
const genai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// Genkit configuration (keeping for RAG and Flow structure)
const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY })], // Moving model logic to direct SDK
});

// --- Schemas ---

export const CurriculumSchema = z.object({
    id: z.string().optional().describe("Firestore ID if updating, otherwise ignore"),
    tempId: z.string().optional().describe("Temporary ID used for linking children in a hierarchical response"),
    type: z.enum(['project', 'assignment', 'task', 'subtask']).describe("Hierarchy level"),
    title: z.string().describe("The main display title of the curriculum item"),
    structuredContent: z.object({
        keyConcepts: z.array(z.string()).describe("List of 3-5 technical terms or skills covered. Value only."),
        troubleshooting: z.string().optional().describe("A first-person 'Ask the AI' prompt for when a student is stuck. Example: 'Help me fix the...' or 'How do I...'"),
        rationale: z.string().describe("A concise explanation of the learning objective. Value only, no labels."),
        instructions: z.array(z.string()).describe("Step-by-step verifiable action items. Max 5 steps. Value only."),
    }).describe("The core pedagogical content broken into logical sections."),
    parentId: z.string().nullable().describe("UUID or tempId of the parent item, or null if root"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD format"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD format"),
    links: z.array(z.object({
        id: z.string(),
        url: z.string().url(),
        title: z.string().describe("Descriptive title with timestamp if video (e.g., 'Intro to Godot (2:45)')"),
        addedAt: z.string().datetime().optional()
    })).optional(),
    accessibilityAudit: z.object({
        readingLevelGrade: z.number().max(10).describe("Estimated reading grade level (max 10)"),
        hasVisualDualCoding: z.boolean().describe("True if UI colors also have text labels"),
        hasAiPrompt: z.boolean().describe("True if troubleshooting prompt is included"),
        hasAlternativePath: z.boolean().describe("True if the activity has a simplified 'Plan B' for accessibility")
    }).describe("Self-correction log. Must be true/valid for the task to be accepted.")
});

/**
 * Backend Scrubber: Recursively strips unwanted markdown headers and labels from AI output.
 */
const scrubAiOutput = (obj: any): any => {
    if (typeof obj === 'string') {
        return obj
            .replace(/^(###?\s*)+(Why|Steps|Rationale|Instructions|Troubleshooting|Debugging|Concepts|Audit):?\s*/im, '')
            .replace(/^###+\s*/gm, '')
            .replace(/^\*\*(Why|Steps|Rationale|Instructions|Troubleshooting|Debugging|Concepts|Audit)\*\*:?\s*/im, '')
            .replace(/^(Why|Steps|Rationale|Instructions|Troubleshooting|Debugging|Concepts|Audit):?\s*/im, '')
            .replace(/^[#*>\-]+\s*/, '')
            .trim();
    }
    if (Array.isArray(obj)) {
        return obj.map(scrubAiOutput);
    }
    if (typeof obj === 'object' && obj !== null) {
        const scrubbed: any = {};
        for (const key in obj) {
            scrubbed[key] = scrubAiOutput(obj[key]);
        }
        return scrubbed;
    }
    return obj;
};

const CURRICULUM_SYSTEM_PROMPT = `
You are a curriculum designer for a Grade 9-10 classroom platform.

Your job: Convert teacher notes into structured JSON curriculum items.

AUDIENCE: Beginner students with NO terminal access. All instructions must use GUI tools (VS Code, Godot Editor, Browser).

ITEM TYPES:
- project: Multi-week goal
- assignment: Multi-session milestone  
- task: Single session activity
- subtask: One atomic action

OUTPUT RULES:
1. "rationale" field: One sentence stating the learning value. Just the value, nothing else.
2. "instructions" field: Array of discrete action strings. Max 5 steps.
3. "troubleshooting" field: Create a first-person AI prompt for the student (e.g. "I'm having trouble with... can you help?").
4. "keyConcepts" field: 3-5 technical terms (skills/concepts).
5. STRICT PLAIN TEXT ONLY. NEVER include markdown headers (###), bold (**), or labels (e.g., "Why:", "Steps:").
6. The presence of any "###" or "**Label:**" will result in a parsing error and task rejection.
7. Use active voice: "Click the button" not "The button should be clicked"
8. Keep reading level at Grade 10 or below.
`;

// --- RAG Components ---

/**
 * Retriever for curriculum context stored in Firestore.
 * Currently uses a simple query based on taskId, but can be extended to vector search.
 */
export const curriculumRetriever = ai.defineRetriever(
    {
        name: 'curriculumRetriever',
        configSchema: z.object({
            taskId: z.string().optional(),
            limit: z.number().optional().default(5),
        }),
    },
    async (query, options) => {
        let firestoreQuery = db.collection('task_embeddings').limit(options.limit || 5);

        if (options.taskId) {
            firestoreQuery = firestoreQuery.where('taskId', '==', options.taskId);
        }

        const snapshot = await firestoreQuery.get();
        const documents: any[] = [];
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
    }
);

/**
 * Indexer to process and store curriculum documents.
 */
export const curriculumIndexer = ai.defineIndexer(
    {
        name: 'curriculumIndexer',
        configSchema: z.object({
            taskId: z.string(),
            filename: z.string().optional(),
        }),
    },
    async (docs, options) => {
        for (const doc of docs) {
            const textContent = doc.content[0]?.text;
            if (!textContent) continue;

            const embeddingResult = await ai.embed({
                embedder: googleAI.embedder('text-embedding-004'),
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
    }
);

// --- Flows ---

/**
 * Suggests 3 curriculum items based on a subject or topic.
 */
export const suggestTasksFlow = ai.defineFlow(
    {
        name: 'suggestTasksFlow',
        inputSchema: z.object({
            subject: z.string().describe('The subject or topic to generate tasks for'),
            gradeLevel: z.string().optional().describe('The grade level of the students'),
        }),
        outputSchema: z.object({
            tasks: z.array(CurriculumSchema),
            thoughts: z.string().optional(),
        }),
    },
    async (input) => {
        const { subject, gradeLevel } = input;

        const response = await genai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: `Generate 3 educational curriculum items (tasks/projects).
            Subject: ${subject}
            ${gradeLevel ? `Grade Level: ${gradeLevel}` : ''}
            
            Follow the Gold Standard schema and strict rules.`,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: CURRICULUM_SYSTEM_PROMPT,
                temperature: 0,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        tasks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['project', 'assignment', 'task', 'subtask'] },
                                    title: { type: 'string', description: 'Concise title.' },
                                    structuredContent: {
                                        type: 'object',
                                        properties: {
                                            keyConcepts: { type: 'array', items: { type: 'string' } },
                                            troubleshooting: { type: 'string', description: 'Student-facing AI prompt. Example: "I\'m stuck on... help?"' },
                                            rationale: { type: 'string', description: 'Learning value. No labels.' },
                                            instructions: { type: 'array', items: { type: 'string' } },
                                        },
                                        required: ['rationale', 'instructions', 'keyConcepts'],
                                    },
                                    accessibilityAudit: {
                                        type: 'object',
                                        properties: {
                                            readingLevelGrade: { type: 'number' },
                                            hasVisualDualCoding: { type: 'boolean' },
                                            hasAiPrompt: { type: 'boolean' },
                                            hasAlternativePath: { type: 'boolean' }
                                        },
                                        required: ['hasVisualDualCoding', 'readingLevelGrade', 'hasAiPrompt', 'hasAlternativePath']
                                    }
                                },
                                required: ['title', 'type', 'structuredContent', 'accessibilityAudit'],
                            }
                        }
                    },
                    required: ['tasks']
                }
            }
        });

        const text = response.text;
        const thoughts = response.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.thought)
            ?.map((p: any) => p.text)
            .join('\n') || '';

        if (!text) {
            return { tasks: [], thoughts };
        }

        try {
            const output = JSON.parse(text);
            const scrubbedTasks = (output?.tasks || []).map(scrubAiOutput);
            return {
                tasks: scrubbedTasks,
                thoughts
            };
        } catch (e) {
            console.error('Failed to parse AI response:', e);
            return { tasks: [], thoughts };
        }
    }
);

/**
 * Refines a raw curriculum description into a structured CurriculumSchema object.
 */
export const refineTaskFlow = ai.defineFlow(
    {
        name: 'refineTaskFlow',
        inputSchema: z.object({
            rawContent: z.string().describe('The raw text content/notes for a curriculum item'),
            subject: z.string().optional().describe('The subject context (e.g., Computer Science)'),
            gradeLevel: z.string().optional().describe('The grade level context (e.g., Grade 9)'),
            context: z.array(z.string()).optional().describe('Additional context strings (e.g. text from files/links)'),
            taskId: z.string().nullable().optional().describe('If provided, will attempt to retrieve context from the RAG store'),
            existingItems: z.array(CurriculumSchema).optional().describe('Previously generated items for multi-turn refinement'),
        }),
        outputSchema: z.object({
            items: z.array(CurriculumSchema).describe("A flat list of items that form a hierarchy"),
            thoughts: z.string().optional(),
        }),
    },
    async (input) => {
        const { rawContent, subject, gradeLevel, context, taskId, existingItems } = input;

        // 1. Retrieve additional context from the RAG store if taskId is provided
        let retrievedContext = '';
        if (taskId) {
            const documents = await ai.retrieve({
                retriever: curriculumRetriever,
                query: rawContent,
                options: { taskId, limit: 3 },
            });
            retrievedContext = documents.map((doc: any) => doc.content[0]?.text).filter(Boolean).join('\n\n');
        }

        // 2. Combine with direct context provided in the call
        const totalContext = [
            ...(context || []),
            retrievedContext
        ].filter(Boolean).join('\n\n');

        const promptParts = [
            `Convert or refine the following curriculum notes into structured items:`,
            `NOTES:\n${rawContent}`,
        ];

        if (existingItems && existingItems.length > 0) {
            promptParts.push(`EXISTING DRAFT ITEMS:\n${JSON.stringify(existingItems, null, 2)}`);
            promptParts.push(`INSTRUCTION: Update or expand upon these existing items based on the notes above.`);
        }

        if (subject) promptParts.push(`Subject Context: ${subject}`);
        if (gradeLevel) promptParts.push(`Grade Level Context: ${gradeLevel}`);
        if (totalContext) promptParts.push(`ADDITIONAL CONTEXT MATERIALS:\n${totalContext}`);

        promptParts.push(`Scoping: Break down Project -> Assignment -> Task -> Subtask. Use tempId for linking. Ensure strict plain text output (NO ### HEADERS).`);

        const combinedPrompt = promptParts.join('\n\n');

        const response = await genai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: combinedPrompt,
            config: {
                tools: [{ googleSearch: {} }],
                systemInstruction: CURRICULUM_SYSTEM_PROMPT,
                temperature: 0,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    tempId: { type: 'string' },
                                    type: { type: 'string', enum: ['project', 'assignment', 'task', 'subtask'] },
                                    title: { type: 'string', description: 'Concise title.' },
                                    structuredContent: {
                                        type: 'object',
                                        properties: {
                                            keyConcepts: { type: 'array', items: { type: 'string' } },
                                            troubleshooting: { type: 'string', description: 'Student-facing prompt.' },
                                            rationale: { type: 'string', description: 'Learning value.' },
                                            instructions: { type: 'array', items: { type: 'string' } },
                                        },
                                        required: ['rationale', 'instructions', 'keyConcepts'],
                                    },
                                    parentId: { type: 'string', nullable: true },
                                    accessibilityAudit: {
                                        type: 'object',
                                        properties: {
                                            readingLevelGrade: { type: 'number' },
                                            hasVisualDualCoding: { type: 'boolean' },
                                            hasAiPrompt: { type: 'boolean' },
                                            hasAlternativePath: { type: 'boolean' }
                                        },
                                        required: ['hasVisualDualCoding', 'readingLevelGrade', 'hasAiPrompt', 'hasAlternativePath']
                                    }
                                },
                                required: ['title', 'type', 'structuredContent', 'accessibilityAudit'],
                            }
                        }
                    },
                    required: ['items']
                }
            }
        });

        const text = response.text;
        const thoughts = response.candidates?.[0]?.content?.parts
            ?.filter((p: any) => p.thought)
            ?.map((p: any) => p.text)
            .join('\n') || '';

        if (!text) {
            throw new Error('Failed to generate items from AI: Empty response');
        }

        try {
            const output = JSON.parse(text);
            if (!output || !output.items) {
                throw new Error('Failed to generate items from AI: Invalid structured output');
            }
            const scrubbedItems = (output.items || []).map(scrubAiOutput);
            return {
                items: scrubbedItems,
                thoughts
            };
        } catch (e) {
            console.error('Failed to parse AI response:', e);
            throw new Error('Failed to parse AI response');
        }
    }
);

// --- Firebase Callable Wrappers for Flows ---

export const suggestTasks = onCall(
    { cors: true },
    async (request) => {
        const { subject, gradeLevel } = request.data;
        if (!subject) {
            throw new HttpsError('invalid-argument', 'subject is required');
        }
        try {
            return await suggestTasksFlow({ subject, gradeLevel });
        } catch (error: any) {
            console.error('[AI] Error in suggestTasks:', error);
            throw new HttpsError('internal', error.message || 'Failed to suggest tasks');
        }
    }
);

export const refineTask = onCall(
    { cors: true },
    async (request) => {
        const { rawContent, subject, gradeLevel, context, taskId, existingItems } = request.data;
        if (!rawContent) {
            throw new HttpsError('invalid-argument', 'rawContent is required');
        }
        try {
            return await refineTaskFlow({
                rawContent,
                subject,
                gradeLevel,
                context,
                taskId: taskId || undefined,
                existingItems
            });
        } catch (error: any) {
            console.error('[AI] Error in refineTask:', error);
            throw new HttpsError('internal', error.message || 'Failed to refine task');
        }
    }
);

/**
 * AI Flow for analyzing student struggles in a classroom.
 */
export const analyzeStrugglesFlow = ai.defineFlow(
    {
        name: 'analyzeStrugglesFlow',
        inputSchema: z.object({
            classroomId: z.string(),
            taskIds: z.array(z.string()).optional(),
        }),
        outputSchema: z.object({
            summary: z.string(),
            topStruggles: z.array(z.string()),
            suggestions: z.array(z.string()),
        }),
    },
    async (input) => {
        const { classroomId, taskIds } = input;

        // 1. Fetch all unresolved questions for the class
        // Collection group query might be better if we want ALL questions, 
        // but for now we'll query per task if provided, or all tasks in the class.
        let questions: any[] = [];

        const tasksSnapshot = await db.collection('tasks')
            .where('selectedRoomIds', 'array-contains', classroomId)
            .get();

        for (const taskDoc of tasksSnapshot.docs) {
            if (taskIds && !taskIds.includes(taskDoc.id)) continue;

            const qSnapshot = await taskDoc.ref.collection('questions')
                .where('resolved', '==', false)
                .get();

            qSnapshot.forEach(doc => {
                questions.push({
                    taskId: taskDoc.id,
                    taskTitle: taskDoc.data().title,
                    ...doc.data()
                });
            });
        }

        if (questions.length === 0) {
            return {
                summary: "No active struggles detected. Everyone seems to be on track!",
                topStruggles: [],
                suggestions: []
            };
        }

        // 2. Format context for AI
        const context = questions.map(q =>
            `[Task: ${q.taskTitle}] ${q.studentName}: "${q.question}"`
        ).join('\n');

        const prompt = `You are a pedagogical analyst for a teacher. 
        Analyze these student questions and summarize the friction points in the class.
        
        STUDENT DATA:
        ${context}
        
        OUTPUT RULES:
        1. Summary: 2-3 sentences max.
        2. Top Struggles: List 2-3 specific conceptual blockers.
        3. Suggestions: 2-3 actionable tips for the teacher (e.g., "Clarify the use of signals in Godot").`;

        const response = await genai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        summary: { type: 'string' },
                        topStruggles: { type: 'array', items: { type: 'string' } },
                        suggestions: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['summary', 'topStruggles', 'suggestions']
                }
            }
        });

        const output = JSON.parse(response.text || '{}');
        return output;
    }
);

/**
 * AI Flow for suggesting scaffolding tasks.
 */
export const suggestScaffoldingFlow = ai.defineFlow(
    {
        name: 'suggestScaffoldingFlow',
        inputSchema: z.object({
            classroomId: z.string(),
            struggleSummary: z.string().optional(),
        }),
        outputSchema: z.object({
            suggestedTasks: z.array(CurriculumSchema),
        }),
    },
    async (input) => {
        const { struggleSummary } = input;

        const prompt = `You are an instructional designer. 
        Based on these class struggles, suggest 1-2 bridging "Scaffolding" tasks to help students understand the concepts better.
        
        CLASS STRUGGLES:
        ${struggleSummary || 'General extension needed.'}
        
        Follow the Gold Standard schema. Set the type to 'task' or 'subtask'.`;

        const response = await genai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                systemInstruction: CURRICULUM_SYSTEM_PROMPT,
                temperature: 0.3,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'object',
                    properties: {
                        suggestedTasks: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', enum: ['task', 'subtask'] },
                                    title: { type: 'string' },
                                    structuredContent: {
                                        type: 'object',
                                        properties: {
                                            keyConcepts: { type: 'array', items: { type: 'string' } },
                                            troubleshooting: { type: 'string' },
                                            rationale: { type: 'string' },
                                            instructions: { type: 'array', items: { type: 'string' } },
                                        },
                                        required: ['rationale', 'instructions', 'keyConcepts'],
                                    },
                                    accessibilityAudit: {
                                        type: 'object',
                                        properties: {
                                            readingLevelGrade: { type: 'number' },
                                            hasVisualDualCoding: { type: 'boolean' },
                                            hasAiPrompt: { type: 'boolean' },
                                            hasAlternativePath: { type: 'boolean' }
                                        },
                                        required: ['hasVisualDualCoding', 'readingLevelGrade', 'hasAiPrompt', 'hasAlternativePath']
                                    }
                                },
                                required: ['title', 'type', 'structuredContent', 'accessibilityAudit'],
                            }
                        }
                    },
                    required: ['suggestedTasks']
                }
            }
        });

        const output = JSON.parse(response.text || '{}');
        const scrubbedTasks = (output?.suggestedTasks || []).map(scrubAiOutput);
        return { suggestedTasks: scrubbedTasks };
    }
);

/**
 * AI Flow for expanding task instructions for a student.
 */
export const expandTaskInstructionsFlow = ai.defineFlow(
    {
        name: 'expandTaskInstructionsFlow',
        inputSchema: z.object({
            taskId: z.string(),
            currentInstructions: z.array(z.string()),
        }),
        outputSchema: z.object({
            expandedInstructions: z.array(z.string()),
        }),
    },
    async (input) => {
        const { currentInstructions } = input;

        const prompt = `You are a supportive tutor. 
        Take these instructions and break them down into even more granular, simple, 
        and supportive steps for a student who is struggling.
        
        ORIGINAL STEPS:
        ${currentInstructions.join('\n')}
        
        OUTPUT RULES:
        - Max 10 steps.
        - Use very simple language.
        - Focus on one tiny action per step.
        - No markdown headers or bold text.`;

        const response = await ai.generate({
            model: googleAI.model('gemini-1.5-flash'),
            prompt: prompt,
            config: { temperature: 0 },
        });

        const text = response.text;
        const expandedInstructions = text.split('\n')
            .map(line => line.replace(/^[#*>\-0-9.\s]+/, '').trim())
            .filter(Boolean);

        return { expandedInstructions };
    }
);

// --- Firebase Callable Wrappers for New Flows ---

export const analyzeStruggles = onCall(
    { cors: true },
    async (request) => {
        const { classroomId, taskIds } = request.data;
        if (!classroomId) {
            throw new HttpsError('invalid-argument', 'classroomId is required');
        }
        try {
            return await analyzeStrugglesFlow({ classroomId, taskIds });
        } catch (error: any) {
            console.error('[AI] Error in analyzeStruggles:', error);
            throw new HttpsError('internal', error.message || 'Failed to analyze struggles');
        }
    }
);

export const suggestScaffolding = onCall(
    { cors: true },
    async (request) => {
        const { classroomId, struggleSummary } = request.data;
        if (!classroomId) {
            throw new HttpsError('invalid-argument', 'classroomId is required');
        }
        try {
            return await suggestScaffoldingFlow({ classroomId, struggleSummary });
        } catch (error: any) {
            console.error('[AI] Error in suggestScaffolding:', error);
            throw new HttpsError('internal', error.message || 'Failed to suggest scaffolding');
        }
    }
);

export const expandTaskInstructions = onCall(
    { cors: true },
    async (request) => {
        const { taskId, currentInstructions } = request.data;
        if (!taskId || !currentInstructions) {
            throw new HttpsError('invalid-argument', 'taskId and currentInstructions are required');
        }
        try {
            return await expandTaskInstructionsFlow({ taskId, currentInstructions });
        } catch (error: any) {
            console.error('[AI] Error in expandTaskInstructions:', error);
            throw new HttpsError('internal', error.message || 'Failed to expand instructions');
        }
    }
);

/**
 * Helper to index content into the vector database.
 */
async function indexContent(taskId: string, sourceId: string, filename: string, text: string) {
    if (!text || text.trim().length === 0) return;

    // Use Genkit indexer
    await ai.index({
        indexer: curriculumIndexer,
        documents: [{
            content: [{ text }],
            metadata: { taskId, filename }
        }],
        options: { taskId, filename }
    });

    console.log(`[AI] Indexed ${filename} for task ${taskId}`);
}

// Triggered when a task document is updated.
// If attachments or links have changed, extract text and generate embeddings.
export const onTaskAttachmentChange = onDocumentUpdated(
    'tasks/{taskId}',
    async (event) => {
        const beforeData = event.data?.before.data();
        const afterData = event.data?.after.data();
        const taskId = event.params.taskId;

        if (!afterData) return;

        // 1. Process File Attachments
        const afterAttachments = (afterData.attachments || []) as any[];
        const beforeAttachments = (beforeData?.attachments || []) as any[];

        for (const attachment of afterAttachments) {
            const isNew = !beforeAttachments.some((pa: any) => pa.id === attachment.id);
            if (!isNew) continue;

            try {
                // Skip if already processed
                const existingDoc = await db.collection('task_embeddings')
                    .where('taskId', '==', taskId)
                    .where('filename', '==', attachment.filename)
                    .limit(1)
                    .get();
                if (!existingDoc.empty) continue;

                console.log(`[AI] Processing new attachment: ${attachment.filename}`);

                const response = await fetch(attachment.url);
                if (!response.ok) throw new Error('Failed to download attachment');
                const buffer = Buffer.from(await response.arrayBuffer());

                let text = '';
                if (attachment.mimeType === 'application/pdf') {
                    const data = await pdf(buffer);
                    text = data.text;
                } else if (attachment.mimeType?.startsWith('text/')) {
                    text = buffer.toString('utf-8');
                }

                if (text) {
                    await indexContent(taskId, attachment.id, attachment.filename, text);
                }
            } catch (error) {
                console.error(`[AI] Failed to process attachment ${attachment.id}:`, error);
            }
        }

        // 2. Process YouTube Links
        const afterLinks = (afterData.links || []) as any[];
        const beforeLinks = (beforeData?.links || []) as any[];

        for (const link of afterLinks) {
            const isNew = !beforeLinks.some((pl: any) => pl.id === link.id);
            if (!isNew) continue;

            if (link.url.includes('youtube.com') || link.url.includes('youtu.be')) {
                try {
                    const existingDoc = await db.collection('task_embeddings')
                        .where('taskId', '==', taskId)
                        .where('filename', '==', `Transcript: ${link.title}`)
                        .limit(1)
                        .get();
                    if (!existingDoc.empty) continue;

                    console.log(`[AI] Processing new YouTube link: ${link.url}`);
                    const transcriptData = await YoutubeTranscript.fetchTranscript(link.url);
                    const transcript = transcriptData.map(t => t.text).join(' ');

                    if (transcript) {
                        await indexContent(taskId, link.id, `Transcript: ${link.title || 'YouTube Video'}`, transcript);
                    }
                } catch (error) {
                    console.log(`[AI] Failed to fetch transcript for ${link.url}:`, error);
                }
            }
        }
    }
);

/**
 * AI Flow for answering student questions using RAG.
 */
export const answerQuestionFlow = ai.defineFlow(
    {
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
    },
    async (input) => {
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

        const contextChunks = documents.map((doc: any) => doc.content[0]?.text).filter(Boolean);

        // 3. Generate answer using Gemini with context
        const context = contextChunks.length > 0
            ? `Context from teacher's materials (Notes, PDFs, Transcripts):\n${contextChunks.join('\n\n')}`
            : 'No additional context available.';

        const prompt = `You are a supportive, encouraging AI Tutor for a student working on a specific task.
        
PEDAGOGICAL RULES:
1. NEVER provide a step-by-step solution.
2. NEVER complete the task for the student. 
3. If a student asks you to solve it or give the answer, politely decline and explain that you are here to help them learn by doing it themselves.
4. Instead of answers, provide:
   - Conceptual hints.
   - Clarifying questions (e.g., "What do you think happens when you click that?")
   - Guidance on where to look in the provided materials.
5. Reference the teacher's materials (attached files/videos) by name when possible.

Task Title: ${task?.title}
${task?.description ? `Task Description: ${task.description}` : ''}

${context}

Student Question: ${question}

Provide a "tutor-style" response that guides them toward the answer. Use a friendly, Grade 9-10 appropriate tone.`;

        const response = await genai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 500,
            },
        });

        const answer = response.text || "I'm sorry, I couldn't generate an answer. Please try again or ask your teacher.";

        // 4. Log the Q&A for analytics
        await db.collection('ai_interactions').add({
            taskId,
            classroomId: classroomId || null,
            question,
            answer,
            timestamp: FieldValue.serverTimestamp(),
        });

        return {
            answer,
            success: !!response.text
        };
    }
);

// Callable function for students to ask questions about a task.
// Wraps the answerQuestionFlow.
export const answerStudentQuestion = onCall(
    { cors: true },
    async (request) => {
        const { taskId, question, classroomId } = request.data;

        if (!taskId || !question) {
            throw new HttpsError('invalid-argument', 'taskId and question are required');
        }

        console.log(`[AI] Student question for task ${taskId}: ${question}`);

        try {
            return await answerQuestionFlow({ taskId, question, classroomId });
        } catch (error: any) {
            console.error('[AI] Error answering question:', error);
            throw new HttpsError('internal', error.message || 'Failed to generate answer');
        }
    }
);

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
                const metadata = await fetchYouTubeMetadata(url);

                // Fetch transcript as well
                try {
                    const transcriptData = await YoutubeTranscript.fetchTranscript(url);
                    return {
                        ...metadata,
                        transcript: transcriptData.map(t => t.text).join(' '),
                    };
                } catch (tError) {
                    console.log(`[Transcript] Failed to fetch for ${url}:`, tError);
                    return metadata; // Return metadata without transcript if it fails
                }
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
// FILE PROCESSING FUNCTION - ACTIVE
export const processFile = onCall(
    { cors: true },
    async (request) => {
        const { fileUrl, filename, contentType } = request.data;

        if (!fileUrl) {
            throw new HttpsError('invalid-argument', 'fileUrl is required');
        }

        console.log(`[FileProcess] Processing: ${filename} (${contentType})`);

        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error('Failed to download file');

            const buffer = Buffer.from(await response.arrayBuffer());
            let text = '';

            if (contentType === 'application/pdf') {
                const data = await pdf(buffer);
                text = data.text;
            } else if (contentType?.startsWith('text/')) {
                text = buffer.toString('utf-8');
            } else {
                throw new Error('Unsupported file type');
            }

            return { text: text.substring(0, 50000) }; // Cap at 50k chars for safety
        } catch (error: any) {
            console.error('[FileProcess] Error:', error);
            throw new HttpsError('internal', error.message || 'Failed to process file');
        }
    }
);
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
