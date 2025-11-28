import {
    collection,
    doc,
    getDocs,
    deleteDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import { getAllDummyData, getTasksByDate } from '../utils/dummyData';
import toast from 'react-hot-toast';

/**
 * Dummy Data Service
 * 
 * Manages loading and clearing of dummy data in Firestore for UX exploration.
 * This service allows developers to quickly populate the database with realistic
 * test data for both teacher and student flows.
 */

/**
 * Load all dummy data into Firestore
 * @param teacherId - The UID of the teacher to assign classrooms to
 * @returns Promise that resolves when all data is loaded
 */
export const loadDummyData = async (teacherId: string): Promise<void> => {
    try {
        const data = getAllDummyData();
        const batch = writeBatch(db);
        let operationCount = 0;

        console.log('Loading dummy data for teacher:', teacherId);

        // 1. Load Classrooms
        for (const classroom of data.classrooms) {
            const classroomRef = doc(db, 'classrooms', classroom.id);
            batch.set(classroomRef, {
                ...classroom,
                teacherId, // Override with actual teacher ID
            });
            operationCount++;

            // If we hit batch limit (500 operations), commit and start new batch
            if (operationCount >= 450) {
                await batch.commit();
                operationCount = 0;
            }
        }

        // Commit classroom batch
        if (operationCount > 0) {
            await batch.commit();
            operationCount = 0;
        }

        console.log('✓ Classrooms loaded');

        // 2. Load Tasks for each classroom
        const newBatch = writeBatch(db);
        for (const [classId] of Object.entries(data.tasks)) {
            const tasksByDate = getTasksByDate(classId);

            for (const [date, dateTasks] of Object.entries(tasksByDate)) {
                for (const task of dateTasks) {
                    const taskRef = doc(db, `classrooms/${classId}/tasks/${date}/tasks`, task.id);
                    newBatch.set(taskRef, task);
                    operationCount++;

                    if (operationCount >= 450) {
                        await newBatch.commit();
                        operationCount = 0;
                    }
                }
            }
        }

        if (operationCount > 0) {
            await newBatch.commit();
            operationCount = 0;
        }

        console.log('✓ Tasks loaded');

        // 3. Load Live Students
        const studentBatch = writeBatch(db);
        for (const [classId, students] of Object.entries(data.liveStudents)) {
            for (const student of students) {
                const studentRef = doc(db, `classrooms/${classId}/live_students`, student.uid);
                studentBatch.set(studentRef, {
                    ...student,
                    // Convert Timestamp objects to proper format
                    joinedAt: student.joinedAt,
                });
                operationCount++;

                if (operationCount >= 450) {
                    await studentBatch.commit();
                    operationCount = 0;
                }
            }
        }

        if (operationCount > 0) {
            await studentBatch.commit();
            operationCount = 0;
        }

        console.log('✓ Live students loaded');

        // 4. Load Analytics
        const analyticsBatch = writeBatch(db);
        for (const analyticsLog of data.analytics) {
            const logId = `${analyticsLog.classroomId}_${analyticsLog.studentId}_${analyticsLog.date}`;
            const analyticsRef = doc(db, 'analytics_logs', logId);
            analyticsBatch.set(analyticsRef, {
                ...analyticsLog,
                id: logId,
            });
            operationCount++;

            if (operationCount >= 450) {
                await analyticsBatch.commit();
                operationCount = 0;
            }
        }

        if (operationCount > 0) {
            await analyticsBatch.commit();
        }

        console.log('✓ Analytics loaded');

        toast.success('Dummy data loaded successfully! 🎉', {
            duration: 4000,
            icon: '📚',
        });
    } catch (error) {
        console.error('Error loading dummy data:', error);
        toast.error('Failed to load dummy data. Check console for details.');
        throw error;
    }
};

/**
 * Clear all dummy data from Firestore
 * This removes all classrooms, tasks, live students, and analytics created by loadDummyData
 */
export const clearDummyData = async (): Promise<void> => {
    try {
        const data = getAllDummyData();

        // 1. Delete Live Students
        for (const [classId, students] of Object.entries(data.liveStudents)) {
            for (const student of students) {
                const studentRef = doc(db, `classrooms/${classId}/live_students`, student.uid);
                await deleteDoc(studentRef);
            }
        }

        console.log('✓ Live students cleared');

        // 2. Delete Tasks
        for (const [classId] of Object.entries(data.tasks)) {
            const tasksByDate = getTasksByDate(classId);

            for (const [date, dateTasks] of Object.entries(tasksByDate)) {
                for (const task of dateTasks) {
                    const taskRef = doc(db, `classrooms/${classId}/tasks/${date}/tasks`, task.id);
                    await deleteDoc(taskRef);
                }
            }
        }

        console.log('✓ Tasks cleared');

        // 3. Delete Classrooms
        for (const classroom of data.classrooms) {
            const classroomRef = doc(db, 'classrooms', classroom.id);
            await deleteDoc(classroomRef);
        }

        console.log('✓ Classrooms cleared');

        // 4. Delete Analytics
        for (const analyticsLog of data.analytics) {
            const logId = `${analyticsLog.classroomId}_${analyticsLog.studentId}_${analyticsLog.date}`;
            const analyticsRef = doc(db, 'analytics_logs', logId);
            await deleteDoc(analyticsRef);
        }

        console.log('✓ Analytics cleared');

        toast.success('Dummy data cleared successfully!', {
            duration: 3000,
        });
    } catch (error) {
        console.error('Error clearing dummy data:', error);
        toast.error('Failed to clear dummy data. Check console for details.');
        throw error;
    }
};

/**
 * Reset dummy data (clear then reload)
 * @param teacherId - The UID of the teacher to assign classrooms to
 */
export const resetDummyData = async (teacherId: string): Promise<void> => {
    try {
        toast.loading('Resetting dummy data...', { duration: 2000 });
        await clearDummyData();
        await loadDummyData(teacherId);
        toast.success('Dummy data reset complete!', {
            duration: 3000,
            icon: '🔄',
        });
    } catch (error) {
        console.error('Error resetting dummy data:', error);
        toast.error('Failed to reset dummy data.');
        throw error;
    }
};

/**
 * Check if dummy data exists in the database
 * @returns Promise<boolean> - true if dummy classrooms exist
 */
export const hasDummyData = async (): Promise<boolean> => {
    try {
        const data = getAllDummyData();
        const classroomIds = data.classrooms.map(c => c.id);

        // Check if any dummy classroom exists
        const docSnap = await getDocs(collection(db, 'classrooms'));

        for (const doc of docSnap.docs) {
            if (classroomIds.includes(doc.id)) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking for dummy data:', error);
        return false;
    }
};

/**
 * Get dummy classroom join codes for easy reference
 * @returns Array of join codes with classroom names
 */
export const getDummyJoinCodes = () => {
    const data = getAllDummyData();
    return data.classrooms.map(c => ({
        code: c.joinCode,
        name: c.name,
        id: c.id,
    }));
};
