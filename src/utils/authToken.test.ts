import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearAuthToken, readAuthToken, writeAuthToken } from './authToken'

describe('auth token storage', () => {
  beforeEach(() => {
    clearAuthToken()
  })

  it('reads and trims a plain token', () => {
    window.localStorage.setItem('token', '  abc123  ')

    expect(readAuthToken()).toBe('abc123')
  })

  it('reads supported JSON token shapes', () => {
    const values = [
      '"quoted-token"',
      JSON.stringify({ token: 'direct-token' }),
      JSON.stringify({ accessToken: 'access-token' }),
      JSON.stringify({ data: { jwt: 'nested-token' } }),
    ]

    values.forEach((value, index) => {
      window.localStorage.setItem('token', value)
      expect(readAuthToken()).toBe(value.includes('quoted') ? 'quoted-token' : [
        'direct-token',
        'access-token',
        'nested-token',
      ][index - 1])
      clearAuthToken()
    })
  })

  it.each(['', 'null', 'undefined', '<html><body>403 Forbidden</body></html>'])(
    'clears invalid stored value: %s',
    (value) => {
      window.localStorage.setItem('token', value)

      expect(readAuthToken()).toBe('')
      expect(window.localStorage.getItem('token')).toBeNull()
    },
  )

  it('writes valid values and clears invalid values', () => {
    writeAuthToken('  saved-token  ')
    expect(window.localStorage.getItem('token')).toBe('saved-token')

    writeAuthToken('null')
    expect(window.localStorage.getItem('token')).toBeNull()
  })

  it('clears the token explicitly', () => {
    window.localStorage.setItem('token', 'token-to-clear')

    clearAuthToken()

    expect(readAuthToken()).toBe('')
  })

  it('fails safely when storage access throws', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(readAuthToken()).toBe('')

    getItem.mockRestore()
  })
})
