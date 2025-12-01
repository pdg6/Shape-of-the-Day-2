import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom } from '../../types';
import { X } from 'lucide-react';
import { handleError, handleSuccess } from '../../utils/errorHandler';
import { useClassStore } from '../../store/classStore';

export const ClassFormModal: React.FC = () => {
    const { isClassModalOpen, setIsClassModalOpen, editingClass, classrooms, setClassrooms, setCurrentClassId } = useClassStore();

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
                // Create
                const newClass = {
                    teacherId: auth.currentUser.uid,
                    joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                    name: formData.name,
                    subject: formData.subject,
                    gradeLevel: formData.gradeLevel,
                    color: formData.color,
                    presentationSettings: { defaultView: 'grid', showTimeEstimates: true, allowStudentSorting: false },
                    contentLibrary: []
                };
                const ref = await addDoc(collection(db, 'classrooms'), newClass);
                const newClassWithId = { id: ref.id, ...newClass } as Classroom;
                setClassrooms([...classrooms, newClassWithId]);
                // Automatically select the new class
                setCurrentClassId(ref.id);
                handleSuccess('Class created successfully');
            }
            setIsClassModalOpen(false);
        } catch (error) {
            handleError(error, 'saving class');
        }
    };

    if (!isClassModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-md rounded-xl shadow-2xl border-[3px] border-gray-200 dark:border-gray-700 p-6 transition-transform duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{editingClass ? 'Edit Class' : 'Create New Class'}</h3>
                    <button onClick={() => setIsClassModalOpen(false)}><X className="w-6 h-6 text-gray-500" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold mb-1 text-brand-textDarkSecondary dark:text-brand-textSecondary">Class Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary"
                            placeholder="e.g. Period 1 - Math"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-brand-textDarkSecondary dark:text-brand-textSecondary">Subject</label>
                        <input
                            type="text"
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full p-2 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary"
                            placeholder="e.g. Mathematics"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-brand-textDarkSecondary dark:text-brand-textSecondary">Grade Level</label>
                        <input
                            type="text"
                            value={formData.gradeLevel}
                            onChange={e => setFormData({ ...formData, gradeLevel: e.target.value })}
                            className="w-full p-2 border-[3px] border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-brand-textDarkPrimary dark:text-brand-textPrimary"
                            placeholder="e.g. 10th Grade"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1 text-brand-textDarkSecondary dark:text-brand-textSecondary">Theme Color</label>
                        <div className="flex gap-2">
                            {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                                <button
                                    key={color}
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-brand-textDarkPrimary dark:border-white scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={handleSaveClass}
                        className="w-full py-3 bg-brand-accent text-white font-bold rounded-lg mt-4 hover:bg-blue-600 transition-colors"
                    >
                        {editingClass ? 'Save Changes' : 'Create Class'}
                    </button>
                </div>
            </div>
        </div>
    );
};
