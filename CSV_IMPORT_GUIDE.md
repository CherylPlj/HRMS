# 📥 CSV Import Guide - Schedule Module

## 🎉 Feature Complete!

CSV Import functionality is now available for bulk schedule creation. You can import using **names** (recommended) or **IDs**!

---

## 🌟 Two Import Methods

### **Method 1: Using Names** (Recommended ✨)

**Much easier and more user-friendly!** No need to look up numeric IDs.

```csv
facultyName,subjectName,sectionName,day,time,duration
Juan Cruz,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1
Maria Santos,English 8,Grade 8 - Bonifacio,Tuesday,10:00-11:00,1
Pedro Reyes,Science 9,Grade 9 - Mabini,Wednesday,13:00-14:00,2
```

**Important:** Use the exact "FirstName LastName" as stored in the system. For example, if the user's FirstName is "Juan" and LastName is "Cruz", use "Juan Cruz" (not "Juan Dela Cruz").

### **Method 2: Using IDs**

For automated systems or if you already have the IDs.

```csv
facultyId,subjectId,classSectionId,day,time,duration
1,5,10,Monday,08:00-09:00,1
2,6,11,Tuesday,10:00-11:00,1
3,7,12,Wednesday,13:00-14:00,2
```

### **Method 3: Using Email for Faculty**

You can also identify faculty by their email address:

```csv
facultyEmail,subjectName,sectionName,day,time,duration
juan.delacruz@school.edu,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1
maria.santos@school.edu,English 8,Grade 8 - Bonifacio,Tuesday,10:00-11:00,1
```

---

## 📋 Column Options

You can identify faculty, subjects, and sections using **names OR IDs**:

### **Faculty Identification** (choose one):
- `facultyName` - Full name in "FirstName LastName" format (e.g., "Juan Cruz", "Maria Santos")
  - **Note:** Must include both first and last name, separated by space
  - System matches against `FirstName` + `LastName` fields in the database
- `facultyEmail` - Email address (e.g., "juan.delacruz@school.edu")
- `facultyId` - Numeric ID (e.g., 1)

### **Subject Identification** (choose one):
- `subjectName` - Subject name (e.g., "Mathematics 7")
- `subjectId` - Numeric ID (e.g., 5)

### **Section Identification** (choose one):
- `sectionName` - Section name (e.g., "Grade 7 - Rizal")
- `section` - Short form (e.g., "7-Rizal")
- `classSectionId` - Numeric ID (e.g., 10)
- `sectionId` - Alternative ID field (e.g., 10)

### **Required Fields** (always needed):
- `day` - Day of week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- `time` - Time slot (HH:MM-HH:MM format, e.g., "08:00-09:00")
- `duration` - Duration in hours (e.g., 1, 2, 3)

---

## ✅ Why Use Names Instead of IDs?

| **Names** ✨ | **IDs** |
|-----------|---------|
| ✅ No lookup needed - just type the name | ❌ Must look up numeric IDs first |
| ✅ Human-readable CSV file | ❌ Hard to read CSV file |
| ✅ Easy to spot mistakes | ❌ Hard to verify correctness |
| ✅ Faster data entry | ❌ Slower data entry |
| ✅ Perfect for manual creation | ✅ Good for automated systems |

**Bottom line:** Use names for manual imports, use IDs for automated integrations!

---

## 🚀 How to Use

### **Step 1: Prepare Your CSV File**

Click **"📥 Download Template CSV"** to get a sample file, or create your own:

#### **Sample CSV (Using Names):**
```csv
facultyName,subjectName,sectionName,day,time,duration
Juan Dela Cruz,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1
Juan Dela Cruz,Mathematics 7,Grade 7 - Bonifacio,Monday,09:00-10:00,1
Maria Santos,English 8,Grade 8 - Mabini,Tuesday,10:00-11:00,1
Maria Santos,English 8,Grade 8 - Luna,Tuesday,13:00-14:00,1
Pedro Reyes,Science 9,Grade 9 - Aguinaldo,Wednesday,14:00-15:00,2
```

### **Step 2: Import the CSV**

1. Go to the **Schedules** page
2. Click **"Import CSV"** button
3. Select your CSV file or drag and drop
4. Review the preview
5. Click **"Import Schedules"**

### **Step 3: Review Results**

The system will show:
- ✅ **Success count** - How many schedules were created
- ❌ **Failed count** - How many failed validation
- 📋 **Error details** - Specific issues with row numbers

---

## 📝 Sample Import Scenarios

### **Scenario 1: Simple Schedule Import Using Names**

You have 3 faculty members teaching different subjects.

**CSV File:**
```csv
facultyName,subjectName,sectionName,day,time,duration
Juan Dela Cruz,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1
Maria Santos,English 8,Grade 8 - Bonifacio,Tuesday,10:00-11:00,1
Pedro Reyes,Science 9,Grade 9 - Mabini,Wednesday,14:00-15:00,2
```

**Result:**
- ✅ 3 schedules imported successfully

---

### **Scenario 2: Same Faculty, Multiple Classes**

One faculty member teaches multiple subjects to different sections.

**CSV File:**
```csv
facultyName,subjectName,sectionName,day,time,duration
Juan Dela Cruz,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1
Juan Dela Cruz,Mathematics 7,Grade 7 - Bonifacio,Monday,09:00-10:00,1
Juan Dela Cruz,Science 7,Grade 7 - Mabini,Tuesday,10:00-11:00,1
Juan Dela Cruz,Science 7,Grade 7 - Luna,Wednesday,13:00-14:00,1
```

**Result:**
- ✅ 4 schedules imported successfully

---

### **Scenario 3: Schedule with Errors**

Some rows have validation errors.

**CSV File:**
```csv
facultyName,subjectName,sectionName,day,time,duration
Juan Dela Cruz,Mathematics 7,Grade 7 - Rizal,Monday,08:00-09:00,1
Unknown Teacher,Science 7,Grade 7 - Bonifacio,Tuesday,10:00-11:00,1
Juan Dela Cruz,English 7,Grade 7 - Mabini,Monday,08:00-09:00,1
Maria Santos,History 8,Grade 8 - Luna,Friday,15:00-16:00,2
```

**Result:**
- ✅ 2 schedules imported successfully (rows 1 and 4)
- ❌ 2 schedules failed:
  - Row 2: Faculty with name "Unknown Teacher" not found
  - Row 3: Schedule conflict (Juan Dela Cruz already has class on Monday at 08:00-09:00)

---

### **Scenario 4: Mixed Format (Advanced)**

You can mix IDs and names in the same CSV!

**CSV File:**
```csv
facultyName,subjectId,sectionName,day,time,duration
Juan Dela Cruz,5,Grade 7 - Rizal,Monday,08:00-09:00,1
Maria Santos,6,Grade 8 - Bonifacio,Tuesday,10:00-11:00,1
```

**Result:**
- ✅ 2 schedules imported successfully

---

## ✅ Validation Rules

The system validates each row before import:

### **Required Fields:**
- All columns must have values
- At least one faculty identifier (name, email, or ID)
- At least one subject identifier (name or ID)
- At least one section identifier (name or ID)

### **Valid Day:**
Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday

### **Valid Time:**
Must be in format HH:MM-HH:MM (e.g., 08:00-09:00, 13:30-15:00)

### **Valid Duration:**
Must be a positive number (typically 1-8 hours)

### **Faculty Exists:**
- If using `facultyName`: Must match a user's full name (case-insensitive)
- If using `facultyEmail`: Must match a user's email (case-insensitive)
- If using `facultyId`: Must exist in the system

### **Subject Exists:**
- If using `subjectName`: Must match a subject's name (case-insensitive)
- If using `subjectId`: Must exist in the system

### **Section Exists:**
- If using `sectionName` or `section`: Must match a section's name (case-insensitive)
- If using `classSectionId` or `sectionId`: Must exist in the system

### **No Conflicts:**
Faculty cannot have two classes at the same day and time

---

## 📥 Import Process Details

### **Step 1: Click Import CSV Button**
On the Schedules page, click the **"Import CSV"** button (next to "Add Schedule")

### **Step 2: Download Template (Optional)**
Click **"📥 Download Template CSV"** to get a sample file with the correct format (name-based template)

### **Step 3: Upload Your CSV**
- Click **"Select CSV File"** or drag and drop
- Only `.csv` files are accepted
- File size limit: 5MB

### **Step 4: Review Preview**
The system will:
- ✅ Parse your CSV file
- ✅ Validate all data
- ✅ Show preview of first 10 rows
- ✅ Display validation errors (if any)

### **Step 5: Fix Errors (if needed)**
If validation errors are found:
- Review the error messages
- Fix your CSV file
- Upload again

### **Step 6: Confirm Import**
- Click **"Import X Schedules"** button
- Wait for processing
- View results summary

### **Step 7: Review Results**
The system will show:
- ✅ Total successful imports
- ❌ Total failed imports
- 📋 Detailed error list with row numbers

---

## 🔍 Common Validation Errors

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `Faculty with name "..." not found` | Faculty name doesn't match any user | Check spelling, use "FirstName LastName" format |
| `Faculty name "..." must include both first and last name` | Name has only one word | Use full name with first and last name |
| `Faculty with email "..." not found` | Email doesn't exist | Verify email address |
| `Subject "..." not found` | Subject name doesn't match | Check subject list, verify spelling |
| `Section "..." not found` | Section name doesn't match | Check section list, verify spelling |
| `Day must be one of: Monday, Tuesday, ...` | Invalid day name | Use full day name (e.g., Monday not Mon) |
| `Schedule conflict: Faculty already has a class on...` | Duplicate schedule | Check for overlapping schedules |
| `Duration must be a number` | Non-numeric duration | Use whole numbers (1, 2, 3) |

---

## 💡 Tips for Successful Imports

### **1. Use the Template**
Download the template CSV to ensure correct format

### **2. Check Names Carefully**
- Faculty names must match exactly (case-insensitive)
- Subject names must match exactly
- Section names must match exactly

### **3. Verify Data First**
Before importing, check:
- Faculty members exist in the system
- Subjects are created
- Sections are created

### **4. Start Small**
- Test with 2-3 rows first
- Once successful, import the full file

### **5. Avoid Special Characters**
- Use plain text for names
- Avoid extra spaces
- Avoid special punctuation

### **6. One Schedule Per Row**
Each row = one class schedule

### **7. Check for Conflicts**
Make sure faculty don't have overlapping schedules

---

## 🛠 Troubleshooting

### **Problem: "Faculty not found" but I know they exist**

**Solutions:**
1. **Check name format:** Use "FirstName LastName" (e.g., "Juan Cruz" not "Juan Dela Cruz")
   - The system matches against separate FirstName and LastName fields
   - Example: If the user's FirstName is "Juan" and LastName is "Cruz", use "Juan Cruz"
2. Try using email instead: `facultyEmail`
3. Check if the faculty account is active (not deleted)
4. Verify in the Employee module that they exist
5. Check the exact spelling and capitalization (case-insensitive matching is supported)

### **Problem: "Subject not found"**

**Solutions:**
1. Verify subject exists in the database
2. Check spelling and capitalization
3. Create the subject first if it doesn't exist
4. Try using subjectId instead

### **Problem: "Section not found"**

**Solutions:**
1. Verify section exists in the database
2. Check spelling
3. Create the section first if it doesn't exist
4. Try using classSectionId instead

### **Problem: CSV file won't upload**

**Solutions:**
1. Ensure file is .csv format (not .xlsx)
2. Check file size (must be under 5MB)
3. Save as CSV UTF-8 if using special characters
4. Try opening in text editor to verify it's comma-separated

### **Problem: All rows failing with "Unknown error"**

**Solutions:**
1. Check CSV format is correct
2. Ensure no blank rows
3. Verify column headers match expected names
4. Check for special characters or encoding issues

---

## 🔧 Technical Details

### **API Endpoint**

**POST** `/api/schedules/bulk-import`

### **Request Body (Name-Based)**

```json
[
  {
    "facultyName": "Juan Dela Cruz",
    "subjectName": "Mathematics 7",
    "sectionName": "Grade 7 - Rizal",
    "day": "Monday",
    "time": "08:00-09:00",
    "duration": 1
  }
]
```

### **Request Body (ID-Based)**

```json
[
  {
    "facultyId": 1,
    "subjectId": 5,
    "classSectionId": 10,
    "day": "Monday",
    "time": "08:00-09:00",
    "duration": 1
  }
]
```

### **Request Body (Email-Based for Faculty)**

```json
[
  {
    "facultyEmail": "juan.delacruz@school.edu",
    "subjectName": "Mathematics 7",
    "sectionName": "Grade 7 - Rizal",
    "day": "Monday",
    "time": "08:00-09:00",
    "duration": 1
  }
]
```

### **Response Format**

```json
{
  "success": 15,
  "failed": 2,
  "errors": [
    {
      "row": 3,
      "message": "Faculty with name \"Unknown Teacher\" not found"
    },
    {
      "row": 8,
      "message": "Schedule conflict: Faculty already has a class on Monday at 08:00-09:00"
    }
  ]
}
```

---

## 📊 Best Practices

### **For Manual Data Entry:**
1. ✅ Use name-based columns (`facultyName`, `subjectName`, `sectionName`)
2. ✅ Download the template CSV
3. ✅ Fill in Excel or Google Sheets
4. ✅ Save as CSV before importing

### **For Automated Integration (e.g., SIS):**
1. ✅ Use ID-based columns if you have the IDs
2. ✅ Use name-based if querying from another system
3. ✅ Implement error handling for failed imports
4. ✅ Log errors for review

### **For Large Imports:**
1. ✅ Split into smaller batches (100-200 rows each)
2. ✅ Import one batch at a time
3. ✅ Review results after each batch
4. ✅ Fix errors before proceeding

---

## 🎓 Example Use Cases

### **Use Case 1: New Semester Schedule**
Import entire semester schedule for all faculty members using names

### **Use Case 2: Mid-Semester Adjustments**
Add new schedules for substitute teachers or new sections

### **Use Case 3: SIS Integration**
Automated nightly sync from SIS to HRMS using faculty names and section codes

### **Use Case 4: Department Schedule**
Import schedules for a specific department (e.g., Math department)

---

## 📞 Support

If you encounter issues not covered in this guide:

1. Check the validation error messages
2. Review the error row numbers in your CSV
3. Verify all names match exactly with the system
4. Try the download template for correct format
5. Contact your system administrator

---

## ✨ Feature Summary

- ✅ Bulk import schedules from CSV
- ✅ Support for name-based identification (recommended!)
- ✅ Support for ID-based identification
- ✅ Support for email-based faculty identification
- ✅ Mixed mode support (names and IDs in same file)
- ✅ Comprehensive validation
- ✅ Detailed error reporting
- ✅ Preview before import
- ✅ Download template
- ✅ Schedule conflict detection
- ✅ Case-insensitive matching

**Happy importing! 🎉**
