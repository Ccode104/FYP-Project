# Video Player UI Polish - Student Side Only

## Status
✅ Step 2: Data props complete  
✅ Step 3a: Navbar added  
✅ Step 3b: Instructor avatar & info  
✅ Step 3c: Video progress %  
✅ Step 3d: Progress text  
✅ Step 3e: Mobile FAB  
⏳ Step 4: Test & complete

## Detailed Steps
1. **VideoPlayerPage.tsx** (fetch course data)
   - Get courseOffering details for title/instructor  
   - Add views count from API  
   - Pass as props to player  

2. **VideoPlayerNew.tsx** (UI fixes)  
   - Add Scholaris navbar (copy from mockup HTML)  
   - Dynamic video info with props (title, course, instructor avatar)  
   - Exact mockup images & text  
   - Progress: video watch % vs quiz  
   - Mobile FAB for notes  
   - Quiz overlay: Neural Plasticity example  

## Test Commands
```bash
npm run dev
# Visit /videos/1 (demo video)
# Check: navbar, quiz @12:45, playlist nav, dark mode, mobile FAB
```

Last Updated: $(date)
