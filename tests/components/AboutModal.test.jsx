import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import AboutModal from '../../src/components/AboutModal';
import { translations } from '../../src/data/translations';

describe('AboutModal', () => {
  afterEach(() => cleanup());

  const renderModal = (props = {}) => {
    const onClose = vi.fn();
    const view = render(
      <AboutModal
        open={true}
        onClose={onClose}
        t={translations.en}
        isDemo={true}
        {...props}
      />,
    );
    return { onClose, view };
  };

  it('draws nothing when open is false', () => {
    render(<AboutModal open={false} onClose={vi.fn()} t={translations.en} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders about section with app info and GitHub repository link', () => {
    renderModal();
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText('DownCV')).not.toBeNull();
    expect(screen.getByText(translations.en.aboutTab)).not.toBeNull();

    const repoLink = screen.getByRole('link', { name: new RegExp(translations.en.aboutRepoButton, 'i') });
    expect(repoLink).not.toBeNull();
    expect(repoLink.getAttribute('href')).toBe('https://github.com/AcoranGonzalezMoray/DownCV');
    expect(repoLink.getAttribute('target')).toBe('_blank');
  });

  it('renders privacy policy explaining client-side storage and processing', () => {
    renderModal();
    expect(screen.getByText(translations.en.privacyTab)).not.toBeNull();
    expect(screen.getByText(translations.en.privacyClientTitle)).not.toBeNull();
    expect(screen.getByText(translations.en.privacyStorageDesc)).not.toBeNull();
    expect(screen.getByText(translations.en.privacyProcessingDesc)).not.toBeNull();
    expect(screen.getByText(translations.en.privacyNetworkDesc)).not.toBeNull();
  });

  it('shows demo purpose notice when isDemo is true (GitHub Pages mode)', () => {
    renderModal({ isDemo: true });
    expect(screen.getByTestId('demo-notice-box')).not.toBeNull();
    expect(screen.getByText(translations.en.privacyDemoTitle)).not.toBeNull();
    expect(screen.getByText(translations.en.privacyDemoDesc)).not.toBeNull();
  });

  it('hides demo notice when isDemo is false (Docker / local mode)', () => {
    renderModal({ isDemo: false });
    expect(screen.queryByTestId('demo-notice-box')).toBeNull();
    expect(screen.queryByText(translations.en.privacyDemoTitle)).toBeNull();
    expect(screen.getByText(translations.en.aboutTab)).not.toBeNull();
    expect(screen.getByText(translations.en.privacyTab)).not.toBeNull();
  });

  it('triggers onClose when close button is clicked or Escape key is pressed', () => {
    const { onClose } = renderModal();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();

    const closeBtn = screen.getByRole('button', { name: new RegExp(translations.en.updateResolvedClose, 'i') });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
