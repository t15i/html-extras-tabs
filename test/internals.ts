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
 *
 * @remarks
 * What an element writes through its internals is the default semantics of the
 * element, and the platform exposes it nowhere else: reading the same property
 * off the element reads what the author wrote, which is a different value. The
 * only way to see ours is to keep the object the element was handed, so this
 * module patches `attachInternals` on import - before any element of the test
 * file has been constructed.
 */
export function internalsOf(element: HTMLElement): ElementInternals {
  return attached.get(element)!;
}
