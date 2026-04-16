# User Management API

Base URL: `http://localhost:8123/api`

All responses are wrapped in a `BaseResponse` envelope with `code`, `message`, and `data` fields.

---

## Response Format

Every API response follows this structure:

| Field | Type | Description |
|-------|------|-------------|
| `code` | int | `0` means success; non-zero means error |
| `message` | string | Human-readable status message |
| `data` | object/null | Response payload (absent on errors) |

### Success Example

```json
{
  "code": 0,
  "message": "OK",
  "data": { ... }
}
```

### Error Example

```json
{
  "code": 40101,
  "message": "Account does not exist",
  "data": null
}
```

---

## Data Models

### User Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | long | Auto-generated primary key, globally unique |
| `account` | string | Login account name; must be unique across the system |
| `username` | string | Display name shown in the UI; can be changed |
| `password` | string | Encrypted (hashed) password; **never returned** by any API |
| `userRole` | string | Role identifier: `"user"` (default) or `"admin"` |
| `createTime` | datetime | When the account was registered |
| `updateTime` | datetime | When the profile was last modified |
| `isDelete` | int | Soft-delete flag: `0` = active, `1` = deleted (never returned by normal queries) |

### UserRegisterRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | string | Yes | Desired login account name |
| `username` | string | Yes | Display name |
| `password` | string | Yes | Plain-text password (min. length enforced server-side) |
| `confirmPassword` | string | Yes | Must match `password` exactly |

### UserLoginRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `account` | string | Yes | Account name |
| `password` | string | Yes | Plain-text password |

### UserUpdateRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | New display name |

### UserUpdatePasswordRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `oldPassword` | string | Yes | Current password for verification |
| `newPassword` | string | Yes | New password (replaces `oldPassword`) |

### UserVO (view object — returned by `/user/me`)

| Field | Type | Description |
|-------|------|-------------|
| `id` | long | User ID |
| `account` | string | Account name |
| `username` | string | Display name |
| `userRole` | string | Role (`"user"` or `"admin"`) |
| `createTime` | datetime | Registration timestamp |

### UserLoginVo (login response payload)

| Field | Type | Description |
|-------|------|-------------|
| `id` | long | User ID |
| `username` | string | Display name |
| `token` | string | JWT or session token; send as `Authorization: Bearer <token>` header on subsequent requests |

---

## Endpoints

---

### 1. Register

Register a new user account.

**HTTP Method:** `POST`  
**Path:** `/user/register`  
**Authentication:** None

#### Request Body

```json
{
  "account": "alice_dev",
  "username": "Alice Chen",
  "password": "Str0ng!Pass",
  "confirmPassword": "Str0ng!Pass"
}
```

#### Success Response

```json
{
  "code": 0,
  "message": "OK",
  "data": 1879200000000001
}
```

`data` is the newly created user's `id`.

#### Error Responses

| code | Scenario |
|------|----------|
| 40101 | Account already exists |
| 40102 | Passwords do not match |
| 40100 | Account or password is empty |

---

### 2. Login

Authenticate with account credentials and receive a session token.

**HTTP Method:** `POST`  
**Path:** `/user/login`  
**Authentication:** None

#### Request Body

```json
{
  "account": "alice_dev",
  "password": "Str0ng!Pass"
}
```

#### Success Response

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 1879200000000001,
    "username": "Alice Chen",
    "token": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

Store the `token` value and include it in the `Authorization` header for all subsequent authenticated requests.

#### Error Responses

| code | Scenario |
|------|----------|
| 40101 | Account does not exist |
| 40102 | Wrong password |

---

### 3. Logout

End the current session. Currently the client is expected to discard its local token; no server-side token invalidation is performed.

**HTTP Method:** `POST`  
**Path:** `/user/logout`  
**Authentication:** Required

#### Request

No request body.

#### Success Response

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### 4. Get Current User (`/me`)

Retrieve the profile of the currently authenticated user.

**HTTP Method:** `GET`  
**Path:** `/user/me`  
**Authentication:** Required

#### Request

No parameters.

#### Success Response

```json
{
  "code": 0,
  "message": "OK",
  "data": {
    "id": 1879200000000001,
    "account": "alice_dev",
    "username": "Alice Chen",
    "userRole": "user",
    "createTime": "2026-03-15 10:30:00"
  }
}
```

#### Error Responses

| code | Scenario |
|------|----------|
| 40100 | Not logged in / token missing or invalid |

---

### 5. Update Profile

Update the display name of the currently authenticated user.

**HTTP Method:** `POST`  
**Path:** `/user/update`  
**Authentication:** Required

#### Request Body

```json
{
  "username": "Alice Chen (Work)"
}
```

#### Success Response

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

---

### 6. Update Password

Change the current user's password.

**HTTP Method:** `POST`  
**Path:** `/user/password/update`  
**Authentication:** Required

#### Request Body

```json
{
  "oldPassword": "Str0ng!Pass",
  "newPassword": "N3wStr0ng!Pass"
}
```

#### Success Response

```json
{
  "code": 0,
  "message": "OK",
  "data": true
}
```

#### Error Responses

| code | Scenario |
|------|----------|
| 40102 | Old password is incorrect |

---

## Authentication

All endpoints marked **Required** expect a valid token in the request header:

```
Authorization: Bearer <token>
```

The token is obtained from the `/user/login` response's `data.token` field.

## Error Codes Summary

| code | Meaning |
|------|---------|
| `0` | Success |
| `40100` | Account or password empty / not authenticated |
| `40101` | Account not found or already exists |
| `40102` | Password mismatch or incorrect |
