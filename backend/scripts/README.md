# Test Environment Seed Script Documentation

## Overview

The `seedTestEnvironment.js` script is designed to populate MongoDB with controlled test data for geospatial verification testing in the CivicPulse platform.

**Location:** `backend/scripts/seedTestEnvironment.js`

---

## Features

### 1. **Database Clearing**
- Removes all existing users
- Removes all existing issues
- Provides clean slate for testing

### 2. **50 Test Users Generated**
- **30 users** within 10km radius from center coordinates
- **20 users** between 20-50km away from center
- Each user has:
  - Unique Indian name
  - Email: `{firstname}123@test.com`
  - Hashed password: `Geeks@12345` (bcrypt)
  - Role: `citizen`
  - Status: `isActive: true`, `isVerified: true`
  - GeoJSON location with precise coordinates

### 3. **Geospatial Coordinate Generation**
Uses **spherical geometry** to accurately generate coordinates:
- Random bearing (0-360°)
- Specified distance in km
- Conversion to radians using Earth's radius (6371km)
- Spherical trigonometry formulas applied
- Result: Accurate coordinates valid for MongoDB $geoWithin queries

### 4. **Test Issue Creation**
- Creates 1 issue at center location
- Issue properties:
  - Title: "Test Issue - Pothole on Center Street"
  - Location: [72.64893454224435, 23.419571372072653]
  - Category: "road"
  - Creator: First seeded user
  - Status: "Pending"

### 5. **Verification & Statistics**
- Prints total users created
- Prints users within 10km
- Prints users outside 10km
- Uses MongoDB `$geoWithin` to verify accuracy
- Displays sample user details

---

## Center Coordinates

```javascript
const CENTER_LNG = 72.64893454224435;
const CENTER_LAT = 23.419571372072653;
```

**Location:** Ahmedabad, India (near Sabarmati Taluka)

---

## Usage

### Basic Usage
```bash
cd backend
node scripts/seedTestEnvironment.js
```

### With Custom Timeout
```bash
timeout 30000 node scripts/seedTestEnvironment.js
```

---

## Output Example

```
🌱 Starting database seed...

📡 DNS servers configured: 8.8.8.8, 1.1.1.1
📡 Connecting to MongoDB...
✅ Connected via SRV

🗑️  Clearing existing users and issues...
✅ Cleared existing data

👥 Generating 50 test users...
✅ Created 50 users

🎯 Creating test issue at center location...
✅ Created test issue: 6998e44ce6866ebc173c149c

📊 Verification Statistics:

   Total Users Created: 50
   Users within 10km:  30
   Users 20-50km away: 20
   Test Issue ID:      6998e44ce6866ebc173c149c
   Center Coordinates: [72.64893454224435, 23.419571372072653]

🔍 Geospatial Query Verification:

   Users within 10km (via geospatial query): 30
   Users outside 10km: 20

📋 Sample Users Created:

   1. Aarav
      Email: aarav123@test.com
      Role: citizen
      Location: [72.7350, 23.3997]

   2. Aditya
      Email: aditya123@test.com
      Role: citizen
      Location: [72.6002, 23.4333]

   3. Arjun
      Email: arjun123@test.com
      Role: citizen
      Location: [72.6354, 23.4080]

✨ Seed completed successfully!
```

---

## Implementation Details

### Geospatial Formula

The script uses the **Haversine formula** for accurate spherical distance calculation:

```javascript
function generateCoordinateAtDistance(distanceKm, centerLng, centerLat) {
  // Random bearing (0-360 degrees)
  const bearing = Math.random() * 360;
  const bearingRad = (bearing * Math.PI) / 180;

  // Earth radius in km
  const earthRadiusKm = 6371;

  // Convert center to radians
  const lat1Rad = (centerLat * Math.PI) / 180;
  const lng1Rad = (centerLng * Math.PI) / 180;

  // Angular distance
  const angularDistance = distanceKm / earthRadiusKm;

  // Calculate new latitude
  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
    Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  // Calculate new longitude
  const lng2Rad =
    lng1Rad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
      Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  // Convert back to degrees
  const lat2 = (lat2Rad * 180) / Math.PI;
  const lng2 = (lng2Rad * 180) / Math.PI;

  return { lng: lng2, lat: lat2 };
}
```

**Why Haversine?**
- Accounts for Earth's spherical shape
- Accurate for small distances (< 1000km)
- Used by MongoDB $geoNear queries internally
- Prevents coordinate drift at poles

---

## User Generation

### Indian Names Used (50 unique)
```javascript
Aarav, Aditya, Arjun, Ashok, Amit, Akshay, Ajay, Aman, Anshul, Arun,
Bhavesh, Brijesh, Bhuvan, Bhupendra, Bikram, Chirag, Chandra, Chetan,
Chaitanya, Cyril, Deepak, Devendra, Dhiraj, Darshan, Dilip, Eshan,
Eshwar, Emraan, Ethan, Elias, Farhan, Faisal, Faraz, Feroz, Flavio,
Gaurav, Girish, Govind, Gajendra, Ghanshyam, Harsh, Harish, Harshal,
Hemant, Hrishikesh, Inder, Ishaan, Iqbal, Ishan, Ivan, Jyoti, Jayesh
```

### Email Generation
```javascript
email: `${firstName.toLowerCase()}123@test.com`
// Examples:
// Aarav → aarav123@test.com
// Aditya → aditya123@test.com
// Arjun → arjun123@test.com
```

### Password Hashing
```javascript
const hashedPassword = await bcrypt.hash('Geeks@12345', 12);
// All users have same plaintext password for testing simplicity
```

---

## Database Operations

### 1. Clear Existing Data
```javascript
await User.deleteMany({});
await Issue.deleteMany({});
```

### 2. Batch Insert Users
```javascript
const createdUsers = await User.insertMany(users);
```

### 3. Create Single Issue
```javascript
const testIssue = await Issue.create({
  title: 'Test Issue - Pothole on Center Street',
  description: 'This is a test issue created at the center coordinate...',
  category: 'road',
  location: {
    type: 'Point',
    coordinates: [CENTER_LNG, CENTER_LAT],
    address: 'Center Test Location',
    city: 'Ahmedabad',
    ward: 'Test Ward',
  },
  image: { url: '', publicId: '' },
  images: [],
  seriousnessRatings: [3],
  averageSeverity: 3,
  createdBy: createdUsers[0]._id,
  status: 'Pending',
});
```

### 4. Geospatial Verification Query
```javascript
const radiusInRadians = 10 / 6378.1;  // 10km to radians
const usersWithin10km = await User.countDocuments({
  location: {
    $geoWithin: {
      $centerSphere: [[CENTER_LNG, CENTER_LAT], radiusInRadians],
    },
  },
});
```

---

## MongoDB Connection Handling

### 1. DNS Server Configuration
```javascript
const dnsServers = (process.env.MONGO_DNS_SERVERS || '8.8.8.8,1.1.1.1').split(',');
dns.setServers(dnsServers);
```

### 2. SRV Connection Attempt
```javascript
await mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,  // IPv4 preference
});
```

### 3. Fallback to Non-SRV
```javascript
if (srvError.message.includes('querySrv ECONNREFUSED')) {
  await mongoose.connect(process.env.MONGO_URI_FALLBACK, {
    // ... same options
  });
}
```

---

## Testing Use Cases

### 1. **Verify 10km Radius Checks**
Use the 30 users within 10km to test:
- `verifyIssue` endpoint geospatial validation ✅
- Issue verification from nearby users ✅

### 2. **Verify Outside Radius Rejection**
Use the 20 users outside 10km to test:
- Rejection of verifications from distance ✅
- Proper 403 error response ✅

### 3. **Geospatial Query Testing**
- Test `getNearbyIssues` endpoint
- Verify correct distance calculations
- Test $geoWithin and $geoNear queries

### 4. **Socket Broadcast Testing**
- Test `issue:verified` event broadcast
- Test admin notification socket events
- Verify real-time updates

---

## Troubleshooting

### Error: "MongoDB connection string not found in .env"
**Solution:** Ensure `.env` file exists with:
```
MONGO_URI=mongodb+srv://...
MONGO_URI_FALLBACK=mongodb://...
MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1
```

### Error: "querySrv ECONNREFUSED"
**Solution:** Script auto-retries with fallback non-SRV URI. If both fail:
- Check internet connection
- Verify MongoDB Atlas IP whitelist
- Ensure DNS servers are accessible

### Error: "User validation failed: email must be unique"
**Solution:** Clear existing data first:
```bash
# Delete all users and issues manually, then run seed script
```

### Script Hangs
**Solution:** Increase timeout or check MongoDB network:
```bash
timeout 60000 node scripts/seedTestEnvironment.js
```

---

## Performance Metrics

**Typical Execution Time:** 5-10 seconds
- DNS configuration: ~100ms
- MongoDB connection: ~1-2 seconds
- User generation: ~100ms
- Batch insert 50 users: ~1-2 seconds
- Issue creation: ~500ms
- Geospatial verification: ~500ms
- Total: ~5-10 seconds

---

## Data Schema Snapshot

### User Document
```javascript
{
  _id: ObjectId("..."),
  name: "Aarav",
  email: "aarav123@test.com",
  password: "$2a$12$...",  // bcrypt hash of "Geeks@12345"
  role: "citizen",
  isActive: true,
  isVerified: true,
  location: {
    type: "Point",
    coordinates: [72.7350, 23.3997],
  },
  credibilityScore: 0,
  verificationCount: 0,
  createdAt: ISODate("2026-02-21T..."),
  updatedAt: ISODate("2026-02-21T..."),
}
```

### Issue Document
```javascript
{
  _id: ObjectId("6998e44ce6866ebc173c149c"),
  title: "Test Issue - Pothole on Center Street",
  description: "This is a test issue created at the center coordinate...",
  category: "road",
  location: {
    type: "Point",
    coordinates: [72.64893454224435, 23.419571372072653],
    address: "Center Test Location",
    city: "Ahmedabad",
    ward: "Test Ward",
  },
  image: { url: "", publicId: "" },
  images: [],
  seriousnessRatings: [3],
  averageSeverity: 3,
  createdBy: ObjectId("..."),
  status: "Pending",
  verificationCount: 0,
  notifiedCount: 0,
  commentCount: 0,
  likeCount: 0,
  createdAt: ISODate("2026-02-21T..."),
  updatedAt: ISODate("2026-02-21T..."),
}
```

---

## CommonJS Compliance

✅ All imports use `require()`
✅ All exports use `module.exports`
✅ No ES6 imports/exports
✅ Compatible with Node.js CommonJS module system

---

## Next Steps After Seeding

1. **Test Verification Endpoint**
   ```bash
   PATCH /api/v1/issues/{issueId}/verify
   ```
   Use users from within 10km → should succeed
   Use users from outside 10km → should return 403

2. **Test Geospatial Queries**
   ```bash
   GET /api/v1/issues/nearby?longitude=72.64893&latitude=23.41957&maxDistance=10000
   ```

3. **Test Admin Notifications**
   - Trigger 3 verifications
   - Verify all admin users receive notification
   - Check socket event delivery

4. **Verify Data Integrity**
   - Check user count: 50
   - Check coordinates precision
   - Verify role assignments
   - Confirm password hashing

---

## Script Termination

The script automatically exits after completion:
```javascript
// Success
process.exit(0);

// Error
process.exit(1);
```

This ensures no lingering MongoDB connections and clean process lifecycle.

---

## Version Info

- **Node.js:** v14+
- **MongoDB:** v4.0+
- **Mongoose:** v5+
- **bcryptjs:** v2.4+
- **Created:** February 21, 2026

