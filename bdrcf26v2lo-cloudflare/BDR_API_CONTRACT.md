# Breakdown Reporter (BDR) API v1 — Implementation Contract

> Deployment/authentication setup is documented in README.md. Existing endpoint and concurrency guarantees must be checked against implementation.

This document specifies the API contract for BDR API v1. It serves as the authoritative interface shared by **BDR Web**, **BDR Desktop**, and **BDR Mobile (Flet)**.

---

## 1. Global Specifications

### Base URL
All routes are version-prefixed:
```text
/api/v1
```

### Protocol Constraints
- Standard MIME Type: `application/json`
- Header authentication constraint: `Authorization: Bearer <Cloudflare Access JWT>`
- Every write mutation must be validated server-side. Masse-assignment of roles or status fields is explicitly blocked.

---

## 2. Authentication Context

Clients must authenticate with standard Cloudflare Access JWTs:
```http
Authorization: Bearer <ID_TOKEN>
```
The API validates the Access RS256 signature, issuer, audience, expiry and required claims using the team public keys, loads the authoritative D1 user profile by verified email, and attaches it to the request context. Cloudflare supplies `Cf-Access-Jwt-Assertion`; API clients may alternatively send the Access JWT as a Bearer token. Identity values such as `userId`, `name`, `email`, and `role` are derived exclusively from this server-side profile to prevent identity spoofing.

---

## 3. Core Resource Endpoints

### 3.1 Health Check
Check the API process status. This endpoint does not verify D1 connectivity.

*   **Endpoint:** `GET /api/v1/health`
*   **Authentication Required:** No
*   **Response Format (200 OK):**
    ```json
    {
      "status": "UP",
      "timestamp": "2026-10-07T05:26:00.000Z",
      "service": "BDR API v1"
    }
    ```

---

### 3.2 Authenticated Profile
Yields the authenticated user profile details matching the current token credentials.

*   **Endpoint:** `GET /api/v1/me`
*   **Authentication Required:** Yes
*   **Response Format (200 OK):**
    ```json
    {
      "data": {
        "id": "user_abc123",
        "name": "John Doe",
        "email": "johndoe@matimba.com",
        "role": "Maintenance Shift Foreman",
        "employeeNumber": "EMP-987",
        "shift": "A"
      }
    }
    ```

---

### 3.3 Breakdown Reports

#### List Reports
*   **Endpoint:** `GET /api/v1/reports`
*   **Query Parameters:**
    *   `hours` (optional, default: `72`) - Filter reports within the specified preceding hour window.
    *   `limit` (optional, default: `1000`) - Total reports limit.
*   **Response (200 OK):**
    ```json
    {
      "data": [
        {
          "id": "report_1",
          "equipment": "Primary Crusher",
          "equipmentNumber": "CR-101",
          "reportedFault": "Blockage in feed chute",
          "urgency": 4,
          "status": "Active",
          "reportingTime": "2026-10-07T04:00:00.000Z",
          "workGroup": "Mechanical",
          "reporter": {
            "id": "user_xyz",
            "name": "Bob the Builder"
          }
        }
      ]
    }
    ```

#### Get Specific Report
*   **Endpoint:** `GET /api/v1/reports/:id`
*   **Response (200 OK):**
    ```json
    {
      "data": {
        "id": "report_1",
        "equipment": "Primary Crusher",
        "equipmentNumber": "CR-101",
        "reportedFault": "Blockage in feed chute",
        "urgency": 4,
        "status": "Active",
        "reportingTime": "2026-10-07T04:00:00.000Z",
        "workGroup": "Mechanical",
        "reporter": { "id": "user_xyz", "name": "Bob" }
      }
    }
    ```

#### Create Report
*   **Endpoint:** `POST /api/v1/reports`
*   **Payload Constraints:**
    ```json
    {
      "equipment": "Primary Crusher",
      "equipmentNumber": "CR-101",
      "reportedFault": "Blocked feeder chute",
      "urgency": 4,
      "workGroup": "Mechanical",
      "details": "Chute blocked by massive boulder."
    }
    ```
*   **Response (201 Created):** Returns the created `BreakdownReport` entity containing server-generated IDs, timestamps, and reporter profiles.

#### Update Report
*   **Endpoint:** `PATCH /api/v1/reports/:id`
*   **Payload Constraints:**
    ```json
    {
      "details": "Feeder chute cleared of blocked boulder.",
      "status": "Resolved"
    }
    ```
*   **Response (200 OK):** Yields the updated `BreakdownReport` document with an automatically appended, audit-compliant entry inside `changeLog`.

---

### 3.4 Lockout / Isolation Lifecycle Endpoints

Lockout state transitions are restricted to the following explicit endpoints. Generic status updates are strictly prohibited to preserve safety invariants.

#### List Active Lockouts
*   **Endpoint:** `GET /api/v1/lockouts`
*   **Response (200 OK):** Returns array of active job tickets within the past 30 days.

#### Get Lockout Ticket
*   **Endpoint:** `GET /api/v1/lockouts/:id`
*   **Response (200 OK):** Returns full `JobTicket` structure.

#### 1. Initiate Lockout Request
*   **Endpoint:** `POST /api/v1/lockouts`
*   **Payload:**
    ```json
    {
      "equipment": "Primary Crusher Conveyor",
      "equipmentNumber": "CV-101",
      "workGroup": "Mechanical",
      "lockoutComments": "Belt scraper inspection",
      "bookedDurationMinutes": 60
    }
    ```
*   **Response (201 Created):** Creates state `LOCKOUT_REQUESTED`.

#### 2. Confirm Equipment QR/Tag
*   **Endpoint:** `POST /api/v1/lockouts/:id/confirm-equipment`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-111",
      "qrVerified": true,
      "scannedQrCode": "QR-CV-101"
    }
    ```
*   **Target State:** `EQUIPMENT_CONFIRMED`

#### 3. Confirm SCADA Stop
*   **Endpoint:** `POST /api/v1/lockouts/:id/confirm-scada-stop`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-222",
      "comments": "Operations control stop confirmed"
    }
    ```
*   **Target State:** `SCADA_STOP_CONFIRMED`

#### 4. Confirm Physical Lockout (Isolation)
*   **Endpoint:** `POST /api/v1/lockouts/:id/confirm-physical-lockout`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-333",
      "comments": "Locks placed on isolator 4A"
    }
    ```
*   **Target State:** `LOCKOUT_ACTIVE`

#### 5. Record Positive Test
*   **Endpoint:** `POST /api/v1/lockouts/:id/positive-test`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-444",
      "result": "PASS",
      "comments": "Conveyor does not start up"
    }
    ```
*   **Target State:** `POSITIVE_TEST`

#### 6. Request Release
*   **Endpoint:** `POST /api/v1/lockouts/:id/request-release`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-555",
      "comments": "All cleaning complete, padlocks removed"
    }
    ```
*   **Target State:** `RELEASE_REQUESTED`

#### 7. Final Clearance & Return
*   **Endpoint:** `POST /api/v1/lockouts/:id/confirm-release`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-666",
      "comments": "Handback complete and safe to restart"
    }
    ```
*   **Target State:** `RELEASED`

#### Reject Lockout Request
*   **Endpoint:** `POST /api/v1/lockouts/:id/reject`
*   **Payload:**
    ```json
    {
      "employeeNumber": "EMP-888",
      "reason": "Isolation request scope is ambiguous"
    }
    ```
*   **Target State:** `REJECTED`

---

### 3.5 Operational Sync (Idempotent Sync)

Accepts batch operations from offline-capable clients. Fully enforces domain service validation constraints, preventing shadow modifications.

*   **Endpoint:** `POST /api/v1/sync`
*   **Payload Structure:**
    ```json
    {
      "operations": [
        {
          "operationId": "client-uuid-99a22",
          "type": "CREATE_REPORT",
          "payload": {
            "equipment": "Transfer Chute 3",
            "equipmentNumber": "CH-03",
            "reportedFault": "Chute liner worn out",
            "urgency": 3,
            "workGroup": "Mechanical"
          }
        }
      ]
    }
    ```
*   **Response Structure (200 OK):**
    ```json
    {
      "data": [
        {
          "operationId": "client-uuid-99a22",
          "status": "SUCCESS",
          "result": {
            "id": "f892asd",
            "equipment": "Transfer Chute 3",
            "status": "Active"
          }
        }
      ]
    }
    ```
*   **Idempotency Guarantee:** Retrying an already successful `operationId` returns the cached successful result instead of duplicating the database entry. Failed sync submissions remain fully retryable.

---

## 4. Error Manifest Contract

All error payloads conform to a strict JSON layout:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message detail"
  }
}
```

### Standard Status Codes
*   **`200 OK`**: Standard success.
*   **`201 Created`**: Resource successfully created.
*   **`400 Bad Request`**: Malformed payload, structural validation failure (`VALIDATION_FAILED`).
*   **`401 Unauthenticated`**: Missing, invalid, or expired Bearer token (`UNAUTHENTICATED`).
*   **`403 Unauthorized`**: Authenticated user lacks permission / role claims (`UNAUTHORIZED`).
*   **`404 Not Found`**: Resource is missing or does not exist (`NOT_FOUND`).
*   **`409 Conflict / Invalid State Transition`**: State-machine transition out-of-order, or version conflict (`INVALID_STATE_TRANSITION`).
*   **`500 Internal Error`**: Server-side error (`INTERNAL_SERVER_ERROR`).
