import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import useLocalFile, { fileSystemAccessSupported } from '../../src/hooks/useLocalFile';

const writable = { write: vi.fn(), close: vi.fn() };
let handle;

const installApi = () => {
  handle = {
    name: 'cv.md',
    getFile: vi.fn(async () => ({ text: async () => '# Ana' })),
    createWritable: vi.fn(async () => writable),
  };
  window.showOpenFilePicker = vi.fn(async () => [handle]);
  window.showSaveFilePicker = vi.fn(async () => handle);
  window.FileSystemFileHandle = function FileSystemFileHandle() {};
};

const removeApi = () => {
  delete window.showOpenFilePicker;
  delete window.showSaveFilePicker;
  delete window.FileSystemFileHandle;
};

function Harness({ onRead, onWrite, onError }) {
  const api = useLocalFile({ onRead, onWrite, onError });
  return (
    <div>
      <span data-testid="name">{api.fileName || 'none'}</span>
      <span data-testid="status">{api.status}</span>
      <span data-testid="supported">{String(api.supported)}</span>
      <button type="button" onClick={() => api.link()}>
        link
      </button>
      <button type="button" onClick={() => api.save('# Ana')}>
        save
      </button>
      <button type="button" onClick={() => api.save('# Ana', { silent: true })}>
        autosave
      </button>
      <button type="button" onClick={() => api.markDirty()}>
        dirty
      </button>
      <button type="button" onClick={() => api.unlink()}>
        unlink
      </button>
    </div>
  );
}

const click = (name) => fireEvent.click(screen.getByRole('button', { name }));

describe('fileSystemAccessSupported', () => {
  afterEach(removeApi);

  it('is false where the browser has no File System Access API', () => {
    removeApi();
    expect(fileSystemAccessSupported()).toBe(false);
  });

  it('is true once both the picker and the handle exist', () => {
    installApi();
    expect(fileSystemAccessSupported()).toBe(true);
  });
});

describe('useLocalFile', () => {
  let onRead;
  let onWrite;
  let onError;

  beforeEach(() => {
    installApi();
    writable.write.mockClear();
    writable.close.mockClear();
    onRead = vi.fn();
    onWrite = vi.fn();
    onError = vi.fn();
  });

  afterEach(() => {
    cleanup();
    removeApi();
  });

  it('reads the chosen file into the app and remembers its name', async () => {
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('link');
    });

    expect(onRead).toHaveBeenCalledWith('# Ana', 'cv.md');
    expect(screen.getByTestId('name').textContent).toBe('cv.md');
    expect(screen.getByTestId('supported').textContent).toBe('true');
  });

  it('writes to the very same file on every save, with no download in between', async () => {
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('link');
    });
    await act(async () => {
      click('save');
    });

    expect(window.showSaveFilePicker).not.toHaveBeenCalled();
    expect(writable.write).toHaveBeenCalledWith('# Ana');
    expect(writable.close).toHaveBeenCalled();
    expect(onWrite).toHaveBeenCalledWith('# Ana', 'cv.md');
    expect(screen.getByTestId('status').textContent).toBe('saved');
  });

  it('asks where to put the file the first time, and never again', async () => {
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('save');
    });
    expect(window.showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('name').textContent).toBe('cv.md');

    await act(async () => {
      click('save');
    });
    expect(window.showSaveFilePicker).toHaveBeenCalledTimes(1);
  });

  it('stays quiet on an automatic save when no file is linked', async () => {
    
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('autosave');
    });
    expect(window.showSaveFilePicker).not.toHaveBeenCalled();
    expect(writable.write).not.toHaveBeenCalled();
  });

  it('knows there is something to write before the save happens', async () => {
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('link');
    });
    await act(async () => {
      click('dirty');
    });
    expect(screen.getByTestId('status').textContent).toBe('dirty');
  });

  it('forgets the file without touching it on disk', async () => {
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('link');
    });
    await act(async () => {
      click('unlink');
    });
    expect(screen.getByTestId('name').textContent).toBe('none');
  });

  it('does not treat a cancelled file picker as a failure', async () => {
    window.showOpenFilePicker = vi.fn(async () => {
      throw Object.assign(new Error('cancelled'), { name: 'AbortError' });
    });
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    await act(async () => {
      click('link');
    });
    expect(onError).not.toHaveBeenCalled();
    expect(screen.getByTestId('name').textContent).toBe('none');
  });

  it('reports a browser that cannot do it, instead of failing silently', async () => {
    removeApi();
    render(<Harness onRead={onRead} onWrite={onWrite} onError={onError} />);
    expect(screen.getByTestId('supported').textContent).toBe('false');
    await act(async () => {
      click('link');
    });
    await waitFor(() => expect(onError).toHaveBeenCalledWith('unsupported'));
  });
});
