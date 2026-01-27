# AES-256 Encryption Setup Guide

This document explains how to set up and use AES-256 encryption for sensitive data in the HRMS system.

## Overview

The system now encrypts sensitive data using AES-256-GCM (Galois/Counter Mode) encryption:

- **Medical Information**: All sensitive medical fields
- **Government ID Numbers**: All government identification numbers
- **Salary Data**: Salary amounts and salary grades

## Setup Instructions

### 1. Generate Encryption Key

Generate a secure 32-byte (256-bit) encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

This will output a base64-encoded key like:
```
K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

### 2. Set Environment Variable

Add the encryption key to your environment variables:

**Development (.env.local):**
```env
ENCRYPTION_KEY=K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

**Production (Vercel):**
1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add `ENCRYPTION_KEY` with your generated key
4. Redeploy the application

⚠️ **IMPORTANT**: 
- Never commit the encryption key to version control
- Use different keys for development and production
- Keep the key secure - if lost, encrypted data cannot be recovered
- Rotate keys periodically for enhanced security

### 3. Migrate Existing Data

After setting up the encryption key, encrypt existing plaintext data:

```bash
npx ts-node -r tsconfig-paths/register --project tsconfig.prisma.json scripts/migrate-encrypt-existing-data.ts
```

This script will:
- Encrypt all existing medical information
- Encrypt all existing government ID numbers
- Encrypt all existing salary data
- Skip already encrypted data (idempotent)

⚠️ **Before running migration:**
- Backup your database
- Ensure `ENCRYPTION_KEY` is set correctly
- Test in a development environment first

## How It Works

### Encryption Process

1. **On Save**: When sensitive data is saved via API:
   - Fields are automatically encrypted before storing in database
   - Uses purpose-specific key derivation (medical, government, salary)
   - Each encryption uses a unique IV (Initialization Vector)

2. **On Read**: When sensitive data is retrieved:
   - Fields are automatically decrypted before returning to client
   - Handles both encrypted and plaintext data (during migration period)

### Encrypted Fields

#### Medical Information
- `medicalNotes`
- `allergies`
- `disabilityDetails`
- `pwdIdNumber`
- `healthInsuranceNumber`
- `physicianContact`
- `emergencyProcedures`
- `bloodType`
- `accommodationsNeeded`
- `emergencyProtocol`
- `disabilityCertification`
- `assistiveTechnology`
- `mobilityAids`
- `communicationNeeds`
- `workplaceModifications`

#### Government ID Numbers
- `SSSNumber`
- `TINNumber`
- `PhilHealthNumber`
- `PagIbigNumber`
- `GSISNumber`
- `PRCLicenseNumber`
- `BIRNumber`
- `PassportNumber`

#### Salary Data
- `SalaryAmount`
- `SalaryGrade`

## Security Features

1. **AES-256-GCM**: Authenticated encryption providing both confidentiality and integrity
2. **Key Derivation**: PBKDF2 with 100k iterations for purpose-specific keys
3. **Unique IVs**: Each encryption uses a random IV for security
4. **Authentication Tags**: GCM mode provides authentication to detect tampering
5. **Purpose Separation**: Different keys derived for medical, government, and salary data

## API Usage

The encryption/decryption is handled automatically by the API routes. No changes needed in frontend code.

### Example: Creating Medical Info

```typescript
// Frontend code (no changes needed)
const response = await fetch(`/api/employees/${employeeId}/medical`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    allergies: 'Peanuts, Shellfish',
    bloodType: 'O+',
    healthInsuranceNumber: '123456789'
  })
});

// Data is automatically encrypted before saving
// Data is automatically decrypted when reading
```

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is required"

**Solution**: Set the `ENCRYPTION_KEY` environment variable in your `.env.local` file or Vercel settings.

### Error: "Failed to decrypt data"

**Possible causes:**
1. Encryption key mismatch (different key used for encryption vs decryption)
2. Data corruption
3. Data was encrypted with a different key

**Solution**: 
- Verify `ENCRYPTION_KEY` matches the key used for encryption
- Check if data needs to be re-encrypted with migration script

### Data appears encrypted in database

**This is normal!** Encrypted data in the database will look like:
```
salt:iv:authTag:encryptedData
```

The API automatically decrypts this when reading, so frontend code receives plaintext.

## Key Rotation

To rotate encryption keys:

1. **Generate new key**: Use the key generation command above
2. **Re-encrypt data**: Update migration script to use new key, then re-run
3. **Update environment variable**: Set new `ENCRYPTION_KEY`
4. **Test thoroughly**: Verify all encrypted data can be decrypted

⚠️ **Warning**: Key rotation requires re-encrypting all existing data. Plan for downtime.

## Compliance

This encryption implementation helps meet:
- **DPA Philippines**: Data Privacy Act requirements for sensitive personal information
- **AES-256**: Industry-standard encryption strength
- **At Rest Encryption**: Data encrypted in database storage

## Support

For issues or questions:
1. Check this documentation
2. Review encryption utility: `src/lib/encryption.ts`
3. Check API route implementations for encryption usage
4. Review migration script: `scripts/migrate-encrypt-existing-data.ts`
