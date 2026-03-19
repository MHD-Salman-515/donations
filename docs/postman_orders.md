# Orders + Automatic Donation - Postman Guide

Base URL examples assume `http://localhost:5000`.

## 1) Create Order

`POST /api/orders`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "product_id": 5,
  "quantity": 2
}
```

Expected:
- `201`
- `{ ok: true, data: { order, donation }, meta: null }`

## 2) My Orders

`GET /api/orders/my?page=1&limit=10`

Headers:
- `Authorization: Bearer <access_token>`

Expected:
- `200`
- paginated `{ ok, data, meta }`

