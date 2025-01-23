import type { ClassArray, ClassDictionary, ClassValue } from 'clsx/lite'

import { clsx } from 'clsx/lite'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Exclude<ClassValue, ClassArray | ClassDictionary>[]) {
  return twMerge(clsx(...inputs))
}

export function setMetaThemeColorAttribute(newThemeColor: string) {
  const metaThemeColorEl = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColorEl) {
    if (metaThemeColorEl.getAttribute('content') !== newThemeColor)
      metaThemeColorEl.setAttribute('content', newThemeColor)
  }
}

// https://stackoverflow.com/a/13382873/10903455
export function getScrollbarWidth() {
  // Creating invisible container
  const outer = document.createElement('div')
  outer.style.visibility = 'hidden'
  outer.style.overflow = 'scroll' // forcing scrollbar to appear
  // @ts-expect-error
  outer.style.msOverflowStyle = 'scrollbar' // needed for WinJS apps
  document.body.appendChild(outer)

  // Creating inner element and placing it in the container
  const inner = document.createElement('div')
  outer.appendChild(inner)

  // Calculating difference between container's full width and the child width
  const scrollbarWidth = (outer.offsetWidth - inner.offsetWidth)

  // Removing temporary elements from the DOM
  outer.parentNode?.removeChild(outer)

  return scrollbarWidth
}
