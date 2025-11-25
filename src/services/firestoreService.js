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
