import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';
import PageLoader from '../PageLoader';

describe('LoadingSpinner', () => {
    it('renders with default size', () => {
        render(<LoadingSpinner />);
        const spinner = screen.getByRole('status');
        expect(spinner).toBeInTheDocument();
        expect(spinner).toHaveClass('w-8', 'h-8');
    });

    it('renders with small size', () => {
        render(<LoadingSpinner size="sm" />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('w-4', 'h-4');
    });

    it('renders with large size', () => {
        render(<LoadingSpinner size="lg" />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('w-12', 'h-12');
    });

    it('applies custom className', () => {
        render(<LoadingSpinner className="custom-class" />);
        const spinner = screen.getByRole('status');
        expect(spinner).toHaveClass('custom-class');
    });
});

describe('PageLoader', () => {
    it('renders with default message', () => {
        render(<PageLoader />);
        expect(screen.getByText('Memuat data...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
        render(<PageLoader message="Loading products..." />);
        expect(screen.getByText('Loading products...')).toBeInTheDocument();
    });

    it('contains a loading spinner', () => {
        render(<PageLoader />);
        expect(screen.getByRole('status')).toBeInTheDocument();
    });
});
