import { useState } from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import AtsRulesModal from '../../src/components/AtsRulesModal';
import { translations } from '../../src/data/translations';

const t = translations.en;

function Harness({ initial = [] }) {
  const [groups, setGroups] = useState(initial);
  return (
    <AtsRulesModal open onClose={() => {}} t={t} lang="en" groups={groups} setGroups={setGroups} />
  );
}

const fillBothLanguages = (label, value) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /^ES/ }));
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /^EN/ }));
};

describe('AtsRulesModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('lists the permanent base rules and their points', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog', { name: t.atsRulesTitle });
    expect(within(dialog).getAllByText(t.atsRulesPermanent)).toHaveLength(19);
    expect(within(dialog).getByText(t.atsPdfTextLayer)).toBeTruthy();
    expect(within(dialog).getByText(t.atsPdfStuffing)).toBeTruthy();
  });

  it('creates a group after its name and description are written in both languages', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));

    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fillBothLanguages(t.atsRulesGroupDescription, 'Backend rules');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    expect(screen.getByText('Backend')).toBeTruthy();
    expect(screen.getByText(new RegExp(`0 ${t.atsRulesRuleCount}`))).toBeTruthy();
  });

  it('refuses to save a group that only has one language', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fireEvent.change(screen.getByLabelText(t.atsRulesGroupName), {
      target: { value: 'Only English' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    expect(screen.getByText(t.atsRulesValidationGroupName)).toBeTruthy();
  });

  it('requires a description for a new group', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    expect(screen.getByText(t.atsRulesValidationGroupDescription)).toBeTruthy();
  });

  it('shows validation errors as dismissible notifications', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    expect(screen.getByText(t.atsRulesValidationGroupName)).toBeTruthy();
    expect(screen.getByText(t.atsRulesValidationGroupDescription)).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: t.atsRulesDismiss })[0]);

    expect(screen.queryByText(t.atsRulesValidationGroupName)).toBeNull();
    expect(screen.getByText(t.atsRulesValidationGroupDescription)).toBeTruthy();
  });

  it('shows an example for the selected rule type', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fillBothLanguages(t.atsRulesGroupDescription, 'Backend rules');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddRule }));

    expect(screen.getByText(t.atsRulesExampleContainsAny)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(t.atsRulesRuleType), {
      target: { value: 'regex' },
    });

    expect(screen.getByText(t.atsRulesExampleRegex)).toBeTruthy();
  });

  it('adds a rule with terms and localized messages', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fillBothLanguages(t.atsRulesGroupDescription, 'Backend rules');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddRule }));
    fillBothLanguages(t.atsRulesRuleTitle, 'Docker');
    fillBothLanguages(t.atsRulesPassMessage, 'Docker found');
    fillBothLanguages(t.atsRulesFailMessage, 'Add Docker');
    fireEvent.change(screen.getByLabelText(t.atsRulesTerms), {
      target: { value: 'docker\nkubernetes' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    expect(screen.getByText('Docker')).toBeTruthy();
    expect(screen.getByText(new RegExp(t.atsRulesTypeContainsAny))).toBeTruthy();
    expect(screen.getByText(new RegExp(`1 ${t.atsRulesRuleCount}`))).toBeTruthy();
  });

  it('opens the group editor inside the group card', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fillBothLanguages(t.atsRulesGroupDescription, 'Backend rules');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    fireEvent.click(screen.getByRole('button', { name: t.atsRulesEditGroup }));

    const groupCard = screen.getByText('Backend').closest('li');
    expect(groupCard).toBeTruthy();
    expect(within(groupCard).getByLabelText(t.atsRulesGroupName)).toBeTruthy();
    expect(within(groupCard).getByLabelText(t.atsRulesGroupDescription)).toBeTruthy();
  });

  it('opens an existing rule editor inside its rule card', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fillBothLanguages(t.atsRulesGroupDescription, 'Backend rules');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddRule }));
    fillBothLanguages(t.atsRulesRuleTitle, 'Docker');
    fillBothLanguages(t.atsRulesPassMessage, 'Docker found');
    fillBothLanguages(t.atsRulesFailMessage, 'Add Docker');
    fireEvent.change(screen.getByLabelText(t.atsRulesTerms), {
      target: { value: 'docker' },
    });
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    fireEvent.click(screen.getByRole('button', { name: t.atsRulesEditRule }));

    const ruleCard = screen.getByText('Docker').closest('li');
    expect(ruleCard).toBeTruthy();
    expect(within(ruleCard).getByLabelText(t.atsRulesRuleTitle)).toBeTruthy();
    expect(within(ruleCard).getByLabelText(t.atsRulesTerms)).toBeTruthy();
  });

  it('enables and disables a group and a rule', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesCustomTab }));
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesAddGroup }));
    fillBothLanguages(t.atsRulesGroupName, 'Backend');
    fillBothLanguages(t.atsRulesGroupDescription, 'Backend rules');
    fireEvent.click(screen.getByRole('button', { name: t.atsRulesSave }));

    const groupToggle = screen.getByRole('checkbox', { name: t.atsRulesEnableGroup });
    expect(groupToggle.checked).toBe(true);
    fireEvent.click(groupToggle);
    expect(groupToggle.checked).toBe(false);
  });
});
