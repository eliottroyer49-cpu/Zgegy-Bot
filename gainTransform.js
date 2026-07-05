const { Transform } = require('stream');

/**
 * Multiplie chaque échantillon audio PCM 16 bits (signé, little-endian, stéréo)
 * par un gain (0 = silence, 1 = volume normal). Le gain est lu dynamiquement
 * via getGain() à chaque chunk, donc il peut varier en temps réel pendant le stream.
 */
class GainTransform extends Transform {
  constructor(getGain) {
    super();
    this.getGain = getGain;
  }

  _transform(chunk, encoding, callback) {
    const gain = Math.max(0, Math.min(1, this.getGain()));
    const out = Buffer.alloc(chunk.length);

    // Chaque échantillon = 2 octets (Int16 LE)
    for (let i = 0; i + 1 < chunk.length; i += 2) {
      const sample = chunk.readInt16LE(i);
      const scaled = Math.round(sample * gain);
      out.writeInt16LE(Math.max(-32768, Math.min(32767, scaled)), i);
    }

    callback(null, out);
  }
}

module.exports = GainTransform;
