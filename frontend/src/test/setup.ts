import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  this.removeAttribute('open')
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})
