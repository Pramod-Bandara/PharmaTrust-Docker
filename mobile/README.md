# PharmaTrust Mobile App

React Native mobile application for verifying medicine batch authenticity using QR code scanning.

## 📱 Features

- **QR Code Scanning**: Scan medicine batch QR codes using device camera
- **Real-time Verification**: Instant batch authenticity and quality checks
- **Batch Details**: View comprehensive information about medicine batches
- **Cross-platform**: Works on iOS and Android devices
- **Offline-ready**: Core functionality available without internet (coming soon)

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- **Expo Go app** on your mobile device (recommended for testing)
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **Optional**: iOS Simulator (macOS) or Android Emulator

### Installation

1. **Install Dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Ensure Backend is Running**
   ```bash
   # From project root directory
   docker-compose up -d
   # or
   make up
   ```

3. **Start Expo Development Server**
   ```bash
   npm start
   ```

   A QR code will appear in your terminal and in the browser (http://localhost:8081)

4. **Test the App**
   
   **Option A: Physical Device (Recommended)**
   - Open Expo Go app on your phone
   - Scan the QR code from terminal
   - App will load on your device
   
   **Option B: iOS Simulator** (macOS only)
   ```bash
   npm run ios
   # or press 'i' in the terminal
   ```
   
   **Option C: Android Emulator**
   ```bash
   npm run android
   # or press 'a' in the terminal
   ```
   
   **Option D: Web Browser**
   ```bash
   npm run web
   # or press 'w' in the terminal
   ```

## 🛠️ Using the Makefile (Recommended)

From the project root directory:

```bash
# Complete mobile setup
make mobile-setup

# Start development server
make mobile-start

# Run on iOS simulator
make mobile-ios

# Run on Android emulator
make mobile-android

# Run in web browser
make mobile-web

# View all mobile commands
make help-mobile
```

## 📖 How to Use

### Testing Batch Verification

1. **Get a Batch QR Code**
   - Create a batch in the admin dashboard
   - Generate QR code from Batch Management section
   - Or use the QR Generator tool

2. **Scan in Mobile App**
   - Open the mobile app
   - Tap "Scan QR" button
   - Point camera at the QR code
   - View verification results instantly

3. **Manual Entry**
   - Enter Batch ID manually in the input field
   - Tap "Verify" button
   - View batch details and authenticity status

### Understanding Results

**Authentic Badge (Green)**
- Batch is verified and genuine
- All quality checks passed
- Temperature and humidity within safe ranges

**Suspicious Badge (Red)**
- Batch authenticity cannot be confirmed
- Quality parameters compromised
- Further investigation required

## 🔧 Configuration

### API Endpoint

The mobile app connects to your PharmaTrust backend:

```typescript
// Mobile app automatically detects the correct API endpoint:
// iOS Simulator: http://localhost:3000/api/mobile
// Android Emulator: http://10.0.2.2:3000/api/mobile
// Physical Device: http://YOUR_COMPUTER_IP:3000/api/mobile
```

For physical device testing, you may need to update the API endpoint in `App.tsx`:

```typescript
const API_BASE = 'http://YOUR_COMPUTER_IP:3000';
```

Find your computer's IP:
- **macOS/Linux**: `ifconfig | grep "inet "`
- **Windows**: `ipconfig`

### Camera Permissions

The app requires camera permissions for QR code scanning:

**iOS**: Permission requested automatically on first use

**Android**: Permission requested automatically on first use

## 🏗️ Project Structure

```
mobile/
├── App.tsx              # Main application component
├── index.js             # Entry point
├── app.json             # Expo configuration
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── eas.json             # Expo Application Services config
└── assets/              # Images and static assets
```

## 🔌 API Integration

### Verify Batch Endpoint

```typescript
GET /api/mobile/verify?batchId={batchId}

Response:
{
  "success": true,
  "data": {
    "batchId": "BATCH001",
    "name": "Aspirin 100mg",
    "authenticity": "Authentic",
    "qualityStatus": "good",
    "currentStage": "Distributed",
    "lastTemperature": 23.5,
    "lastHumidity": 45.2,
    "lastTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 🎨 Customization

### Styling

The app uses React Native's StyleSheet API with a design token system:

```typescript
const tokens = {
  colors: {
    primary: '#2E86AB',
    success: '#28A745',
    warning: '#FFC107',
    error: '#DC3545',
    // ...
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: 8
};
```

Modify these values in `App.tsx` to customize the look and feel.

### Features

Add new features by modifying `App.tsx`:
- Additional API calls
- New screens/components
- Enhanced verification logic
- Notification support

## 📱 Testing on Devices

### Same Network Testing

Ensure your mobile device and development machine are on the same WiFi network:

1. Find your computer's IP address
2. Update `API_BASE` in App.tsx if needed
3. Start the backend: `docker-compose up -d`
4. Start mobile app: `npm start`
5. Scan QR code with Expo Go

### Troubleshooting Network Issues

If the app can't connect to the backend:

```bash
# Check if backend is accessible
curl http://YOUR_IP:3000/api/health

# Check firewall settings
# Ensure port 3000 is accessible on your network

# Try using ngrok for external access
npx ngrok http 3000
```

## 🧪 Development Tips

### Hot Reload

Changes to `App.tsx` will automatically reload in Expo Go:
- Save the file
- App reloads instantly
- No need to rebuild

### Debugging

**View Logs**:
- Shake device (physical) or Cmd+D (iOS) / Cmd+M (Android)
- Select "Debug Remote JS"
- Open Chrome DevTools

**Console Logs**:
```typescript
console.log('Verification result:', result);
```

### Testing Without QR Codes

Use manual entry mode to test with batch IDs:
```
BATCH001
BATCH002
test-batch-id
```

## 📦 Building for Production

### Create Development Build

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Submit to App Stores

```bash
# Submit to Apple App Store
eas submit --platform ios

# Submit to Google Play Store
eas submit --platform android
```

See [Expo EAS documentation](https://docs.expo.dev/eas/) for detailed build and submission guides.

## 🔒 Security Notes

- API endpoints should use HTTPS in production
- Implement proper authentication for mobile API
- Store sensitive data securely using `expo-secure-store`
- Validate QR code data before processing

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Camera API](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Barcode Scanner](https://docs.expo.dev/versions/latest/sdk/bar-code-scanner/)

## 🐛 Common Issues

### "Cannot connect to Metro bundler"
- Ensure `npm start` is running
- Check firewall settings
- Try clearing cache: `npm start --clear`

### "Camera permission denied"
- Go to device Settings → PharmaTrust → Enable Camera
- Restart the app

### "Network request failed"
- Check if backend is running: `docker-compose ps`
- Verify API endpoint in App.tsx
- Ensure device and computer are on same network
- Try accessing http://YOUR_IP:3000 from mobile browser

### QR Scanner not working
- Check camera permissions
- Ensure adequate lighting
- Try a different QR code
- Test on a different device

## 🤝 Contributing

When contributing to the mobile app:

1. Test on both iOS and Android
2. Follow React Native best practices
3. Maintain TypeScript type safety
4. Update this README for new features

## 📄 License

Part of the PharmaTrust project. See main project LICENSE file.

## 💬 Support

- **Admin Dashboard**: http://localhost/admin/mobile
- **Project Documentation**: See main README.md
- **API Documentation**: http://localhost/api/docs

---

**Happy Testing! 📱✨**