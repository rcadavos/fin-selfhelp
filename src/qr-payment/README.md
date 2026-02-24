# QR code for payments (QR PH / UnionBank)

Put your **UnionBank QR code image** here so customers can scan it on the payment page.  
This folder is **not** in `public`, so the image is only served through the app (via the payment page).

## What to do

1. Save your UnionBank QR code as an image (PNG or JPG).
2. Name the file exactly: **`unionbank-qr.png`** (or **`unionbank-qr.jpg`**).
3. Place it in this folder: **`src/qr-payment/`**

The payment page will show this image in the “Pay with QR PH” section so users can scan it to pay you.

## Allowed filenames

- `unionbank-qr.png` (recommended)
- `unionbank-qr.jpg`

Only one file is used; PNG is checked first.
