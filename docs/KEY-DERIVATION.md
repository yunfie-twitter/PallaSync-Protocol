# Key Derivation from Seed Phrase

PallaSync v2 utilizes a Brave Sync-like Sync Chain mechanism. Devices join a chain by entering a 24-word seed phrase based on the BIP39 standard.

## Process

1. **Seed Phrase Generation**:
   A new Sync Chain is created by generating 24 random mnemonic words from the English BIP39 wordlist.

2. **Seed Derivation**:
   The 24 words are converted into a 64-byte seed using the standard BIP39 PBKDF2 function.
   - Salt: `"mnemonic"`
   - Iterations: `2048`
   - Hash: HMAC-SHA512

3. **Key Material Derivation (HKDF)**:
   The 64-byte seed is passed through HKDF-SHA256 to derive the necessary keys and identifiers.
   - `IKM` (Input Key Material): 64-byte BIP39 Seed
   - `salt`: (empty or predefined constant e.g. `"PallaSync-V2-Salt"`)
   
   From the HKDF output, we derive:
   - **Chain ID (32 bytes)**: Used to identify the chain on the server. `info: "chain_id"`
   - **Encryption Key (32 bytes)**: Used to encrypt/decrypt `SyncRecords`. `info: "encryption_key"`
   - **Signing Key (32 bytes)**: Used to sign payloads for integrity. `info: "signing_key"`

4. **Encoding**:
   - The Chain ID is encoded using Base64-URL for use in API paths.
   
## Security Properties
- The Server only sees the `Chain ID` and encrypted `SyncRecords`.
- The Server never sees the Seed Phrase or the Encryption/Signing Keys.
- Compromising the Server does not reveal user data.
