# Firebase Integration Guide for Shape of the Day

## Overview
This guide walks you through integrating Firebase Authentication and Firestore into your "Shape of the Day" application.

---

## Setup Steps

### 1. Firebase Console Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add project"
   - Name: "Shape of the Day"
   - Click "Create project"

2. **Add Web App**:
   - Click the Web icon (`</>`)
   - App nickname: "Shape of the Day Web"
   - Click "Register app"
   - **IMPORTANT**: Copy the `firebaseConfig` object

3. **Enable Authentication**:
   - Navigate to Authentication → Get started
   - Click "Sign-in method" tab
   - Enable "Google" provider
   - Add your support email
   - Save

4. **Enable Firestore**:
   - Navigate to Firestore Database → Create database
   - Start in **test mode** (for development)
   - Choose your region
   - Click "Enable"

---

### 2. Update Firebase Configuration

Replace the placeholder values in `src/firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

---

### 3. Update App.jsx to Use Firebase Services

Replace the mock authentication in `App.jsx` with real Firebase calls:

```javascript
import { signInWithGoogle, signOut, onAuthChange } from './services/authService';

// In App.jsx, replace the handleLogin function:
const handleLogin = async () => {
  try {
    const result = await signInWithGoogle();
    // User will be set automatically by onAuthChange listener
    setView('teacher');
  } catch (error) {
    console.error('Login failed:', error);
    toast.error('Failed to sign in. Please try again.');
  }
};

// Replace the handleLogout function:
const handleLogout = async () => {
  try {
    await signOut();
    setView('landing');
    setUser(null);
  } catch (error) {
    console.error('Logout failed:', error);
  }
};

// The existing useEffect for auth state should work with our new service
```

---

### 4. Integrate Firestore for Student Sessions

When a student joins a room, save their session:

```javascript
import { joinClassroom, saveStudentProfile } from './services/firestoreService';

const handleJoinRoom = async (code) => {
  try {
    // Find classroom by code
    const classroom = await joinClassroom(code);
    
    if (!classroom) {
      toast.error('Invalid room code. Please try again.');
      return;
    }
    
    // Generate a student ID (you could use a UUID library)
    const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save student session
    await saveStudentProfile(studentId, classroom.id, {
      name: 'Anonymous', // Will be updated when they submit their name
      joinedAt: new Date()
    });
    
    // Store classroom info in state
    setCurrentClassroom(classroom);
    setView('student');
    setShowNameModal(true);
  } catch (error) {
    console.error('Error joining classroom:', error);
    toast.error('Failed to join classroom. Please try again.');
  }
};
```

---

### 5. Set Up Firestore Security Rules

In the Firebase Console, go to Firestore Database → Rules and add:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Classrooms: Teachers can read/write their own classrooms
    match /classrooms/{classroomId} {
      allow read: if true; // Anyone with the code can read
      allow write: if request.auth != null && 
                      request.resource.data.teacherId == request.auth.uid;
      
      // Tasks within classrooms
      match /tasks/{taskId} {
        allow read: if true;
        allow write: if request.auth != null;
        
        // Task statuses for students
        match /statuses/{studentId} {
          allow read: if true;
          allow write: if true; // Students can update their own status
        }
      }
    }
    
    // Student profiles
    match /students/{studentId} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

**Note**: These are permissive rules for development. Tighten them for production.

---

### 6. Firestore Data Structure

Your Firestore database will have this structure:

```
classrooms/
  {classroomId}/
    - teacherId: string
    - name: string
    - code: string (6-digit code for joining)
    - createdAt: timestamp
    - updatedAt: timestamp
    
    tasks/
      {taskId}/
        - title: string
        - description: string
        - dueDate: string
        - createdAt: timestamp
        
        statuses/
          {studentId}/
            - status: string (todo, in_progress, stuck, question, done)
            - updatedAt: timestamp

students/
  {studentId}/
    - name: string
    - classroomId: string
    - joinedAt: timestamp
    - lastActive: timestamp
```

---

### 7. Implement Real-Time Updates in TeacherDashboard

```javascript
import { subscribeToTasks, subscribeToTaskStatuses } from '../services/firestoreService';

useEffect(() => {
  if (!currentClassroom) return;
  
  // Subscribe to task updates
  const unsubscribeTasks = subscribeToTasks(currentClassroom.id, (tasks) => {
    setTasks(tasks);
  });
  
  // Cleanup on unmount
  return () => unsubscribeTasks();
}, [currentClassroom]);
```

---

### 8. Implement Real-Time Updates in StudentView

```javascript
import { subscribeToTasks, updateTaskStatus } from '../services/firestoreService';

const handleUpdateStatus = async (taskId, newStatus) => {
  try {
    await updateTaskStatus(currentClassroom.id, taskId, studentId, newStatus);
    
    // Show toast notification
    if (newStatus === 'stuck') {
      toast.error("Teacher notified that you're stuck!");
    } else if (newStatus === 'question') {
      toast('Teacher notified that you have a question.', { icon: '🙋' });
    } else if (newStatus === 'done') {
      toast.success("Great job! Task completed.");
    }
  } catch (error) {
    console.error('Error updating status:', error);
    toast.error('Failed to update status. Please try again.');
  }
};
```

---

## Testing Firebase Integration

1. **Test Authentication**:
   - Click "Teacher" tab → "Sign in with Google"
   - Verify you can sign in and out

2. **Create a Test Classroom**:
   - Use Firestore Console to manually create a classroom document
   - Add a `code` field (e.g., "123456")

3. **Test Student Join**:
   - Click "Student" tab
   - Enter the classroom code
   - Verify the join succeeds

4. **Test Real-Time Updates**:
   - Open app in two browser windows
   - Have one as teacher, one as student
   - Update task status as student
   - Verify teacher sees the update in real-time

---

## Environment Variables (Optional but Recommended)

Create a `.env` file in your project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Then update `src/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
```

---

## Next Steps

1. ✅ Update `src/firebase.js` with your Firebase project credentials
2. ✅ Replace mock authentication in `App.jsx`
3. ✅ Implement classroom creation in `TeacherDashboard`
4. ✅ Implement real-time task updates
5. ✅ Test the full flow: Teacher creates classroom → Student joins → Real-time status updates
6. ✅ Secure Firestore rules for production

---

## Troubleshooting

**Issue**: "Firebase: Error (auth/unauthorized-domain)"
- **Solution**: Add `localhost` and your domain to authorized domains in Firebase Console → Authentication → Settings → Authorized domains

**Issue**: "Missing or insufficient permissions"
- **Solution**: Check your Firestore security rules

**Issue**: "Cannot read properties of undefined (reading 'id')"
- **Solution**: Ensure you're checking if data exists before accessing it

---

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
