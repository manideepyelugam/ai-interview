# Next.js + Appwrite setup

1. Install dependencies:
   npm install

2. Configure Appwrite:
   - Run Appwrite locally or use hosted Appwrite.
   - Set .env.local values: NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT.
   - If server-side operations need admin privileges, set APPWRITE_API_KEY (keep it secret).

3. Run dev server:
   npm run dev

4. Example Appwrite client wrapper: src/lib/appwrite.ts

Docs: https://appwrite.io/docs
