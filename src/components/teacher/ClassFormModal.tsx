import React, { useState, useEffect } from 'react';
import { collection, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom } from '../../types';
import { X, Trash2 } from 'lucide-react';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { useClassStore } from '../../store/appSettings';
import { themeColors } from '../../styles/tokens';
import { generateSecureCode } from '../../utils/security';

export const ClassFormModal: React.FC = () => {
    const { isClassModalOpen, setIsClassModalOpen, editingClass, classrooms, setClassrooms, currentClassId, setCurrentClassId } = useClassStore();

    const [formData, setFormData] = useState({
        name: '',
        subject: '',
        gradeLevel: '',
        color: '#3B82F6'
    });

    useEffect(() => {
        if (editingClass) {
            setFormData({
                name: editingClass.name,
                subject: editingClass.subject || '',
                gradeLevel: editingClass.gradeLevel || '',
                color: editingClass.color || '#3B82F6'
            });
        } else {
            setFormData({ name: '', subject: '', gradeLevel: '', color: '#3B82F6' });
        }
    }, [editingClass, isClassModalOpen]);

    const handleDeleteClass = async () => {
        if (!editingClass) return;
        if (!window.confirm('Are you sure you want to delete this class? This action cannot be undone.')) return;

        try {
            await deleteDoc(doc(db, 'classrooms', editingClass.id));
            setClassrooms(classrooms.filter(c => c.id !== editingClass.id));
            if (currentClassId === editingClass.id) {
                setCurrentClassId(null);
            }
            handleSuccess('Class deleted successfully');
            setIsClassModalOpen(false);
        } catch (error) {
            handleError(error, 'deleting class');
        }
    };

    const handleSaveClass = async () => {
        if (!formData.name) return handleError(new Error('Class name is required'));
        if (!auth.currentUser) return;

        try {
            if (editingClass) {
                // Update
                await updateDoc(doc(db, 'classrooms', editingClass.id), {
                    name: formData.name,
                    subject: formData.subject,
                    gradeLevel: formData.gradeLevel,
                    color: formData.color
                });
                setClassrooms(classrooms.map(c => c.id === editingClass.id ? { ...c, ...formData } : c));
                handleSuccess('Class updated successfully');
            } else {
                // Create with cryptographically secure join code
                // Generate unique code (check for collisions)
                let joinCode = generateSecureCode(6);
                let attempts = 0;
                const maxAttempts = 10;

                while (attempts < maxAttempts) {
                    const existing = await getDocs(
                        query(collection(db, 'classrooms'), where('joinCode', '==', joinCode))
                    );
                    if (existing.empty) break;
                    joinCode = generateSecureCode(6);
                    attempts++;
                }

                if (attempts >= maxAttempts) {
                    throw new Error('Could not generate unique join code. Please try again.');
                }

                const newClass = {
                    teacherId: auth.currentUser.uid,
                    joinCode: joinCode,
                    name: formData.name,
                    subject: formData.subject,
                    gradeLevel: formData.gradeLevel,
                    color: formData.color,
                    presentationSettings: { defaultView: 'grid', showTimeEstimates: true, allowStudentSorting: false },
                    contentLibrary: []
                };
                // Use joinCode as the document ID for easy lookup
                const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
                await setDoc(firestoreDoc(db, 'classrooms', joinCode), newClass);
                const newClassWithId = { id: joinCode, ...newClass } as Classroom;
                setClassrooms([...classrooms, newClassWithId]);
                // Automatically select the new class
                setCurrentClassId(joinCode);
                handleSuccess('Class created successfully');
            }
            setIsClassModalOpen(false);
        } catch (error) {
            handleError(error, 'saving class');
        }
    };

    if (!isClassModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-(--color-bg-tile) w-full max-w-md rounded-2xl shadow-layered border border-border-subtle p-6 transition-transform duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-brand-textPrimary">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
                    <button onClick={() => setIsClassModalOpen(false)} aria-label="Close modal" title="Close modal"><X className="w-6 h-6 text-brand-textSecondary" /></button>
                </div>
                {/* Law of Common Region: Group related fields visually */}
                <div className="space-y-4">
                    {/* Basic Info Section - Grouped with border */}
                    <div className="p-4 rounded-xl bg-tile-alt border border-border-subtle space-y-4">
                        <h4 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-3">Basic Information</h4>
                        <div>
                            <label className="block text-sm font-bold mb-1 text-brand-textSecondary">Class Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="input-base input-focus"
                                placeholder="e.g. Period 1 - Math"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-bold mb-1 text-brand-textSecondary">Subject</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    className="input-base input-focus"
                                    placeholder="e.g. Math"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold mb-1 text-brand-textSecondary">Grade Level</label>
                                <input
                                    type="text"
                                    value={formData.gradeLevel}
                                    onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}
                                    className="input-base input-focus"
                                    placeholder="e.g. 10th"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Appearance Section - Separate visual group */}
                    <div className="p-4 rounded-xl bg-tile-alt border border-border-subtle">
                        <h4 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-3">Appearance</h4>
                        <label className="block text-sm font-bold mb-1 text-brand-textSecondary">Theme Color</label>
                        <p className="text-xs text-brand-textMuted mb-2">This color will accent both teacher and student views</p>
                        <div className="flex flex-wrap gap-2">
                            {themeColors.classroomOptions.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setFormData({ ...formData, color })}
                                    /* Fitts's Law: Larger touch targets (44x44px) for color selection */
                                    className={`w-11 h-11 rounded-full border-2 transition-all ${formData.color === color ? 'border-brand-textPrimary scale-110 ring-2 ring-offset-2 ring-offset-(--bg-page)' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: color }}
                                    title={`Select ${color} as theme color`}
                                    aria-label={`Select theme color ${color}`}
                                    aria-pressed={formData.color === color ? "true" : "false"}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Primary action button - Large touch target */}
                    <button
                        onClick={handleSaveClass}
                        className="w-full py-3 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border border-brand-accent/20 hover:border-brand-accent/40 font-bold rounded-xl mt-4 button-lift-dynamic"
                    >
                        {editingClass ? 'Save Changes' : 'Create Class'}
                    </button>

                    {editingClass && (
                        <button
                            onClick={handleDeleteClass}
                            className="w-full py-3 bg-red-500/10 text-red-500 border border-red-500/20 hover:border-red-500/40 font-bold rounded-xl button-lift-dynamic flex items-center justify-center gap-2 mt-4"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Class
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
