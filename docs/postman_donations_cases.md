# Donations to Cases - Postman Guide

Base URL examples assume `http://localhost:5000`.

## 1) Donate to Case

`POST /api/donations`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "case_id": 12,
  "amount": 250,
  "payment_method": "card",
  "payment_status": "paid"
}
```

Expected:
- `201` with created donation containing `case_id`.

## 2) Negative: both campaign_id and case_id

`POST /api/donations`

```json
{
  "campaign_id": 3,
  "case_id": 12,
  "amount": 250,
  "payment_method": "card",
  "payment_status": "paid"
}
```

Expected:
- `400` message: exactly one of `campaign_id` or `case_id` is required.

## 3) Negative: neither campaign_id nor case_id

`POST /api/donations`

```json
{
  "amount": 250,
  "payment_method": "card",
  "payment_status": "paid"
}
```

Expected:
- `400`

## 4) Negative: case not found

`POST /api/donations`

```json
{
  "case_id": 999999,
  "amount": 250,
  "payment_method": "card",
  "payment_status": "paid"
}
```

Expected:
- `404` message: `case not found`

## 5) Negative: case not approved/active

`POST /api/donations`

```json
{
  "case_id": 12,
  "amount": 250,
  "payment_method": "card",
  "payment_status": "paid"
}
```

Expected:
- `400` if case status is not in `approved` or `active`.

## 6) My Donations (Donor)

`GET /api/donations/my?page=1&limit=10`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200` with paginated `data` + `meta`.
- Case donations include case fields (`case_title`, `case_type`, `case_status`).
- Campaign donations include campaign fields (`campaign_title`, `campaign_status`).

## 7) Admin: Case Donations

`GET /api/admin/cases/:id/donations?page=1&limit=10&from=2026-01-01&to=2026-12-31`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200` with paginated case donation list.
