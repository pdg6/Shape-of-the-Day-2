// @ts-nocheck
// Firebase Firestore database services
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
    orderBy
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Create or update a classroom
 * @param {string} teacherId - The teacher's user ID
 * @param {Object} classroomData - Classroom data
 * @returns {Promise<string>} Classroom ID
 */
export const createClassroom = async (teacherId: string, classroomData: any) => {
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
export const getClassroom = async (classroomId: string) => {
    const classroomRef = doc(db, 'classrooms', classroomId);
    const snapshot = await getDoc(classroomRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

/**
 * Get all classrooms for a teacher
 * @param {string} teacherId 
 * @returns {Promise<Array>}
 */
export const getTeacherClassrooms = async (teacherId: string) => {
    const q = query(
        collection(db, 'classrooms'),
        where('teacherId', '==', teacherId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Join a classroom with a code
 * @param {string} code - The classroom code
 * @returns {Promise<Object|null>}
 */
export const joinClassroom = async (code: string) => {
    const q = query(
        collection(db, 'classrooms'),
        where('code', '==', code)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const classroomDoc = snapshot.docs[0];
    return { id: classroomDoc.id, ...classroomDoc.data() };
};

/**
 * Create or update a task (Root collection)
 * @param {string} teacherId
 * @param {Object} taskData 
 * @returns {Promise<string>} Task ID
 */
export const saveTask = async (teacherId: string, taskData: any) => {
    const taskRef = taskData.id ? doc(db, 'tasks', taskData.id) : doc(collection(db, 'tasks'));
    const isNew = !taskData.id;

    const data = {
        ...taskData,
        teacherId,
        updatedAt: serverTimestamp()
    };

    if (isNew) {
        data.createdAt = serverTimestamp();
    }

    await setDoc(taskRef, data, { merge: true });
    return taskRef.id;
};

/**
 * Get all tasks for a classroom (from root collection)
 * @param {string} classroomId 
 * @returns {Promise<Array>}
 */
export const getClassroomTasks = async (classroomId: string) => {
    const q = query(
        collection(db, 'tasks'),
        where('selectedRoomIds', 'array-contains', classroomId),
        orderBy('presentationOrder', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Listen to real-time updates for classroom tasks (from root collection)
 * @param {string} classroomId 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToClassroomTasks = (classroomId: string, callback: (tasks: any[]) => void) => {
    const q = query(
        collection(db, 'tasks'),
        where('selectedRoomIds', 'array-contains', classroomId),
        orderBy('presentationOrder', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
export const updateStudentStatus = async (classroomId, studentId, statusData) => {
    const studentRef = doc(db, 'classrooms', classroomId, 'live_students', studentId);
    await updateDoc(studentRef, {
        ...statusData,
        lastActive: serverTimestamp()
    });
};

/**
 * Save student profile
 * @param {string} studentId 
 * @param {string} classroomId 
 * @param {Object} studentData 
 * @returns {Promise<void>}
 */
export const saveStudentProfile = async (studentId, classroomId, studentData) => {
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
export const getStudentProfile = async (studentId) => {
    const studentRef = doc(db, 'students', studentId);
    const snapshot = await getDoc(studentRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

// ============================================
// HIERARCHICAL TASK FUNCTIONS
// ============================================

/**
 * Get a task with all its descendants (children, grandchildren, etc.)
 * @param {string} taskId - The root task ID
 * @returns {Promise<{task: Object, descendants: Array}>}
 */
export const getTaskWithChildren = async (taskId) => {
    const tasksRef = collection(db, 'tasks');

    // Get the root task
    const taskDoc = await getDoc(doc(db, 'tasks', taskId));
    if (!taskDoc.exists()) {
        return { task: null, descendants: [] };
    }

    const rootTask = { id: taskDoc.id, ...taskDoc.data() };

    // Get all descendants using rootId or path
    const q = query(
        tasksRef,
        where('rootId', '==', taskId)
    );

    const snapshot = await getDocs(q);
    const descendants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return { task: rootTask, descendants };
};

/**
 * Duplicate a task and optionally all its children
 * @param {string} taskId - The task to duplicate
 * @param {Object} options - Options for duplication
 * @param {boolean} options.includeChildren - Whether to duplicate children
 * @param {string} options.newParentId - New parent ID (for moving)
 * @param {Array<string>} options.newAssignedRooms - Override assigned rooms
 * @returns {Promise<{newTaskId: string, childMap: Object}>} New task ID and mapping of old to new IDs
 */
export const duplicateTask = async (taskId, options = {}) => {
    const { includeChildren = true, newParentId = null, newAssignedRooms = null } = options;

    // Get the task and its children if needed
    const { task, descendants } = await getTaskWithChildren(taskId);

    if (!task) {
        throw new Error('Task not found');
    }

    // Create mapping from old IDs to new IDs
    const idMap = {};

    // Helper to create a duplicate task
    const createDuplicate = async (original, parentId, rootId) => {
        const newTaskRef = doc(collection(db, 'tasks'));
        const newId = newTaskRef.id;
        idMap[original.id] = newId;

        // Build path and pathTitles for the new task
        let path = [];
        let pathTitles = [];

        if (parentId && idMap[original.parentId]) {
            // Find the parent in our duplicated items
            const duplicatedParent = descendants.find(d => d.id === original.parentId);
            if (duplicatedParent) {
                path = [...(duplicatedParent.path || []), parentId];
                pathTitles = [...(duplicatedParent.pathTitles || []), duplicatedParent.title];
            }
        }

        const newTaskData = {
            ...original,
            id: undefined, // Remove old id
            parentId: parentId,
            rootId: rootId || newId,
            path,
            pathTitles,
            selectedRoomIds: newAssignedRooms || original.selectedRoomIds,
            childIds: [], // Will be updated after children are created
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        // Remove undefined fields
        Object.keys(newTaskData).forEach(key => {
            if (newTaskData[key] === undefined) {
                delete newTaskData[key];
            }
        });

        await setDoc(newTaskRef, newTaskData);
        return newId;
    };

    // Duplicate the root task
    const newRootId = await createDuplicate(task, newParentId, null);

    // Duplicate children if requested
    if (includeChildren && descendants.length > 0) {
        // Sort by depth (path length) to ensure parents are created before children
        const sortedDescendants = [...descendants].sort((a, b) =>
            (a.path?.length || 0) - (b.path?.length || 0)
        );

        for (const child of sortedDescendants) {
            const newParent = idMap[child.parentId] || newRootId;
            await createDuplicate(child, newParent, newRootId);
        }

        // Update childIds for all duplicated tasks
        for (const original of [task, ...descendants]) {
            if (original.childIds && original.childIds.length > 0) {
                const newTaskId = idMap[original.id];
                const newChildIds = original.childIds
                    .map(oldChildId => idMap[oldChildId])
                    .filter(Boolean);

                if (newChildIds.length > 0) {
                    await updateDoc(doc(db, 'tasks', newTaskId), {
                        childIds: newChildIds,
                        updatedAt: serverTimestamp()
                    });
                }
            }
        }
    }

    return { newTaskId: newRootId, childMap: idMap };
};

/**
 * Move a task to a new parent (changes hierarchy)
 * @param {string} taskId - The task to move
 * @param {string} newParentId - New parent ID (null for root level)
 * @param {Object} newParent - The new parent task object (for path building)
 * @returns {Promise<void>}
 */
export const moveTaskToParent = async (taskId, newParentId, newParent = null) => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
        throw new Error('Task not found');
    }

    const task = taskDoc.data();
    const oldParentId = task.parentId;

    // Build new path and pathTitles
    let newPath = [];
    let newPathTitles = [];
    let newRootId = taskId;

    if (newParent) {
        newPath = [...(newParent.path || []), newParentId];
        newPathTitles = [...(newParent.pathTitles || []), newParent.title];
        newRootId = newParent.rootId || newParentId;
    }

    // Update the moved task
    await updateDoc(taskRef, {
        parentId: newParentId,
        rootId: newRootId,
        path: newPath,
        pathTitles: newPathTitles,
        updatedAt: serverTimestamp()
    });

    // Remove from old parent's childIds
    if (oldParentId) {
        const oldParentRef = doc(db, 'tasks', oldParentId);
        const oldParentDoc = await getDoc(oldParentRef);
        if (oldParentDoc.exists()) {
            const oldParentData = oldParentDoc.data();
            const updatedChildIds = (oldParentData.childIds || []).filter(id => id !== taskId);
            await updateDoc(oldParentRef, {
                childIds: updatedChildIds,
                updatedAt: serverTimestamp()
            });
        }
    }

    // Add to new parent's childIds
    if (newParentId) {
        const newParentRef = doc(db, 'tasks', newParentId);
        const newParentDoc = await getDoc(newParentRef);
        if (newParentDoc.exists()) {
            const newParentData = newParentDoc.data();
            const updatedChildIds = [...(newParentData.childIds || []), taskId];
            await updateDoc(newParentRef, {
                childIds: updatedChildIds,
                updatedAt: serverTimestamp()
            });
        }
    }

    // Update all descendants' paths and rootIds
    const { descendants } = await getTaskWithChildren(taskId);
    for (const descendant of descendants) {
        // Recalculate path for this descendant
        const descendantRef = doc(db, 'tasks', descendant.id);

        // Find the descendant's immediate parent in our list
        const parentInDescendants = descendants.find(d => d.id === descendant.parentId);
        const isDirectChild = descendant.parentId === taskId;

        let descendantPath, descendantPathTitles;

        if (isDirectChild) {
            descendantPath = [...newPath, taskId];
            descendantPathTitles = [...newPathTitles, task.title];
        } else if (parentInDescendants) {
            // This will be updated in a subsequent iteration
            continue; // Skip for now, will be handled by cascading updates
        }

        await updateDoc(descendantRef, {
            rootId: newRootId,
            path: descendantPath,
            pathTitles: descendantPathTitles,
            updatedAt: serverTimestamp()
        });
    }
};

/**
 * Delete a task and optionally all its children
 * @param {string} taskId - The task to delete
 * @param {boolean} deleteChildren - Whether to delete children (default: true)
 * @returns {Promise<number>} Number of tasks deleted
 */
export const deleteTaskWithChildren = async (taskId, deleteChildren = true) => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
        return 0;
    }

    const task = taskDoc.data();
    let deletedCount = 0;

    // Delete children first if requested
    if (deleteChildren) {
        const { descendants } = await getTaskWithChildren(taskId);

        // Delete in reverse order (deepest first)
        const sortedDescendants = [...descendants].sort((a, b) =>
            (b.path?.length || 0) - (a.path?.length || 0)
        );

        for (const descendant of sortedDescendants) {
            await deleteDoc(doc(db, 'tasks', descendant.id));
            deletedCount++;
        }
    }

    // Remove from parent's childIds
    if (task.parentId) {
        const parentRef = doc(db, 'tasks', task.parentId);
        const parentDoc = await getDoc(parentRef);
        if (parentDoc.exists()) {
            const parentData = parentDoc.data();
            const updatedChildIds = (parentData.childIds || []).filter(id => id !== taskId);
            await updateDoc(parentRef, {
                childIds: updatedChildIds,
                updatedAt: serverTimestamp()
            });
        }
    }

    // Delete the task itself
    await deleteDoc(taskRef);
    deletedCount++;

    return deletedCount;
};

// ============================================
// STUDENT QUESTION FUNCTIONS
// ============================================

/**
 * Add a question to a task's question history
 * Note: Questions are stored on the task and NOT duplicated when task is copied
 * @param {string} taskId - The task ID
 * @param {Object} questionData - Question data
 * @param {string} questionData.studentId - Student's UID
 * @param {string} questionData.studentName - Student's display name
 * @param {string} questionData.classroomId - Classroom ID where question was asked
 * @param {string} questionData.question - The question text
 * @returns {Promise<string>} Question ID
 */
export const addQuestionToTask = async (taskId, questionData) => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
        throw new Error('Task not found');
    }

    const task = taskDoc.data();
    const questionHistory = task.questionHistory || [];

    const questionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newQuestion = {
        id: questionId,
        studentId: questionData.studentId,
        studentName: questionData.studentName,
        classroomId: questionData.classroomId,
        question: questionData.question,
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
export const resolveQuestion = async (taskId, questionId, teacherResponse = '') => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
        throw new Error('Task not found');
    }

    const task = taskDoc.data();
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
 * @param {string} classroomId - Optional: filter by classroom
 * @returns {Promise<Array>} Array of questions
 */
export const getTaskQuestions = async (taskId, classroomId = null) => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);

    if (!taskDoc.exists()) {
        return [];
    }

    const task = taskDoc.data();
    let questions = task.questionHistory || [];

    if (classroomId) {
        questions = questions.filter(q => q.classroomId === classroomId);
    }

    return questions;
};

/**
 * Migration: Un-nest all assignments from projects
 * This converts assignments that are children of projects to standalone items.
 * - Sets parentId, rootId to null
 * - Clears path and pathTitles arrays
 * - Removes assignment IDs from parent project's childIds array
 * @returns {Promise<{updated: number, errors: string[]}>} Migration result
 */
export const unNestAssignmentsFromProjects = async () => {
    const result = { updated: 0, errors: [] };

    try {
        // Find all assignments that have a parent
        const tasksRef = collection(db, 'tasks');
        const q = query(
            tasksRef,
            where('type', '==', 'assignment')
        );

        const snapshot = await getDocs(q);
        const nestedAssignments = snapshot.docs.filter(doc => {
            const data = doc.data();
            return data.parentId !== null && data.parentId !== undefined;
        });

        console.log(`Found ${nestedAssignments.length} nested assignments to migrate`);

        for (const assignmentDoc of nestedAssignments) {
            try {
                const assignment = assignmentDoc.data();
                const assignmentId = assignmentDoc.id;
                const oldParentId = assignment.parentId;

                // Update the assignment to be standalone
                const assignmentRef = doc(db, 'tasks', assignmentId);
                await updateDoc(assignmentRef, {
                    parentId: null,
                    rootId: null,
                    path: [],
                    pathTitles: [],
                    updatedAt: serverTimestamp(),
                });

                // Remove assignment from parent's childIds
                if (oldParentId) {
                    const parentRef = doc(db, 'tasks', oldParentId);
                    const parentDoc = await getDoc(parentRef);

                    if (parentDoc.exists()) {
                        const parentData = parentDoc.data();
                        const updatedChildIds = (parentData.childIds || []).filter(
                            id => id !== assignmentId
                        );

                        await updateDoc(parentRef, {
                            childIds: updatedChildIds,
                            updatedAt: serverTimestamp(),
                        });
                    }
                }

                result.updated++;
                console.log(`Migrated assignment: ${assignment.title} (${assignmentId})`);
            } catch (err) {
                const errorMsg = `Failed to migrate assignment ${assignmentDoc.id}: ${err.message}`;
                result.errors.push(errorMsg);
                console.error(errorMsg);
            }
        }

        console.log(`Migration complete: ${result.updated} assignments updated, ${result.errors.length} errors`);
    } catch (err) {
        result.errors.push(`Migration failed: ${err.message}`);
        console.error('Migration failed:', err);
    }

    return result;
};
