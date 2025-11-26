import toast from 'react-hot-toast';

export const handleError = (error: any, context: string = '') => {
    console.error(`Error ${context ? `in ${context}` : ''}:`, error);

    const message = error?.message || 'An unexpected error occurred';
    toast.error(message);
};

export const handleSuccess = (message: string) => {
    toast.success(message);
};
