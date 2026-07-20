# KGS Music Academy - Management Portal

Welcome to the **KGS Music Academy** management system. This application is designed to manage student enrollment, track musical progress, and send notifications.

---

## One-Click Launch

The portal can be started without using any complicated commands.

### For Mac Users
1. Open the project folder in **Finder**.
2. Double-click the file named **`Launch Academy.command`**.
3. A window will open, and your web browser will automatically load the academy portal.
   - *Note: If macOS blocks it, right-click the file and choose 'Open'.*

### For Windows Users
1. Open the project folder.
2. Double-click the file named **`Launch Academy.bat`**.
3. The management portal will start and open in your default browser.

---

## Features for Staff & Admins

### 1. Student Management
- **Add Students**: Register new students with their instrument, joining date, and parent contact details.
- **Edit Details**: Update student information at any time.
- **Mobile Numbers**: Parent phone numbers are automatically prefixed with `+91` for convenience.

### 2. Progress Tracking
- Update **Theory** and **Practical** grades for each student.
- Assign status levels like **Excellent**, **Good**, or **Needs Improvement**.
- Write personalized **Instructor Notes** for parents to see.

### 3. Notifications
- Manage your own notification preferences (Email/Push) in the **Profile > Notifications** section.
- The system ensures parents stay updated on their child's musical journey.

---

## Troubleshooting

- **Browser not opening?** Ensure you have a stable internet connection and that the terminal/command window stays open.
- **Login Issues?** Make sure you are using the official academy credentials. If you forget your password, use the "Forgot Password" link on the login screen.

---

## Technical Setup (For Developers)

If you are a developer and want to modify the code, please refer to the technical sections below.

### Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Icons**: Lucide React
- **Styling**: Vanilla React Native StyleSheet

### Environment Variables
Ensure you have a `.env` file with the following Firebase credentials:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
...
```

### Building for Android
To generate a new APK:
1. Run `npx expo prebuild`
2. Run `cd android && ./gradlew assembleRelease`
3. The APK will be in `android/app/build/outputs/apk/release/`

---

Built for KGS Music Academy.
