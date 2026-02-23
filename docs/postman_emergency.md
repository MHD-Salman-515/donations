# Emergency Fund - Postman Guide

Base URL examples assume `http://localhost:5000`.

## 1) Public Emergency Fund

`GET /api/public/emergency`

Expected:
- `200` with `{ data, meta }`.

## 2) Donor: Donate to Emergency Fund

`POST /api/emergency/donate`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "amount": 120,
  "payment_method": "card",
  "payment_status": "paid",
  "emergency_id": 1
}
```

Expected:
- `201` with donation in `{ data, meta }`.

## 3) Donor: My Emergency Donations

`GET /api/emergency/my?page=1&limit=10&from=2026-01-01&to=2026-12-31`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200` paginated `{ data, meta }`.

## 4) Admin: Get Emergency Fund

`GET /api/admin/emergency`

Headers:
- `Authorization: Bearer <access_token>`

## 5) Admin: Update Emergency Fund

`PUT /api/admin/emergency`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "enabled": true,
  "title": "Emergency Relief Fund",
  "description": "Emergency support for urgent incidents.",
  "target_amount": 250000,
  "currency": "USD",
  "start_date": "2026-01-01T00:00:00.000Z",
  "end_date": "2026-12-31T00:00:00.000Z"
}
```

## 6) Admin: Emergency Donations List

`GET /api/admin/emergency/donations?page=1&limit=10&from=2026-01-01&to=2026-12-31`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200` paginated `{ data, meta }`.

## 7) Cross-check Generic Donations Endpoint

`POST /api/donations`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body (emergency target):
```json
{
  "emergency_id": 1,
  "amount": 80,
  "payment_method": "cash",
  "payment_status": "paid"
}
```

Negative tests:
- Provide more than one target among `campaign_id`, `case_id`, `emergency_id` => `400`
- Provide no target => `400`
- Emergency fund disabled => `400`
