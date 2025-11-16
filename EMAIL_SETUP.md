# Email Verification Setup for Wolt Branding

To customize email verification emails to use Wolt branding instead of Supabase default:

## Steps:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to: **Authentication** > **Email Templates**
4. Click on **Confirmation** template
5. Customize the following:
   - **Subject**: Change to something like "Verify your Wolt account"
   - **Sender name**: Change to "Wolt" or "Wolt Team"
   - **HTML content**: Update the email body with Wolt branding, logo, and styling
   - **Redirect URL**: Should already be set to your app URL

## Example Email Template Customization:

You can use HTML like this in the email template:

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #000; font-style: italic;">Wolt</h1>
  <p>Welcome to Wolt! Please verify your email address by clicking the link below:</p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #ff69b4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
    Verify Email
  </a>
  <p>If you didn't create an account with Wolt, you can safely ignore this email.</p>
</div>
```

## Note:

The email templates use Go template syntax. Use `{{ .ConfirmationURL }}` for the verification link.

