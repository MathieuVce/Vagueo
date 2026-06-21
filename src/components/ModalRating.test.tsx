import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ModalRating from './ModalRating';

describe('ModalRating', () => {
  it('renders correctly', () => {
    render(<ModalRating onSubmit={() => {}} onSkip={() => {}} />);
    expect(screen.getByText(/Votre avis compte/i)).toBeInTheDocument();
  });

  it('calls onSubmit when a star is clicked and submitted', () => {
    const handleSubmit = vi.fn();
    render(<ModalRating onSubmit={handleSubmit} onSkip={() => {}} />);
    // There are 5 stars. Let's click the 4th one.
    const stars = screen.getAllByText('★');
    fireEvent.click(stars[3]);

    // It should show feedback field now
    const textarea = screen.getByPlaceholderText(/Un axe d'amélioration/i);
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Great!' } });
    fireEvent.click(screen.getByText(/Envoyer mon avis/i));

    expect(handleSubmit).toHaveBeenCalledWith(4, 'Great!');
  });

  it('calls onSkip when "Passer" is clicked', () => {
    const handleSkip = vi.fn();
    render(<ModalRating onSubmit={() => {}} onSkip={handleSkip} />);
    fireEvent.click(screen.getByText(/Passer sans noter/i));
    expect(handleSkip).toHaveBeenCalled();
  });
});
