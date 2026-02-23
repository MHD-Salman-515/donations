# Cases Module Postman Checklist

Base URL examples assume local server `http://localhost:5000`.

## 1) Beneficiary: Create Case

`POST /api/cases`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "type": "medical",
  "title": "Kidney surgery support",
  "description": "Urgent support request for surgery and recovery.",
  "category": "health",
  "target_amount": 15000,
  "currency": "USD",
  "status": "draft",
  "priority": "normal",
  "privacy_mode": "masked",
  "masked_display": {
    "alias_name": "Case M-1001",
    "hide_images": true
  },
  "location": {
    "coordinates": [46.6753, 24.7136],
    "city": "Riyadh",
    "area": "North",
    "address_text": "Near district clinic"
  },
  "start_date": "2026-02-01T00:00:00.000Z",
  "end_date": "2026-08-01T00:00:00.000Z"
}
```

## 2) Beneficiary: Update Case

`PUT /api/cases/:id`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "description": "Updated medical details.",
  "target_amount": 18000,
  "priority": "high"
}
```

## 3) Beneficiary: Submit Case

`POST /api/cases/:id/submit`

Headers:
- `Authorization: Bearer <access_token>`

## 4) Beneficiary: My Cases

`GET /api/cases/my?page=1&limit=10&status=submitted`

Headers:
- `Authorization: Bearer <access_token>`

## 5) Beneficiary: Upload Case Document

`POST /api/cases/:id/documents`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "type": "medical_report",
  "file_url": "https://cdn.example.com/files/report-1.pdf",
  "mime_type": "application/pdf",
  "size_bytes": 240123
}
```

## 6) Admin: List Cases

`GET /api/admin/cases?page=1&limit=10&status=submitted&type=medical&priority=high&beneficiary_id=2&q=surgery&from=2026-01-01&to=2026-12-31`

Headers:
- `Authorization: Bearer <access_token>`

## 7) Admin: Change Case Status

`PATCH /api/admin/cases/:id/status`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Approve:
```json
{ "status": "approved" }
```

Reject:
```json
{ "status": "rejected", "rejection_reason": "Missing valid documentation." }
```

## 8) Admin: Change Case Priority

`PATCH /api/admin/cases/:id/priority`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{ "priority": "urgent" }
```

## 9) Admin: Verify Case Document

`PATCH /api/admin/case-documents/:docId/verify`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{ "verified": true }
```

## 10) Admin: Add Case Update

`POST /api/admin/cases/:id/updates`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "kind": "monthly_report",
  "content": "Monthly visit completed. Patient condition improved.",
  "media_urls": [
    "https://cdn.example.com/files/monthly-1.jpg"
  ]
}
```

## 11) Public: List Cases

`GET /api/public/cases?page=1&limit=10&type=medical&category=health&city=Riyadh&priority=high&q=surgery`

## 12) Public: Case Detail

`GET /api/public/cases/:id`

## 13) Public: Cases Map (bbox)

`GET /api/public/cases/map?minLng=46.4&minLat=24.5&maxLng=46.9&maxLat=24.9`

## 14) Public: Cases Map (center/radius)

`GET /api/public/cases/map?centerLng=46.6753&centerLat=24.7136&radiusKm=25`
