# Store Products - Postman Guide

Base URL examples assume `http://localhost:5000`.

## 1) Store: Create Product

`POST /api/store/products`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "title": "Family Grocery Box",
  "description": "Weekly essentials package.",
  "price": 45,
  "cost_price": 30,
  "stock": 20,
  "image_url": "https://cdn.example.com/store/box-1.jpg",
  "donation_mode": "inherit"
}
```

For custom donation mode:
```json
{
  "title": "Premium Box",
  "price": 80,
  "cost_price": 50,
  "stock": 10,
  "donation_mode": "custom",
  "donation_type": "percentage",
  "donation_value": 10,
  "target_type": "campaign",
  "target_id": 12
}
```

## 2) Store: My Products

`GET /api/store/products/my?page=1&limit=10`

Headers:
- `Authorization: Bearer <access_token>`

## 3) Store: Product By Id

`GET /api/store/products/:id`

Headers:
- `Authorization: Bearer <access_token>`

## 4) Store: Update Product

`PUT /api/store/products/:id`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{
  "title": "Family Grocery Box (Updated)",
  "stock": 0,
  "price": 47
}
```

## 5) Store: Product Status

`PATCH /api/store/products/:id/status`

Headers:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

Body:
```json
{ "status": "inactive" }
```

## 6) Public: List Active Store Products

`GET /api/public/store-products?page=1&limit=10&q=box&city=Riyadh&business_category=grocery&donation_mode=inherit&min_price=10&max_price=100`

## 7) Public: Active Product By Id

`GET /api/public/store-products/:id`

