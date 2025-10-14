import { fireEvent } from './testing-library-react';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function click(element: Element) {
  fireEvent.click(element);
  await delay(0);
}

async function type(element: Element, text: string) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error('userEvent.type only supports input and textarea elements in this test harness');
  }
  element.focus();
  let value = '';
  for (const char of text) {
    value += char;
    fireEvent.input(element, value);
    await delay(0);
  }
}

async function clear(element: Element) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    fireEvent.input(element, '');
    await delay(0);
  }
}

async function selectOptions(element: Element, value: string) {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error('userEvent.selectOptions expects a select element');
  }
  element.value = value;
  fireEvent.change(element, value);
  await delay(0);
}

export const userEvent = {
  click,
  type,
  clear,
  selectOptions,
};

export default userEvent;
