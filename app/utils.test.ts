import { sum } from '~/utils'

describe('sum', () => {
  it('should sum two numbers', () => {
    expect(sum(1, 2)).toBe(3)
  })
})
