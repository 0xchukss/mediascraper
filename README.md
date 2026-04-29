# Universal Media Scraper

A high-performance web tool for instantly searching, trimming, and downloading public domain media for YouTube video automation.

## Features
- **6-Source Aggregator**: Prelinger Archives, Library of Congress, Smithsonian, Google, Pexels, and Pixabay.
- **Precision Trimming**: Centered dual-handle slider for frame-accurate clipping.
- **Direct PC Download**: Saves assets directly to your system's `Downloads/VintageAssets` folder.
- **Workflow Optimization**: Drag-and-drop support for CapCut and one-click "Copy Path" buttons.

## Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Keys** (Optional):
   Create a `.env.local` file and add your keys for higher rate limits:
   ```env
   SMITHSONIAN_API_KEY=your_key
   PEXELS_API_KEY=your_key
   PIXABAY_API_KEY=your_key
   GOOGLE_API_KEY=your_key
   GOOGLE_CX=your_cx
   ```

3. **Run Locally**:
   ```bash
   npm run dev
   ```

## Deployment Note

This tool is optimized for **Local Development**. 
- **Saving to PC**: The automated "Save to Downloads" and "Open Folder" features require a local Node.js environment.
- **Hosted Environments (Vercel)**: While you can deploy the search interface to Vercel, the local file system interactions (saving directly to your PC) will be disabled. In a hosted environment, you should use standard browser downloads.

## License
Public Domain / MIT
