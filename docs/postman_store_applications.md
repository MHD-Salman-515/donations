# Store Applications - Postman Guide (Phase 1)

Base URL examples assume `http://localhost:5000`.

## 1) Public: Submit Store Application

`POST /api/store-applications`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "store_name": "Green Basket Market",
  "owner_name": "Mona Ali",
  "phone": "+966500000000",
  "email": "owner@greenbasket.com",
  "city": "Riyadh",
  "business_category": "grocery",
  "description": "Neighborhood grocery store.",
  "donation_mode": "percentage",
  "donation_value": 5,
  "target_type": "campaign",
  "target_id": 12
}
```

Expected:
- `201`
- `{ ok: true, data, meta }`
- `data.applicant_user_id` is set automatically from authenticated user

## 2) Admin: List Applications

`GET /api/admin/store-applications?status=pending&city=Riyadh&business_category=grocery&q=green&page=1&limit=10`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200`
- paginated `{ ok, data, meta }`

## 3) Admin: Get Application by Id

`GET /api/admin/store-applications/:id`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200`
- `{ ok: true, data, meta: null }`

## 4) Admin: Approve Application

`PATCH /api/admin/store-applications/:id/approve`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{}
```

Expected:
- `200`
- `data.status = "approved"`
- `data.partner_id` is filled
- `data.reviewed_by` and `data.reviewed_at` are filled
- `data.partner` includes partner summary (`id`, `name`, `type`, `status`)

## 5) Admin: Reject Application

`PATCH /api/admin/store-applications/:id/reject`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "notes": "Missing business registration details."
}
```

Expected:
- `200`
- `data.status = "rejected"`
- `data.notes` contains rejection notes

## 6) Store: My Store Profile

`GET /api/store/profile`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200`
- `{ ok: true, data: { user, store }, meta: null }`
