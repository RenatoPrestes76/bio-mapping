import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScenarioSelector } from '../components/ScenarioSelector';

const scenarios = [
  { scenarioType: 'SMOKING_CESSATION' as const, name: 'Cessação do tabagismo', description: 'Parar de fumar', defaultParameters: {} },
  { scenarioType: 'WEIGHT_LOSS' as const, name: 'Perda de peso', description: 'Reduzir peso', defaultParameters: {} },
];

const defaults = {
  scenarios,
  selectedScenario: null as any,
  selectedHorizon: 'YEAR_1' as const,
  onSelectScenario: vi.fn(),
  onSelectHorizon: vi.fn(),
  onRun: vi.fn(),
};

describe('ScenarioSelector', () => {
  it('renders all scenario options', () => {
    render(<ScenarioSelector {...defaults} />);
    const options = screen.getAllByTestId('scenario-option');
    expect(options).toHaveLength(2);
  });

  it('renders scenario names', () => {
    render(<ScenarioSelector {...defaults} />);
    expect(screen.getByText('Cessação do tabagismo')).toBeTruthy();
    expect(screen.getByText('Perda de peso')).toBeTruthy();
  });

  it('calls onSelectScenario when option clicked', () => {
    const onSelectScenario = vi.fn();
    render(<ScenarioSelector {...defaults} onSelectScenario={onSelectScenario} />);
    fireEvent.click(screen.getAllByTestId('scenario-option')[0]);
    expect(onSelectScenario).toHaveBeenCalled();
  });

  it('highlights selected scenario', () => {
    render(<ScenarioSelector {...defaults} selectedScenario="SMOKING_CESSATION" />);
    const selected = screen.getAllByTestId('scenario-option').find(
      (el) => el.getAttribute('data-scenario') === 'SMOKING_CESSATION',
    );
    expect(selected?.className).toContain('border-blue-500');
  });

  it('renders all 6 time horizon options', () => {
    render(<ScenarioSelector {...defaults} />);
    expect(screen.getAllByTestId('horizon-option')).toHaveLength(6);
  });

  it('calls onSelectHorizon when horizon clicked', () => {
    const onSelectHorizon = vi.fn();
    render(<ScenarioSelector {...defaults} onSelectHorizon={onSelectHorizon} />);
    fireEvent.click(screen.getAllByTestId('horizon-option')[0]);
    expect(onSelectHorizon).toHaveBeenCalled();
  });

  it('run button is disabled when no scenario selected', () => {
    render(<ScenarioSelector {...defaults} selectedScenario={null} />);
    expect(screen.getByTestId('run-simulation-btn')).toBeDisabled();
  });

  it('run button is enabled when scenario is selected', () => {
    render(<ScenarioSelector {...defaults} selectedScenario="SMOKING_CESSATION" />);
    expect(screen.getByTestId('run-simulation-btn')).not.toBeDisabled();
  });

  it('calls onRun when button clicked', () => {
    const onRun = vi.fn();
    render(<ScenarioSelector {...defaults} selectedScenario="SMOKING_CESSATION" onRun={onRun} />);
    fireEvent.click(screen.getByTestId('run-simulation-btn'));
    expect(onRun).toHaveBeenCalled();
  });

  it('shows loading text when loading', () => {
    render(<ScenarioSelector {...defaults} selectedScenario="SMOKING_CESSATION" loading />);
    expect(screen.getByTestId('run-simulation-btn').textContent).toContain('Simulando');
  });
});
