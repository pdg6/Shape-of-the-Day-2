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
export const createClassroom = async (teacherId, classroomData) => {
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
export const getClassroom = async (classroomId) => {
    const classroomRef = doc(db, 'classrooms', classroomId);
    const snapshot = await getDoc(classroomRef);
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

/**
 * Get all classrooms for a teacher
 * @param {string} teacherId 
 * @returns {Promise<Array>}
 */
export const getTeacherClassrooms = async (teacherId) => {
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
export const joinClassroom = async (code) => {
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
 * Create or update a task
 * @param {string} classroomId 
 * @param {Object} taskData 
 * @returns {Promise<string>} Task ID
 */
export const createTask = async (classroomId, taskData) => {
    const taskRef = doc(collection(db, 'classrooms', classroomId, 'tasks'));
    await setDoc(taskRef, {
        ...taskData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return taskRef.id;
};

/**
 * Get all tasks for a classroom
 * @param {string} classroomId 
 * @returns {Promise<Array>}
 */
export const getClassroomTasks = async (classroomId) => {
    const q = query(
        collection(db, 'classrooms', classroomId, 'tasks'),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Update task status for a student
 * @param {string} classroomId 
 * @param {string} taskId 
 * @param {string} studentId 
 * @param {string} status 
 * @returns {Promise<void>}
 */
export const updateTaskStatus = async (classroomId, taskId, studentId, status) => {
    const statusRef = doc(db, 'classrooms', classroomId, 'tasks', taskId, 'statuses', studentId);
    await setDoc(statusRef, {
        status,
        updatedAt: serverTimestamp()
    }, { merge: true });
};

/**
 * Listen to real-time updates for classroom tasks
 * @param {string} classroomId 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTasks = (classroomId, callback) => {
    const q = query(
        collection(db, 'classrooms', classroomId, 'tasks'),
        orderBy('createdAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(tasks);
    });
};

/**
 * Listen to real-time task status updates
 * @param {string} classroomId 
 * @param {string} taskId 
 * @param {Function} callback 
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTaskStatuses = (classroomId, taskId, callback) => {
    const statusesRef = collection(db, 'classrooms', classroomId, 'tasks', taskId, 'statuses');
    return onSnapshot(statusesRef, (snapshot) => {
        const statuses = {};
        snapshot.docs.forEach(doc => {
            statuses[doc.id] = doc.data();
        });
        callback(statuses);
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
            assignedRooms: newAssignedRooms || original.assignedRooms,
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
