export const STATUS_CONFIG = {
    todo: {
        id: 'todo',
        label: 'To Do',
        color: 'bg-slate-100',
        borderColor: 'border-slate-300',
        textColor: 'text-slate-700'
    },
    in_progress: {
        id: 'in_progress',
        label: 'In Progress',
        color: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700'
    },
    done: {
        id: 'done',
        label: 'Done',
        color: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700'
    }
};

export const STATUS_IDS = Object.keys(STATUS_CONFIG);
