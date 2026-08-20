# TCE ERP — Companion Android Technician App API Contract

This document serves as the single source of truth for the API contract between the HVAC ERP backend and the Android Technician Companion application.

---

## 1. Authentication

### `POST /api/auth/login`
Authenticates a user and returns a signed JSON Web Token (JWT).

- **Authentication**: None (Public)
- **Request Headers**: `Content-Type: application/json`

#### Request Body Shape
```json
{
  "email": "tech.rashid@tceerp.com",
  "password": "<technician_password>"
}
```
*Note: The identifier field name is strictly `email` (string).*

#### Response Shape (`200 OK`)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "573950d4-648a-4a2b-b914-387a84502d77",
    "email": "tech.rashid@tceerp.com",
    "name": "Rashid Mehmood (Test Tech)",
    "role": "Technician"
  }
}
```
- **JWT Delivery**: The JWT is returned **both** in the JSON response body (`token` field) and as an HTTP `Set-Cookie: token=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200` (12 hours expiry).
- **Subsequent Requests**: The mobile app should send the token in the `Authorization` header: `Authorization: Bearer <token>`.

---

## 2. Jobs Queue & Details

### `GET /api/technician/jobs`
Fetches all complaint/service jobs assigned to the authenticated technician.

- **Authentication**: `Bearer <token>` in `Authorization` header (or cookie).
- **RBAC**: Requires role `Technician` (or `Admin`).
- **Identity Isolation**: Server-side resolved from JWT and linked `Employee` record. Never trusts client-supplied IDs.

#### Response Shape (`200 OK`)
```json
{
  "technician": {
    "id": "3b6b64b7-0218-427f-b270-dc89a60fc026",
    "name": "Rashid Mehmood (Test Tech)",
    "phone": "0300-7776655"
  },
  "count": 2,
  "jobs": [
    {
      "id": "6dc15b80-4c36-4237-abb2-d29f4c5228af",
      "complaintNumber": "COMP-10004",
      "clientName": "Gul Ahmed Textile Mills",
      "address": "Landhi Industrial Area, Karachi",
      "phone": "0300-4455667",
      "problemDescription": "Air handling unit vibrating excessively. Suspected fan belt or bearing failure.",
      "remarks": "URGENT priority job. Contact site engineer.",
      "status": "OPEN",
      "assignedDate": "2026-08-20T12:38:28.980Z",
      "priority": "HIGH",
      "amount": 12000,
      "amountStatus": "UNPAID",
      "customer": null,
      "attachments": [],
      "timeline": [
        {
          "id": "tl-uuid-1",
          "fromStatus": "OPEN",
          "toStatus": "EN_ROUTE",
          "remarks": "Driver dispatched",
          "timestamp": "2026-08-20T12:40:00.000Z",
          "changedBy": {
            "id": "usr-uuid-1",
            "name": "Rashid Mehmood (Test Tech)"
          }
        }
      ]
    }
  ]
}
```

#### Confirmed Field Specifications
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique UUID of the job/complaint ticket |
| `complaintNumber` | `string` | Human-readable ticket ID (e.g. `COMP-10004`) |
| `clientName` | `string` | Customer / Client organization or person name |
| `address` | `string` | Physical job / site address |
| `phone` | `string` | Customer contact phone number |
| `problemDescription` | `string` | Fault description reported by client |
| `remarks` | `string` | Internal notes / dispatch instructions |
| `status` | `string` | `OPEN`, `ACCEPTED`, `EN_ROUTE`, `IN_PROGRESS`, `RESOLVED`, `CLOSED` |
| `assignedDate` | `string (ISO)` | Assignment timestamp |
| `priority` | `string` | `HIGH` (if tagged urgent) or `NORMAL` |
| `amount` | `number` | Service / estimate charge in PKR |
| `amountStatus` | `string` | `UNPAID`, `PAID`, `WAIVED` |
| `attachments` | `array` | Existing uploaded photos / document files |
| `timeline` | `array` | Chronological transition history and logs |

---

## 3. Status Transitions

### `PATCH /api/technician/jobs/[id]/status`
Updates the operational status of an assigned job.

- **Authentication**: `Bearer <token>`
- **Ownership Verification**: Automatically rejects with `403 Forbidden` if the ticket is not assigned to the calling technician.

#### Request Body Shape
```json
{
  "status": "EN_ROUTE",
  "remarks": "Leaving workshop on service motorcycle. ETA 20 mins."
}
```
*Allowed `status` values: `ACCEPTED`, `EN_ROUTE`, `IN_PROGRESS`, `RESOLVED`, `COMPLETED`.*

#### Response Shape (`200 OK`)
```json
{
  "success": true,
  "message": "Job status updated to EN_ROUTE",
  "job": {
    "id": "6dc15b80-4c36-4237-abb2-d29f4c5228af",
    "complaintNumber": "COMP-10004",
    "status": "EN_ROUTE",
    "remarks": "...",
    "updatedAt": "2026-08-20T12:40:00.000Z"
  }
}
```

---

## 4. Job Completion & Proof Upload

### `POST /api/technician/jobs/[id]/complete`
Submits work completion with photos, customer signature, and final remarks. Automatically transitions status to `RESOLVED`, records attachment files, logs timeline entry, and generates an audit record.

- **Authentication**: `Bearer <token>`
- **Payload Format**: Supports **BOTH** `multipart/form-data` and `application/json` (Base64).

#### Option A: `multipart/form-data` (Recommended for binary files)
- `photos` or `files`: Image file(s) (can append multiple: `formData.append('photos', file)`)
- `signature`: Signature image file (PNG) or base64 data URL string
- `remarks` or `notes`: Text description of work done

#### Option B: `application/json` (Base64 data URLs)
```json
{
  "photos": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
  ],
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "remarks": "Replaced blower fan belt (Size B-42) and lubricated bearings. Running smoothly at nominal load."
}
```
*Note: Also accepts objects in photos array: `[{ "fileName": "repair.jpg", "base64": "data:...", "mimeType": "image/jpeg" }]`.*

#### Response Shape (`200 OK`)
```json
{
  "success": true,
  "message": "Job completed and signed off successfully",
  "job": {
    "id": "6dc15b80-4c36-4237-abb2-d29f4c5228af",
    "complaintNumber": "COMP-10004",
    "status": "RESOLVED",
    "remarks": "...",
    "updatedAt": "2026-08-20T12:45:00.000Z"
  },
  "uploadedAttachmentsCount": 3,
  "attachments": [
    {
      "id": "att-uuid-1",
      "fileName": "job_photo_1.jpg",
      "fileUrl": "/uploads/1787229500-job_photo_1.jpg",
      "fileType": "image/jpeg"
    },
    {
      "id": "att-uuid-2",
      "fileName": "customer_signature_1787229500.png",
      "fileUrl": "/uploads/1787229500-customer_signature.png",
      "fileType": "image/png"
    }
  ]
}
```

---

## 5. Device Token Registration

### `POST /api/technician/push-token`
Registers or updates the technician's Firebase Cloud Messaging (FCM) device token.

- **Authentication**: `Bearer <token>`

#### Request Body Shape
```json
{
  "fcmToken": "c7k...e9P",
  "deviceModel": "Samsung Galaxy S23",
  "appVersion": "1.0.0"
}
```

#### Response Shape (`200 OK`)
```json
{
  "success": true,
  "message": "Device FCM push token registered successfully",
  "user": {
    "id": "573950d4-648a-4a2b-b914-387a84502d77",
    "name": "Rashid Mehmood (Test Tech)"
  }
}
```

---

## 6. Public App Version Check

### `GET /api/app-version`
Returns the current mobile companion app version, download URL, and update flags.

- **Authentication**: None (Public)

#### Response Shape (`200 OK`)
```json
{
  "appName": "TCE Technician Companion",
  "platform": "android",
  "version": "1.0.0",
  "downloadUrl": "https://tce-hvac.com/downloads/technician-app-latest.apk",
  "minSupportedVersion": "1.0.0",
  "forceUpdate": false,
  "releaseNotes": "Official Technicool Engineering Companion App for field service technicians.",
  "timestamp": "2026-08-20T18:40:00.000Z"
}
```
