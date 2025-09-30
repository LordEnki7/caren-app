# Google Play Store Release Configuration for C.A.R.E.N.

## App Information
- **App Name**: C.A.R.E.N.
- **Package Name**: com.caren.app
- **Version**: 1.0.0
- **Version Code**: 1

## Required for Google Play Store Release

### 1. Production Backend URL ✅ CONFIGURED
The environment configuration system is now set up:

1. **Environment System**: `client/src/config/environment.ts` automatically detects Capacitor mobile apps and uses production URLs
2. **API Configuration**: `client/src/lib/queryClient.ts` updated to use absolute URLs for mobile apps
3. **Security**: Production backend security has been hardened with secure cookies and CORS configuration

**To complete setup:**
1. Deploy your backend through Replit's publishing interface (deployment suggested)
2. Set the environment variable: `VITE_PRODUCTION_API_URL=https://your-actual-deployment-url.replit.app`
3. Build the mobile app with this environment variable set

### 2. App Signing
For Google Play Store release, you need to create a release keystore:

```bash
# Generate release keystore (run this locally, not on Replit)
keytool -genkey -v -keystore caren-release-key.keystore -alias caren-release -keyalg RSA -keysize 2048 -validity 10000
```

### 3. Release Build Configuration
Update `android/app/build.gradle` with signing configuration:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('path/to/caren-release-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'caren-release'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 4. App Store Listing Information

**Short Description (80 characters max):**
Legal protection & emergency assistance for drivers and citizens

**Full Description:**
C.A.R.E.N. (Citizen Assistance for Roadside Emergencies and Navigation) is your comprehensive legal protection and emergency assistance platform. Features include:

• GPS-enabled legal rights information by state
• Emergency pullover assistance with location sharing
• Attorney network access for legal consultations  
• Voice-activated hands-free controls for safety
• Evidence recording and documentation tools
• Real-time emergency contact notifications
• Roadside assistance coordination
• Multi-language support

Perfect for drivers, families, and anyone who values legal protection and emergency preparedness.

**Keywords:**
legal protection, emergency assistance, roadside help, attorney access, GPS legal rights, voice commands, evidence recording, driver safety

**Category:** Lifestyle / Tools
**Content Rating:** Everyone
**Privacy Policy Required:** Yes (ensure you have one)

### 5. Required App Assets
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG) 
- Screenshots (minimum 2, up to 8)
- Short promotional video (optional)

### 6. Permissions Explanation ✅ CONFIGURED
The app uses Google Play Store compliant permissions:
- **Internet**: API communication and real-time features
- **Location (Fine/Coarse)**: GPS-based legal rights and emergency services
- **Camera**: Evidence documentation and recording
- **Microphone**: Voice commands and audio recording
- **Media Storage (API 33+ compliant)**: Read media files with scoped storage
- **Legacy Storage (API ≤32)**: Backwards compatibility for older devices
- **Vibrate**: Haptic feedback for emergency alerts
- **Network State**: Connection monitoring for reliability

**Note**: Legacy WRITE_EXTERNAL_STORAGE permission is limited to API ≤29 for Google Play compliance

### 7. Build Commands ✅ CONFIGURED FOR AAB
```bash
# Build production frontend with production API URL
VITE_PRODUCTION_API_URL=https://your-production-url.replit.app npm run build

# Copy to Capacitor
npx cap copy android

# Open in Android Studio for release AAB build
npx cap open android

# In Android Studio: Build > Generate Signed App Bundle (AAB)
```

## Next Steps
1. Deploy backend to production via Replit publishing
2. Update production API URL in environment configuration
3. Generate release keystore and configure signing
4. Build release APK/AAB in Android Studio
5. Create Google Play Console listing with required assets
6. Upload and publish to Google Play Store

## Important Notes
- Test thoroughly on physical devices before release
- Ensure all API endpoints work with production backend
- Verify all permissions are properly declared and explained
- Have privacy policy and terms of service ready
- Consider beta testing through Google Play Console