import { describe, expect, it } from 'vitest'

import { composeRawText } from '../page'

// Golden-fold regression guard (Block 6 WU3 §8.2, risk #1): persisting
// system/tone on the campaign MUST NOT change how the extraction `raw_text`
// is folded. If this byte-for-byte snapshot ever needs updating, the
// extraction fold changed — confirm that is intentional before touching it.
describe('composeRawText golden fold', () => {
  it('folds a full campaign form into the exact expected raw_text', () => {
    const output = composeRawText({
      name: 'The Salt Road',
      system: 'D&D 5e',
      tone: 'Grim survival',
      raw_text: 'Phandalin is a frontier town.',
      additional_details: 'Keep magic rare.',
    })

    expect(output).toBe(
      'Campaign name: The Salt Road\n\n' +
        'Game system: D&D 5e\n\n' +
        'Tone or style: Grim survival\n\n' +
        'Starting context:\nPhandalin is a frontier town.\n\n' +
        'Additional details for the Scribe:\nKeep magic rare.'
    )
  })

  it('omits optional blank fields (tone, details) without extra separators', () => {
    const output = composeRawText({
      name: 'The Salt Road',
      system: 'D&D 5e',
      raw_text: 'Phandalin is a frontier town.',
    })

    expect(output).toBe(
      'Campaign name: The Salt Road\n\n' +
        'Game system: D&D 5e\n\n' +
        'Starting context:\nPhandalin is a frontier town.'
    )
  })
})
