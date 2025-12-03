# DPA Compliance - Action Items & Implementation Guide

## 🎯 Executive Summary

After reviewing all employee data collection in the HRMS system, here are the **critical action items** to ensure DPA Philippines compliance.

---

## 🔴 CRITICAL: Immediate Actions (Week 1-2)

### 1. Religion Field - Make Explicitly Optional
**Current Status:** ✅ Already optional in database (`String?`), but collected in forms

**Action Required:**
- [ ] Add note in form: "Optional - Only required for accommodation purposes"
- [ ] Add consent checkbox if Religion is provided
- [ ] Update privacy policy to explain why Religion may be collected
- [ ] Consider removing from default export/display

**Files to Update:**
- `src/components/EmployeeContentNew.tsx` (lines 1693-1702)
- `src/app/offered-applicant/[token]/page.tsx` (line 579)
- Add consent mechanism

---

### 2. Social Media Links - Remove or Make Optional
**Current Status:** ⚠️ Collected in `ContactInfo` model

**Data:**
- `FBLink` (Facebook link)
- `MessengerName`

**Action Required:**
- [ ] Remove from required fields (already optional in schema)
- [ ] Add consent checkbox if provided
- [ ] Update privacy policy
- [ ] Consider removing entirely if not needed

**Files to Update:**
- `prisma/schema.prisma` - `ContactInfo` model (lines 199, 200)
- Any forms collecting this data

---

### 3. Medical Information - Security & Consent
**Current Status:** ⚠️ Collected but may lack proper security/consent

**Action Required:**
- [ ] Implement encryption at rest for `MedicalInfo` table
- [ ] Separate medical data storage (or encrypted column)
- [ ] Add explicit consent form for medical data collection
- [ ] Implement strict access controls (HR + Medical personnel only)
- [ ] Add audit logging for medical data access

**Files to Review:**
- `src/components/tabs/MedicalTab.tsx`
- `src/app/api/employees/[employeeId]/medical/route.ts`
- Database encryption implementation

---

### 4. Government ID Numbers - Encryption
**Current Status:** ⚠️ Stored but may not be encrypted

**Action Required:**
- [ ] Encrypt all government ID numbers at rest
- [ ] Implement field-level encryption or database encryption
- [ ] Mask in UI (show only last 4 digits)
- [ ] Add audit logging for access

**Files to Review:**
- `prisma/schema.prisma` - `GovernmentID` model
- All API routes accessing government IDs
- UI components displaying IDs

---

## 🟡 HIGH PRIORITY: Security Enhancements (Week 3-4)

### 5. Family Member Data - Consent Mechanism
**Current Status:** ⚠️ Third-party data collected without explicit consent

**Action Required:**
- [ ] Create consent form for family members
- [ ] Add consent checkbox in family data entry form
- [ ] Store consent records
- [ ] Update privacy policy

**Files to Update:**
- `src/lib/employeeService.ts` - Family data functions
- Family data entry forms

---

### 6. Access Control Implementation
**Action Required:**
- [ ] Implement Role-Based Access Control (RBAC)
- [ ] Restrict medical data to HR + Medical personnel
- [ ] Restrict government IDs to HR + Payroll
- [ ] Restrict salary data to HR + Finance
- [ ] Regular access reviews

---

### 7. Audit Logging
**Action Required:**
- [ ] Log all access to Sensitive Personal Information (SPI)
- [ ] Log all modifications to employee data
- [ ] Implement log retention (1 year)
- [ ] Create audit log dashboard

---

## 🟢 MEDIUM PRIORITY: Retention & Compliance (Month 2)

### 8. Data Retention Automation
**Current Status:** ✅ Already has retention tracking in `EmployeeDashboard.tsx`

**Action Required:**
- [ ] Implement automated deletion after 3 years from resignation
- [ ] Create data retention job/scheduler
- [ ] Handle exceptions (legal holds, regulatory requirements)
- [ ] Create deletion logs

**Files to Create/Update:**
- New service: `src/services/dataRetentionService.ts`
- Scheduled job/cron for data deletion
- Exception handling logic

---

### 9. Privacy Policy Updates
**Action Required:**
- [ ] List all data collected
- [ ] Explain purpose for each data type
- [ ] Document retention periods
- [ ] Explain employee rights
- [ ] Add AI processing disclosure
- [ ] Make accessible to all employees

---

### 10. Consent Forms Creation
**Action Required:**
- [ ] Medical data consent form
- [ ] Photo storage consent form
- [ ] Family member data consent form
- [ ] AI processing disclosure form
- [ ] Store consent records with timestamps

---

## 📋 Data Classification Summary

### ✅ ACCEPTABLE (Keep as-is, ensure security)
- Basic personal info (name, contact, address)
- Employment information
- Education history
- Employment history
- Performance records (with retention)
- Disciplinary records (with retention)
- Skills and training
- Certificates

### ⚠️ REQUIRES ENHANCEMENT (Keep but improve)
- **Medical Information** - Encrypt, restrict access, consent
- **Government IDs** - Encrypt, mask in UI
- **Salary Information** - Encrypt, restrict access
- **Family Data** - Add consent mechanism
- **Photo** - Add consent, secure storage
- **BloodType** - Store with medical data, require consent

### ❌ REMOVE OR MAKE OPTIONAL (Non-essential)
- **Religion** - Make optional, require consent if kept
- **FBLink** - Remove or make optional with consent
- **MessengerName** - Remove or make optional with consent

---

## 🔐 Security Implementation Checklist

### Encryption
- [ ] Medical data: AES-256 at rest
- [ ] Government IDs: Field-level encryption
- [ ] Salary data: Encryption at rest
- [ ] All data: TLS 1.3 in transit
- [ ] Database encryption for sensitive tables

### Access Control
- [ ] Role-based access control (RBAC)
- [ ] Principle of least privilege
- [ ] Multi-factor authentication for sensitive data
- [ ] Regular access reviews (quarterly)
- [ ] Access logging

### Audit & Monitoring
- [ ] Audit logging for SPI access
- [ ] Data modification logging
- [ ] Log retention (1 year)
- [ ] Regular log reviews
- [ ] Security monitoring

---

## 📝 Legal Compliance Checklist

### NPC Registration
- [ ] Register as Personal Information Controller (PIC)
- [ ] Appoint Data Protection Officer (if required)
- [ ] Submit privacy policy to NPC

### Documentation
- [ ] Privacy Policy (comprehensive)
- [ ] Data Processing Agreement templates
- [ ] Consent forms
- [ ] Data breach response plan
- [ ] Employee data rights procedures

### Training
- [ ] HR staff training on data privacy
- [ ] IT staff training on security
- [ ] Employee awareness program

### Ongoing
- [ ] Annual privacy impact assessment
- [ ] Regular security audits
- [ ] Compliance monitoring

---

## 🚨 Data Breach Response Plan

### Immediate Actions (0-24 hours)
1. Contain the breach
2. Assess scope and impact
3. Notify internal security team
4. Document all actions

### Notification (24-72 hours)
1. Notify NPC within 72 hours
2. Notify affected employees (if high risk)
3. Prepare public statement (if required)

### Remediation
1. Fix vulnerabilities
2. Enhance security measures
3. Review and update policies
4. Conduct post-incident review

---

## 📊 Implementation Timeline

### Phase 1: Critical (Weeks 1-2)
- Remove/make optional non-essential SPI
- Add consent mechanisms
- Update privacy policy

### Phase 2: Security (Weeks 3-4)
- Implement encryption
- Enhance access controls
- Add audit logging

### Phase 3: Retention (Month 2)
- Automated retention system
- Deletion procedures
- Exception handling

### Phase 4: Compliance (Month 3)
- Complete documentation
- Employee training
- Regular audits

---

## 📞 Key Contacts

- **Data Protection Officer:** [To be assigned]
- **Legal Counsel:** [To be assigned]
- **IT Security:** [To be assigned]
- **HR Manager:** [To be assigned]

---

## 📚 Resources

- **Full Assessment:** `docs/DPA_COMPLIANCE_ASSESSMENT.md`
- **Quick Reference:** `docs/DPA_QUICK_REFERENCE.md`
- **NPC Website:** https://privacy.gov.ph
- **DPA Law:** Republic Act No. 10173

---

**Status:** Draft for Review  
**Last Updated:** 2024  
**Next Review:** Quarterly

