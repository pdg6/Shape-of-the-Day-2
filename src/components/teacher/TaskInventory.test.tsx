import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('../../firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid',
    },
  },
  db: {},
  collection: jest.fn(),
  onSnapshot: jest.fn((query, callback) => {
    callback({
      forEach: (callback) => {
        // empty
      },
    });
    return jest.fn();
  }),
  query: jest.fn(),
  where: jest.fn(),
}));

jest.mock('../../store/classStore', () => ({
  useClassStore: jest.fn(() => ({
    classrooms: [],
  })),
}));

const TaskInventory = require('./TaskInventory').default;

describe('TaskInventory', () => {
  it('should render the search input', () => {
    render(<TaskInventory />);
    const searchInput = screen.getByPlaceholderText('Search tasks...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should filter tasks based on search query', () => {
    render(<TaskInventory />);
    const searchInput = screen.getByPlaceholderText('Search tasks...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    // Add assertions to check if the tasks are filtered
  });
});