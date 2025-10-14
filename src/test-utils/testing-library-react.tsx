import type { ReactElement } from 'react';
import React, { StrictMode } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';

type TextMatch = string | RegExp;

type QueryOptions = {
  name?: TextMatch;
  selector?: string;
};

type FindOptions = QueryOptions & {
  timeout?: number;
  interval?: number;
};

interface RenderResult {
  container: HTMLElement;
  unmount: () => void;
  rerender: (ui: ReactElement) => void;
}

let currentRoot: Root | null = null;
let currentContainer: HTMLElement | null = null;

const DEFAULT_TIMEOUT = 2000;
const DEFAULT_INTERVAL = 50;

function matchesText(text: string | null | undefined, matcher: TextMatch): boolean {
  if (text == null) return false;
  if (typeof matcher === 'string') {
    return text.toLowerCase().includes(matcher.toLowerCase());
  }
  return matcher.test(text);
}

function getNodeLabel(node: Element): string {
  const ariaLabel = node.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;
  if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
    if (node.placeholder) return node.placeholder;
    if (node.value) return String(node.value);
  }
  return node.textContent ?? '';
}

function queryAllByText(container: Element, matcher: TextMatch): Element[] {
  const nodes = Array.from(container.querySelectorAll('*'));
  return nodes.filter((node) => matchesText(node.textContent, matcher));
}

function queryByText(container: Element, matcher: TextMatch): Element | null {
  return queryAllByText(container, matcher)[0] ?? null;
}

function getByText(container: Element, matcher: TextMatch): Element {
  const result = queryByText(container, matcher);
  if (!result) {
    throw new Error(`Unable to find element with text: ${matcher.toString()}`);
  }
  return result;
}

function queryAllByRole(container: Element, role: string, options: QueryOptions = {}): Element[] {
  const normalizedRole = role.toLowerCase();
  const candidates = Array.from(container.querySelectorAll(options.selector ?? '*'));
  return candidates.filter((node) => {
    const explicitRole = node.getAttribute('role');
    const matchesRole = explicitRole
      ? explicitRole.toLowerCase() === normalizedRole
      : matchesImplicitRole(node, normalizedRole);
    if (!matchesRole) {
      return false;
    }
    if (options.name) {
      return matchesText(getNodeLabel(node), options.name);
    }
    return true;
  });
}

function matchesImplicitRole(node: Element, role: string): boolean {
  const tag = node.tagName.toLowerCase();
  switch (role) {
    case 'button':
      return tag === 'button' || (tag === 'input' && ['button', 'submit'].includes((node as HTMLInputElement).type));
    case 'textbox':
      return tag === 'textarea' || (tag === 'input' && !['button', 'submit', 'checkbox', 'radio'].includes((node as HTMLInputElement).type));
    case 'combobox':
      return tag === 'select';
    case 'heading':
      return /^h[1-6]$/.test(tag);
    case 'link':
      return tag === 'a';
    default:
      return false;
  }
}

function queryByRole(container: Element, role: string, options: QueryOptions = {}): Element | null {
  return queryAllByRole(container, role, options)[0] ?? null;
}

function getByRole(container: Element, role: string, options: QueryOptions = {}): Element {
  const result = queryByRole(container, role, options);
  if (!result) {
    throw new Error(`Unable to find role "${role}"` + (options.name ? ` with name ${options.name}` : ''));
  }
  return result;
}

function queryByLabelText(container: Element, matcher: TextMatch): Element | null {
  const labels = Array.from(container.querySelectorAll('label'));
  for (const label of labels) {
    if (!matchesText(label.textContent, matcher)) continue;
    const htmlFor = label.getAttribute('for');
    if (htmlFor) {
      const control = container.querySelector(`#${CSS.escape(htmlFor)}`);
      if (control instanceof HTMLElement) return control;
    }
    const control = label.querySelector('input,textarea,select');
    if (control instanceof HTMLElement) return control;
  }
  return null;
}

function getByLabelText(container: Element, matcher: TextMatch): Element {
  const result = queryByLabelText(container, matcher);
  if (!result) {
    throw new Error(`Unable to find label text: ${matcher.toString()}`);
  }
  return result;
}

function queryByPlaceholderText(container: Element, matcher: TextMatch): Element | null {
  const inputs = Array.from(container.querySelectorAll('input,textarea'));
  return inputs.find((input) => matchesText((input as HTMLInputElement | HTMLTextAreaElement).placeholder ?? '', matcher)) ?? null;
}

function getByPlaceholderText(container: Element, matcher: TextMatch): Element {
  const result = queryByPlaceholderText(container, matcher);
  if (!result) {
    throw new Error(`Unable to find placeholder text: ${matcher.toString()}`);
  }
  return result;
}

function ensureContainer(): HTMLElement {
  if (!currentContainer) {
    throw new Error('No rendered container. Call render() first.');
  }
  return currentContainer;
}

export function cleanup() {
  if (currentRoot) {
    act(() => {
      currentRoot?.unmount();
    });
    currentRoot = null;
  }
  if (currentContainer?.parentElement) {
    currentContainer.parentElement.removeChild(currentContainer);
  }
  currentContainer = null;
}

export function render(ui: ReactElement): RenderResult {
  cleanup();
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<StrictMode>{ui}</StrictMode>);
  });
  currentRoot = root;
  currentContainer = container;

  return {
    container,
    unmount: cleanup,
    rerender: (nextUi: ReactElement) => {
      act(() => {
        root.render(<StrictMode>{nextUi}</StrictMode>);
      });
    },
  };
}

function waitForElement(matcher: () => Element | null, options: FindOptions = {}): Promise<Element> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const interval = options.interval ?? DEFAULT_INTERVAL;
  const start = Date.now();

  return new Promise<Element>((resolve, reject) => {
    function check() {
      try {
        const result = matcher();
        if (result) {
          resolve(result);
          return;
        }
      } catch {
        // ignore until timeout
      }
      if (Date.now() - start >= timeout) {
        reject(new Error('Timed out waiting for element'));
        return;
      }
      setTimeout(check, interval);
    }
    check();
  });
}

export function waitFor(callback: () => void, options: FindOptions = {}): Promise<void> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const interval = options.interval ?? DEFAULT_INTERVAL;
  const start = Date.now();

  return new Promise<void>((resolve, reject) => {
    function check() {
      try {
        callback();
        resolve();
      } catch (error) {
        if (Date.now() - start >= timeout) {
          reject(error instanceof Error ? error : new Error('waitFor timeout'));
          return;
        }
        setTimeout(check, interval);
      }
    }
    check();
  });
}

export function findByText(matcher: TextMatch, options?: FindOptions): Promise<Element> {
  return waitForElement(() => queryByText(ensureContainer(), matcher), options);
}

export function findByRole(role: string, options?: FindOptions): Promise<Element> {
  return waitForElement(() => queryByRole(ensureContainer(), role, options), options);
}

export const screen = {
  get container() {
    return ensureContainer();
  },
  getByText: (matcher: TextMatch) => getByText(ensureContainer(), matcher),
  queryByText: (matcher: TextMatch) => queryByText(ensureContainer(), matcher),
  findByText,
  getByRole: (role: string, options?: QueryOptions) => getByRole(ensureContainer(), role, options),
  queryByRole: (role: string, options?: QueryOptions) => queryByRole(ensureContainer(), role, options),
  findByRole,
  getByLabelText: (matcher: TextMatch) => getByLabelText(ensureContainer(), matcher),
  getByPlaceholderText: (matcher: TextMatch) => getByPlaceholderText(ensureContainer(), matcher),
};

export const fireEvent = {
  click(target: Element) {
    act(() => {
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
  },
  change(target: Element, value: string) {
    act(() => {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.value = value;
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    });
  },
  input(target: Element, value: string) {
    fireEvent.change(target, value);
  },
  submit(target: Element) {
    act(() => {
      target.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  },
};

export function within(element: Element) {
  return {
    getByText: (matcher: TextMatch) => getByText(element, matcher),
    queryByText: (matcher: TextMatch) => queryByText(element, matcher),
    getByRole: (role: string, options?: QueryOptions) => getByRole(element, role, options),
    queryByRole: (role: string, options?: QueryOptions) => queryByRole(element, role, options),
  };
}

export type {
  RenderResult,
  TextMatch,
};
