# DPA Compliance - Quick Reference Guide

## 🚨 Critical Issues to Fix Immediately

### 1. Remove Religion Field (Non-Essential SPI)
**Location:** `prisma/schema.prisma` line 93, `src/components/employee/types.ts` line 16

**Action:**
- Make Religion field optional in database
- Remove from required form fields
- If kept, require explicit consent

---

### 2. Remove Social Media Links (Non-Essential)
**Location:** `ContactInfo` model - `FBLink`, `MessengerName`

**Action:**
- Remove `FBLink` and `MessengerName` from required fields
- Make optional if needed for emergency contact
- Require explicit consent if kept

---

### 3. Medical Data Security
**Location:** `MedicalInfo` model

**Action:**
- ✅ Encrypt at rest (AES-256)
- ✅ Separate storage/database
- ✅ Strict access control (HR + Medical personnel only)
- ✅ Audit logging for all access
- ✅ Explicit consent required

---

### 4. Government ID Encryption
**Location:** `GovernmentID` model

**Action:**
- ✅ Encrypt all ID numbers at rest
- ✅ Mask in UI (show only last 4 digits)
- ✅ Strict access control
- ✅ Audit logging

---

### 5. Family Member Consent
**Location:** `Family` model

**Action:**
- ✅ Obtain written consent from family members
- ✅ Minimize data collection
- ✅ Clear purpose statement
- ✅ Allow opt-out

---

### 6. Data Retention (3 Years)
**Location:** `EmployeeDashboard.tsx` (already has retention logic)

**Action:**
- ✅ Implement automated deletion after 3 years from resignation
- ✅ Exception handling for legal holds
- ✅ Deletion logs

---

## 📋 Data Classification

### Sensitive Personal Information (SPI) - Requires Special Protection
- ❌ Religion (remove or require consent)
- ✅ Medical Information (encrypt, restrict access)
- ✅ BloodType (store with medical data, require consent)
- ✅ Disability Information (encrypt, restrict access)
- ✅ Family Member Data (require consent)

### Personal Information (PI) - Standard Protection
- ✅ Name, Contact Info, Address
- ✅ Employment Information
- ✅ Government IDs (encrypt)
- ✅ Salary Information (encrypt, restrict access)
- ✅ Performance Records
- ✅ Disciplinary Records

---

## 🔐 Security Requirements

### Encryption
- [ ] Medical data: AES-256 at rest
- [ ] Government IDs: Field-level encryption
- [ ] Salary data: Encryption at rest
- [ ] All data: TLS 1.3 in transit

### Access Control
- [ ] Role-based access control (RBAC)
- [ ] Principle of least privilege
- [ ] Multi-factor authentication for sensitive data
- [ ] Regular access reviews

### Audit Logging
- [ ] Log all SPI access
- [ ] Log all data modifications
- [ ] Retain logs for 1 year
- [ ] Regular log reviews

---

## 📝 Consent Requirements

### Required Consents
1. **Medical Information** - Written consent
2. **Photo** - Consent for storage and use
3. **Family Members** - Written consent from family
4. **AI Processing** - Disclosure and right to object

### Consent Forms Needed
- [ ] Medical data collection consent
- [ ] Photo storage consent
- [ ] Family member data consent
- [ ] AI processing disclosure

---

## ⏰ Retention Periods

| Data Type | Retention | Action |
|-----------|-----------|--------|
| Active Employee | While employed | Keep |
| Resigned Employee | 3 years from resignation | Delete/Anonymize |
| Medical Info | 3 years from separation | Delete |
| Performance Records | 3 years from separation | Delete/Anonymize |
| Disciplinary Records | 3 years from separation | Delete/Anonymize |
| Activity Logs | 1 year | Anonymize then delete |

---

## 🎯 Implementation Priority

### Week 1-2 (Critical)
1. Remove Religion from mandatory
2. Remove/make optional social media links
3. Add consent forms

### Week 3-4 (High Priority)
1. Encrypt medical data
2. Encrypt government IDs
3. Implement access controls

### Month 2 (Medium Priority)
1. Automated retention system
2. Audit logging
3. Privacy policy updates

### Month 3 (Ongoing)
1. Employee training
2. Regular audits
3. Compliance monitoring

---

## 📞 Data Subject Rights

Employees have the right to:
1. **Access** - Request copy of their data
2. **Rectification** - Correct inaccurate data
3. **Erasure** - Request deletion (subject to retention)
4. **Object** - Object to processing
5. **Portability** - Receive data in portable format

**Implementation:**
- [ ] Create data request form
- [ ] Establish response procedures (30 days)
- [ ] Create data export functionality

---

## 🚨 Data Breach Response

### If Data Breach Occurs:
1. **Contain** - Stop the breach immediately
2. **Assess** - Determine scope and impact
3. **Notify** - Notify NPC within 72 hours
4. **Notify Affected** - Notify employees if high risk
5. **Document** - Document all actions taken
6. **Remediate** - Fix vulnerabilities

---

## ✅ Compliance Checklist

### Legal Requirements
- [ ] Registered with NPC as PIC
- [ ] Appointed Data Protection Officer (if required)
- [ ] Privacy Policy published and accessible
- [ ] Consent mechanisms in place
- [ ] Security measures implemented
- [ ] Data breach response plan ready
- [ ] Employee training conducted
- [ ] Regular audits scheduled

### Technical Requirements
- [ ] Encryption for SPI
- [ ] Access controls implemented
- [ ] Audit logging active
- [ ] Retention policy automated
- [ ] Data backup and recovery
- [ ] Secure data transmission
- [ ] Regular security updates

---

## 📚 Resources

- **NPC Website:** https://privacy.gov.ph
- **DPA Implementing Rules:** NPC Circulars
- **DOLE Requirements:** Labor Code of the Philippines
- **Internal DPO Contact:** [To be added]

---

**Last Updated:** 2024  
**Review Frequency:** Quarterly

