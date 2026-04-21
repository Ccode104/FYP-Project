# Fix Video Upload Errors - Progress Tracker

## Plan Status: ✅ APPROVED (Revised: Reuse cloudinary_public_id for Drive IDs, no DB migration)

### Step 1: ✅ Create this TODO.md **DONE**

### Step 2: ✅ Edit backend/controllers/videosController.js **DONE**

- ✅ Removed `v.drive_file_id,` from getMyVideos, getVideosByCourseOffering, getVideoById queries
- ✅ Fixed uploadVideoToDrive ESM issue: `require('stream').Readable.from(buffer)`
- ✅ Drive upload stores fileId in existing `cloudinary_public_id` column

### Step 3: [READY] Test fixes

```
cd backend && npm run start

# Test Cloudinary upload (unchanged, should work)
curl -F "title=TestCloudinary" -F "course_offering_id=302" -F "video=@test.mp4" http://localhost:4000/api/videos

# Test Drive upload
curl -H "Authorization: Bearer YOUR_TOKEN" -F "title=TestDrive" -F "course_offering_id=302" -F "video=@BGP.mp4" http://localhost:4000/api/drive-upload
```

### Step 4: [READY] Verify no more DB errors

```
curl -H "Authorization: Bearer TOKEN" "http://localhost:4000/api/videos/course/302"
```

### Step 5: [PENDING] User testing → attempt_completion
