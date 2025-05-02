# 🔐 Password Reset Email Service

A secure Node.js application for user authentication, password resets via email (Resend), and MongoDB storage. Built with Express, JWT, and Resend for modern transactional email delivery.

---

## ✨ Features

- User **signup**, **login**, and **JWT authentication**
- **Password reset** flow with secure token links
- **Email sending** powered by [Resend](https://resend.com)
- **Rate limiting** on reset requests (max 3/hour)
- **Audit logging** of reset attempts (including failures)
- HTML UI for request, reset, login, signup
- MongoDB with unique user constraint

---

## 🚀 Getting Started

### 1. Clone the project

```bash
git clone https://github.com/your-user/password-reset-service.git
cd password-reset-service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file:

```env
PORT=3000
BASE_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb://localhost:27017

# JWT
JWT_SECRET=your_super_secret_key

# Resend (https://resend.com)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM=you@yourdomain.com
```

> ⚠️ Your `RESEND_FROM` address must be verified in your Resend dashboard.

### 4. Run the server

```bash
npm start
```

---

## 🌐 Available Routes

| Route                       | Method | Description                       |
|----------------------------|--------|-----------------------------------|
| `/signup`                  | GET/POST | User registration                |
| `/login`                   | GET/POST | User login                        |
| `/request-reset`           | GET    | Password reset request form       |
| `/request-password-reset`  | POST   | Sends email with reset token      |
| `/reset-password.html?token=...` | GET | Enter new password              |
| `/reset-password`          | POST   | Accepts new password              |
| `/profile`                 | GET    | Protected profile page            |

---

## 🧪 Example Workflow

1. Register at `/signup`
2. Login at `/login` (get JWT token)
3. Go to `/request-reset`, enter your email
4. Click the link in your email
5. Enter a new password at `/reset-password`
6. Log in again with your new password

---

## ✅ Security Notes

- Passwords are hashed using `bcrypt`
- JWT tokens expire in 15–60 minutes
- Email reset tokens are one-time use and expire quickly
- All reset attempts are logged in `reset_logs`

---


## 📬 Email Service: Resend

 [Resend](https://resend.com) for reliable, developer-friendly email delivery. Sign up and verify your domain to start sending emails.


