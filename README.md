# SendShare

A secure, enterprise-grade file sharing application built with React, TypeScript, and Azure Blob Storage.

## Features

- 🔒 **Password Protection** - Secure your transfers with optional password encryption
- 📦 **Bulk Downloads** - Download all files as a single ZIP archive
- 📧 **Email Notifications** - Send transfer links directly to recipients
- 🔐 **256-bit Encryption** - Enterprise-grade security powered by Azure
- ♾️ **Unlimited File Size** - No restrictions on file sizes
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🌙 **Dark Mode** - Beautiful dark theme for comfortable viewing

## Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Router

**Backend:**
- Node.js
- Express
- TypeScript
- Azure Blob Storage
- Nodemailer (email)
- bcryptjs (password hashing)
- archiver (ZIP generation)

## Prerequisites

- Node.js 18+ and npm
- Azure Storage Account
- Gmail account (for email notifications)

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd SendShare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `AZURE_STORAGE_ACCOUNT_NAME` - Your Azure Storage account name
   - `AZURE_STORAGE_KEY` - Your Azure Storage account key
   - `EMAIL_USER` - Your Gmail address
   - `EMAIL_PASS` - Gmail app-specific password

4. **Start development servers**
   
   Terminal 1 (Backend):
   ```bash
   npm run dev:server
   ```

   Terminal 2 (Frontend):
   ```bash
   npm run dev:client
   ```

5. **Open the application**
   
   Navigate to `http://localhost:8080`

## Usage

### Uploading Files

1. Click "Add files" or "Add folders" to select files
2. (Optional) Enter recipient email
3. (Optional) Add a message
4. (Optional) Set a password to protect the transfer
5. Click "Transfer" to upload

### Sharing Files

- Copy the generated share link
- Send it to your recipients
- If password-protected, share the password securely

### Downloading Files

- Open the share link
- Enter password if required
- Download individual files or all files as ZIP

## Project Structure

```
SendShare/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   └── lib/               # Utilities
├── server/                # Backend source
│   ├── index.ts           # Express server
│   ├── storage.ts         # Azure Blob Storage logic
│   ├── email.ts           # Email functionality
│   ├── zip.ts             # ZIP generation
│   └── sasToken.ts        # SAS token generation
└── public/                # Static assets
```

## Building for Production

```bash
npm run build
```

This creates optimized builds in:
- `dist/` - Frontend build
- `server/` - Backend (already TypeScript compiled)

## Environment Variables

See `.env.example` for all required environment variables.

## Security Features

- Password hashing with bcrypt (10 rounds)
- SAS tokens for secure Azure Blob access
- Password metadata stored separately from files
- Server-side password validation
- HTTPS recommended for production

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
