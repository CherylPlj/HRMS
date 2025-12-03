# Medical Information Collection - Recommendations

## Executive Summary

Based on DPA Philippines compliance and practical HR needs, here are recommendations for medical information collection, display, and security.

---

## 1. Essential Medical Information (Keep)

### ✅ **Critical for Emergency Response & Workplace Safety**

#### **Allergies** ✅
- **Purpose:** Critical for emergency medical response
- **Status:** ✅ **KEEP** - Essential
- **Masking:** ⚠️ **PARTIAL** - Show to HR and medical personnel only, mask in general views

#### **Has Disability** ✅
- **Purpose:** Required for workplace accommodations (ADA/DPA compliance)
- **Status:** ✅ **KEEP** - Essential
- **Masking:** ⚠️ **YES** - Only show to HR and authorized personnel

#### **Health Insurance Provider** ✅
- **Purpose:** Benefits administration, emergency contact
- **Status:** ✅ **KEEP** - Essential
- **Masking:** ⚠️ **YES** - Mask insurance number, show provider name only to HR

#### **Blood Type** ⚠️
- **Purpose:** Emergency medical response
- **Status:** ✅ **MOVE TO MEDICAL INFO** - Should be with medical data
- **Current Location:** Employee model (should be in MedicalInfo)
- **Masking:** ⚠️ **YES** - Show only to medical personnel and HR

---

## 2. Recommended Medical Information Structure

### **Essential Fields (Minimum Required)**

1. **Allergies** ✅
   - Critical for emergency response
   - Keep as-is

2. **Has Disability** ✅
   - Required for accommodations
   - Keep as-is

3. **Health Insurance Provider** ✅
   - Benefits administration
   - Keep as-is

4. **Health Insurance Number** ⚠️
   - **MASK** - Show only last 4 digits in general views
   - Full number only to HR and benefits admin

5. **Blood Type** ⚠️
   - **MOVE** from Employee model to MedicalInfo
   - Critical for emergency response
   - Mask in general views

6. **Emergency Contact (Physician)** ✅
   - Primary Physician Name
   - Physician Contact Number
   - Keep as-is

7. **Emergency Procedures** ✅
   - Critical medical procedures/instructions
   - Keep as-is

---

### **Optional but Recommended Fields**

8. **Last Medical Checkup** ✅
   - Useful for health monitoring
   - Keep as-is

9. **Vaccination Status** ✅
   - Important for workplace health
   - Keep as-is

10. **Medical Notes** ⚠️
    - **MINIMIZE** - Only essential notes
    - Consider removing or making very restricted

11. **Blood Pressure** ⚠️
    - **REMOVE** - Not necessary for HR purposes
    - Too detailed, privacy concern

12. **Height & Weight** ⚠️
    - **REMOVE** - Not necessary for HR purposes
    - Privacy concern, not needed for accommodations

---

### **Disability Information (Keep if Has Disability = Yes)**

All disability-related fields are **REQUIRED** for workplace accommodations:
- ✅ Disability Type
- ✅ Disability Details
- ✅ PWD ID Number (mask - show only last 4 digits)
- ✅ PWD ID Validity
- ✅ Accommodations Needed
- ✅ Workplace Modifications
- ✅ Emergency Protocol
- ✅ Assistive Technology
- ✅ Mobility Aids
- ✅ Communication Needs

---

## 3. Fields to Remove or Minimize

### ❌ **Remove (Not Necessary for HR)**

1. **Blood Pressure** ❌
   - Too detailed for HR purposes
   - Privacy concern
   - Not needed for accommodations or emergency response

2. **Height** ❌
   - Not necessary for HR
   - Privacy concern

3. **Weight** ❌
   - Not necessary for HR
   - Privacy concern

4. **Medical Notes** ⚠️
   - **MINIMIZE** - Only keep if absolutely necessary
   - Consider removing or restricting to essential emergency info only

---

## 4. Recommended Medical Information Collection

### **Minimum Essential Fields:**

```
✅ Allergies (required if known)
✅ Has Disability (required)
✅ Blood Type (required - move from Employee model)
✅ Health Insurance Provider (required)
✅ Health Insurance Number (required - masked)
✅ Primary Physician Name (optional but recommended)
✅ Physician Contact (optional but recommended)
✅ Emergency Procedures (required if applicable)
✅ Last Medical Checkup (optional)
✅ Vaccination Status (optional but recommended)

If Has Disability = Yes:
✅ All disability-related fields (required)
```

### **Fields to Remove:**

```
❌ Blood Pressure
❌ Height
❌ Weight
⚠️ Medical Notes (minimize or remove)
```

---

## 5. Blood Type - Move to Medical Info

### **Current Status:**
- BloodType is in `Employee` model (line 94 in schema.prisma)
- Displayed in MedicalTab but stored separately
- Should be moved to `MedicalInfo` model for better organization

### **Recommendation:**
1. ✅ **MOVE** BloodType from Employee model to MedicalInfo model
2. ✅ **UPDATE** database migration
3. ✅ **UPDATE** all references to use MedicalInfo.BloodType
4. ✅ **MASK** in general views (show only to medical personnel)

---

## 6. Data Masking Recommendations

### **High Priority - Mask These Fields:**

1. **Health Insurance Number**
   - Display: `****-****-1234` (last 4 digits only)
   - Full access: HR and Benefits Admin only

2. **PWD ID Number**
   - Display: `****-****-1234` (last 4 digits only)
   - Full access: HR and Accommodations Team only

3. **Physician Contact Number**
   - Display: `***-***-1234` (last 4 digits only)
   - Full access: HR and Medical Personnel only

4. **Blood Type**
   - Display: `***` (masked) in general views
   - Full access: Medical Personnel and HR only

5. **Allergies**
   - Display: `***` (masked) in general views
   - Full access: Medical Personnel, HR, and Emergency Response Team

6. **Disability Details**
   - Display: `***` (masked) in general views
   - Full access: HR and Accommodations Team only

7. **Emergency Procedures**
   - Display: `***` (masked) in general views
   - Full access: Medical Personnel and HR only

8. **Medical Notes**
   - Display: `***` (masked) in general views
   - Full access: Medical Personnel and HR only

### **Low Priority - Can Show:**

1. **Health Insurance Provider** (name only)
2. **Primary Physician Name**
3. **Last Medical Checkup** (date only)
4. **Vaccination Status** (general status)

---

## 7. Access Control Recommendations

### **Role-Based Access:**

#### **Full Access (All Medical Data):**
- HR Manager
- Medical Personnel
- Benefits Administrator

#### **Limited Access (Masked Data):**
- Department Heads (masked view)
- Supervisors (masked view)
- General HR Staff (masked view)

#### **No Access:**
- Regular Employees (cannot view other employees' medical data)
- IT Staff (unless authorized)
- External Users

---

## 8. Implementation Plan

### **Phase 1: Data Restructuring (Week 1-2)**

1. ✅ Move BloodType from Employee to MedicalInfo model
2. ✅ Create database migration
3. ✅ Update all API endpoints
4. ✅ Update all UI components

### **Phase 2: Field Cleanup (Week 2-3)**

1. ✅ Remove Blood Pressure field
2. ✅ Remove Height field
3. ✅ Remove Weight field
4. ✅ Minimize or remove Medical Notes

### **Phase 3: Masking Implementation (Week 3-4)**

1. ✅ Implement masking for sensitive fields
2. ✅ Add role-based access control
3. ✅ Create masked/unmasked views
4. ✅ Add "Show Full Details" button for authorized users

### **Phase 4: Security Enhancement (Week 4-5)**

1. ✅ Encrypt medical data at rest
2. ✅ Add audit logging for medical data access
3. ✅ Implement consent mechanism
4. ✅ Update privacy policy

---

## 9. Summary of Recommendations

### **Keep (Essential):**
- ✅ Allergies
- ✅ Has Disability
- ✅ Health Insurance Provider
- ✅ Health Insurance Number (masked)
- ✅ Blood Type (move to MedicalInfo, masked)
- ✅ Primary Physician
- ✅ Physician Contact (masked)
- ✅ Emergency Procedures (masked)
- ✅ All disability fields (if hasDisability = true)

### **Keep (Optional but Recommended):**
- ✅ Last Medical Checkup
- ✅ Vaccination Status

### **Remove:**
- ❌ Blood Pressure
- ❌ Height
- ❌ Weight
- ⚠️ Medical Notes (minimize or remove)

### **Move:**
- ⚠️ Blood Type (from Employee to MedicalInfo)

### **Mask:**
- ⚠️ Health Insurance Number
- ⚠️ PWD ID Number
- ⚠️ Physician Contact
- ⚠️ Blood Type
- ⚠️ Allergies
- ⚠️ Disability Details
- ⚠️ Emergency Procedures
- ⚠️ Medical Notes (if kept)

---

## 10. DPA Compliance Notes

### **Medical Information is Sensitive Personal Information (SPI)**

- ✅ **Encrypt** at rest (AES-256)
- ✅ **Restrict Access** - Only authorized personnel
- ✅ **Mask in UI** - General views show masked data
- ✅ **Audit Logging** - Track all access
- ✅ **Consent Required** - Explicit consent for collection
- ✅ **Retention Policy** - Delete after 3 years from separation
- ✅ **Purpose Limitation** - Only for accommodations and emergency response

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Next Review:** Quarterly

