# Task 1: API Reasoning

## 1. Validation

### Data Validation
- `userId` must be provided (required), must be an integer, and must be greater than 0
- `items` must be provided, must be an array, and must not be empty  
- Each item must contain:
  - `productId` (required, must be a number)
  - `quantity` (required, must be a number greater than 0)

### Business Logic Validation

#### User validation
- User must exist in the database  
- User must be allowed to place orders (e.g., not banned, suspended or deleted)
- User may need a verified email or completed profile before placing orders

#### Product validation
- Each product must exist  
- Each product must be active (not discontinued)  
- Each product must have valid pricing
- Requested quantity must not exceed available stock  
- Duplicate products in the items list should be prevented 


## 2. Possible Errors

- User not found
- Malformed JSON (request cannot be parsed) 
- Invalid request body (missing fields or wrong data types)  
- Product not found  
- Insufficient stock  
- Quantity is zero or negative  
- Items array is empty  
- User not authorized to place orders  
- Product is inactive or discontinued  
- Duplicate product entries causing inconsistencies  
- Database or transaction failure  

## 3. HTTP Responses

- **201 Created**  
  Returned when the order is successfully created. This indicates a new resource has been created.

- **400 Bad Request**  
  Returned when the request body is invalid (e.g., missing fields, incorrect data types, invalid values).

- **404 Not Found**  
  Returned when a referenced resource (such as a product) does not exist.

- **500 Internal Server Error**  
  Returned when an unexpected error occurs on the server (e.g., database failure).
