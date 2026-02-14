# Locomo - AI-Powered Marketing Platform

A comprehensive platform to help local businesses improve their Google My Business profile visibility, manage reviews, and create effective posts without requiring marketing expertise.

## Features

### User Features
- **OTP-based Authentication** - Secure phone number-based login with OTP verification
- **Google OAuth Integration** - Connect Google My Business accounts seamlessly
- **Google Health Score** - Real-time profile health scoring (0-100) with actionable recommendations
- **Review Management** - View all reviews with AI-generated reply suggestions
- **Post Creator** - AI-powered post generation for Google Business Profile
- **Keyword Planner** - Get AI-generated keyword suggestions based on business category
- **Business Profile Editor** - Edit business information, hours, and attributes
- **Analytics Dashboard** - Track views, calls, directions, and website clicks
- **Event Management** - Create and manage business events

### Admin Features
- **User Management** - View and manage all platform users
- **Platform Analytics** - Monitor user engagement and system health
- **User Impersonation** - View dashboard as any user for support purposes
- **Audit Logs** - Track all admin actions for security

## Tech Stack

- **Frontend**: Next.js 13 (App Router), React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT tokens with OTP verification
- **AI**: OpenAI API (for review replies, post generation, keywords)
- **Google Integration**: OAuth 2.0, Google Business Profile API
- **SMS**: Twilio (for OTP delivery)
- **Charts**: Recharts

## Prerequisites

Before setting up the project, ensure you have:

1. Node.js 18+ installed
2. A Supabase account and project
3. Google Cloud Console project with OAuth credentials
4. Twilio account for SMS (optional for demo)
5. OpenAI API key (optional for demo)

## Setup Instructions

### 1. Database Setup

The database schema is already created via Supabase migrations. The following tables are included:

- users - User accounts and authentication
- otp_verifications - OTP codes for phone verification
- google_accounts - Google OAuth tokens
- businesses - Google Business Profile data
- reviews - Customer reviews and AI-generated replies
- posts - Business posts and content
- analytics - Performance metrics
- health_scores - Google Health Score calculations
- events - Business events
- keywords - Keyword suggestions
- admin_audit_logs - Admin action tracking

### 2. Environment Variables

Update the `.env` file with your credentials:

```env
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Authentication
JWT_SECRET=your-secret-key-change-in-production

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Twilio (for OTP)
NEXT_PUBLIC_TWILIO_ACCOUNT_SID=your-twilio-account-sid
NEXT_PUBLIC_TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Business Profile API
   - Google OAuth2 API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/api/google/callback`
5. Copy Client ID and Client Secret to `.env`

### 4. Twilio Setup (Optional)

1. Sign up at [Twilio](https://www.twilio.com/)
2. Get a phone number with SMS capabilities
3. Copy Account SID, Auth Token, and Phone Number to `.env`

Note: For development, the OTP is logged to the console when sent.

### 5. OpenAI Setup (Optional)

1. Sign up at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Copy to `.env`

Note: A basic fallback AI reply generator is included if OpenAI is not configured.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## Building for Production

```bash
npm run build
npm run start
```

## User Flow

### First-Time User
1. Visit the site and get redirected to `/login`
2. Enter phone number
3. Receive OTP via SMS (or see it in console logs during development)
4. Enter OTP to authenticate
5. Get redirected to `/google-connect`
6. Click "Connect with Google"
7. Authorize Google Business Profile access
8. Get redirected to `/dashboard` with full access

### Returning User
1. Visit the site
2. Enter phone number and OTP
3. Automatically redirected to dashboard

### Admin User
1. Create an admin user by updating the `role` field to 'admin' in the Supabase `users` table
2. Login normally
3. Access `/admin` from the sidebar

## Key Features Implemented

### Authentication System
- Phone number-based OTP login
- JWT token management
- Secure cookie-based sessions
- 5-minute OTP expiration
- Rate limiting on OTP attempts

### Google Integration
- OAuth 2.0 flow
- Token refresh mechanism
- Business profile data fetching
- Review synchronization (ready for API integration)

### Dashboard Features
- **Health Score Widget**: Shows overall profile health with breakdown
- **Statistics Cards**: Display key metrics (views, calls, ratings)
- **Action Items**: Prioritized improvement suggestions
- **Recent Reviews**: Quick view of latest customer feedback

### Review Management
- List all reviews with filters (all/pending/replied)
- AI-generated reply suggestions
- Edit and post replies
- Sentiment analysis indicators
- Response rate tracking

### Content Creation
- Post composer with AI assistance
- Draft, scheduled, and published post management
- Post performance tracking
- Image upload support (UI ready)

### Keywords
- AI-generated keyword suggestions
- Search volume and competition data
- Relevance scoring
- Usage recommendations

### Analytics
- Line charts for views and searches
- Bar charts for customer actions
- Top search queries
- 7-day trend analysis

### Admin Dashboard
- User management table
- Platform statistics
- Activity monitoring
- System health status

## Security Features

- Row Level Security (RLS) on all database tables
- JWT token authentication
- HTTP-only cookies
- CSRF protection ready
- Input validation
- Encrypted token storage in database
- Admin-only routes protection

## API Routes

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Google Integration
- `GET /api/google/auth-url` - Get OAuth authorization URL
- `GET /api/google/callback` - Handle OAuth callback
- `GET /api/google/check-connection` - Check if Google account is connected

### AI Features
- `POST /api/ai/generate-reply` - Generate AI review reply

## Development Notes

- Mock data is used in some pages for demonstration (reviews, analytics, posts)
- Google Business Profile API integration is structured but requires actual API calls
- Twilio integration logs to console in development mode
- AI features have fallback logic if OpenAI is not configured

## Future Enhancements

1. **Real Google API Integration**: Connect to actual Google Business Profile API
2. **Twilio SMS Integration**: Implement actual SMS sending
3. **OpenAI Integration**: Connect to OpenAI for better AI responses
4. **PDF Report Generation**: Implement health score PDF export
5. **Photo Upload**: Implement actual file upload with cloud storage
6. **Scheduled Posts**: Background job system for scheduled posts
7. **Email Notifications**: Add email notification system
8. **Multi-location Support**: Handle businesses with multiple locations
9. **Advanced Analytics**: More detailed insights and reports
10. **Mobile App**: React Native mobile application

## Troubleshooting

### Build Errors
If you encounter build errors related to Progress component, ensure you're using the SimpleProgress component instead of the Radix UI Progress component.

### Authentication Issues
- Check that JWT_SECRET is set in `.env`
- Verify Supabase credentials are correct
- Check browser console for detailed error messages

### Google OAuth Issues
- Verify redirect URI matches exactly in Google Cloud Console
- Check that required APIs are enabled
- Ensure credentials are copied correctly to `.env`

## Support

For issues or questions, check:
1. Console logs for detailed error messages
2. Supabase dashboard for database errors
3. Network tab for API request failures

## License

Private - All rights reserved
