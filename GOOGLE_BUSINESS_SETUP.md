# Google Business Profile API Setup Guide

This guide will help you properly configure Google Business Profile APIs for your application.

## Prerequisites

1. A Google Cloud Console project
2. A Google Business Profile account
3. OAuth 2.0 credentials configured

## Required APIs

You **MUST** enable all 8 Google Business Profile APIs in your Google Cloud Console:

### Enable These APIs

Go to [Google Cloud Console API Library](https://console.cloud.google.com/apis/library) and enable:

1. **Google My Business API**
2. **My Business Account Management API**
3. **My Business Business Information API**
4. **My Business Lodging API**
5. **My Business Place Actions API**
6. **My Business Notifications API**
7. **My Business Verifications API**
8. **My Business Q&A API**

### How to Enable an API

1. Open the [API Library](https://console.cloud.google.com/apis/library)
2. Search for each API name listed above
3. Click on the API
4. Click the "Enable" button
5. Repeat for all 8 APIs

## Google Workspace Users

If you're using a Google Workspace account, you must ensure Google Business Profile is enabled for your organization:

1. Go to your Google Workspace Admin Console
2. Navigate to Apps > Google Workspace > Google Business Profile
3. Ensure it's turned **ON** for your organization

**Without this, you'll get a `403 PERMISSION_DENIED` error even with all APIs enabled.**

## OAuth Scopes

The application uses the following scope:
```
https://www.googleapis.com/auth/business.manage
```

This scope is already configured in the application.

## Common Issues

### 401 Unauthorized Error

**Cause:** Access token expired or invalid

**Solution:**
- The app should automatically refresh tokens
- Try disconnecting and reconnecting your Google account
- Check server logs for detailed error messages

### 403 Permission Denied Error

**Causes:**
1. Not all 8 APIs are enabled
2. Google Workspace - Business Profile is turned off
3. Your Google account doesn't have access to the Business Profile

**Solution:**
1. Enable all 8 APIs listed above
2. For Workspace users: Enable Business Profile in Admin Console
3. Ensure you're signed in with the correct Google account that owns the Business Profile

### 404 No Business Accounts Found

**Causes:**
1. You don't have a Google Business Profile yet
2. The authenticated account doesn't have access to any Business Profiles

**Solution:**
1. Create a Google Business Profile at https://business.google.com
2. Ensure the Google account you're connecting has Owner or Manager access to the Business Profile

## Testing Your Setup

1. Enable all 8 APIs in Google Cloud Console
2. Disconnect your Google account in the app (if already connected)
3. Reconnect your Google account
4. Try syncing your businesses

## Check Server Logs

If you're still having issues, check the server logs. The app provides detailed logging:

- Token refresh attempts
- API request URLs
- Detailed error responses from Google APIs

Look for logs starting with `[GMB]` for Business Profile related operations.

## Need Help?

- [Google Business Profile API Documentation](https://developers.google.com/my-business)
- [Google Business Profile Help](https://support.google.com/business)
- [Create a Business Profile](https://support.google.com/business/answer/2911778)
