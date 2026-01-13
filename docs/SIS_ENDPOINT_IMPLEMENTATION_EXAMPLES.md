# SIS Endpoint Implementation Examples

This document provides example code implementations for the two endpoints that SIS must implement to integrate with HRMS.

## Required Endpoints

1. **POST /api/hrms/available-schedules** - Provide schedules to HRMS
2. **POST /api/hrms/assign-teacher** - Receive teacher assignments from HRMS

---

## Common Authentication Helper

Both endpoints require HMAC-SHA256 signature verification. Here's a helper function you can use:

### Node.js/Express Example

```javascript
const crypto = require('crypto');

/**
 * Verify HMAC-SHA256 signature
 * @param {string} body - Request body as string
 * @param {string} timestamp - Timestamp from x-timestamp header
 * @param {string} signature - Signature from x-signature header
 * @param {string} sharedSecret - Shared secret (SJSFI_SHARED_SECRET)
 * @returns {boolean} - True if signature is valid
 */
function verifySignature(body, timestamp, signature, sharedSecret) {
    const hmac = crypto.createHmac('sha256', sharedSecret);
    hmac.update(body + timestamp);
    const digest = hmac.digest('hex');
    return digest === signature;
}

/**
 * Validate API key
 * @param {string} apiKey - API key from Authorization header
 * @param {string} expectedKey - Expected API key (SJSFI_HRMS_API_KEY)
 * @returns {boolean} - True if API key is valid
 */
function validateApiKey(apiKey, expectedKey) {
    return apiKey === expectedKey;
}

/**
 * Validate timestamp (must be within ±5 minutes)
 * @param {string} timestamp - Timestamp string
 * @returns {boolean} - True if timestamp is valid
 */
function validateTimestamp(timestamp) {
    const now = Date.now();
    const tsInt = parseInt(timestamp, 10);
    if (isNaN(tsInt)) return false;
    return Math.abs(now - tsInt) <= 5 * 60 * 1000; // 5 minutes
}
```

### PHP Example

```php
<?php
/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature($body, $timestamp, $signature, $sharedSecret) {
    $message = $body . $timestamp;
    $computedSignature = hash_hmac('sha256', $message, $sharedSecret);
    return hash_equals($computedSignature, $signature);
}

/**
 * Validate API key
 */
function validateApiKey($apiKey, $expectedKey) {
    return hash_equals($apiKey, $expectedKey);
}

/**
 * Validate timestamp (must be within ±5 minutes)
 */
function validateTimestamp($timestamp) {
    $now = time() * 1000; // Convert to milliseconds
    $tsInt = intval($timestamp);
    if ($tsInt === 0) return false;
    return abs($now - $tsInt) <= 5 * 60 * 1000; // 5 minutes
}
?>
```

### Python/Flask Example

```python
import hmac
import hashlib
import time

def verify_signature(body, timestamp, signature, shared_secret):
    """Verify HMAC-SHA256 signature"""
    message = body + timestamp
    computed_signature = hmac.new(
        shared_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed_signature, signature)

def validate_api_key(api_key, expected_key):
    """Validate API key"""
    return hmac.compare_digest(api_key, expected_key)

def validate_timestamp(timestamp):
    """Validate timestamp (must be within ±5 minutes)"""
    try:
        now = int(time.time() * 1000)  # Convert to milliseconds
        ts_int = int(timestamp)
        return abs(now - ts_int) <= 5 * 60 * 1000  # 5 minutes
    except (ValueError, TypeError):
        return False
```

---

## Endpoint 1: POST /api/hrms/available-schedules

**Purpose**: Provide all available schedules to HRMS

### Node.js/Express Implementation

```javascript
const express = require('express');
const router = express.Router();

// Environment variables
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const HRMS_API_KEY = process.env.SJSFI_HRMS_API_KEY;

/**
 * POST /api/hrms/available-schedules
 * Provide all schedules to HRMS
 */
router.post('/api/hrms/available-schedules', async (req, res) => {
    try {
        // 1. Get headers
        const auth = req.headers.authorization || '';
        const apiKey = auth.split(' ')[1]; // Extract from "Bearer {key}"
        const timestamp = req.headers['x-timestamp'] || '';
        const signature = req.headers['x-signature'] || '';

        // 2. Validate API key
        if (!validateApiKey(apiKey, HRMS_API_KEY)) {
            return res.status(401).json({
                status: 'error',
                error: 'Unauthorized',
                errors: []
            });
        }

        // 3. Validate timestamp
        if (!validateTimestamp(timestamp)) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid timestamp',
                errors: []
            });
        }

        // 4. Verify signature
        const rawBody = JSON.stringify(req.body);
        if (!verifySignature(rawBody, timestamp, signature, SHARED_SECRET)) {
            return res.status(403).json({
                status: 'error',
                error: 'Invalid signature',
                errors: []
            });
        }

        // 5. Validate request body
        if (!req.body || req.body.data !== 'fetch-all-schedules') {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid request body',
                errors: []
            });
        }

        // 6. Fetch schedules from your database
        // TODO: Replace this with your actual database query
        const schedules = await fetchAllSchedulesFromDatabase();

        // 7. Format response according to HRMS expected format
        const formattedSchedules = schedules.map(schedule => ({
            scheduleId: schedule.id,
            schedule: {
                id: schedule.id,
                day: schedule.day,
                startTime: schedule.start_time, // Format: "HH:MM"
                endTime: schedule.end_time,     // Format: "HH:MM"
                room: schedule.room || ''
            },
            subject: {
                id: schedule.subject_id,
                code: schedule.subject_code,
                name: schedule.subject_name
            },
            section: {
                id: schedule.section_id,
                name: schedule.section_name
            },
            teacher: {
                assigned: schedule.teacher_id !== null,
                teacherId: schedule.teacher_id || null,
                teacherName: schedule.teacher_name || null
            },
            yearLevel: {
                name: schedule.year_level_name
            },
            term: {
                id: schedule.term_id
            }
        }));

        // 8. Return response
        return res.status(200).json({
            status: 'success',
            data: formattedSchedules
        });

    } catch (error) {
        console.error('Error in /api/hrms/available-schedules:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Internal server error',
            errors: []
        });
    }
});

/**
 * TODO: Implement this function to fetch schedules from your database
 * Example SQL query:
 * 
 * SELECT 
 *     s.id,
 *     s.day,
 *     s.start_time,
 *     s.end_time,
 *     s.room,
 *     sub.id as subject_id,
 *     sub.code as subject_code,
 *     sub.name as subject_name,
 *     sec.id as section_id,
 *     sec.name as section_name,
 *     t.id as teacher_id,
 *     t.name as teacher_name,
 *     yl.name as year_level_name,
 *     term.id as term_id
 * FROM schedules s
 * JOIN subjects sub ON s.subject_id = sub.id
 * JOIN sections sec ON s.section_id = sec.id
 * LEFT JOIN teachers t ON s.teacher_id = t.id
 * JOIN year_levels yl ON sec.year_level_id = yl.id
 * JOIN terms term ON s.term_id = term.id
 * WHERE s.is_active = true
 */
async function fetchAllSchedulesFromDatabase() {
    // TODO: Replace with your actual database query
    // This is just an example
    return [
        {
            id: 123,
            day: 'Monday',
            start_time: '08:00',
            end_time: '09:30',
            room: 'Room 101',
            subject_id: 45,
            subject_code: 'MATH101',
            subject_name: 'Mathematics 101',
            section_id: 10,
            section_name: 'Grade 7-A',
            teacher_id: null,
            teacher_name: null,
            year_level_name: 'Grade 7',
            term_id: 1
        }
        // ... more schedules
    ];
}

module.exports = router;
```

### PHP Implementation

```php
<?php
header('Content-Type: application/json');

// Environment variables
$SHARED_SECRET = getenv('SJSFI_SHARED_SECRET');
$HRMS_API_KEY = getenv('SJSFI_HRMS_API_KEY');

// Get request data
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

// Get headers
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$apiKey = str_replace('Bearer ', '', $auth);
$timestamp = $_SERVER['HTTP_X_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';

// Validate API key
if (!validateApiKey($apiKey, $HRMS_API_KEY)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'error' => 'Unauthorized',
        'errors' => []
    ]);
    exit;
}

// Validate timestamp
if (!validateTimestamp($timestamp)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => 'Invalid timestamp',
        'errors' => []
    ]);
    exit;
}

// Verify signature
if (!verifySignature($rawBody, $timestamp, $signature, $SHARED_SECRET)) {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'error' => 'Invalid signature',
        'errors' => []
    ]);
    exit;
}

// Validate request body
if (!isset($body['data']) || $body['data'] !== 'fetch-all-schedules') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => 'Invalid request body',
        'errors' => []
    ]);
    exit;
}

try {
    // Fetch schedules from database
    // TODO: Replace with your actual database query
    $schedules = fetchAllSchedulesFromDatabase();
    
    // Format response
    $formattedSchedules = array_map(function($schedule) {
        return [
            'scheduleId' => $schedule['id'],
            'schedule' => [
                'id' => $schedule['id'],
                'day' => $schedule['day'],
                'startTime' => $schedule['start_time'],
                'endTime' => $schedule['end_time'],
                'room' => $schedule['room'] ?? ''
            ],
            'subject' => [
                'id' => $schedule['subject_id'],
                'code' => $schedule['subject_code'],
                'name' => $schedule['subject_name']
            ],
            'section' => [
                'id' => $schedule['section_id'],
                'name' => $schedule['section_name']
            ],
            'teacher' => [
                'assigned' => $schedule['teacher_id'] !== null,
                'teacherId' => $schedule['teacher_id'],
                'teacherName' => $schedule['teacher_name']
            ],
            'yearLevel' => [
                'name' => $schedule['year_level_name']
            ],
            'term' => [
                'id' => $schedule['term_id']
            ]
        ];
    }, $schedules);
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => $formattedSchedules
    ]);
    
} catch (Exception $e) {
    error_log('Error in /api/hrms/available-schedules: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Internal server error',
        'errors' => []
    ]);
}

/**
 * TODO: Implement this function to fetch schedules from your database
 */
function fetchAllSchedulesFromDatabase() {
    // TODO: Replace with your actual database query
    return [
        [
            'id' => 123,
            'day' => 'Monday',
            'start_time' => '08:00',
            'end_time' => '09:30',
            'room' => 'Room 101',
            'subject_id' => 45,
            'subject_code' => 'MATH101',
            'subject_name' => 'Mathematics 101',
            'section_id' => 10,
            'section_name' => 'Grade 7-A',
            'teacher_id' => null,
            'teacher_name' => null,
            'year_level_name' => 'Grade 7',
            'term_id' => 1
        ]
        // ... more schedules
    ];
}
?>
```

---

## Endpoint 2: POST /api/hrms/assign-teacher

**Purpose**: Receive teacher assignment updates from HRMS

### Node.js/Express Implementation

```javascript
const express = require('express');
const router = express.Router();

// Environment variables
const SHARED_SECRET = process.env.SJSFI_SHARED_SECRET;
const HRMS_API_KEY = process.env.SJSFI_HRMS_API_KEY;

/**
 * POST /api/hrms/assign-teacher
 * Receive teacher assignment from HRMS
 */
router.post('/api/hrms/assign-teacher', async (req, res) => {
    try {
        // 1. Get headers
        const auth = req.headers.authorization || '';
        const apiKey = auth.split(' ')[1]; // Extract from "Bearer {key}"
        const timestamp = req.headers['x-timestamp'] || '';
        const signature = req.headers['x-signature'] || '';

        // 2. Validate API key
        if (!validateApiKey(apiKey, HRMS_API_KEY)) {
            return res.status(401).json({
                status: 'error',
                error: 'Unauthorized',
                errors: []
            });
        }

        // 3. Validate timestamp
        if (!validateTimestamp(timestamp)) {
            return res.status(400).json({
                status: 'error',
                error: 'Invalid timestamp',
                errors: []
            });
        }

        // 4. Verify signature
        const rawBody = JSON.stringify(req.body);
        if (!verifySignature(rawBody, timestamp, signature, SHARED_SECRET)) {
            return res.status(403).json({
                status: 'error',
                error: 'Invalid signature',
                errors: []
            });
        }

        // 5. Validate request body
        const { scheduleId, teacher } = req.body;
        
        if (!scheduleId || !teacher) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing required fields: scheduleId and teacher',
                errors: []
            });
        }

        if (!teacher.teacherId || !teacher.teacherName || !teacher.teacherEmail) {
            return res.status(400).json({
                status: 'error',
                error: 'Missing required teacher fields: teacherId, teacherName, teacherEmail',
                errors: []
            });
        }

        // 6. Verify schedule exists
        const schedule = await findScheduleById(scheduleId);
        if (!schedule) {
            return res.status(404).json({
                status: 'error',
                error: 'Schedule not found',
                errors: []
            });
        }

        // 7. Update schedule with teacher assignment
        // TODO: Replace with your actual database update
        await updateScheduleTeacher(scheduleId, {
            teacherId: teacher.teacherId,
            teacherName: teacher.teacherName,
            teacherEmail: teacher.teacherEmail
        });

        // 8. Return success response
        return res.status(200).json({
            status: 'success',
            data: {
                message: 'Schedule assignment updated successfully'
            }
        });

    } catch (error) {
        console.error('Error in /api/hrms/assign-teacher:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Internal server error',
            errors: []
        });
    }
});

/**
 * TODO: Implement this function to find schedule by ID
 */
async function findScheduleById(scheduleId) {
    // TODO: Replace with your actual database query
    // Example SQL:
    // SELECT * FROM schedules WHERE id = ?
    return {
        id: scheduleId,
        // ... other schedule fields
    };
}

/**
 * TODO: Implement this function to update schedule teacher
 */
async function updateScheduleTeacher(scheduleId, teacher) {
    // TODO: Replace with your actual database update
    // Example SQL:
    // UPDATE schedules 
    // SET teacher_id = ?, teacher_name = ?, teacher_email = ?
    // WHERE id = ?
    
    // Or if you have a separate teachers table:
    // UPDATE schedules 
    // SET teacher_id = (SELECT id FROM teachers WHERE employee_id = ?)
    // WHERE id = ?
    
    console.log(`Updating schedule ${scheduleId} with teacher:`, teacher);
}

module.exports = router;
```

### PHP Implementation

```php
<?php
header('Content-Type: application/json');

// Environment variables
$SHARED_SECRET = getenv('SJSFI_SHARED_SECRET');
$HRMS_API_KEY = getenv('SJSFI_HRMS_API_KEY');

// Get request data
$rawBody = file_get_contents('php://input');
$body = json_decode($rawBody, true);

// Get headers
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$apiKey = str_replace('Bearer ', '', $auth);
$timestamp = $_SERVER['HTTP_X_TIMESTAMP'] ?? '';
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';

// Validate API key
if (!validateApiKey($apiKey, $HRMS_API_KEY)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'error' => 'Unauthorized',
        'errors' => []
    ]);
    exit;
}

// Validate timestamp
if (!validateTimestamp($timestamp)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => 'Invalid timestamp',
        'errors' => []
    ]);
    exit;
}

// Verify signature
if (!verifySignature($rawBody, $timestamp, $signature, $SHARED_SECRET)) {
    http_response_code(403);
    echo json_encode([
        'status' => 'error',
        'error' => 'Invalid signature',
        'errors' => []
    ]);
    exit;
}

// Validate request body
if (!isset($body['scheduleId']) || !isset($body['teacher'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => 'Missing required fields: scheduleId and teacher',
        'errors' => []
    ]);
    exit;
}

$scheduleId = $body['scheduleId'];
$teacher = $body['teacher'];

if (!isset($teacher['teacherId']) || !isset($teacher['teacherName']) || !isset($teacher['teacherEmail'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'error' => 'Missing required teacher fields: teacherId, teacherName, teacherEmail',
        'errors' => []
    ]);
    exit;
}

try {
    // Verify schedule exists
    $schedule = findScheduleById($scheduleId);
    if (!$schedule) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'error' => 'Schedule not found',
            'errors' => []
        ]);
        exit;
    }
    
    // Update schedule with teacher assignment
    updateScheduleTeacher($scheduleId, $teacher);
    
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data' => [
            'message' => 'Schedule assignment updated successfully'
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Error in /api/hrms/assign-teacher: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'error' => 'Internal server error',
        'errors' => []
    ]);
}

/**
 * TODO: Implement this function to find schedule by ID
 */
function findScheduleById($scheduleId) {
    // TODO: Replace with your actual database query
    // Example using PDO:
    // $stmt = $pdo->prepare("SELECT * FROM schedules WHERE id = ?");
    // $stmt->execute([$scheduleId]);
    // return $stmt->fetch(PDO::FETCH_ASSOC);
    return ['id' => $scheduleId];
}

/**
 * TODO: Implement this function to update schedule teacher
 */
function updateScheduleTeacher($scheduleId, $teacher) {
    // TODO: Replace with your actual database update
    // Example using PDO:
    // $stmt = $pdo->prepare("
    //     UPDATE schedules 
    //     SET teacher_id = ?, teacher_name = ?, teacher_email = ?
    //     WHERE id = ?
    // ");
    // $stmt->execute([
    //     $teacher['teacherId'],
    //     $teacher['teacherName'],
    //     $teacher['teacherEmail'],
    //     $scheduleId
    // ]);
    error_log("Updating schedule $scheduleId with teacher: " . json_encode($teacher));
}
?>
```

### Python/Flask Implementation

```python
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

# Environment variables
SHARED_SECRET = os.getenv('SJSFI_SHARED_SECRET')
HRMS_API_KEY = os.getenv('SJSFI_HRMS_API_KEY')

@app.route('/api/hrms/assign-teacher', methods=['POST'])
def assign_teacher():
    try:
        # 1. Get headers
        auth = request.headers.get('Authorization', '')
        api_key = auth.replace('Bearer ', '') if auth.startswith('Bearer ') else ''
        timestamp = request.headers.get('x-timestamp', '')
        signature = request.headers.get('x-signature', '')
        
        # 2. Validate API key
        if not validate_api_key(api_key, HRMS_API_KEY):
            return jsonify({
                'status': 'error',
                'error': 'Unauthorized',
                'errors': []
            }), 401
        
        # 3. Validate timestamp
        if not validate_timestamp(timestamp):
            return jsonify({
                'status': 'error',
                'error': 'Invalid timestamp',
                'errors': []
            }), 400
        
        # 4. Verify signature
        raw_body = request.get_data(as_text=True)
        if not verify_signature(raw_body, timestamp, signature, SHARED_SECRET):
            return jsonify({
                'status': 'error',
                'error': 'Invalid signature',
                'errors': []
            }), 403
        
        # 5. Validate request body
        body = request.get_json()
        if not body or 'scheduleId' not in body or 'teacher' not in body:
            return jsonify({
                'status': 'error',
                'error': 'Missing required fields: scheduleId and teacher',
                'errors': []
            }), 400
        
        schedule_id = body['scheduleId']
        teacher = body['teacher']
        
        if 'teacherId' not in teacher or 'teacherName' not in teacher or 'teacherEmail' not in teacher:
            return jsonify({
                'status': 'error',
                'error': 'Missing required teacher fields: teacherId, teacherName, teacherEmail',
                'errors': []
            }), 400
        
        # 6. Verify schedule exists
        schedule = find_schedule_by_id(schedule_id)
        if not schedule:
            return jsonify({
                'status': 'error',
                'error': 'Schedule not found',
                'errors': []
            }), 404
        
        # 7. Update schedule with teacher assignment
        update_schedule_teacher(schedule_id, teacher)
        
        # 8. Return success response
        return jsonify({
            'status': 'success',
            'data': {
                'message': 'Schedule assignment updated successfully'
            }
        }), 200
        
    except Exception as e:
        print(f'Error in /api/hrms/assign-teacher: {str(e)}')
        return jsonify({
            'status': 'error',
            'error': 'Internal server error',
            'errors': []
        }), 500

def find_schedule_by_id(schedule_id):
    """TODO: Implement this function to find schedule by ID"""
    # TODO: Replace with your actual database query
    return {'id': schedule_id}

def update_schedule_teacher(schedule_id, teacher):
    """TODO: Implement this function to update schedule teacher"""
    # TODO: Replace with your actual database update
    print(f"Updating schedule {schedule_id} with teacher: {teacher}")

if __name__ == '__main__':
    app.run(debug=True)
```

---

## Database Schema Examples

### Schedules Table (Example)

```sql
CREATE TABLE schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    day VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room VARCHAR(50),
    subject_id INT NOT NULL,
    section_id INT NOT NULL,
    teacher_id VARCHAR(50), -- HRMS Employee ID
    teacher_name VARCHAR(255),
    teacher_email VARCHAR(255),
    year_level_id INT,
    term_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (term_id) REFERENCES terms(id)
);
```

---

## Testing Your Implementation

### Test Endpoint 1: Available Schedules

```bash
# Generate signature (Node.js)
node -e "
const crypto = require('crypto');
const body = JSON.stringify({data: 'fetch-all-schedules'});
const timestamp = Date.now().toString();
const secret = 'YOUR_SHARED_SECRET';
const signature = crypto.createHmac('sha256', secret).update(body + timestamp).digest('hex');
console.log('Timestamp:', timestamp);
console.log('Signature:', signature);
"

# Make request
curl -X POST http://your-sis-domain.com/api/hrms/available-schedules \
  -H "Authorization: Bearer YOUR_HRMS_API_KEY" \
  -H "x-timestamp: GENERATED_TIMESTAMP" \
  -H "x-signature: GENERATED_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{"data":"fetch-all-schedules"}'
```

### Test Endpoint 2: Assign Teacher

```bash
# Generate signature (Node.js)
node -e "
const crypto = require('crypto');
const body = JSON.stringify({
  scheduleId: 123,
  teacher: {
    teacherId: '2026-0001',
    teacherName: 'Dr. Maria Santos',
    teacherEmail: 'maria@school.edu'
  }
});
const timestamp = Date.now().toString();
const secret = 'YOUR_SHARED_SECRET';
const signature = crypto.createHmac('sha256', secret).update(body + timestamp).digest('hex');
console.log('Timestamp:', timestamp);
console.log('Signature:', signature);
"

# Make request
curl -X POST http://your-sis-domain.com/api/hrms/assign-teacher \
  -H "Authorization: Bearer YOUR_HRMS_API_KEY" \
  -H "x-timestamp: GENERATED_TIMESTAMP" \
  -H "x-signature: GENERATED_SIGNATURE" \
  -H "Content-Type: application/json" \
  -d '{
    "scheduleId": 123,
    "teacher": {
      "teacherId": "2026-0001",
      "teacherName": "Dr. Maria Santos",
      "teacherEmail": "maria@school.edu"
    }
  }'
```

---

## Important Notes

1. **Security**: Always validate the signature and API key before processing requests
2. **Timestamp**: Ensure your server clock is synchronized (use NTP)
3. **Error Handling**: Return appropriate HTTP status codes and error messages
4. **Database**: Replace TODO sections with your actual database queries
5. **Logging**: Log all requests for debugging and audit purposes
6. **Rate Limiting**: Consider implementing rate limiting to prevent abuse
7. **Environment Variables**: Store secrets in environment variables, never in code

---

## Support

If you need help implementing these endpoints, contact the HRMS team for:
- API key configuration
- Shared secret setup
- Testing assistance
- Integration troubleshooting
