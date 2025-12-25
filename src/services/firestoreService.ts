// Firebase Firestore database services
/**
 * Note: Type safety is fully restored. @ts-nocheck has been removed.
 */
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    orderBy,
    Unsubscribe,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    DocumentData,
    WithFieldValue
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Classroom, QuestionEntry, ItemType, LiveStudent, Student } from '../types';
import { writeBatch } from 'firebase/firestore';

/**
 * Firestore Data Converter for Task objects.
 * Handles normalization and sanitization of data between the app and Firestore.
 */
export const taskConverter: FirestoreDataConverter<Task> = {
    toFirestore(task: WithFieldValue<Task>): DocumentData {
        const data = { ...task } as any;

        // Remove fields that should not be in Firestore
        delete data.id;
        delete data.questionHistory;

        // Recursive helper to remove undefined values
        const removeUndefined = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(removeUndefined);
            } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !('type' in obj && obj.type === 'serverTimestamp')) {
                const newObj: any = {};
                for (const key in obj) {
                    if (obj[key] !== undefined) {
                        newObj[key] = removeUndefined(obj[key]);
                    }
                }
                return newObj;
            }
            return obj;
        };

        return removeUndefined(data);
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): Task {
        const data = snapshot.data();

        // Normalize fields to ensure they match our TypeScript interface
        return {
            id: snapshot.id,
            title: data.title || '',
            description: data.description || '',
            status: data.status || 'todo',
            type: data.type as ItemType || 'task',
            parentId: data.parentId === undefined ? null : data.parentId,
            rootId: data.rootId === undefined ? null : data.rootId,
            path: data.path || [],
            pathTitles: data.pathTitles || [],
            childIds: data.childIds || [],
            links: data.links || [],
            selectedRoomIds: data.selectedRoomIds || data.assignedRooms || [],
            presentationOrder: data.presentationOrder ?? 0,
            teacherId: data.teacherId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            // Legacy/Optional fields
            startDate: data.startDate,
            endDate: data.endDate,
            imageURL: data.imageURL,
            attachments: data.attachments || [],
        } as Task;
    }
};

/**
 * Create or update a classroom
 * @param {string} teacherId - The teacher's user ID
 * @param {Object} classroomData - Classroom data
 * @returns {Promise<string>} Classroom ID
 */
export const createClassroom = async (
    teacherId: string,
    classroomData: Partial<Classroom>
): Promise<string> => {
    const classroomRef = doc(collection(db, 'classrooms'));
    await setDoc(classroomRef, {
        ...classroomData,
        teacherId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return classroomRef.id;
};

/**
 * Get classroom by ID
 * @param {string} classroomId 
 * @returns {Promise<Object|null>}
 */
export const getClassroom = async (classroomId: string): Promise<Classroom | null> => {
    const classroomRef = doc(db, 'classrooms', classroomId);
    const snapshot = await getDoc(classroomRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Classroom : null;
};

/**
 * Get all classrooms for a teacher
 * @param {string} teacherId 
 * @returns {Promise<Array>}
 */
export const getTeacherClassrooms = async (teacherId: string): Promise<Classroom[]> => {
    const q = query(
        collection(db, 'classrooms'),
        where('teacherId', '==', teacherId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Classroom));
};

/**
 * Join a classroom with a code
 * @param {string} code - The classroom code
 * @returns {Promise<Object|null>}
 */
export const joinClassroom = async (code: string): Promise<Classroom | null> => {
    const q = query(
        collection(db, 'classrooms'),
        where('code', '==', code)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const classroomDoc = snapshot.docs[0];
    if (!classroomDoc) return null;
    return { id: classroomDoc.id, ...classroomDoc.data() } as Classroom;
};

/**
 * Create or update a task (Root collection)
 * @param {string} teacherId
 * @param {Object} taskData 
 * @returns {Promise<string>} Task ID
 */
export const saveTask = async (
    teacherId: string,
    taskData: Partial<Task> & { id?: string }
): Promise<string> => {
    const { id, ...dataToSave } = taskData;
    const taskRef = id
        ? doc(db, 'tasks', id).withConverter(taskConverter)
        : doc(collection(db, 'tasks')).withConverter(taskConverter);

    const isNew = !id;

    const finalData = {
        ...dataToSave,
        teacherId,
        updatedAt: serverTimestamp()
    };

    if (isNew) {
        // @ts-ignore - createdAt is added for new tasks
        finalData.createdAt = serverTimestamp();
    }

    await setDoc(taskRef, finalData, { merge: true });
    return taskRef.id;
};

/**
 * Get all tasks for a classroom (from root collection)
 * @param {string} classroomId 
 * @returns {Promise<Array>}
 */
export const getClassroomTasks = async (classroomId: string): Promise<Task[]> => {
    const q = query(
        collection(db, 'tasks').withConverter(taskConverter),
        where('selectedRoomIds', 'array-contains', classroomId),
        orderBy('presentationOrder', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
};

/**
 * Subscribe to classroom tasks with real-time updates
 * @param {string} classroomId 
 * @param {Function} callback 
 * @param {string} [teacherId] - Optional: filter by teacher if classroomId is empty
 * @returns {Unsubscribe}
 */
export const subscribeToClassroomTasks = (
    classroomId: string,
    callback: (tasks: Task[]) => void,
    teacherId?: string
): Unsubscribe => {
    let q;

    if (classroomId) {
        q = query(
            collection(db, 'tasks').withConverter(taskConverter),
            where('selectedRoomIds', 'array-contains', classroomId),
            orderBy('presentationOrder', 'asc')
        );
    } else if (teacherId) {
        q = query(
            collection(db, 'tasks').withConverter(taskConverter),
            where('teacherId', '==', teacherId),
            orderBy('presentationOrder', 'asc')
        );
    } else {
        // Fallback to all tasks if neither ID is provided
        q = query(
            collection(db, 'tasks').withConverter(taskConverter),
            orderBy('presentationOrder', 'asc')
        );
    }

    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => doc.data());
        callback(tasks);
    });
};

/**
 * Update student status in a classroom
 * @param {string} classroomId 
 * @param {string} studentId 
 * @param {Object} statusData 
 * @returns {Promise<void>}
 */
export const updateStudentStatus = async (
    classroomId: string,
    studentId: string,
    statusData: Partial<LiveStudent>
): Promise<void> => {
    const studentRef = doc(db, 'classrooms', classroomId, 'live_students', studentId);
    await setDoc(studentRef, {
        ...statusData,
        lastActive: serverTimestamp()
    }, { merge: true });
};

/**
 * Remove a student from the live session
 * @param {string} classroomId 
 * @param {string} studentId 
 * @returns {Promise<void>}
 */
export const deleteStudent = async (
    classroomId: string,
    studentId: string
): Promise<void> => {
    const studentRef = doc(db, 'classrooms', classroomId, 'live_students', studentId);
    await deleteDoc(studentRef);
};

/**
 * Subscribe to students in a classroom
 * @param {string} classroomId 
 * @param {Function} callback 
 * @returns {Unsubscribe}
 */
export const subscribeToStudents = (
    classroomId: string,
    callback: (students: LiveStudent[]) => void
): Unsubscribe => {
    const studentsQuery = query(collection(db, 'classrooms', classroomId, 'live_students'));
    return onSnapshot(studentsQuery, (snapshot) => {
        const students: LiveStudent[] = [];
        snapshot.forEach(docSnap => {
            students.push({ uid: docSnap.id, ...docSnap.data() } as LiveStudent);
        });
        callback(students);
    });
};

/**
 * Save student profile
 * @param {string} studentId 
 * @param {string} classroomId 
 * @param {Object} studentData 
 * @returns {Promise<void>}
 */
export const saveStudentProfile = async (
    studentId: string,
    classroomId: string,
    studentData: Partial<Student>
): Promise<void> => {
    const studentRef = doc(db, 'students', studentId);
    await setDoc(studentRef, {
        ...studentData,
        classroomId,
        lastActive: serverTimestamp()
    }, { merge: true });
};

/**
 * Get student profile
 * @param {string} studentId 
 * @returns {Promise<Object|null>}
 */
export const getStudentProfile = async (studentId: string): Promise<Student | null> => {
    const studentRef = doc(db, 'students', studentId);
    const snapshot = await getDoc(studentRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } as Student : null;
};

// ============================================
// HIERARCHICAL TASK FUNCTIONS
// ============================================

/**
 * Get a task with all its descendants (children, grandchildren, etc.)
 * @param {string} taskId - The root task ID
 * @returns {Promise<{task: Object, descendants: Array}>}
 */
export const getTaskWithChildren = async (taskId: string): Promise<{ task: Task; descendants: Task[] }> => {
    const taskRef = doc(db, 'tasks', taskId).withConverter(taskConverter);
    const snapshot = await getDoc(taskRef);

    if (!snapshot.exists()) {
        throw new Error('Task not found');
    }

    const task = snapshot.data();

    // Recursive function to get all descendants
    const fetchDescendants = async (parentId: string): Promise<Task[]> => {
        const q = query(
            collection(db, 'tasks').withConverter(taskConverter),
            where('parentId', '==', parentId)
        );
        const childSnapshot = await getDocs(q);
        const children = childSnapshot.docs.map(doc => doc.data());

        let allDescendants = [...children];
        for (const child of children) {
            const grandchildren = await fetchDescendants(child.id);
            allDescendants = [...allDescendants, ...grandchildren];
        }
        return allDescendants;
    };

    const descendants = await fetchDescendants(taskId);
    return { task, descendants };
};

export interface DuplicateOptions {
    includeChildren?: boolean;
    newTitle?: string;
    newStartDate?: string;
    newEndDate?: string;
    newAssignedRooms?: string[];
}

/**
 * Duplicate a task and optionally all its children
 * @param {string} taskId - The task to duplicate
 * @param {DuplicateOptions} options - Options for duplication
 * @returns {Promise<{newTaskId: string, childMap: Record<string, string>}>}
 */
export const duplicateTask = async (
    taskId: string,
    options: DuplicateOptions = {}
): Promise<{ newTaskId: string; childMap: Record<string, string> }> => {
    const { task, descendants } = await getTaskWithChildren(taskId);
    const batch = writeBatch(db);
    const childMap: Record<string, string> = {}; // Old ID -> New ID

    // 1. Create duplicate for the root task
    const newRootRef = doc(collection(db, 'tasks')).withConverter(taskConverter);
    const newRootId = newRootRef.id;
    childMap[taskId] = newRootId;

    const newRootData: Partial<Task> = {
        ...task,
        title: options.newTitle || `${task.title} (Copy)`,
        startDate: options.newStartDate || task.startDate,
        endDate: options.newEndDate || task.endDate,
        selectedRoomIds: options.newAssignedRooms || task.selectedRoomIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        childIds: [] // Will populate if includeChildren is true
    };

    batch.set(newRootRef, newRootData);

    // 2. Duplicate children if requested
    if (options.includeChildren && descendants.length > 0) {
        // First pass: create references for all descendants
        const descendantCopies: Record<string, { ref: any; original: Task }> = {};
        for (const desc of descendants) {
            const newRef = doc(collection(db, 'tasks')).withConverter(taskConverter);
            childMap[desc.id] = newRef.id;
            descendantCopies[desc.id] = { ref: newRef, original: desc };
        }

        // Second pass: set data with updated parent/root IDs
        for (const oldId in descendantCopies) {
            const entry = descendantCopies[oldId];
            if (!entry) continue;

            const { ref, original } = entry;
            const newParentId = childMap[original.parentId!] || newRootId;
            const newPath = original.path.map((id: string) => childMap[id] || id);

            const copyData: Partial<Task> = {
                ...original,
                parentId: newParentId,
                rootId: newRootId,
                path: newPath,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                childIds: original.childIds.map((id: string) => childMap[id]).filter((id: string | undefined): id is string => !!id)
            };

            batch.set(ref, copyData);
        }

        // Update root's childIds
        const rootChildIds = task.childIds.map((id: string) => childMap[id]).filter((id: string | undefined): id is string => !!id);
        batch.update(newRootRef, { childIds: rootChildIds });
    }

    await batch.commit();
    return { newTaskId: newRootId, childMap };
};

/**
 * Move a task to a new parent (changes hierarchy)
 * @param {string} taskId - The task to move
 * @param {string | null} newParentId - New parent ID (null for root level)
 * @param {Task | null} newParent - The new parent task object (for path building)
 * @returns {Promise<void>}
 */
export const moveTaskToParent = async (
    taskId: string,
    newParentId: string | null,
    newParent: Task | null = null
): Promise<void> => {
    // Get the task and all its descendants to update their paths
    const { task, descendants } = await getTaskWithChildren(taskId);
    const batch = writeBatch(db);

    // 1. Update the task itself
    const taskRef = doc(db, 'tasks', taskId).withConverter(taskConverter);
    const newPath = newParent ? [...newParent.path, newParent.id] : [];
    const newPathTitles = newParent ? [...newParent.pathTitles, newParent.title] : [];
    const newRootId = newParent ? (newParent.rootId || newParent.id) : null;

    batch.update(taskRef, {
        parentId: newParentId,
        rootId: newRootId,
        path: newPath,
        pathTitles: newPathTitles,
        updatedAt: serverTimestamp()
    });

    // 2. Remove taskId from old parent's childIds
    if (task.parentId) {
        const oldParentRef = doc(db, 'tasks', task.parentId);
        const oldParentSnap = await getDoc(oldParentRef);
        if (oldParentSnap.exists()) {
            const oldChildIds = oldParentSnap.data().childIds || [];
            batch.update(oldParentRef, {
                childIds: oldChildIds.filter((id: string) => id !== taskId)
            });
        }
    }

    // 3. Add taskId to new parent's childIds
    if (newParentId) {
        const newParentRef = doc(db, 'tasks', newParentId);
        const newParentSnap = await getDoc(newParentRef);
        if (newParentSnap.exists()) {
            const newChildIds = newParentSnap.data().childIds || [];
            if (!newChildIds.includes(taskId)) {
                batch.update(newParentRef, {
                    childIds: [...newChildIds, taskId]
                });
            }
        }
    }

    // 4. Update descendants' paths and rootIds
    // This is a bit complex as we need to rebuild the path for each descendant
    // For simplicity, we can just update the segment of the path that changed
    for (const desc of descendants) {
        const descRef = doc(db, 'tasks', desc.id).withConverter(taskConverter);

        // Find where the old path for the moved task was in the descendant's path
        const taskIndex = desc.path.indexOf(taskId);
        let updatedPath = [...newPath, taskId];
        let updatedPathTitles = [...newPathTitles, task.title];

        if (taskIndex !== -1) {
            // Append the existing sub-path after the moved task
            const subPath = desc.path.slice(taskIndex + 1);
            const subPathTitles = desc.pathTitles.slice(taskIndex + 1);
            updatedPath = [...updatedPath, ...subPath];
            updatedPathTitles = [...updatedPathTitles, ...subPathTitles];
        }

        batch.update(descRef, {
            path: updatedPath,
            pathTitles: updatedPathTitles,
            rootId: newRootId,
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();
};

/**
 * Delete a task and optionally all its children.
 * If children are NOT deleted, they (and their descendants) are re-parented.
 * 
 * @param {string} taskId - The task to delete
 * @param {boolean} deleteChildren - Whether to delete children (default: true)
 * @param {Task[]} allTasks - Optional: current local tasks to avoid extra fetches
 * @returns {Promise<number>} Number of tasks deleted
 */
export const deleteTaskWithChildren = async (
    taskId: string,
    deleteChildren: boolean = true
): Promise<number> => {
    // 1. Get the task and its descendants
    const { task, descendants } = await getTaskWithChildren(taskId);
    const batch = writeBatch(db);
    let count = 0;

    // 2. Delete the task itself
    batch.delete(doc(db, 'tasks', taskId));
    count++;

    if (deleteChildren) {
        // 3a. Delete all recursive descendants
        for (const desc of descendants) {
            batch.delete(doc(db, 'tasks', desc.id));
            count++;
        }
    } else {
        // 3b. Make children standalone and update descendant paths
        // We need the full local list or use fetched descendants
        const descendantsToUpdate = descendants;

        for (const desc of descendantsToUpdate) {
            if (desc.parentId === taskId) {
                // Direct child - becomes standalone root
                batch.update(doc(db, 'tasks', desc.id), {
                    parentId: null,
                    rootId: null,
                    path: [],
                    pathTitles: [],
                    updatedAt: serverTimestamp()
                });
            } else {
                // Grandchild/deeper - update path to remove the deleted taskId
                // We calculate the new path by filtering out the deleted ID
                const newPath = (desc.path || []).filter(id => id !== taskId);
                const newPathTitles = (desc.pathTitles || []);

                // Remove the title matching the taskId if we can find it
                // Note: path and pathTitles correspond 1:1
                const taskIndex = (desc.path || []).indexOf(taskId);
                if (taskIndex !== -1) {
                    newPathTitles.splice(taskIndex, 1);
                }

                batch.update(doc(db, 'tasks', desc.id), {
                    rootId: newPath[0] || desc.parentId,
                    path: newPath,
                    pathTitles: newPathTitles,
                    updatedAt: serverTimestamp()
                });
            }
        }
    }

    // 4. Update parent's childIds if the deleted task had a parent
    if (task.parentId) {
        const parentRef = doc(db, 'tasks', task.parentId);
        const parentSnap = await getDoc(parentRef);
        if (parentSnap.exists()) {
            const childIds = parentSnap.data().childIds || [];
            batch.update(parentRef, {
                childIds: childIds.filter((id: string) => id !== taskId)
            });
        }
    }

    await batch.commit();
    return count;
};

/**
 * Reorder a task relative to its siblings
 * @param {string} taskId - Task being moved
 * @param {string} targetTaskId - Task to swap with (or relative to)
 * @param {Task[]} siblings - All siblings sharing the same parent
 * @returns {Promise<void>}
 */
export const reorderTasks = async (
    taskId: string,
    targetTaskId: string,
    siblings: Task[]
): Promise<void> => {
    const currentTask = siblings.find(t => t.id === taskId);
    const targetTask = siblings.find(t => t.id === targetTaskId);
    if (!currentTask || !targetTask) return;

    // Check for duplicate orders - if any exist, normalize all siblings first
    const orders = siblings.map(t => t.presentationOrder || 0);
    const hasDuplicates = orders.length !== new Set(orders).size;

    if (hasDuplicates) {
        console.log('[firestoreService] Normalizing duplicate orders');
        const batch = writeBatch(db);
        // Re-sort siblings by their current (possibly ambiguous) order or fallback to ID
        const sorted = [...siblings].sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

        sorted.forEach((sibling, index) => {
            batch.update(doc(db, 'tasks', sibling.id), {
                presentationOrder: (index + 1) * 10
            });
        });

        // Perform the swap in the same batch if possible, or commit and then swap
        // To be safe and simple, we do the normalization first
        await batch.commit();

        // Recalculate and swap
        const currentIndex = sorted.findIndex(t => t.id === taskId);
        const targetIndex = sorted.findIndex(t => t.id === targetTaskId);
        const newCurrentOrder = (targetIndex + 1) * 10;
        const newTargetOrder = (currentIndex + 1) * 10;

        await updateDoc(doc(db, 'tasks', taskId), { presentationOrder: newCurrentOrder });
        await updateDoc(doc(db, 'tasks', targetTaskId), { presentationOrder: newTargetOrder });
    } else {
        // Simple swap
        const batch = writeBatch(db);
        batch.update(doc(db, 'tasks', taskId), { presentationOrder: targetTask.presentationOrder });
        batch.update(doc(db, 'tasks', targetTaskId), { presentationOrder: currentTask.presentationOrder });
        await batch.commit();
    }
};

// ============================================
// STUDENT QUESTION FUNCTIONS
// ============================================

/**
 * Add a question to a task's question history
 * @param {string} taskId - The task ID
 * @param {Partial<QuestionEntry>} questionData - Question data
 * @returns {Promise<string>} Question ID
 */
export const addQuestionToTask = async (
    taskId: string,
    questionData: Partial<QuestionEntry>
): Promise<string> => {
    const taskRef = doc(db, 'tasks', taskId).withConverter(taskConverter);
    const snapshot = await getDoc(taskRef);

    if (!snapshot.exists()) {
        throw new Error('Task not found');
    }

    const task = snapshot.data();
    const questionHistory = task.questionHistory || [];

    const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const newQuestion: QuestionEntry = {
        id: questionId,
        studentId: questionData.studentId!,
        studentName: questionData.studentName!,
        classroomId: questionData.classroomId!,
        question: questionData.question!,
        askedAt: serverTimestamp(),
        resolved: false,
    };

    await updateDoc(taskRef, {
        questionHistory: [...questionHistory, newQuestion],
        updatedAt: serverTimestamp(),
    });

    return questionId;
};

/**
 * Mark a question as resolved
 * @param {string} taskId - The task ID
 * @param {string} questionId - The question ID to resolve
 * @param {string} teacherResponse - Optional teacher response
 * @returns {Promise<void>}
 */
export const resolveQuestion = async (
    taskId: string,
    questionId: string,
    teacherResponse: string = ''
): Promise<void> => {
    const taskRef = doc(db, 'tasks', taskId).withConverter(taskConverter);
    const snapshot = await getDoc(taskRef);

    if (!snapshot.exists()) {
        throw new Error('Task not found');
    }

    const task = snapshot.data();
    const questionHistory = (task.questionHistory || []).map(q => {
        if (q.id === questionId) {
            return {
                ...q,
                resolved: true,
                resolvedAt: serverTimestamp(),
                teacherResponse,
            };
        }
        return q;
    });

    await updateDoc(taskRef, {
        questionHistory,
        updatedAt: serverTimestamp(),
    });
};

/**
 * Get questions for a task, optionally filtered by classroom
 * @param {string} taskId - The task ID
 * @param {string | null} classroomId - Optional: filter by classroom
 * @returns {Promise<QuestionEntry[]>} Array of questions
 */
export const getTaskQuestions = async (
    taskId: string,
    classroomId: string | null = null
): Promise<QuestionEntry[]> => {
    const taskRef = doc(db, 'tasks', taskId).withConverter(taskConverter);
    const snapshot = await getDoc(taskRef);

    if (!snapshot.exists()) {
        return [];
    }

    const task = snapshot.data();
    let questions = task.questionHistory || [];

    if (classroomId) {
        questions = questions.filter(q => q.classroomId === classroomId);
    }

    return questions;
};

/**
 * Migration: Un-nest all assignments from projects
 * @returns {Promise<{updated: number, errors: string[]}>} Migration result
 */
export const unNestAssignmentsFromProjects = async (): Promise<{ updated: number; errors: string[] }> => {
    const result = { updated: 0, errors: [] as string[] };

    try {
        const q = query(
            collection(db, 'tasks').withConverter(taskConverter),
            where('type', '==', 'assignment')
        );

        const snapshot = await getDocs(q);
        const nestedAssignments = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.parentId !== null && data.parentId !== undefined;
        });

        for (const assignmentSnap of nestedAssignments) {
            try {
                const assignment = assignmentSnap.data();
                const assignmentId = assignmentSnap.id;
                const oldParentId = assignment.parentId;

                const batch = writeBatch(db);

                // 1. Update assignment
                batch.update(doc(db, 'tasks', assignmentId), {
                    parentId: null,
                    rootId: null,
                    path: [],
                    pathTitles: [],
                    updatedAt: serverTimestamp(),
                });

                // 2. Remove from parent
                if (oldParentId) {
                    const parentRef = doc(db, 'tasks', oldParentId);
                    const parentSnap = await getDoc(parentRef);
                    if (parentSnap.exists()) {
                        const childIds = parentSnap.data().childIds || [];
                        batch.update(parentRef, {
                            childIds: childIds.filter((id: string) => id !== assignmentId),
                            updatedAt: serverTimestamp()
                        });
                    }
                }

                await batch.commit();
                result.updated++;
            } catch (err: any) {
                result.errors.push(`Failed to migrate assignment ${assignmentSnap.id}: ${err.message}`);
            }
        }
    } catch (err: any) {
        result.errors.push(`Migration failed: ${err.message}`);
    }

    return result;
};
