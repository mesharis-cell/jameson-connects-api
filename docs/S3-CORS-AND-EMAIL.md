# S3 CORS and email setup

## Why you see "blocked by CORS policy" and "Network error - saving offline"

The kiosk app runs in the **browser** (e.g. `http://localhost:5173`). When you click **Save** on the Review screen, it:

1. Asks this API for a presigned S3 URL
2. Sends a **PUT request from the browser directly to S3** to upload the recording file

That second step is a **cross-origin** request (from localhost:5173 to your bucket, e.g. `jam0036-jameson-recording.s3.me-south-1.amazonaws.com`). By default, S3 does not send `Access-Control-Allow-Origin`, so the browser blocks the response and you see:

- `Access to XMLHttpRequest at 'https://jameson-recordings.s3...' from origin 'http://localhost:5173' has been blocked by CORS policy`
- `Network error - saving offline`

This is **not** a download on the success screen. It is the **upload to S3** that fails, so the recording is never uploaded and the flow falls back to "saving offline."

### Fix: Add CORS to your S3 bucket

1. Open **AWS Console** → **S3** → bucket **jam0036-jameson-recording** (region **me-south-1**).
2. Go to the **Permissions** tab.
3. Scroll to **Cross-origin resource sharing (CORS)** and edit.
4. Paste a configuration that allows your kiosk origin and PUT. Example:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:3000"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

5. When you deploy the kiosk to a real URL, add that origin to `AllowedOrigins` (e.g. `https://kiosk.yourdomain.com`).
6. Save. After this, the browser will allow the PUT from your kiosk and the upload (and then email) will succeed.

---

## Why you didn’t receive the email

### 1. Upload fails first (CORS)

If the S3 upload is blocked by CORS (as above), the kiosk never gets a successful upload and does not call the send-email endpoint. Fix CORS so upload succeeds.

### 2. Resend: "You can only send testing emails to your own email address" (403)

Your Resend API key is in **testing mode**. In that mode you can **only** send to the email that owns the Resend account (e.g. `meshari.s@homeofpmg.com`). Sending to any other address returns **403**.

**To send to any recipient (e.g. kiosk users):** Go to [resend.com/domains](https://resend.com/domains), **verify a domain**, and set **FROM_EMAIL** in `.env` to an address on that domain (e.g. `noreply@yourcompany.com`).

**For quick testing:** Use the Resend account owner's email in the kiosk registration form so the "to" address is allowed.

### 3. Resend: "Invalid `to` field" (422)

The email from the form must be a valid format (`name@domain.tld`). Values like `fd@dsa.ds` or `sd@jdk.ckj` are rejected. Use a proper email in the registration form.

### 4. General Resend checks

- **FROM_EMAIL** in `.env` must be a verified sender (e.g. `onboarding@resend.dev` for testing, or an address on a verified domain).
- Check the API terminal for `[send-email] Sending recording to ...` and any Resend error output.
- Check spam/junk and that the recipient address is correct.

After fixing CORS and Resend, try Save again and watch the API logs.
