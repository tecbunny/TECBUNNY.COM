# Payment API Management - COD & UPI Configuration

## Update Summary (October 4, 2025)

### ✅ Added: Cash on Delivery (COD) Configuration

**New Features:**
- Enable/Disable COD payment option
- Set minimum order amount for COD
- Set maximum order amount for COD
- Custom instructions for customers

**Configuration Fields:**
- **Minimum Order Amount**: Optional minimum cart value for COD orders
- **Maximum Order Amount**: Optional maximum cart value for COD orders (useful for risk management)
- **Instructions**: Custom message shown to customers during checkout

**Use Cases:**
- Set minimum ₹500 for COD to reduce small orders
- Set maximum ₹50,000 for COD to manage cash handling risk
- Add instructions like "Please keep exact change ready"

---

### ✅ Added: UPI/QR Code Payment Configuration

**New Features:**
- Enable/Disable UPI payment option
- Configure UPI ID for receiving payments
- Set account holder name
- Custom payment instructions

**Configuration Fields:**
- **UPI ID**: Your payment UPI ID (e.g., `tecbunny@paytm`, `9876543210@ybl`)
- **Account Holder Name**: Business name that appears on UPI
- **Instructions**: Guide customers on how to complete payment

**Use Cases:**
- Accept manual UPI payments
- Show QR code during checkout
- Request payment screenshots for verification
- Instructions like "Scan QR code and share transaction ID"

---

## Technical Changes

### Files Modified:

**1. `src/hooks/use-payment-methods.ts`**
- Added new config properties to `PaymentMethod` interface:
  - `minOrderAmount`, `maxOrderAmount`, `instructions` (for COD)
  - `upiId`, `upiName` (for UPI)

**2. `src/app/management/admin/payment-api/admin-payment-api.tsx`**
- Added `cod` and `upi` to form state
- Added `cod` and `upi` to saving states
- Added handler functions:
  - `handleSaveCOD()`
  - `handleSaveUPI()`
- Added UI cards for COD and UPI configuration
- Imported `Textarea` component for multi-line instructions

**3. `src/app/api/admin/payment-settings/route.ts`**
- Already supports COD and UPI in default settings
- Will save/retrieve configuration from database

---

## How to Use

### 1. Access Payment API Settings
Visit: `https://tecbunny.com/management/admin/payment-api`

### 2. Configure Cash on Delivery (COD)

**Enable COD:**
1. Toggle "Enable Cash on Delivery" switch
2. Set minimum order amount (optional)
   - Example: `500` (requires minimum ₹500 order)
3. Set maximum order amount (optional)
   - Example: `50000` (max ₹50,000 for COD)
4. Add customer instructions
   - Example: "Please keep exact change ready. Our delivery partner will collect payment upon delivery."
5. Click "Save COD Settings"

**Best Practices:**
- Set minimum amount to reduce handling costs
- Set maximum amount to manage risk
- Provide clear instructions about payment collection

### 3. Configure UPI Payments

**Enable UPI:**
1. Toggle "Enable UPI Payments" switch
2. Enter your UPI ID
   - Example: `tecbunny@paytm` or `9876543210@ybl`
3. Enter account holder name
   - Example: "TecBunny Solutions"
4. Add payment instructions
   - Example: "Scan the QR code using any UPI app and complete the payment. Share the transaction screenshot or transaction ID with us for order confirmation."
5. Click "Save UPI Settings"

**Best Practices:**
- Use business UPI ID for credibility
- Provide clear payment verification steps
- Request transaction ID/screenshot for order processing

---

## Payment Flow

### COD Payment Flow:
1. Customer selects "Cash on Delivery" at checkout
2. System validates order amount (min/max limits)
3. Shows instructions to customer
4. Order placed with payment status: "Pending (COD)"
5. Payment collected by delivery partner
6. Admin marks order as paid after delivery

### UPI Payment Flow:
1. Customer selects "UPI/QR Code" at checkout
2. System displays QR code and UPI ID
3. Shows payment instructions
4. Customer completes payment via UPI app
5. Customer shares transaction ID/screenshot
6. Admin verifies payment and confirms order

---

## Database Storage

Configuration is saved in `public.settings` table:
- Key: `payment_cod` or `payment_upi`
- Value: JSONB containing all configuration

Example COD settings:
```json
{
  "id": "cod",
  "name": "Cash on Delivery",
  "type": "offline",
  "enabled": true,
  "config": {
    "minOrderAmount": "500",
    "maxOrderAmount": "50000",
    "instructions": "Please keep exact change ready..."
  }
}
```

Example UPI settings:
```json
{
  "id": "upi",
  "name": "UPI/QR Code",
  "type": "offline",
  "enabled": true,
  "config": {
    "upiId": "tecbunny@paytm",
    "upiName": "TecBunny Solutions",
    "instructions": "Scan QR code and share transaction ID..."
  }
}
```

---

## UI Preview

The Payment API management page now shows:

**Online Payment Gateways:**
1. Razorpay
2. Stripe
3. PhonePe
4. Paytm
5. Cashfree

**Offline Payment Methods:**
6. **Cash on Delivery (COD)** ✨ NEW
   - Enable/Disable toggle
   - Min/Max amount fields
   - Instructions textarea

7. **UPI/QR Code Payment** ✨ NEW
   - Enable/Disable toggle
   - UPI ID input
   - Account name input
   - Instructions textarea

---

## Validation

**COD:**
- Min/Max amounts are optional (numeric)
- If both set, max must be greater than min (frontend validation recommended)
- Instructions can be empty

**UPI:**
- UPI ID format validation recommended (e.g., `name@bank`)
- Account name required if UPI enabled
- Instructions can be empty

---

## Next Steps (Optional Enhancements)

**COD Enhancements:**
- Add COD fee/charges configuration
- Add region-based COD availability
- Add automatic COD verification on delivery

**UPI Enhancements:**
- QR code generation from UPI ID
- Automatic payment verification via UPI API
- Transaction ID validation

---

## Testing

**Test COD Configuration:**
1. Set min amount: 500, max amount: 50000
2. Try checkout with ₹300 cart - should not allow COD
3. Try checkout with ₹1000 cart - should show COD option
4. Try checkout with ₹60000 cart - should not allow COD
5. Verify instructions appear during checkout

**Test UPI Configuration:**
1. Set UPI ID and account name
2. Visit checkout page
3. Select UPI payment
4. Verify QR code/UPI ID is displayed
5. Verify instructions appear correctly

---

## Deployment

Changes are code-level only, no database migration needed:

```bash
# Deploy to production
vercel --prod
```

The `settings` table already exists, so COD and UPI configuration will be stored automatically when you save.

---

**✅ COD and UPI payment configuration is now available in your admin panel!**
