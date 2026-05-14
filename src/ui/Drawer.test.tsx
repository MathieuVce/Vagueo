import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Drawer, DrawerHeader } from './Drawer';

describe('Drawer', () => {
  it('renders content correctly', () => {
    render(<Drawer onClose={() => {}}>Content</Drawer>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = vi.fn();
    render(<Drawer onClose={handleClose}>Content</Drawer>);
    const backdrop = screen.getByText('Content').closest('div')?.parentElement?.parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
    }
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders header via DrawerHeader', () => {
    const handleClose = vi.fn();
    render(
      <Drawer 
        onClose={() => {}} 
        header={<DrawerHeader title="Settings" subtitle="Change your settings" onClose={handleClose} />}
      >
        Content
      </Drawer>
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Change your settings')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('×'));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
