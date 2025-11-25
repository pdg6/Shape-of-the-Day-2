import toast from 'react-hot-toast';

export const handleError = (error, context = '') => {
    console.error(`Error in ${context}:`, error);

    const message = error?.message || 'An unexpected error occurred';
    toast.error(message);
};
