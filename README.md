# CRYSTALS-Dilithium (ML-DSA) · Interactive Demonstration

A modern, interactive web-based demonstration of **CRYSTALS-Dilithium**, the NIST FIPS 204 standardized post-quantum digital signature scheme (ML-DSA).

## Overview

This project provides a comprehensive, real-time implementation of the Dilithium signature algorithm with an intuitive interface for exploring key generation, signing, and verification workflows. It's designed for cryptography enthusiasts, students, and researchers to understand how post-quantum cryptography works.

### Features

- **Multiple Security Levels**: Support for Dilithium2 (NIST-2), Dilithium3 (NIST-3), and Dilithium5 (NIST-5)
- **Interactive Workflow**: 4-step guided process
  1. Generate cryptographic key pairs
  2. Write and hash messages
  3. Create digital signatures
  4. Verify signatures and detect tampering
- **Real-time Cryptography**: Browser-based implementation using Web Crypto API
- **Signature Tampering Demo**: Test message/signature integrity by simulating attacks
- **Performance Metrics**: Track key generation, signing, and verification times
- **Dark Theme UI**: Modern, elegant interface with animated crystalline background
- **Educational Info Cards**: Learn about lattice cryptography, rejection sampling, NTT acceleration, and FIPS 204 standards

## Getting Started

### Prerequisites

- Modern web browser with WebCrypto API support (Chrome, Firefox, Safari, Edge)
- JavaScript enabled

### Installation

1. Clone or download this repository:
```bash
git clone https://github.com/d4505/Dilithium.git
cd Dilithium
```

2. Open `index.html` in your web browser or serve via HTTP:
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000

# Or use any modern HTTP server
```

3. Navigate to `http://localhost:8000` in your browser

## Project Structure

```
├── index.html          # Main HTML structure
├── style.css           # Complete styling and animations
├── script.js           # Core cryptography logic and UI interactions
└── README.md          # This file
```

## Usage Guide

### 1. Select Security Level
In the left sidebar, choose your desired security level:
- **Dilithium2** (NIST-2): Smaller key/signature sizes, lower security
- **Dilithium3** (NIST-3): Balanced security and performance (recommended)
- **Dilithium5** (NIST-5): Maximum security for long-term protection

### 2. Generate Keys
Click "Generate Keys" to create a new keypair. The process:
- Generates cryptographic material
- Displays public and private keys in hex format
- Visualizes the secret polynomial s₁[0] distribution
- Enables signing

### 3. Sign a Message
- Enter or select a sample message
- Click "Sign Message" to create a digital signature
- View the signature and rejection sampling iterations
- Signature is automatically populated in the verify section

### 4. Verify Signature
- Review the message and signature (or tamper with them to test)
- Click "Verify Signature" to check validity
- See real-time verification results with timing information

## Technical Details

### Cryptographic Parameters

| Parameter | Dilithium2 | Dilithium3 | Dilithium5 |
|-----------|-----------|-----------|-----------|
| k × l | 4 × 4 | 6 × 5 | 8 × 7 |
| η (eta) | 2 | 4 | 2 |
| γ₁ | 2¹⁷ | 2¹⁹ | 2¹⁹ |
| γ₂ | 95,232 | 261,888 | 261,888 |
| Public Key | 1,312 B | 1,952 B | 2,592 B |
| Private Key | 2,528 B | 4,000 B | 4,864 B |
| Signature | 2,420 B | 3,293 B | 4,595 B |

### Hardness Assumptions

- **Module-LWE**: Learning With Errors over polynomial rings
- **Module-SIS**: Short Integer Solution problem
- **Resistance**: Believed secure against quantum computers

### Key Features

- **Rejection Sampling**: Signer aborts and retries if computed signature leaks information
- **NTT Acceleration**: Number Theoretic Transform for O(n log n) polynomial multiplication
- **Ring Operations**: All computations over R_q = Z_q[X]/(X²⁵⁶+1) with q = 8,380,417
- **Deterministic Hashing**: SHA-256/SHA-384 for reproducible outputs

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome 90+ | ✅ Fully supported |
| Firefox 88+ | ✅ Fully supported |
| Safari 14+ | ✅ Fully supported |
| Edge 90+ | ✅ Fully supported |

**Requirements**: WebCrypto API, Uint8Array, Promise support

## Educational Resources

This implementation demonstrates:

- **Post-Quantum Cryptography**: Why classic algorithms need quantum-resistant replacements
- **Lattice Problems**: Mathematical foundations of Module-LWE/Module-SIS
- **Rejection Sampling**: Probabilistic algorithm for generating valid signatures
- **Digital Signatures**: How to sign and verify messages cryptographically
- **NIST FIPS 204**: The standardization of ML-DSA in 2024

## Performance

Typical performance on modern hardware (varies by device):

- **Key Generation**: 50-200ms
- **Signing**: 10-50ms (depends on rejection sampling iterations)
- **Verification**: 5-20ms

## Security Notes

⚠️ **Important**: This is an educational implementation. For production use:

1. Use established cryptographic libraries (libdilithium, liboqs, etc.)
2. Conduct security audits and formal verification
3. Implement additional protections against side-channel attacks
4. Use secure random number generation (cryptographically vetted)

## References

- [NIST FIPS 204 - ML-DSA Standard](https://csrc.nist.gov/publications/fips/fips-204/)
- [CRYSTALS Project](https://pqcrystals.org/)
- [Dilithium Specification](https://pqcrystals.org/dilithium/)

## License

This project is provided as-is for educational purposes.

## Related Resources

- [Post-Quantum Cryptography Project](https://pqcrypto.org/)
- [Open Quantum Safe](https://openquantumsafe.org/)
- [Lattice Cryptography Papers](https://pqcrystals.org/dilithium/papers.shtml)

---

**Last Updated**: March 15, 2026

**Status**: Active Development

For questions or improvements, contribute to the project or open an issue.
