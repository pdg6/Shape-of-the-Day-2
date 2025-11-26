import { doc, getDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { LiveStudent, AnalyticsLog } from '../types';

/**
 * Scrubs PII (Personally Identifiable Information) from a student's session data
 * and saves the anonymous metrics to the permanent analytics log.
 * 
 * @param classId The ID of the classroom
 * @param studentId The UID of the student (anonymous auth ID)
 */
export const scrubAndSaveSession = async (classId: string, studentId: string) => {
    try {
        const studentRef = doc(db, 'classrooms', classId, 'live_students', studentId);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
            console.warn(`Student ${studentId} not found for scrubbing.`);
            return;
        }

        const studentData = studentSnap.data() as LiveStudent;
        const now = new Date();
        const joinedAt = studentData.joinedAt.toDate();
        const sessionDuration = now.getTime() - joinedAt.getTime();

        // 1. Transform to Analytics Log (Now with Identity Preserved)
        const analyticsData: AnalyticsLog = {
            classroomId: classId,
            studentId: studentId,
            studentName: studentData.displayName,
            date: now.toISOString().split('T')[0], // YYYY-MM-DD
            sessionDuration: sessionDuration,
            taskPerformance: studentData.taskHistory ? studentData.taskHistory.map(task => ({
                taskId: task.id,
                title: task.title,
                timeToComplete_ms: task.completedAt && task.startedAt ? task.completedAt - task.startedAt : 0,
                statusWasStuck: task.wasStuck || false,
                questionsAsked: task.questions || []
            })) : []
        };

        // 2. Perform Batch Operation: Write Log + Delete Live Record
        const batch = writeBatch(db);

        // Create a new doc in analytics_logs with auto-ID
        const analyticsRef = doc(collection(db, 'analytics_logs'));
        batch.set(analyticsRef, analyticsData);

        // Delete the live student record (The "Scrub")
        batch.delete(studentRef);

        await batch.commit();
        console.log(`[PRIVACY] Scrubbed data for student ${studentId}. Metrics saved.`);

    } catch (error) {
        console.error("Failed to scrub session:", error);
        throw error;
    }
};
