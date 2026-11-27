import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import Stock from '../pages/Stock';
import { createSeedData } from '../store/seed';

let mockStore: {
  data: ReturnType<typeof createSeedData>;
  currentUser: ReturnType<typeof createSeedData>['users'][number] | null;
  can: () => boolean;
  [key: string]: unknown;
};

jest.mock('layouts', () => ({
  DashboardLayout: ({
    children,
    sidePanel,
  }: {
    children: React.ReactNode;
    sidePanel?: React.ReactNode;
  }) => (
    <div>
      {children}
      {sidePanel}
    </div>
  ),
}));

jest.mock('context', () => ({
  useConfirm: () => jest.fn(async () => true),
  useStore: () => mockStore,
}));

describe('Stock quick actions', () => {
  beforeEach(() => {
    const data = createSeedData();
    mockStore = {
      data,
      currentUser: data.users[0],
      can: () => true,
      addDelivery: jest.fn(),
      updateDelivery: jest.fn(),
      deleteDelivery: jest.fn(),
      addStockCount: jest.fn(),
      updateStockCount: jest.fn(),
      deleteStockCount: jest.fn(),
      addLoss: jest.fn(),
      updateLoss: jest.fn(),
      deleteLoss: jest.fn(),
      addInventoryItem: jest.fn(),
      updateInventoryItem: jest.fn(),
      deleteInventoryItem: jest.fn(),
    };
  });

  it.each([
    ['Buy', 'Record delivery', 'Delivery'],
    ['Count', 'Record stock count', 'Stock count'],
    ['Loss', 'Record loss or gain', 'Loss or gain'],
  ])('opens %s in a side panel', (button, title, label) => {
    render(<Stock />);

    fireEvent.click(screen.getAllByRole('button', { name: button })[0]);

    expect(screen.getByRole('complementary', { name: label })).toBeVisible();
    expect(screen.getByText(title)).toBeVisible();
  });
});
