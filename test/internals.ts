const attached = new WeakMap<HTMLElement, ElementInternals>();

const attachInternals = HTMLElement.prototype.attachInternals;
HTMLElement.prototype.attachInternals = function (
  this: HTMLElement,
): ElementInternals {
  const internals = attachInternals.call(this);
  attached.set(this, internals);
  return internals;
};

/**
 * The internals an element attached to itself.
 *
 * @param element - The element.
 *
 * @returns Its internals.
 */
export function internalsOf(element: HTMLElement): ElementInternals {
  return attached.get(element)!;
}
