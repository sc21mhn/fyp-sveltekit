# CANVAS - Interactive Whiteboard Application

## Live Demo
The application is deployed and accessible at [https://fyp-sveltekit.vercel.app]

## Technologies Used
- SvelteKit
- Tailwind CSS
- Supabase (Authentication & Database)
- Vercel (Deployment)

## Setup Instructions
1. Clone the repository
   ```
   git clone https://github.com/sc21mhn/fyp-sveltekit.git
   ```

2. Install dependencies
   ```
   cd fyp-sveltekit
   npm install
   ```
3. Supabase Setup
   1. Create a Supabase account at https://supabase.com
   2. Create a new project in Supabase
   3. Get your project credentials from Project Settings > API:
      - Project URL (`PUBLIC_SUPABASE_URL`)
      - Project API Keys:
        - `anon` public key (`PUBLIC_SUPABASE_ANON_KEY`)
        - `service_role` secret key (`SUPABASE_SERVICE_ROLE_KEY`)
       
4. Create a `.env` file in the project root (or use the included one)
5. Add your Supabase credentials to the `.env` file:
      ```env
      ENCRYPTION_KEY=your_encryption_key
      PUBLIC_SUPABASE_URL=your_project_url
      PUBLIC_SUPABASE_ANON_KEY=your_anon_key
      SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
      ```

4. Run the development server
   ```
   npm run dev
   ```

5. Access the application
   - For local development: Open your browser and navigate to `http://localhost:5173`
   - For production: Visit [https://fyp-sveltekit.vercel.app]
   - Login using Supabase authentication
   - Start creating and collaborating on whiteboards!

## Student Information
- Name: Ming Hei Cyrus Ng 
- Student ID: 201560914
- Course: Computer Science
- University of Leeds
