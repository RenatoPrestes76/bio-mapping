import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CohortBuilder } from '../components/CohortBuilder';

describe('CohortBuilder', () => {
  it('renders the form', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    expect(screen.getByTestId('cohort-builder')).toBeTruthy();
  });

  it('renders name input', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    expect(screen.getByTestId('cohort-name-input')).toBeTruthy();
  });

  it('create button is disabled when name is empty', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    const btn = screen.getByTestId('create-cohort-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('create button is enabled when name is filled', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByTestId('cohort-name-input'), { target: { value: 'Diabéticos' } });
    const btn = screen.getByTestId('create-cohort-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('renders segment select with options', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    const select = screen.getByTestId('cohort-segment-select');
    expect(select).toBeTruthy();
    const options = screen.getAllByTestId('segment-option');
    expect(options.length).toBe(8);
  });

  it('clicking add filter shows a filter row', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('add-filter-btn'));
    expect(screen.getAllByTestId('filter-row').length).toBe(1);
  });

  it('clicking remove filter removes the row', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('add-filter-btn'));
    fireEvent.click(screen.getByTestId('remove-filter-btn'));
    expect(screen.queryAllByTestId('filter-row').length).toBe(0);
  });

  it('calls onSubmit with name and filters on form submit', () => {
    const onSubmit = vi.fn();
    render(<CohortBuilder onSubmit={onSubmit} />);
    fireEvent.change(screen.getByTestId('cohort-name-input'), { target: { value: 'Hipertensos' } });
    fireEvent.submit(screen.getByTestId('cohort-builder'));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hipertensos', filters: [] })
    );
  });

  it('shows loading state on create button', () => {
    render(<CohortBuilder onSubmit={vi.fn()} loading={true} />);
    expect(screen.getByTestId('create-cohort-btn').textContent).toContain('Criando');
  });

  it('multiple filters can be added', () => {
    render(<CohortBuilder onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('add-filter-btn'));
    fireEvent.click(screen.getByTestId('add-filter-btn'));
    expect(screen.getAllByTestId('filter-row').length).toBe(2);
  });
});
